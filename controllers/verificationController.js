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

// @desc    Submit verification documents
// @route   POST /api/verification/submit-documents
// @access  Private
exports.submitDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nin_number } = req.body;

    // Validate NIN number
    if (!nin_number || nin_number.length !== 11 || !/^\d{11}$/.test(nin_number)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 11-digit NIN number is required'
      });
    }

    // Check if NIN is already used by another user
    const existingNinUser = await User.findOne({
      'documents.nin_number': nin_number,
      _id: { $ne: userId } // Exclude current user
    });

    if (existingNinUser) {
      return res.status(400).json({
        success: false,
        message: 'This NIN number is already registered with another account'
      });
    }

    // Check if required files are uploaded
    if (!req.files || !req.files.nin_front || !req.files.nin_back || !req.files.selfie) {
      return res.status(400).json({
        success: false,
        message: 'All required documents are needed (NIN front, NIN back, selfie)'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store document information (in production, save files to cloud storage)
    const documentData = {
      nin_number,
      nin_front: {
        filename: req.files.nin_front.name,
        size: req.files.nin_front.size,
        mimetype: req.files.nin_front.mimetype,
        data: req.files.nin_front.data.toString('base64')
      },
      nin_back: {
        filename: req.files.nin_back.name,
        size: req.files.nin_back.size,
        mimetype: req.files.nin_back.mimetype,
        data: req.files.nin_back.data.toString('base64')
      },
      selfie: {
        filename: req.files.selfie.name,
        size: req.files.selfie.size,
        mimetype: req.files.selfie.mimetype,
        data: req.files.selfie.data.toString('base64')
      },
      submitted_at: new Date(),
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    };

    // Add video if provided (optional)
    if (req.files.video) {
      documentData.video = {
        filename: req.files.video.name,
        size: req.files.video.size,
        mimetype: req.files.video.mimetype,
        data: req.files.video.data.toString('base64')
      };
    }

    // Update user verification status
    await User.findByIdAndUpdate(userId, {
      'verification.didit.status': 'pending',
      'verification.didit.sessionId': `manual_${Date.now()}`,
      'verification.didit.completedAt': null,
      'documents': documentData, // Store documents at top level
      'verification.metadata.lastVerificationAttempt': new Date(),
      'verification.metadata.ipAddress': documentData.ip_address,
      'verification.metadata.userAgent': documentData.user_agent
    });

    console.log(`📄 Manual verification documents submitted for user ${userId} with NIN: ${nin_number.substring(0, 3)}***`);

    res.status(200).json({
      success: true,
      message: 'Documents submitted successfully for manual review',
      status: 'pending',
      estimated_review_time: '24-48 hours'
    });
  } catch (error) {
    console.error('Submit documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit documents',
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

// @desc    Get pending verifications for admin review
// @route   GET /api/verification/admin/pending
// @access  Private (Admin only)
exports.getPendingVerifications = async (req, res) => {
  try {
    const users = await User.find({
      'verification.didit.status': 'pending',
      $or: [
        { 'documents.nin_number': { $exists: true } },
        { 'verification.documents.nin_number': { $exists: true } }
      ]
    })
      .select('username email documents verification')
      .sort({ 'documents.submitted_at': -1 });

    const pendingVerifications = users.map(user => {
      // Check both locations for documents
      const docs = user.documents || user.verification?.documents;
      
      return {
        userId: user._id,
        username: user.username,
        email: user.email,
        submittedAt: docs?.submitted_at,
        documents: {
          nin_number: docs?.nin_number,
          nin_front: docs?.nin_front,
          nin_back: docs?.nin_back,
          selfie: docs?.selfie || docs?.face_photo, // Handle both field names
          video: docs?.video
        },
        metadata: {
          ipAddress: user.verification?.metadata?.ipAddress,
          userAgent: user.verification?.metadata?.userAgent
        }
      };
    });

    res.status(200).json({
      success: true,
      verifications: pendingVerifications
    });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending verifications',
      error: error.message
    });
  }
};

// @desc    Review verification (approve/reject)
// @route   POST /api/verification/admin/review
// @access  Private (Admin only)
exports.reviewVerification = async (req, res) => {
  try {
    const { userId, decision, notes } = req.body;
    const adminId = req.user.id;

    if (!userId || !decision || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Valid userId and decision (approve/reject) are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verification?.didit?.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending verification found for this user'
      });
    }

    let updateData = {
      'documents.reviewed_at': new Date(),
      'documents.reviewed_by': adminId,
      'documents.review_notes': notes || ''
    };

    if (decision === 'approve') {
      // Generate verification data for blockchain storage FIRST
      const verificationData = {
        userId,
        status: 'verified',
        verificationData: {
          documentType: 'nin',
          documentCountry: 'NG',
          verificationLevel: 'enhanced',
          riskScore: 10,
          completedAt: new Date().toISOString(),
          ninNumber: user.documents?.nin_number
        },
        metadata: {
          ipAddress: user.verification?.metadata?.ipAddress || 'unknown',
          userAgent: user.verification?.metadata?.userAgent || 'unknown',
          deviceFingerprint: `fp_${Date.now()}`
        }
      };

      // Generate hash for blockchain storage
      const verificationHash = cardanoService.generateVerificationHash(verificationData);
      
      console.log('📝 Verification data prepared:', {
        userId,
        hash: verificationHash.substring(0, 16) + '...'
      });

      // Check if wallet is ready for blockchain transactions
      console.log('🔍 Checking wallet readiness for user verification approval...');
      const readiness = await cardanoService.checkTransactionReadiness();
      
      console.log('📊 Wallet readiness check result:', {
        ready: readiness.ready,
        reason: readiness.reason,
        canTransact: readiness.canTransact,
        balance: readiness.balance
      });
      
      let blockchainResult;
      
      if (!readiness.ready) {
        console.error('❌ Wallet not ready for transactions:', readiness.reason);
        
        // For any wallet readiness issues, use simulation mode for now
        console.warn('⚠️  Wallet not ready - proceeding with simulated blockchain transaction');
        console.log('📋 Readiness issue:', readiness.reason);
        
        // Create simulated blockchain data
        const simulatedTxHash = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const currentBlock = Math.floor(Date.now() / 1000) + 1000000;
        
        blockchainResult = {
          hash: verificationHash,
          txHash: simulatedTxHash,
          blockHeight: currentBlock,
          network: process.env.CARDANO_NETWORK || 'preprod',
          timestamp: new Date().toISOString(),
          isReal: false,
          simulated: true,
          reason: `Wallet issue: ${readiness.reason}`
        };
        
        console.log('📦 Created simulated blockchain transaction:', {
          txHash: blockchainResult.txHash,
          blockHeight: blockchainResult.blockHeight,
          reason: blockchainResult.reason
        });
      } else {
        console.log('✅ Wallet ready for transactions:', readiness.balance);
      }
      
      // Only try to create real blockchain transaction if wallet is ready and we haven't already created a simulated one
      if (!blockchainResult) {
        console.log('🔗 Preparing real blockchain transaction for verification approval...');
        const blockchainMetadata = cardanoService.createVerificationMetadata(verificationData);
        try {
          console.log('🚀 Attempting to store verification hash on blockchain...');
          blockchainResult = await cardanoService.storeVerificationHash(verificationHash, blockchainMetadata);
          
          console.log('📦 Blockchain storage result:', {
            success: !!blockchainResult,
            isReal: blockchainResult?.isReal,
            txHash: blockchainResult?.txHash,
            network: blockchainResult?.network
          });
          
          console.log('✅ Blockchain transaction successful:', blockchainResult.txHash);
          
        } catch (blockchainError) {
          console.error('❌ Blockchain transaction failed:', {
            error: blockchainError.message,
            stack: blockchainError.stack,
            userId,
            hash: verificationHash.substring(0, 16) + '...'
          });
          
          // Create fallback simulated transaction
          console.warn('⚠️  Creating fallback simulated transaction due to blockchain error');
          const simulatedTxHash = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          const currentBlock = Math.floor(Date.now() / 1000) + 1000000;
          
          blockchainResult = {
            hash: verificationHash,
            txHash: simulatedTxHash,
            blockHeight: currentBlock,
            network: process.env.CARDANO_NETWORK || 'preprod',
            timestamp: new Date().toISOString(),
            isReal: false,
            simulated: true,
            reason: `Blockchain error: ${blockchainError.message}`
          };
          
          console.log('📦 Created fallback simulated transaction:', {
            txHash: blockchainResult.txHash,
            reason: blockchainResult.reason
          });
        }
      }

      // Calculate trust score
      const diditService = require('../services/diditService');
      const trustScore = diditService.calculateTrustScore(verificationData.verificationData);

      updateData = {
        ...updateData,
        'verification.didit.status': 'verified',
        'verification.didit.verificationLevel': 'enhanced',
        'verification.didit.completedAt': new Date(),
        'verification.didit.documentType': 'nin',
        'verification.didit.documentCountry': 'NG',
        'verification.didit.riskScore': 10,
        'verification.didit.trustScore': trustScore,
        
        // Blockchain data - use actual network from environment
        'verification.blockchain.hash': verificationHash,
        'verification.blockchain.txHash': blockchainResult.txHash,
        'verification.blockchain.blockHeight': blockchainResult.blockHeight,
        'verification.blockchain.network': blockchainResult.network || process.env.CARDANO_NETWORK || 'preprod',
        'verification.blockchain.storedAt': new Date(),
        'verification.blockchain.verified': true,
        'verification.blockchain.confirmed': blockchainResult.confirmed || false,
        'verification.blockchain.isReal': blockchainResult.isReal || false,
        'verification.blockchain.simulated': blockchainResult.simulated || false,
        'verification.blockchain.simulationReason': blockchainResult.reason || null,
        
        // Update main verification status
        'isVerified': true
      };

      console.log(`✅ Verification approved for user ${userId} by admin ${adminId} with blockchain TX: ${blockchainResult.txHash}`);
    } else {
      // Rejection
      updateData = {
        ...updateData,
        'verification.didit.status': 'rejected',
        'verification.didit.completedAt': new Date(),
        'isVerified': false
      };

      console.log(`❌ Verification rejected for user ${userId} by admin ${adminId}`);
    }

    await User.findByIdAndUpdate(userId, updateData);

    res.status(200).json({
      success: true,
      message: `Verification ${decision}d successfully`,
      decision,
      reviewedBy: adminId,
      reviewedAt: new Date()
    });
  } catch (error) {
    console.error('Review verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review verification',
      error: error.message
    });
  }
};

// @desc    Get wallet status and balance (Admin only)
// @route   GET /api/verification/admin/wallet-status
// @access  Private (Admin only)
exports.getWalletStatus = async (req, res) => {
  try {
    // Get wallet status
    const status = cardanoService.getWalletStatus();
    
    // Get wallet balance if initialized
    let balance = null;
    if (status.initialized) {
      balance = await cardanoService.getWalletBalance();
    }
    
    res.status(200).json({
      success: true,
      wallet: {
        ...status,
        balance
      }
    });
  } catch (error) {
    console.error('Get wallet status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet status',
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
      .select('username email verification isVerified createdAt documents')
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
      reviewedAt: user.documents?.reviewed_at,
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