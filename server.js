const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const setupSocket = require('./socket/socketHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://craftconnectt.netlify.app',
    credentials: true,
  },
});

// Setup socket handlers
setupSocket(io);

// Make io available to controllers
app.set('io', io);

// Body parser middleware with increased limit for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'https://craftconnectt.netlify.app',
    credentials: true,
  })
);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/jobs', require('./routes/jobApplicationRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/artisans', require('./routes/artisanRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CraftConnect API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`
    ╔═══════════════════════════════════════╗
    ║   CraftConnect API Server Running     ║
    ║   Port: ${PORT}                          ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}            ║
    ╚═══════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
