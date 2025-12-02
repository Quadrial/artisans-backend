# CraftConnect Backend API

Backend API for CraftConnect - Nigerian Artisan Marketplace Platform

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Project Structure

```
backend/
├── config/          # Configuration files
│   └── database.js  # MongoDB connection
├── controllers/     # Route controllers
│   └── authController.js
├── middleware/      # Custom middleware
│   ├── auth.js      # JWT authentication
│   └── errorHandler.js
├── models/          # Mongoose models
│   └── User.js
├── routes/          # API routes
│   └── authRoutes.js
├── utils/           # Utility functions
│   └── generateToken.js
├── .env             # Environment variables
├── .env.example     # Environment variables template
├── server.js        # Entry point
└── package.json     # Dependencies
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update the following in `.env`:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure random string
- `PORT` - Server port (default: 5000)

### 3. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# For local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your Atlas connection string
```

### 4. Run the Server

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "artisan"  // or "customer"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Health Check
```http
GET /api/health
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

## User Model

```javascript
{
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed, required),
  role: String (customer/artisan),
  profile: {
    fullName: String,
    phone: String,
    state: String,
    city: String,
    address: String,
    profession: String,
    bio: String,
    hourlyRate: Number,
    yearsOfExperience: Number,
    skills: [String],
    profilePicture: String
  },
  isVerified: Boolean,
  isActive: Boolean,
  timestamps: true
}
```

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Protected routes middleware
- Role-based access control
- Input validation with express-validator
- CORS configuration
- Environment variable protection

## Development

### Install nodemon for auto-restart
```bash
npm install -D nodemon
```

### Run in development mode
```bash
npm run dev
```

## Testing with Postman/Thunder Client

1. Register a new user
2. Copy the returned token
3. Use the token in Authorization header for protected routes:
   ```
   Authorization: Bearer <your_token_here>
   ```

## MongoDB Atlas Setup (Optional)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network access in MongoDB Atlas

### Port Already in Use
- Change `PORT` in `.env`
- Or kill the process using the port

### JWT Token Invalid
- Check `JWT_SECRET` in `.env`
- Ensure token is properly formatted in Authorization header

## License

MIT
