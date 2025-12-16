const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Admin credentials (in production, store in database with proper hashing)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'CraftConnect2024!',
  email: 'admin@craftconnect.com'
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Verify credentials
    if (username !== ADMIN_CREDENTIALS.username) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // In production, use bcrypt.compare for hashed passwords
    const isPasswordValid = password === ADMIN_CREDENTIALS.password;
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: 'admin',
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    console.log(`🔐 Admin login successful: ${username}`);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: 'admin',
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Verify admin token
// @route   GET /api/admin/verify
// @access  Private (Admin only)
exports.verifyAdmin = async (req, res) => {
  try {
    // Token verification is handled by middleware
    res.status(200).json({
      success: true,
      message: 'Admin token is valid',
      admin: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Admin verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify admin token',
      error: error.message
    });
  }
};

// @desc    Admin logout
// @route   POST /api/admin/logout
// @access  Private (Admin only)
exports.adminLogout = async (req, res) => {
  try {
    console.log(`🔓 Admin logout: ${req.user.username}`);
    
    res.status(200).json({
      success: true,
      message: 'Admin logout successful'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

// @desc    Debug database state
// @route   GET /api/admin/debug
// @access  Private (Admin only)
exports.debugDatabase = async (req, res) => {
  try {
    const User = require('../models/User');

    // Find all users with any verification status
    const allUsers = await User.find({
      $or: [
        { 'verification.didit.status': { $exists: true } },
        { 'documents.nin_number': { $exists: true } }
      ]
    }).select('username email verification documents');

    console.log('🔍 Debug: Found users with verification data:', allUsers.length);
    
    allUsers.forEach(user => {
      console.log(`User: ${user.username}`);
      console.log(`  Verification status: ${user.verification?.didit?.status}`);
      console.log(`  Has documents.nin_number: ${!!user.documents?.nin_number}`);
      console.log(`  Has verification.documents: ${!!user.verification?.documents}`);
    });

    res.status(200).json({
      success: true,
      users: allUsers.map(user => ({
        username: user.username,
        email: user.email,
        verificationStatus: user.verification?.didit?.status,
        hasDocuments: !!user.documents?.nin_number,
        hasVerificationDocuments: !!user.verification?.documents,
        documentsLocation: user.documents?.nin_number ? 'documents' : 
                          user.verification?.documents ? 'verification.documents' : 'none'
      }))
    });
  } catch (error) {
    console.error('Debug database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug database',
      error: error.message
    });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getDashboardStats = async (req, res) => {
  try {
    const User = require('../models/User');

    // Get verification statistics
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const pendingVerifications = await User.countDocuments({ 
      'verification.didit.status': 'pending',
      $or: [
        { 'documents.nin_number': { $exists: true } },
        { 'verification.documents.nin_number': { $exists: true } }
      ]
    });
    const rejectedVerifications = await User.countDocuments({ 'verification.didit.status': 'rejected' });

    // Get user role distribution
    const artisans = await User.countDocuments({ role: 'artisan' });
    const customers = await User.countDocuments({ role: 'customer' });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    
    const recentVerifications = await User.countDocuments({ 
      'verification.didit.completedAt': { $gte: thirtyDaysAgo },
      'verification.didit.status': 'verified'
    });

    // Calculate verification rate
    const verificationRate = totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : 0;

    const stats = {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        artisans,
        customers,
        recent: recentUsers
      },
      verifications: {
        pending: pendingVerifications,
        verified: verifiedUsers,
        rejected: rejectedVerifications,
        rate: parseFloat(verificationRate),
        recent: recentVerifications
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: error.message
    });
  }
};