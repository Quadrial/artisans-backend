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

    const verificationSummary = {
      status: user.verification?.didit?.status || 'none',
      isVerified: user.isVerified,
      level: user.verification?.didit?.verificationLevel,
      trustScore: user.verification?.didit?.trustScore || 0,
      completedAt: user.verification?.didit?.completedAt,
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