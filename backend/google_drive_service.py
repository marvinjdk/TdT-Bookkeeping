"""
Google Drive Integration Service for Tour de Taxa
Handles OAuth flow, file upload, download, and folder management
"""
from fastapi import HTTPException, UploadFile
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import os
import io
import tempfile
import logging

logger = logging.getLogger(__name__)

# Google Drive scopes - using drive.file for app-specific files only
SCOPES = ['https://www.googleapis.com/auth/drive.file']

# Base folder structure
BASE_FOLDER_NAME = "Tour de Taxa"
KVITTERINGER_FOLDER_NAME = "Kvitteringer"


def get_oauth_flow(redirect_uri: str = None) -> Flow:
    """Create OAuth flow for Google Drive"""
    if not redirect_uri:
        redirect_uri = os.getenv("GOOGLE_DRIVE_REDIRECT_URI")
    
    return Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri]
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )


def get_authorization_url(user_id: str) -> str:
    """Generate Google OAuth authorization URL"""
    flow = get_oauth_flow()
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',  # Force consent to get refresh token
        state=user_id  # Pass user ID as state for callback
    )
    logger.info(f"Drive OAuth initiated for user {user_id}")
    return authorization_url


async def handle_oauth_callback(code: str, state: str, db) -> dict:
    """Handle OAuth callback and store credentials"""
    redirect_uri = os.getenv("GOOGLE_DRIVE_REDIRECT_URI")
    
    # Create flow without scopes for callback - accept whatever Google granted
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri]
            }
        },
        scopes=None,  # Accept all granted scopes
        redirect_uri=redirect_uri
    )
    
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    logger.info(f"Drive credentials obtained for user {state}, scopes: {credentials.scopes}")
    
    # Verify required scopes are granted (allow extra scopes)
    required_scopes = {"https://www.googleapis.com/auth/drive.file"}
    granted_scopes = set(credentials.scopes or [])
    if not required_scopes.issubset(granted_scopes):
        missing = required_scopes - granted_scopes
        logger.error(f"Missing required Drive scopes: {missing}")
        raise HTTPException(
            status_code=400,
            detail=f"Manglende tilladelser: {', '.join(missing)}"
        )
    
    # Store credentials in database
    await db.drive_credentials.update_one(
        {"user_id": state},
        {"$set": {
            "user_id": state,
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": list(credentials.scopes) if credentials.scopes else [],
            "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    logger.info(f"Drive credentials stored for user {state}")
    return {"success": True, "user_id": state}


async def get_drive_service(user_id: str, db):
    """Get Google Drive service with auto-refresh credentials"""
    creds_doc = await db.drive_credentials.find_one({"user_id": user_id}, {"_id": 0})
    if not creds_doc:
        raise HTTPException(
            status_code=400,
            detail="Google Drive er ikke tilsluttet. Tilslut venligst din Google Drive først."
        )
    
    # Create credentials object
    creds = Credentials(
        token=creds_doc["access_token"],
        refresh_token=creds_doc.get("refresh_token"),
        token_uri=creds_doc["token_uri"],
        client_id=creds_doc["client_id"],
        client_secret=creds_doc["client_secret"],
        scopes=creds_doc["scopes"]
    )
    
    # Auto-refresh if expired
    if creds.expired and creds.refresh_token:
        logger.info(f"Refreshing expired token for user {user_id}")
        try:
            creds.refresh(GoogleRequest())
            
            # Update in database
            await db.drive_credentials.update_one(
                {"user_id": user_id},
                {"$set": {
                    "access_token": creds.token,
                    "expiry": creds.expiry.isoformat() if creds.expiry else None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            raise HTTPException(
                status_code=401,
                detail="Google Drive session udløbet. Tilslut venligst igen."
            )
    
    return build('drive', 'v3', credentials=creds)


async def get_or_create_folder(service, folder_name: str, parent_id: str = None) -> str:
    """Get existing folder or create new one, return folder ID"""
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"
    
    results = service.files().list(
        q=query,
        spaces='drive',
        fields='files(id, name)'
    ).execute()
    
    files = results.get('files', [])
    
    if files:
        return files[0]['id']
    
    # Create folder
    file_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_id:
        file_metadata['parents'] = [parent_id]
    
    folder = service.files().create(
        body=file_metadata,
        fields='id'
    ).execute()
    
    logger.info(f"Created folder '{folder_name}' with ID: {folder.get('id')}")
    return folder.get('id')


async def ensure_folder_structure(service, afdeling_navn: str, regnskabsaar: str) -> str:
    """
    Ensure folder structure exists: Tour de Taxa/Kvitteringer/[Afdeling]/[Regnskabsaar]
    Returns the final folder ID
    """
    # Get or create base folder
    base_folder_id = await get_or_create_folder(service, BASE_FOLDER_NAME)
    
    # Get or create Kvitteringer folder
    kvit_folder_id = await get_or_create_folder(service, KVITTERINGER_FOLDER_NAME, base_folder_id)
    
    # Get or create Afdeling folder
    afdeling_folder_id = await get_or_create_folder(service, afdeling_navn, kvit_folder_id)
    
    # Get or create Regnskabsaar folder
    year_folder_id = await get_or_create_folder(service, regnskabsaar, afdeling_folder_id)
    
    return year_folder_id


async def upload_file_to_drive(
    service,
    file_content: bytes,
    filename: str,
    folder_id: str,
    mime_type: str = None
) -> Dict[str, str]:
    """Upload a file to Google Drive and return file info"""
    
    # Write content to temp file
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(file_content)
        tmp_path = tmp.name
    
    try:
        file_metadata = {
            'name': filename,
            'parents': [folder_id]
        }
        
        media = MediaFileUpload(
            tmp_path,
            mimetype=mime_type or 'application/octet-stream',
            resumable=True
        )
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink, webContentLink'
        ).execute()
        
        logger.info(f"Uploaded file '{filename}' with ID: {file.get('id')}")
        
        return {
            "file_id": file.get('id'),
            "filename": file.get('name'),
            "web_view_link": file.get('webViewLink'),
            "download_link": file.get('webContentLink')
        }
    finally:
        # Clean up temp file
        os.unlink(tmp_path)


async def list_files_in_folder(service, folder_id: str) -> List[Dict[str, Any]]:
    """List all files in a Google Drive folder"""
    results = service.files().list(
        q=f"'{folder_id}' in parents and trashed=false",
        spaces='drive',
        fields='files(id, name, mimeType, webViewLink, webContentLink, createdTime, size)',
        orderBy='createdTime desc'
    ).execute()
    
    files = results.get('files', [])
    return [
        {
            "file_id": f.get('id'),
            "filename": f.get('name'),
            "mime_type": f.get('mimeType'),
            "web_view_link": f.get('webViewLink'),
            "download_link": f.get('webContentLink'),
            "created_at": f.get('createdTime'),
            "size": f.get('size')
        }
        for f in files
    ]


async def download_file_from_drive(service, file_id: str) -> tuple:
    """Download a file from Google Drive, returns (content, filename, mime_type)"""
    # Get file metadata
    file_metadata = service.files().get(
        fileId=file_id,
        fields='name, mimeType'
    ).execute()
    
    # Download file content
    request = service.files().get_media(fileId=file_id)
    file_content = io.BytesIO()
    downloader = MediaIoBaseDownload(file_content, request)
    
    done = False
    while not done:
        status, done = downloader.next_chunk()
    
    file_content.seek(0)
    return file_content.read(), file_metadata.get('name'), file_metadata.get('mimeType')


async def delete_file_from_drive(service, file_id: str) -> bool:
    """Delete a file from Google Drive"""
    try:
        service.files().delete(fileId=file_id).execute()
        logger.info(f"Deleted file with ID: {file_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete file {file_id}: {e}")
        return False


async def check_drive_connection(user_id: str, db) -> Dict[str, Any]:
    """Check if user has connected Google Drive"""
    creds_doc = await db.drive_credentials.find_one({"user_id": user_id}, {"_id": 0})
    if not creds_doc:
        return {"connected": False}
    
    return {
        "connected": True,
        "connected_at": creds_doc.get("connected_at"),
        "scopes": creds_doc.get("scopes", [])
    }


async def disconnect_drive(user_id: str, db) -> bool:
    """Remove Google Drive connection for user"""
    result = await db.drive_credentials.delete_one({"user_id": user_id})
    return result.deleted_count > 0
