const express = require('express');
const router = express.Router();
const blockfrostService = require('../services/blockfrostService');
const ipfsService = require('../services/ipfsService');

/**
 * @route GET /api/blockfrost/status
 * @desc Get Blockfrost service status
 * @access Public
 */
router.get('/status', async (req, res) => {
    try {
        const status = blockfrostService.getServiceStatus();
        
        // Test API connectivity
        let apiHealth = null;
        try {
            apiHealth = await blockfrostService.getHealth();
        } catch (error) {
            apiHealth = { error: error.message };
        }
        
        res.json({
            success: true,
            status: {
                ...status,
                apiHealth: apiHealth,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/blockfrost/network
 * @desc Get network information
 * @access Public
 */
router.get('/network', async (req, res) => {
    try {
        const networkInfo = await blockfrostService.getNetworkInfo();
        const latestBlock = await blockfrostService.getLatestBlock();
        const latestEpoch = await blockfrostService.getLatestEpoch();
        
        res.json({
            success: true,
            data: {
                network: networkInfo,
                latestBlock: latestBlock,
                latestEpoch: latestEpoch
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/blockfrost/address/:address
 * @desc Get address information
 * @access Public
 */
router.get('/address/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const addressInfo = await blockfrostService.getAddressInfo(address);
        const utxos = await blockfrostService.getAddressUtxos(address);
        
        // Calculate ADA balance
        const lovelace = addressInfo.amount?.find(a => a.unit === 'lovelace')?.quantity || 0;
        const ada = parseInt(lovelace) / 1000000;
        
        res.json({
            success: true,
            data: {
                address: address,
                balance: {
                    ada: ada,
                    lovelace: lovelace
                },
                utxos: utxos.length,
                assets: addressInfo.amount?.filter(a => a.unit !== 'lovelace') || [],
                fullInfo: addressInfo
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/blockfrost/pools
 * @desc Get stake pools
 * @access Public
 */
router.get('/pools', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const count = parseInt(req.query.count) || 10;
        const order = req.query.order || 'asc';
        
        const pools = await blockfrostService.getPools({ page, count, order });
        
        res.json({
            success: true,
            data: {
                pools: pools,
                pagination: {
                    page: page,
                    count: count,
                    order: order
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/blockfrost/transaction/:txHash
 * @desc Get transaction information
 * @access Public
 */
router.get('/transaction/:txHash', async (req, res) => {
    try {
        const { txHash } = req.params;
        
        const transaction = await blockfrostService.getTransaction(txHash);
        
        // Try to get metadata
        let metadata = null;
        try {
            metadata = await blockfrostService.getTransactionMetadata(txHash);
        } catch (metadataError) {
            // Metadata might not exist, that's okay
        }
        
        res.json({
            success: true,
            data: {
                transaction: transaction,
                metadata: metadata
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route POST /api/blockfrost/ipfs/upload
 * @desc Upload content to IPFS
 * @access Public
 */
router.post('/ipfs/upload', async (req, res) => {
    try {
        const { content, filename } = req.body;
        
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }
        
        const result = await ipfsService.addContent(content, filename || 'upload.txt');
        const pinResult = await ipfsService.pinContent(result.ipfs_hash);
        const gatewayUrl = ipfsService.getGatewayUrl(result.ipfs_hash);
        
        res.json({
            success: true,
            data: {
                ipfsHash: result.ipfs_hash,
                size: result.size,
                gatewayUrl: gatewayUrl,
                pinned: pinResult
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route POST /api/blockfrost/ipfs/metadata
 * @desc Upload JSON metadata to IPFS
 * @access Public
 */
router.post('/ipfs/metadata', async (req, res) => {
    try {
        const metadata = req.body;
        
        if (!metadata || typeof metadata !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Valid JSON metadata is required'
            });
        }
        
        const result = await ipfsService.uploadMetadata(metadata);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/blockfrost/test
 * @desc Run comprehensive Blockfrost test
 * @access Public
 */
router.get('/test', async (req, res) => {
    try {
        const testAddress = req.query.address;
        
        const results = await blockfrostService.runComprehensiveExample(testAddress);
        
        res.json({
            success: true,
            message: 'Blockfrost test completed successfully',
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;