const crypto = require('crypto');
const cardanoService = require('./cardanoService');

class DiditService {
  constructor() {
    this.apiKey = process.env.DIDIT_API_KEY;
    this.workflowUrl = 'https://verify.didit.me/verify/7_vdRkScbyHpB6fuGz-thw';
    this.webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;
  }

  /**
   * Initiate KYC verification process
   * @param {string} userId - User ID
   * @param {Object} userInfo - User information
   * @returns {Object} - Verification initiation result
   */
  async initiateVerification(userId, userInfo = {}) {
    try {
      console.log('🚀 Initiating Didit KYC verification for user:', userId);

      // In production, this would make actual API call to Didit
      const verificationSession = {
        sessionId: this.generateSessionId(),
        userId,
        workflowUrl: this.workflowUrl,
        status: 'initiated',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        userInfo
      };

      return {
        success: true,
        sessionId: verificationSession.sessionId,
        verificationUrl: this.workflowUrl,
        expiresAt: verificationSession.expiresAt,
        message: 'Verification session created successfully'
      };
    } catch (error) {
      console.error('❌ Error initiating Didit verification:', error);
      throw new Error('Failed to initiate verification process');
    }
  }

  /**
   * Process Didit webhook callback
   * @param {Object} webhookData - Webhook payload from Didit
   * @returns {Object} - Processing result with blockchain hash
   */
  async processWebhookCallback(webhookData) {
    try {
      console.log('📨 Processing Didit webhook callback');

      // Verify webhook signature (in production)
      if (!this.verifyWebhookSignature(webhookData)) {
        throw new Error('Invalid webhook signature');
      }

      const verificationResult = {
        userId: webhookData.userId,
        sessionId: webhookData.sessionId,
        status: webhookData.status, // 'verified', 'rejected', 'pending'
        verificationData: {
          documentType: webhookData.documentType,
          documentCountry: webhookData.documentCountry,
          verificationLevel: webhookData.verificationLevel,
          riskScore: webhookData.riskScore,
          completedAt: new Date().toISOString(),
          diditTransactionId: webhookData.transactionId
        },
        metadata: {
          ipAddress: webhookData.ipAddress,
          userAgent: webhookData.userAgent,
          deviceFingerprint: webhookData.deviceFingerprint
        }
      };

      // Generate hash for blockchain storage
      const verificationHash = cardanoService.generateVerificationHash(verificationResult);
      
      // Store hash on Cardano blockchain
      const blockchainMetadata = cardanoService.createVerificationMetadata(verificationResult);
      const blockchainResult = await cardanoService.storeVerificationHash(verificationHash, blockchainMetadata);

      return {
        success: true,
        verificationResult,
        blockchainHash: verificationHash,
        blockchainTransaction: blockchainResult,
        message: 'Verification processed and stored on blockchain'
      };
    } catch (error) {
      console.error('❌ Error processing Didit webhook:', error);
      throw error;
    }
  }

  /**
   * Get verification status
   * @param {string} userId - User ID
   * @returns {Object} - Current verification status
   */
  async getVerificationStatus(userId) {
    try {
      // In production, this would query Didit API
      return {
        userId,
        status: 'pending', // 'pending', 'verified', 'rejected'
        lastUpdated: new Date().toISOString(),
        verificationLevel: null,
        blockchainHash: null
      };
    } catch (error) {
      console.error('❌ Error getting verification status:', error);
      throw new Error('Failed to get verification status');
    }
  }

  /**
   * Verify webhook signature
   * @param {Object} webhookData - Webhook payload
   * @returns {boolean} - Signature validity
   */
  verifyWebhookSignature(webhookData) {
    if (!this.webhookSecret) {
      console.warn('⚠️ Webhook secret not configured, skipping signature verification');
      return true; // Allow in development
    }

    try {
      const signature = webhookData.signature;
      const payload = JSON.stringify(webhookData.payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Generate unique session ID
   * @returns {string} - Unique session identifier
   */
  generateSessionId() {
    return 'didit_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create verification summary for user display
   * @param {Object} verificationData - Verification data
   * @returns {Object} - User-friendly verification summary
   */
  createVerificationSummary(verificationData) {
    return {
      status: verificationData.status,
      level: this.getVerificationLevelDisplay(verificationData.verificationLevel),
      completedAt: verificationData.completedAt,
      documentVerified: verificationData.documentType ? true : false,
      blockchainVerified: verificationData.blockchainHash ? true : false,
      trustScore: this.calculateTrustScore(verificationData)
    };
  }

  /**
   * Get user-friendly verification level display
   * @param {string} level - Verification level
   * @returns {string} - Display text
   */
  getVerificationLevelDisplay(level) {
    const levels = {
      'basic': 'Basic Identity',
      'enhanced': 'Enhanced Verification',
      'premium': 'Premium KYC'
    };
    return levels[level] || 'Standard';
  }

  /**
   * Calculate trust score based on verification data
   * @param {Object} verificationData - Verification data
   * @returns {number} - Trust score (0-100)
   */
  calculateTrustScore(verificationData) {
    let score = 0;
    
    if (verificationData.status === 'verified') score += 40;
    if (verificationData.documentType) score += 20;
    if (verificationData.riskScore && verificationData.riskScore < 30) score += 20;
    if (verificationData.blockchainHash) score += 20;
    
    return Math.min(score, 100);
  }
}

module.exports = new DiditService();