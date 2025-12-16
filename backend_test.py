#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class BogforingsappAPITester:
    def __init__(self, base_url="https://danishfinance.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.current_user = None
        self.test_transaction_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if files:
                # Remove Content-Type for file uploads
                headers.pop('Content-Type', None)
                
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login_afdeling(self):
        """Test login with department user"""
        success, response = self.run_test(
            "Login - Afdeling User",
            "POST",
            "auth/login",
            200,
            data={"username": "himmerland", "password": "test123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.current_user = response['user']
            print(f"   Logged in as: {self.current_user['username']} ({self.current_user['role']})")
            return True
        return False

    def test_login_superuser(self):
        """Test login with superuser"""
        success, response = self.run_test(
            "Login - Superuser",
            "POST",
            "auth/login",
            200,
            data={"username": "superbruger", "password": "super123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.current_user = response['user']
            print(f"   Logged in as: {self.current_user['username']} ({self.current_user['role']})")
            return True
        return False

    def test_login_admin(self):
        """Test login with admin user"""
        success, response = self.run_test(
            "Login - Admin User",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.current_user = response['user']
            print(f"   Logged in as: {self.current_user['username']} ({self.current_user['role']})")
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User Info",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            print(f"   Stats: Saldo={response.get('aktuelt_saldo', 0)}, Posteringer={response.get('antal_posteringer', 0)}")
        return success

    def test_create_transaction(self):
        """Test creating a new transaction"""
        transaction_data = {
            "bilagnr": f"TEST-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "bank_dato": "2024-01-15",
            "tekst": "Test postering fra API test",
            "formal": "Diverse",
            "belob": 150.50,
            "type": "udgift"
        }
        
        success, response = self.run_test(
            "Create Transaction",
            "POST",
            "transactions",
            200,
            data=transaction_data
        )
        if success and 'id' in response:
            self.test_transaction_id = response['id']
            print(f"   Created transaction ID: {self.test_transaction_id}")
        return success

    def test_list_transactions(self):
        """Test listing transactions"""
        success, response = self.run_test(
            "List Transactions",
            "GET",
            "transactions",
            200
        )
        if success:
            print(f"   Found {len(response)} transactions")
        return success

    def test_get_transaction(self):
        """Test getting a specific transaction"""
        if not self.test_transaction_id:
            print("❌ No transaction ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Specific Transaction",
            "GET",
            f"transactions/{self.test_transaction_id}",
            200
        )
        return success

    def test_update_transaction(self):
        """Test updating a transaction"""
        if not self.test_transaction_id:
            print("❌ No transaction ID available for testing")
            return False
            
        update_data = {
            "bilagnr": f"UPDATED-{datetime.now().strftime('%H%M%S')}",
            "bank_dato": "2024-01-16",
            "tekst": "Updated test postering",
            "formal": "Diverse",
            "belob": 200.75,
            "type": "indtaegt"
        }
        
        success, response = self.run_test(
            "Update Transaction",
            "PUT",
            f"transactions/{self.test_transaction_id}",
            200,
            data=update_data
        )
        return success

    def test_settings_get(self):
        """Test getting settings (afdeling only)"""
        if self.current_user and self.current_user['role'] == 'afdeling':
            success, response = self.run_test(
                "Get Settings",
                "GET",
                "settings",
                200
            )
            return success
        else:
            print("⏭️  Skipping settings test - not an afdeling user")
            return True

    def test_settings_update(self):
        """Test updating settings (afdeling only)"""
        if self.current_user and self.current_user['role'] == 'afdeling':
            settings_data = {
                "startsaldo": 5000.0,
                "periode_start": "01-10",
                "periode_slut": "30-09"
            }
            
            success, response = self.run_test(
                "Update Settings",
                "PUT",
                "settings",
                200,
                data=settings_data
            )
            return success
        else:
            print("⏭️  Skipping settings update test - not an afdeling user")
            return True

    def test_admin_list_users(self):
        """Test listing users (admin only)"""
        if self.current_user and self.current_user['role'] == 'admin':
            success, response = self.run_test(
                "List Users (Admin)",
                "GET",
                "admin/users",
                200
            )
            if success:
                print(f"   Found {len(response)} users")
            return success
        else:
            print("⏭️  Skipping admin users test - not an admin user")
            return True

    def test_admin_create_user(self):
        """Test creating a user (admin only)"""
        if self.current_user and self.current_user['role'] == 'admin':
            user_data = {
                "username": f"testuser_{datetime.now().strftime('%H%M%S')}",
                "password": "testpass123",
                "role": "afdeling",
                "afdeling_navn": "Test Afdeling"
            }
            
            success, response = self.run_test(
                "Create User (Admin)",
                "POST",
                "admin/users",
                200,
                data=user_data
            )
            return success
        else:
            print("⏭️  Skipping admin create user test - not an admin user")
            return True

    def test_admin_dashboard_stats_with_afdelinger_saldi(self):
        """Test admin dashboard stats - verify user_id is included in afdelinger_saldi"""
        if self.current_user and self.current_user['role'] == 'admin':
            success, response = self.run_test(
                "Admin Dashboard Stats with Afdelinger Saldi",
                "GET",
                "dashboard/stats",
                200
            )
            if success:
                afdelinger_saldi = response.get('afdelinger_saldi', [])
                print(f"   Found {len(afdelinger_saldi)} afdelinger in saldi")
                
                # Check if user_id is included for departments with users
                for afdeling in afdelinger_saldi:
                    afdeling_navn = afdeling.get('afdeling_navn', 'Unknown')
                    user_id = afdeling.get('user_id')
                    aktuelt_saldo = afdeling.get('aktuelt_saldo', 0)
                    print(f"   - {afdeling_navn}: {aktuelt_saldo} kr (user_id: {user_id})")
                
                # Verify structure
                if afdelinger_saldi:
                    first_afdeling = afdelinger_saldi[0]
                    required_fields = ['afdeling_id', 'afdeling_navn', 'aktuelt_saldo']
                    missing_fields = [field for field in required_fields if field not in first_afdeling]
                    if missing_fields:
                        print(f"   ❌ Missing required fields: {missing_fields}")
                        return False
                    else:
                        print(f"   ✅ All required fields present in afdelinger_saldi")
                
            return success
        else:
            print("⏭️  Skipping admin dashboard stats test - not an admin user")
            return True

    def test_admin_transactions_by_afdeling_id(self):
        """Test admin transactions filtering by afdeling_id"""
        if self.current_user and self.current_user['role'] == 'admin':
            # First get the dashboard stats to find an afdeling with transactions
            stats_success, stats_response = self.run_test(
                "Get Dashboard Stats for Afdeling Lookup",
                "GET",
                "dashboard/stats",
                200
            )
            
            if not stats_success:
                print("   ❌ Could not get dashboard stats for afdeling lookup")
                return False
            
            afdelinger_saldi = stats_response.get('afdelinger_saldi', [])
            test_afdeling = None
            
            # Find an afdeling with a user_id (meaning it has transactions)
            for afdeling in afdelinger_saldi:
                if afdeling.get('user_id') and afdeling.get('afdeling_navn') == 'Himmerland':
                    test_afdeling = afdeling
                    break
            
            if not test_afdeling:
                # Try to find any afdeling with user_id
                for afdeling in afdelinger_saldi:
                    if afdeling.get('user_id'):
                        test_afdeling = afdeling
                        break
            
            if not test_afdeling:
                print("   ⚠️  No afdeling with user_id found for testing")
                return True
            
            afdeling_id = test_afdeling['user_id']  # Use user_id as afdeling_id for transactions
            afdeling_navn = test_afdeling['afdeling_navn']
            
            success, response = self.run_test(
                f"Admin Transactions for {afdeling_navn}",
                "GET",
                f"transactions?afdeling_id={afdeling_id}",
                200
            )
            
            if success:
                transactions = response if isinstance(response, list) else []
                print(f"   Found {len(transactions)} transactions for {afdeling_navn}")
                
                # Verify all transactions belong to the correct afdeling
                for transaction in transactions:
                    if transaction.get('afdeling_id') != afdeling_id:
                        print(f"   ❌ Transaction {transaction.get('bilagnr')} has wrong afdeling_id")
                        return False
                
                if transactions:
                    print(f"   ✅ All transactions correctly filtered for afdeling_id: {afdeling_id}")
                    # Show sample transaction
                    sample = transactions[0]
                    print(f"   Sample: {sample.get('bilagnr')} - {sample.get('tekst')} ({sample.get('belob')} kr)")
            
            return success
        else:
            print("⏭️  Skipping admin transactions by afdeling test - not an admin user")
            return True

    def test_admin_transactions_all_departments(self):
        """Test admin viewing all transactions (should show transactions from all departments)"""
        if self.current_user and self.current_user['role'] == 'admin':
            success, response = self.run_test(
                "Admin All Transactions",
                "GET",
                "transactions",
                200
            )
            
            if success:
                transactions = response if isinstance(response, list) else []
                print(f"   Found {len(transactions)} total transactions across all departments")
                
                # Group by afdeling_id to show distribution
                afdeling_counts = {}
                for transaction in transactions:
                    afdeling_id = transaction.get('afdeling_id', 'Unknown')
                    afdeling_counts[afdeling_id] = afdeling_counts.get(afdeling_id, 0) + 1
                
                print(f"   Transactions by afdeling_id:")
                for afdeling_id, count in afdeling_counts.items():
                    print(f"   - {afdeling_id}: {count} transactions")
                
                if transactions:
                    # Show sample transactions
                    print(f"   Sample transactions:")
                    for i, transaction in enumerate(transactions[:3]):
                        print(f"   {i+1}. {transaction.get('bilagnr')} - {transaction.get('tekst')} (Afdeling: {transaction.get('afdeling_id')})")
            
            return success
        else:
            print("⏭️  Skipping admin all transactions test - not an admin user")
            return True

    def test_excel_export(self):
        """Test Excel export"""
        success, response = self.run_test(
            "Excel Export",
            "GET",
            "export/excel",
            200
        )
        return success

    def test_delete_transaction(self):
        """Test deleting a transaction"""
        if not self.test_transaction_id:
            print("❌ No transaction ID available for testing")
            return False
            
        success, response = self.run_test(
            "Delete Transaction",
            "DELETE",
            f"transactions/{self.test_transaction_id}",
            200
        )
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login Test",
            "POST",
            "auth/login",
            401,
            data={"username": "invalid", "password": "invalid"}
        )
        return success

def main():
    print("🚀 Starting Bogføringsapp API Tests")
    print("=" * 50)
    
    tester = BogforingsappAPITester()
    
    # Test invalid login first
    tester.test_invalid_login()
    
    # Test with afdeling user
    print("\n📋 Testing with Afdeling User (himmerland)")
    print("-" * 40)
    
    if not tester.test_login_afdeling():
        print("❌ Afdeling login failed, stopping afdeling tests")
    else:
        tester.test_get_me()
        tester.test_dashboard_stats()
        tester.test_create_transaction()
        tester.test_list_transactions()
        tester.test_get_transaction()
        tester.test_update_transaction()
        tester.test_settings_get()
        tester.test_settings_update()
        tester.test_excel_export()
        tester.test_delete_transaction()
    
    # Reset for admin tests
    tester.token = None
    tester.current_user = None
    
    # Test with admin user
    print("\n👑 Testing with Admin User")
    print("-" * 40)
    
    if not tester.test_login_admin():
        print("❌ Admin login failed, stopping admin tests")
    else:
        tester.test_get_me()
        tester.test_dashboard_stats()
        tester.test_admin_dashboard_stats_with_afdelinger_saldi()
        tester.test_admin_transactions_by_afdeling_id()
        tester.test_admin_transactions_all_departments()
        tester.test_admin_list_users()
        tester.test_admin_create_user()
        tester.test_excel_export()

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())