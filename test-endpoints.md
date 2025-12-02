# Testing CraftConnect Backend API Endpoints

## Prerequisites

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Update MongoDB Connection**
   - Open `backend/.env`
   - Replace the `MONGODB_URI` with your actual MongoDB Atlas connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/craftconnect`

3. **Start the Server**
```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════╗
║   CraftConnect API Server Running    ║
║   Port: 5000                          ║
║   Environment: development            ║
╚═══════════════════════════════════════╝

✅ MongoDB Connected: cluster0-xxxxx.mongodb.net
📊 Database: craftconnect
```

---

## Testing with Thunder Client / Postman / cURL

### 1. Health Check
**Test if server is running**

```http
GET http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "CraftConnect API is running",
  "timestamp": "2024-11-30T..."
}
```

---

### 2. Register New User (Artisan)

```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "john_carpenter",
  "email": "john@example.com",
  "password": "password123",
  "role": "artisan"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "674b1234567890abcdef1234",
    "username": "john_carpenter",
    "email": "john@example.com",
    "role": "artisan"
  }
}
```

---

### 3. Register New User (Customer)

```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "jane_customer",
  "email": "jane@example.com",
  "password": "password123",
  "role": "customer"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "674b1234567890abcdef5678",
    "username": "jane_customer",
    "email": "jane@example.com",
    "role": "customer"
  }
}
```

---

### 4. Login User

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "674b1234567890abcdef1234",
    "username": "john_carpenter",
    "email": "john@example.com",
    "role": "artisan"
  }
}
```

---

### 5. Get Current User (Protected Route)

**Copy the token from login/register response**

```http
GET http://localhost:5000/api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "_id": "674b1234567890abcdef1234",
    "username": "john_carpenter",
    "email": "john@example.com",
    "role": "artisan",
    "profile": {
      "skills": []
    },
    "isVerified": false,
    "isActive": true,
    "createdAt": "2024-11-30T...",
    "updatedAt": "2024-11-30T..."
  }
}
```

---

### 6. Logout (Protected Route)

```http
POST http://localhost:5000/api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Error Responses

### Duplicate Email
```json
{
  "success": false,
  "message": "Email already registered"
}
```

### Invalid Credentials
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Missing Token
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Password must be at least 6 characters"
}
```

---

## Testing with cURL (Command Line)

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "password": "password123",
    "role": "artisan"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Current User (Replace TOKEN with actual token)
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Quick Test Script

Save this as `test-api.ps1` in the backend folder:

```powershell
# Test Health Check
Write-Host "`n=== Testing Health Check ===" -ForegroundColor Green
curl http://localhost:5000/api/health

# Test Register
Write-Host "`n`n=== Testing Register ===" -ForegroundColor Green
$registerResponse = curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"username":"testuser","email":"test@test.com","password":"password123","role":"artisan"}'

Write-Host $registerResponse

# Test Login
Write-Host "`n`n=== Testing Login ===" -ForegroundColor Green
$loginResponse = curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@test.com","password":"password123"}'

Write-Host $loginResponse
```

Run with:
```bash
.\test-api.ps1
```

---

## Troubleshooting

### Server won't start
- Check if MongoDB connection string is correct in `.env`
- Ensure MongoDB Atlas IP whitelist includes your IP (or use 0.0.0.0/0 for testing)
- Check if port 5000 is already in use

### Connection Refused
- Make sure MongoDB Atlas cluster is running
- Verify network access settings in MongoDB Atlas
- Check username/password in connection string

### Token Invalid
- Token expires after 7 days (configurable in `.env`)
- Make sure to include "Bearer " before the token
- Check JWT_SECRET is set in `.env`

---

## Next Steps

Once all endpoints are working:
1. ✅ Health check returns success
2. ✅ Can register new users
3. ✅ Can login with credentials
4. ✅ Can access protected routes with token
5. ✅ Ready to connect frontend!
