# 🚀 Quick Start Guide - CraftConnect Backend

## Step 1: Install Dependencies

Open PowerShell in the `backend` folder and run:

```powershell
npm install
```

This will install all required packages (Express, MongoDB, JWT, etc.)

---

## Step 2: Configure MongoDB

### Option A: MongoDB Atlas (Recommended - Cloud, No Installation)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Open `backend/.env` file
7. Replace the `MONGODB_URI` line with:
   ```
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/craftconnect?retryWrites=true&w=majority
   ```
8. Replace `YOUR_USERNAME` and `YOUR_PASSWORD` with your actual credentials
9. In MongoDB Atlas, go to "Network Access" → "Add IP Address" → "Allow Access from Anywhere" (for testing)

### Option B: Local MongoDB (If you have MongoDB installed)

If you have MongoDB installed locally, the default connection string should work:
```
MONGODB_URI=mongodb://127.0.0.1:27017/craftconnect
```

---

## Step 3: Start the Server

```powershell
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

## Step 4: Test the API

### Quick Test (Automated)

Run the test script:
```powershell
.\test-api.ps1
```

This will automatically test all endpoints and show you the results.

### Manual Test (Using Browser or Postman)

1. **Health Check** - Open browser:
   ```
   http://localhost:5000/api/health
   ```

2. **Register User** - Use Postman/Thunder Client:
   ```
   POST http://localhost:5000/api/auth/register
   Body (JSON):
   {
     "username": "john_doe",
     "email": "john@example.com",
     "password": "password123",
     "role": "artisan"
   }
   ```

3. **Login** - Use Postman/Thunder Client:
   ```
   POST http://localhost:5000/api/auth/login
   Body (JSON):
   {
     "email": "john@example.com",
     "password": "password123"
   }
   ```

---

## Common Issues & Solutions

### ❌ "Cannot find module 'express'"
**Solution:** Run `npm install` in the backend folder

### ❌ "MongoDB connection error"
**Solution:** 
- Check your MongoDB Atlas connection string in `.env`
- Verify username and password are correct
- Make sure IP address is whitelisted in MongoDB Atlas

### ❌ "Port 5000 already in use"
**Solution:** 
- Change `PORT=5000` to `PORT=5001` in `.env`
- Or kill the process using port 5000

### ❌ "ECONNREFUSED ::1:27017"
**Solution:** 
- You're trying to connect to local MongoDB but it's not running
- Use MongoDB Atlas instead (see Step 2, Option A)

---

## Next Steps

Once the server is running and tests pass:

✅ Backend is ready!
✅ All endpoints are working!
✅ Ready to connect to frontend!

See `test-endpoints.md` for detailed API documentation.

---

## Quick Commands Reference

```powershell
# Install dependencies
npm install

# Start server (development mode with auto-restart)
npm run dev

# Start server (production mode)
npm start

# Test all endpoints
.\test-api.ps1
```

---

## Need Help?

Check these files:
- `test-endpoints.md` - Detailed API documentation
- `README.md` - Full backend documentation
- `.env.example` - Environment variables template

Happy coding! 🎉
