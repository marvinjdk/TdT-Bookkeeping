from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    username: str
    password: str
    role: Literal["admin", "afdeling"]
    afdeling_navn: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: str
    afdeling_navn: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class SettingsUpdate(BaseModel):
    startsaldo: float = 0.0
    periode_start: str = "01-10"
    periode_slut: str = "30-09"

class SettingsModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    afdeling_id: str
    startsaldo: float = 0.0
    periode_start: str = "01-10"
    periode_slut: str = "30-09"

class TransactionCreate(BaseModel):
    bilagnr: str
    bank_dato: str
    tekst: str
    formal: str
    belob: float
    type: Literal["indtaegt", "udgift"]

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    afdeling_id: str
    bilagnr: str
    bank_dato: str
    tekst: str
    formal: str
    belob: float
    type: str
    kvittering_url: Optional[str] = None
    oprettet: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DashboardStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    aktuelt_saldo: float
    total_indtaegter: float
    total_udgifter: float
    antal_posteringer: int

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Ugyldig token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Bruger ikke fundet")
        return User(**user)
    except JWTError:
        raise HTTPException(status_code=401, detail="Ugyldig token")

# Auth routes
@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Ugyldigt brugernavn eller adgangskode")
    
    user_obj = User(**user)
    access_token = create_access_token(data={"sub": user_obj.id})
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Admin routes
@api_router.post("/admin/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Kun admins kan oprette brugere")
    
    existing = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Brugernavn eksisterer allerede")
    
    user_dict = user_data.model_dump()
    user_dict["password"] = hash_password(user_dict["password"])
    user_obj = User(**{k: v for k, v in user_dict.items() if k != "password"})
    
    doc = user_obj.model_dump()
    doc["password"] = user_dict["password"]
    await db.users.insert_one(doc)
    return user_obj

@api_router.get("/admin/users", response_model=List[User])
async def list_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Kun admins kan se alle brugere")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [User(**u) for u in users]

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Kun admins kan slette brugere")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bruger ikke fundet")
    return {"success": True}

# Settings routes
@api_router.get("/settings", response_model=SettingsModel)
async def get_settings(current_user: User = Depends(get_current_user)):
    afdeling_id = current_user.id if current_user.role == "afdeling" else None
    if not afdeling_id:
        raise HTTPException(status_code=400, detail="Kun afdelinger har indstillinger")
    
    settings = await db.settings.find_one({"afdeling_id": afdeling_id}, {"_id": 0})
    if not settings:
        # Create default settings
        settings_obj = SettingsModel(afdeling_id=afdeling_id)
        await db.settings.insert_one(settings_obj.model_dump())
        return settings_obj
    return SettingsModel(**settings)

@api_router.put("/settings", response_model=SettingsModel)
async def update_settings(settings_update: SettingsUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "afdeling":
        raise HTTPException(status_code=403, detail="Kun afdelinger kan opdatere indstillinger")
    
    # Get existing settings or create new
    existing = await db.settings.find_one({"afdeling_id": current_user.id}, {"_id": 0})
    if existing:
        settings_obj = SettingsModel(**existing)
    else:
        settings_obj = SettingsModel(afdeling_id=current_user.id)
    
    # Update with new values
    update_data = settings_update.model_dump()
    for key, value in update_data.items():
        setattr(settings_obj, key, value)
    
    await db.settings.update_one(
        {"afdeling_id": current_user.id},
        {"$set": settings_obj.model_dump()},
        upsert=True
    )
    return settings_obj

# Transaction routes
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "afdeling":
        raise HTTPException(status_code=403, detail="Kun afdelinger kan oprette posteringer")
    
    trans_dict = transaction.model_dump()
    trans_obj = Transaction(afdeling_id=current_user.id, **trans_dict)
    await db.transactions.insert_one(trans_obj.model_dump())
    return trans_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions(
    afdeling_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if current_user.role == "afdeling":
        query["afdeling_id"] = current_user.id
    elif current_user.role == "admin" and afdeling_id:
        query["afdeling_id"] = afdeling_id
    
    projection = {
        "_id": 0, "id": 1, "afdeling_id": 1, "bilagnr": 1, 
        "bank_dato": 1, "tekst": 1, "formal": 1, "belob": 1, 
        "type": 1, "kvittering_url": 1, "oprettet": 1
    }
    transactions = await db.transactions.find(query, projection).sort("bank_dato", -1).to_list(1000)
    return [Transaction(**t) for t in transactions]

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str, current_user: User = Depends(get_current_user)):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Postering ikke fundet")
    
    if current_user.role == "afdeling" and transaction["afdeling_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Ingen adgang")
    
    return Transaction(**transaction)

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(
    transaction_id: str,
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user)
):
    existing = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Postering ikke fundet")
    
    if current_user.role == "afdeling" and existing["afdeling_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Ingen adgang")
    
    update_data = transaction.model_dump()
    await db.transactions.update_one({"id": transaction_id}, {"$set": update_data})
    
    updated = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    return Transaction(**updated)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: User = Depends(get_current_user)):
    existing = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Postering ikke fundet")
    
    if current_user.role == "afdeling" and existing["afdeling_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Ingen adgang")
    
    result = await db.transactions.delete_one({"id": transaction_id})
    return {"success": True}

@api_router.post("/transactions/{transaction_id}/upload")
async def upload_receipt(
    transaction_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Postering ikke fundet")
    
    if current_user.role == "afdeling" and transaction["afdeling_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Ingen adgang")
    
    # Save file locally (later can be Dropbox)
    upload_dir = Path("/app/uploads")
    upload_dir.mkdir(exist_ok=True)
    
    file_extension = Path(file.filename).suffix
    filename = f"{transaction_id}_{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    kvittering_url = f"/uploads/{filename}"
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"kvittering_url": kvittering_url}}
    )
    
    return {"success": True, "url": kvittering_url}

# Dashboard stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    afdeling_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    target_afdeling_id = None
    
    if current_user.role == "afdeling":
        target_afdeling_id = current_user.id
        query["afdeling_id"] = current_user.id
    elif current_user.role == "admin" and afdeling_id:
        target_afdeling_id = afdeling_id
        query["afdeling_id"] = afdeling_id
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    total_indtaegter = sum(t["belob"] for t in transactions if t["type"] == "indtaegt")
    total_udgifter = sum(t["belob"] for t in transactions if t["type"] == "udgift")
    
    # Get startsaldo
    startsaldo = 0.0
    if target_afdeling_id:
        settings = await db.settings.find_one({"afdeling_id": target_afdeling_id}, {"_id": 0})
        if settings:
            startsaldo = settings.get("startsaldo", 0.0)
    
    aktuelt_saldo = startsaldo + total_indtaegter - total_udgifter
    
    return DashboardStats(
        aktuelt_saldo=aktuelt_saldo,
        total_indtaegter=total_indtaegter,
        total_udgifter=total_udgifter,
        antal_posteringer=len(transactions)
    )

# Excel export
@api_router.get("/export/excel")
async def export_excel(
    afdeling_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if current_user.role == "afdeling":
        query["afdeling_id"] = current_user.id
    elif current_user.role == "admin" and afdeling_id:
        query["afdeling_id"] = afdeling_id
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("bank_dato", 1).to_list(10000)
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Bogføring"
    
    # Headers
    headers = ["Bilagnr.", "Bank dato", "Tekst", "Formål", "Beløb", "Type"]
    ws.append(headers)
    
    # Style headers
    header_fill = PatternFill(start_color="109848", end_color="109848", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    # Add data
    for t in transactions:
        ws.append([
            t["bilagnr"],
            t["bank_dato"],
            t["tekst"],
            t["formal"],
            t["belob"],
            t["type"]
        ])
    
    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(cell.value)
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=bogforing.xlsx"}
    )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()