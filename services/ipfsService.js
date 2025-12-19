const Blockfrost = require("@blockfrost/blockfrost-js");
const fs = require('fs');
const path = require('path');

class IPFSService {
    constructor() {
        // Initialize Blockfrost IPFS client
        this.IPFS = new Blockfrost.BlockFrostIPFS({
            projectId: process.env.BLOCKFROST_IPFS_PROJECT_ID || process.env.BLOCKFROST_PROJECT_ID
        });
    }

    /**
     * Add file to IPFS
     * @param {string} filePath - Path to the file to upload
     * @returns {Promise<Object>} IPFS hash and metadata
     */
    async addFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            const added = await this.IPFS.add(filePath);
            console.log("File added to IPFS:", added);
            return added;
        } catch (error) {
            console.error("Error adding file to IPFS:", error);
            throw error;
        }
    }

    /**
     * Add buffer/content to IPFS
     * @param {Buffer|string} content - Content to upload
     * @param {string} filename - Optional filename
     * @returns {Promise<Object>} IPFS hash and metadata
     */
    async addContent(content, filename = 'content') {
        try {
            // Create temporary file
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempFilePath = path.join(tempDir, filename);
            fs.writeFileSync(tempFilePath, content);

            const added = await this.IPFS.add(tempFilePath);
            
            // Clean up temp file
            fs.unlinkSync(tempFilePath);
            
            console.log("Content added to IPFS:", added);
            return added;
        } catch (error) {
            console.error("Error adding content to IPFS:", error);
            throw error;
        }
    }

    /**
     * Pin content to IPFS
     * @param {string} ipfsHash - IPFS hash to pin
     * @returns {Promise<Object>} Pin result
     */
    async pinContent(ipfsHash) {
        try {
            const pinned = await this.IPFS.pin(ipfsHash);
            console.log("Content pinned to IPFS:", pinned);
            return pinned;
        } catch (error) {
            console.error("Error pinning content to IPFS:", error);
            throw error;
        }
    }

    /**
     * Get pinned objects
     * @returns {Promise<Array>} List of pinned objects
     */
    async getPinnedObjects() {
        try {
            const pinned = await this.IPFS.listPins();
            return pinned;
        } catch (error) {
            console.error("Error getting pinned objects:", error);
            throw error;
        }
    }

    /**
     * Remove pin from IPFS (Note: Blockfrost IPFS doesn't support unpinning via API)
     * @param {string} ipfsHash - IPFS hash to unpin
     * @returns {Promise<Object>} Unpin result
     */
    async unpinContent(ipfsHash) {
        try {
            // Blockfrost IPFS doesn't support unpinning via API
            // This would need to be done through the Blockfrost dashboard
            console.warn("Unpinning not supported via Blockfrost IPFS API. Use dashboard instead.");
            return {
                ipfs_hash: ipfsHash,
                message: "Unpinning not supported via API. Use Blockfrost dashboard."
            };
        } catch (error) {
            console.error("Error unpinning content:", error);
            throw error;
        }
    }

    /**
     * Get IPFS gateway URL for a hash
     * @param {string} ipfsHash - IPFS hash
     * @returns {string} Gateway URL
     */
    getGatewayUrl(ipfsHash) {
        return `https://ipfs.blockfrost.dev/ipfs/${ipfsHash}`;
    }

    /**
     * Upload profile image and return IPFS hash
     * @param {string} imagePath - Path to image file
     * @returns {Promise<Object>} Upload result with IPFS hash and URL
     */
    async uploadProfileImage(imagePath) {
        try {
            const added = await this.addFile(imagePath);
            const pinned = await this.pinContent(added.ipfs_hash);
            
            return {
                ipfsHash: added.ipfs_hash,
                url: this.getGatewayUrl(added.ipfs_hash),
                size: added.size,
                pinned: pinned
            };
        } catch (error) {
            console.error("Error uploading profile image:", error);
            throw error;
        }
    }

    /**
     * Upload JSON metadata to IPFS
     * @param {Object} metadata - JSON metadata object
     * @returns {Promise<Object>} Upload result
     */
    async uploadMetadata(metadata) {
        try {
            const jsonContent = JSON.stringify(metadata, null, 2);
            const added = await this.addContent(jsonContent, 'metadata.json');
            const pinned = await this.pinContent(added.ipfs_hash);
            
            return {
                ipfsHash: added.ipfs_hash,
                url: this.getGatewayUrl(added.ipfs_hash),
                metadata: metadata,
                pinned: pinned
            };
        } catch (error) {
            console.error("Error uploading metadata:", error);
            throw error;
        }
    }
}

module.exports = new IPFSService();