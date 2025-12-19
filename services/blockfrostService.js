const Blockfrost = require("@blockfrost/blockfrost-js");

class BlockfrostService {
    constructor() {
        // Initialize main Blockfrost API
        this.API = new Blockfrost.BlockFrostAPI({
            projectId: process.env.BLOCKFROST_PROJECT_ID,
            network: process.env.CARDANO_NETWORK || 'preprod'
        });

        // Initialize IPFS service (if IPFS project ID is available)
        if (process.env.BLOCKFROST_IPFS_PROJECT_ID) {
            this.IPFS = new Blockfrost.BlockFrostIPFS({
                projectId: process.env.BLOCKFROST_IPFS_PROJECT_ID
            });
        }

        this.network = process.env.CARDANO_NETWORK || 'preprod';
    }

    // ========== BLOCKCHAIN API METHODS ==========

    /**
     * Get latest block information
     * @returns {Promise<Object>} Latest block data
     */
    async getLatestBlock() {
        try {
            const latestBlock = await this.API.blocksLatest();
            return latestBlock;
        } catch (error) {
            console.error("Error getting latest block:", error);
            throw error;
        }
    }

    /**
     * Get network information
     * @returns {Promise<Object>} Network information
     */
    async getNetworkInfo() {
        try {
            const networkInfo = await this.API.network();
            return networkInfo;
        } catch (error) {
            console.error("Error getting network info:", error);
            throw error;
        }
    }

    /**
     * Get latest epoch information
     * @returns {Promise<Object>} Latest epoch data
     */
    async getLatestEpoch() {
        try {
            const latestEpoch = await this.API.epochsLatest();
            return latestEpoch;
        } catch (error) {
            console.error("Error getting latest epoch:", error);
            throw error;
        }
    }

    /**
     * Get API health status
     * @returns {Promise<Object>} Health status
     */
    async getHealth() {
        try {
            const health = await this.API.health();
            return health;
        } catch (error) {
            console.error("Error getting health status:", error);
            throw error;
        }
    }

    /**
     * Get address information
     * @param {string} address - Cardano address
     * @returns {Promise<Object>} Address information
     */
    async getAddressInfo(address) {
        try {
            const addressInfo = await this.API.addresses(address);
            return addressInfo;
        } catch (error) {
            console.error("Error getting address info:", error);
            throw error;
        }
    }

    /**
     * Get address UTXOs
     * @param {string} address - Cardano address
     * @returns {Promise<Array>} UTXOs for the address
     */
    async getAddressUtxos(address) {
        try {
            const utxos = await this.API.addressesUtxos(address);
            return utxos;
        } catch (error) {
            console.error("Error getting address UTXOs:", error);
            throw error;
        }
    }

    /**
     * Get stake pools with pagination
     * @param {Object} options - Pagination options
     * @returns {Promise<Array>} List of stake pools
     */
    async getPools(options = { page: 1, count: 10, order: "asc" }) {
        try {
            const pools = await this.API.pools(options);
            return pools;
        } catch (error) {
            console.error("Error getting pools:", error);
            throw error;
        }
    }

    /**
     * Get transaction information
     * @param {string} txHash - Transaction hash
     * @returns {Promise<Object>} Transaction data
     */
    async getTransaction(txHash) {
        try {
            const transaction = await this.API.txs(txHash);
            return transaction;
        } catch (error) {
            console.error("Error getting transaction:", error);
            throw error;
        }
    }

    /**
     * Get transaction metadata
     * @param {string} txHash - Transaction hash
     * @returns {Promise<Array>} Transaction metadata
     */
    async getTransactionMetadata(txHash) {
        try {
            const metadata = await this.API.txsMetadata(txHash);
            return metadata;
        } catch (error) {
            console.error("Error getting transaction metadata:", error);
            throw error;
        }
    }

    /**
     * Submit a transaction
     * @param {Uint8Array} txBytes - Transaction bytes
     * @returns {Promise<string>} Transaction hash
     */
    async submitTransaction(txBytes) {
        try {
            const result = await this.API.txSubmit(txBytes);
            return result;
        } catch (error) {
            console.error("Error submitting transaction:", error);
            throw error;
        }
    }

    /**
     * Get protocol parameters
     * @returns {Promise<Object>} Protocol parameters
     */
    async getProtocolParameters() {
        try {
            const params = await this.API.epochsLatestParameters();
            return params;
        } catch (error) {
            console.error("Error getting protocol parameters:", error);
            throw error;
        }
    }

    // ========== IPFS METHODS ==========

    /**
     * Add file to IPFS
     * @param {string} filePath - Path to file
     * @returns {Promise<Object>} IPFS result
     */
    async addFileToIPFS(filePath) {
        try {
            if (!this.IPFS) {
                throw new Error("IPFS service not initialized. Please set BLOCKFROST_IPFS_PROJECT_ID");
            }
            const result = await this.IPFS.add(filePath);
            return result;
        } catch (error) {
            console.error("Error adding file to IPFS:", error);
            throw error;
        }
    }

    /**
     * Pin content to IPFS
     * @param {string} ipfsHash - IPFS hash to pin
     * @returns {Promise<Object>} Pin result
     */
    async pinToIPFS(ipfsHash) {
        try {
            if (!this.IPFS) {
                throw new Error("IPFS service not initialized. Please set BLOCKFROST_IPFS_PROJECT_ID");
            }
            const result = await this.IPFS.pin(ipfsHash);
            return result;
        } catch (error) {
            console.error("Error pinning to IPFS:", error);
            throw error;
        }
    }

    /**
     * Get IPFS gateway URL
     * @param {string} ipfsHash - IPFS hash
     * @returns {string} Gateway URL
     */
    getIPFSGatewayUrl(ipfsHash) {
        return `https://ipfs.blockfrost.dev/ipfs/${ipfsHash}`;
    }

    // ========== UTILITY METHODS ==========

    /**
     * Run comprehensive example showcasing various Blockfrost features
     * @param {string} testAddress - Optional test address
     * @returns {Promise<Object>} Example results
     */
    async runComprehensiveExample(testAddress = null) {
        try {
            console.log("🚀 Running Blockfrost comprehensive example...");
            
            const results = {};

            // Get basic blockchain info
            console.log("📊 Fetching blockchain information...");
            results.latestBlock = await this.getLatestBlock();
            results.networkInfo = await this.getNetworkInfo();
            results.latestEpoch = await this.getLatestEpoch();
            results.health = await this.getHealth();
            results.protocolParams = await this.getProtocolParameters();

            console.log("✅ Basic blockchain info retrieved");

            // Get pools information
            console.log("🏊 Fetching stake pools...");
            results.pools = await this.getPools({ page: 1, count: 5, order: "asc" });
            console.log("✅ Stake pools retrieved");

            // Test address if provided
            if (testAddress) {
                console.log(`🏠 Fetching address information for: ${testAddress}`);
                try {
                    results.addressInfo = await this.getAddressInfo(testAddress);
                    results.addressUtxos = await this.getAddressUtxos(testAddress);
                    console.log("✅ Address information retrieved");
                } catch (addressError) {
                    console.warn("⚠️  Could not fetch address info:", addressError.message);
                    results.addressError = addressError.message;
                }
            }

            // Display results
            console.log("\n📋 RESULTS SUMMARY:");
            console.log("==================");
            console.log(`Network: ${results.networkInfo?.network_info || 'Unknown'}`);
            console.log(`Latest Block: ${results.latestBlock?.height || 'Unknown'}`);
            console.log(`Latest Epoch: ${results.latestEpoch?.epoch || 'Unknown'}`);
            console.log(`Health Status: ${results.health?.is_healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
            console.log(`Pools Retrieved: ${results.pools?.length || 0}`);
            
            if (testAddress && results.addressInfo) {
                const lovelace = results.addressInfo.amount?.find(a => a.unit === 'lovelace')?.quantity || 0;
                const ada = parseInt(lovelace) / 1000000;
                console.log(`Address Balance: ${ada} ADA (${lovelace} lovelace)`);
                console.log(`Address UTXOs: ${results.addressUtxos?.length || 0}`);
            }

            return results;

        } catch (error) {
            console.error("❌ Error running comprehensive example:", error);
            throw error;
        }
    }

    /**
     * Test IPFS functionality (if available)
     * @param {string} testFilePath - Optional test file path
     * @returns {Promise<Object>} IPFS test results
     */
    async testIPFS(testFilePath = null) {
        try {
            if (!this.IPFS) {
                return {
                    available: false,
                    message: "IPFS service not available. Set BLOCKFROST_IPFS_PROJECT_ID to enable."
                };
            }

            console.log("🌐 Testing IPFS functionality...");
            
            const results = { available: true };

            if (testFilePath) {
                console.log(`📁 Adding file to IPFS: ${testFilePath}`);
                results.added = await this.addFileToIPFS(testFilePath);
                
                console.log(`📌 Pinning content: ${results.added.ipfs_hash}`);
                results.pinned = await this.pinToIPFS(results.added.ipfs_hash);
                
                results.gatewayUrl = this.getIPFSGatewayUrl(results.added.ipfs_hash);
                
                console.log("✅ IPFS test completed successfully");
                console.log(`🔗 IPFS Hash: ${results.added.ipfs_hash}`);
                console.log(`🌐 Gateway URL: ${results.gatewayUrl}`);
            } else {
                console.log("ℹ️  No test file provided for IPFS test");
                results.message = "IPFS service available but no test file provided";
            }

            return results;

        } catch (error) {
            console.error("❌ Error testing IPFS:", error);
            return {
                available: true,
                error: error.message
            };
        }
    }

    /**
     * Get service status and configuration
     * @returns {Object} Service status
     */
    getServiceStatus() {
        return {
            network: this.network,
            apiAvailable: !!this.API,
            ipfsAvailable: !!this.IPFS,
            projectId: process.env.BLOCKFROST_PROJECT_ID ? 'Set' : 'Not Set',
            ipfsProjectId: process.env.BLOCKFROST_IPFS_PROJECT_ID ? 'Set' : 'Not Set'
        };
    }
}

module.exports = new BlockfrostService();