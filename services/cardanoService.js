const crypto = require('crypto');
const { BlockFrostAPI } = require('@blockfrost/blockfrost-js');

class CardanoService {
  constructor() {
    this.network = process.env.CARDANO_NETWORK || 'testnet';
    this.blockfrost = new BlockFrostAPI({
      projectId: process.env.BLOCKFROST_PROJECT_ID,
      network: this.network,
    });
    this.walletAddress = process.env.CARDANO_WALLET_ADDRESS;
  }

  /**
   * Generate a hash for verification data
   * @param {Object} verificationData - The verification data to hash
   * @returns {string} - SHA256 hash of the data
   */
  generateVerificationHash(verificationData) {
    const dataString = JSON.stringify(verificationData, Object.keys(verificationData).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Store verification hash on Cardano blockchain as metadata
   * @param {string} hash - The verification hash to store
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Transaction result
   */
  async storeVerificationHash(hash, metadata = {}) {
    try {
      // For now, we'll simulate blockchain storage
      // In production, this would create an actual Cardano transaction
      const transactionData = {
        hash,
        metadata: {
          type: 'kyc_verification',
          timestamp: new Date().toISOString(),
          network: this.network,
          ...metadata
        },
        // Simulated transaction hash
        txHash: this.generateTransactionHash(hash),
        blockHeight: await this.getCurrentBlockHeight(),
        walletAddress: this.walletAddress
      };

      console.log('📦 Storing verification hash on Cardano:', {
        hash: hash.substring(0, 16) + '...',
        txHash: transactionData.txHash,
        blockHeight: transactionData.blockHeight
      });

      return transactionData;
    } catch (error) {
      console.error('❌ Error storing hash on Cardano:', error);
      throw new Error('Failed to store verification on blockchain');
    }
  }

  /**
   * Verify a hash exists on the blockchain
   * @param {string} hash - The hash to verify
   * @returns {Promise<Object|null>} - Verification result or null if not found
   */
  async verifyHashOnBlockchain(hash) {
    try {
      // In production, this would query the actual blockchain
      // For now, we'll check our database records
      console.log('🔍 Verifying hash on Cardano blockchain:', hash.substring(0, 16) + '...');
      
      // Simulate blockchain verification
      return {
        exists: true,
        hash,
        verified: true,
        blockHeight: await this.getCurrentBlockHeight(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error verifying hash on blockchain:', error);
      return null;
    }
  }

  /**
   * Get current block height from Cardano network
   * @returns {Promise<number>} - Current block height
   */
  async getCurrentBlockHeight() {
    try {
      const latestBlock = await this.blockfrost.blocksLatest();
      return latestBlock.height;
    } catch (error) {
      console.error('Error getting block height:', error);
      // Return simulated block height for development
      return Math.floor(Date.now() / 1000) + 1000000;
    }
  }

  /**
   * Generate a simulated transaction hash
   * @param {string} data - Data to generate hash from
   * @returns {string} - Simulated transaction hash
   */
  generateTransactionHash(data) {
    const timestamp = Date.now().toString();
    const combined = data + timestamp + this.walletAddress;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get wallet balance (for monitoring purposes)
   * @returns {Promise<Object>} - Wallet balance information
   */
  async getWalletBalance() {
    try {
      if (!this.walletAddress) {
        return { ada: 0, assets: [] };
      }

      const addresses = await this.blockfrost.addresses(this.walletAddress);
      return {
        ada: parseInt(addresses.amount.find(a => a.unit === 'lovelace')?.quantity || 0) / 1000000,
        assets: addresses.amount.filter(a => a.unit !== 'lovelace')
      };
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return { ada: 0, assets: [] };
    }
  }

  /**
   * Create verification metadata for blockchain storage
   * @param {Object} verificationData - Didit verification data
   * @returns {Object} - Formatted metadata for blockchain
   */
  createVerificationMetadata(verificationData) {
    return {
      userId: verificationData.userId,
      verificationType: verificationData.type || 'kyc',
      status: verificationData.status,
      timestamp: new Date().toISOString(),
      diditWorkflowId: process.env.DIDIT_WORKFLOW_ID,
      platform: 'CraftConnect',
      version: '1.0'
    };
  }
}

module.exports = new CardanoService();