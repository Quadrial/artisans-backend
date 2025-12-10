const User = require('../models/User');
const diditService = require('../services/diditService');
const cardanoService = require('../services/cardanoService');

// @desc    Initiate KYC verification
// @route   POST /api/verification/initiate
// @access  Private
exports.initiateVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has pending or completed verification
    if (user.verification?.didit?.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    if (user.verification?.didit?.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Verification is already in progress'
      });
    }

    // Initiate Didit verification
    const userInfo = {
      fullName: user.profile?.fullName,
      email: user.email,
      phone: user.profile?.phone
    };

    const verificationResult = await diditService.initiateVerification(userId, userInfo);

    // Update user verification status
    await User.findByIdAndUpdate(userId, {
      'verification.didit.status': 'initiated',
      'verification.didit.sessionId': verificationResult.sessionId,
      'verification.didit.expiresAt': verificationResult.expiresAt,
      'verification.metadata.lastVerificationAttempt': new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Verification initiated successfully',
      verificationUrl: verificationResult.verificationUrl,
      sessionId: verificationResult.sessionId,
      expiresAt: verificationResult.expiresAt
    });
  } catch (error) {
    console.error('Initiate verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate verification',
      error: error.message
    });
  }
};

// @desc    Handle Didit webhook callback
// @route   POST /api/verification/webhook
// @access  Public (but secured with signature verification)
exports.handleWebhook = async (req, res) => {
  try {
    console.log('📨 Received Didit webhook');

    // Process webhook with Didit service
    const result = await diditService.processWebhookCallback(req.body);
    const { verificationResult, blockchainHash, blockchainTransaction } = result;

    // Update user verification data
    const updateData = {
      'verification.didit.status': verificationResult.status,
      'verification.didit.verificationLevel': verificationResult.verificationData.verificationLevel,
      'verification.didit.completedAt': verificationResult.verificationData.completedAt,
      'verification.didit.documentType': verificationResult.verificationData.documentType,
      'verification.didit.documentCountry': verificationResult.verificationData.documentCountry,
      'verification.didit.riskScore': verificationResult.verificationData.riskScore,
      'verification.didit.trustScore': diditService.calculateTrustScore(verificationResult.verificationData),
      
      // Blockchain data
      'verification.blockchain.hash': blockchainHash,
      'verification.blockchain.txHash': blockchainTransaction.txHash,
      'verification.blockchain.blockHeight': blockchainTransaction.blockHeight,
      'verification.blockchain.network': blockchainTransaction.metadata.network || 'testnet',
      'verification.blockchain.storedAt': new Date(),
      'verification.blockchain.verified': true,
      
      // Metadata
      'verification.metadata.ipAddress': verificationResult.metadata.ipAddress,
      'verification.metadata.userAgent': verificationResult.metadata.userAgent,
      'verification.metadata.deviceFingerprint': verificationResult.metadata.deviceFingerprint,
      
      // Update main verification status
      'isVerified': verificationResult.status === 'verified'
    };

    await User.findByIdAndUpdate(verificationResult.userId, updateData);

    console.log('✅ Verification data updated and stored on blockchain');

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
};

// @desc    Get user verification status
// @route   GET /api/verification/status
// @access  Private
exports.getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('verification isVerified');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let status = user.verification?.didit?.status || 'none';
    
    // Check if verification session has expired
    if (status === 'initiated' || status === 'pending') {
      const expiresAt = user.verification?.didit?.expiresAt;
      const lastAttempt = user.verification?.metadata?.lastVerificationAttempt;
      
      // Check if session expired (24 hours for initiated, 7 days for pending)
      const now = new Date();
      let isExpired = false;
      
      if (status === 'initiated' && expiresAt) {
        isExpired = now > new Date(expiresAt);
      } else if (status === 'initiated' && lastAttempt) {
        // If no expiresAt, check if more than 2 hours since last attempt
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        isExpired = new Date(lastAttempt) < twoHoursAgo;
      } else if (status === 'pending' && lastAttempt) {
        // Pending status expires after 7 days
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        isExpired = new Date(lastAttempt) < sevenDaysAgo;
      }
      
      // Reset expired sessions
      if (isExpired) {
        await User.findByIdAndUpdate(req.user.id, {
          'verification.didit.status': 'none',
          'verification.didit.sessionId': null,
          'verification.didit.expiresAt': null
        });
        status = 'none';
        console.log(`🔄 Reset expired verification session for user ${req.user.id}`);
      }
    }

    const verificationSummary = {
      status,
      isVerified: user.isVerified,
      level: user.verification?.didit?.verificationLevel,
      trustScore: user.verification?.didit?.trustScore || 0,
      completedAt: user.verification?.didit?.completedAt,
      expiresAt: user.verification?.didit?.expiresAt,
      blockchain: {
        verified: user.verification?.blockchain?.verified || false,
        hash: user.verification?.blockchain?.hash,
        txHash: user.verification?.blockchain?.txHash,
        network: user.verification?.blockchain?.network
      }
    };

    res.status(200).json({
      success: true,
      verification: verificationSummary
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status',
      error: error.message
    });
  }
};

// @desc    Simulate verification completion (Development only)
// @route   POST /api/verification/simulate-complete
// @access  Private
exports.simulateVerificationComplete = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has initiated verification
    if (user.verification?.didit?.status !== 'initiated' && user.verification?.didit?.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No active verification session found'
      });
    }

    // Simulate successful verification data
    const verificationData = {
      userId,
      status: 'verified',
      verificationData: {
        documentType: 'passport',
        documentCountry: 'NG',
        verificationLevel: 'enhanced',
        riskScore: 15,
        completedAt: new Date().toISOString(),
        diditTransactionId: `didit_sim_${Date.now()}`
      },
      metadata: {
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('User-Agent') || 'Unknown',
        deviceFingerprint: `fp_${Date.now()}`
      }
    };

    // Generate hash for blockchain storage
    const verificationHash = cardanoService.generateVerificationHash(verificationData);
    
    // Store hash on Cardano blockchain
    const blockchainMetadata = cardanoService.createVerificationMetadata(verificationData);
    const blockchainResult = await cardanoService.storeVerificationHash(verificationHash, blockchainMetadata);

    // Calculate trust score
    const trustScore = diditService.calculateTrustScore(verificationData.verificationData);

    // Update user verification data
    const updateData = {
      'verification.didit.status': 'verified',
      'verification.didit.verificationLevel': 'enhanced',
      'verification.didit.completedAt': new Date(),
      'verification.didit.documentType': 'passport',
      'verification.didit.documentCountry': 'NG',
      'verification.didit.riskScore': 15,
      'verification.didit.trustScore': trustScore,
      
      // Blockchain data
      'verification.blockchain.hash': verificationHash,
      'verification.blockchain.txHash': blockchainResult.txHash,
      'verification.blockchain.blockHeight': blockchainResult.blockHeight,
      'verification.blockchain.network': 'testnet',
      'verification.blockchain.storedAt': new Date(),
      'verification.blockchain.verified': true,
      
      // Metadata
      'verification.metadata.ipAddress': verificationData.metadata.ipAddress,
      'verification.metadata.userAgent': verificationData.metadata.userAgent,
      'verification.metadata.deviceFingerprint': verificationData.metadata.deviceFingerprint,
      
      // Update main verification status
      'isVerified': true
    };

    await User.findByIdAndUpdate(userId, updateData);

    console.log('✅ Simulated verification completion for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Verification completed successfully',
      verification: {
        status: 'verified',
        trustScore: trustScore,
        blockchainHash: verificationHash,
        txHash: blockchainResult.txHash
      }
    });
  } catch (error) {
    console.error('Simulate verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete verification',
      error: error.message
    });
  }
};

// @desc    Reset verification status
// @route   POST /api/verification/reset
// @access  Private
exports.resetVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow reset if not already verified
    if (user.verification?.didit?.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reset completed verification'
      });
    }

    // Reset verification status
    await User.findByIdAndUpdate(userId, {
      'verification.didit.status': 'none',
      'verification.didit.sessionId': null,
      'verification.didit.expiresAt': null,
      'verification.metadata.lastVerificationAttempt': new Date()
    });

    console.log(`🔄 Manual verification reset for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Verification status reset successfully'
    });
  } catch (error) {
    console.error('Reset verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset verification',
      error: error.message
    });
  }
};

// @desc    Verify blockchain hash
// @route   POST /api/verification/verify-blockchain
// @access  Private (Admin only)
exports.verifyBlockchainHash = async (req, res) => {
  try {
    const { userId, hash } = req.body;

    if (!userId || !hash) {
      return res.status(400).json({
        success: false,
        message: 'User ID and hash are required'
      });
    }

    // Verify hash on blockchain
    const blockchainResult = await cardanoService.verifyHashOnBlockchain(hash);

    if (!blockchainResult) {
      return res.status(404).json({
        success: false,
        message: 'Hash not found on blockchain'
      });
    }

    // Get user verification data
    const user = await User.findById(userId).select('verification username email');

    res.status(200).json({
      success: true,
      verification: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        blockchain: blockchainResult,
        storedHash: user.verification?.blockchain?.hash,
        hashMatch: user.verification?.blockchain?.hash === hash,
        verificationStatus: user.verification?.didit?.status
      }
    });
  } catch (error) {
    console.error('Verify blockchain hash error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify blockchain hash',
      error: error.message
    });
  }
};

// @desc    Get all verifications (Admin only)
// @route   GET /api/verification/admin/all
// @access  Private (Admin only)
exports.getAllVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = {};
    if (status) {
      query['verification.didit.status'] = status;
    }

    const users = await User.find(query)
      .select('username email verification isVerified createdAt')
      .sort('-verification.didit.completedAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    const verifications = users.map(user => ({
      userId: user._id,
      username: user.username,
      email: user.email,
      status: user.verification?.didit?.status || 'none',
      isVerified: user.isVerified,
      trustScore: user.verification?.didit?.trustScore || 0,
      completedAt: user.verification?.didit?.completedAt,
      blockchain: {
        hash: user.verification?.blockchain?.hash,
        txHash: user.verification?.blockchain?.txHash,
        verified: user.verification?.blockchain?.verified || false
      },
      createdAt: user.createdAt
    }));

    res.status(200).json({
      success: true,
      verifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verifications',
      error: error.message
    });
  }
};