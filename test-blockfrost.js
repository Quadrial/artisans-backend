#!/usr/bin/env node

/**
 * Blockfrost API and IPFS Test Script
 * 
 * This script demonstrates both the main Blockfrost API and IPFS functionality
 * using the examples you provided.
 */

require('dotenv').config();
const blockfrostService = require('./services/blockfrostService');
const ipfsService = require('./services/ipfsService');
const path = require('path');
const fs = require('fs');

// Test addresses (you can replace with your own)
const TEST_ADDRESSES = {
    // Example address from your code
    example: "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz",
    // Your wallet address from environment
    wallet: process.env.CARDANO_WALLET_ADDRESS
};

async function createTestFile() {
    const testDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-image.svg');
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
  <text x="50" y="55" text-anchor="middle" fill="white" font-family="Arial" font-size="12">
    CraftConnect Test
  </text>
</svg>`;
    
    fs.writeFileSync(testFilePath, svgContent);
    return testFilePath;
}

async function testBlockfrostAPI() {
    console.log("\n🔗 TESTING BLOCKFROST API");
    console.log("=========================");
    
    try {
        // Test service status
        const status = blockfrostService.getServiceStatus();
        console.log("📊 Service Status:", status);
        
        // Run comprehensive example (similar to your first code snippet)
        console.log("\n🚀 Running comprehensive blockchain example...");
        
        const results = await blockfrostService.runComprehensiveExample(
            TEST_ADDRESSES.example || TEST_ADDRESSES.wallet
        );
        
        // Display detailed results
        console.log("\n📋 DETAILED RESULTS:");
        console.log("====================");
        
        if (results.latestBlock) {
            console.log(`📦 Latest Block: ${results.latestBlock.height}`);
            console.log(`   Hash: ${results.latestBlock.hash}`);
            console.log(`   Time: ${new Date(results.latestBlock.time * 1000).toISOString()}`);
        }
        
        if (results.networkInfo) {
            console.log(`🌐 Network: ${results.networkInfo.network_info}`);
            console.log(`   Supply: ${results.networkInfo.supply?.circulating || 'Unknown'} ADA`);
        }
        
        if (results.latestEpoch) {
            console.log(`📅 Current Epoch: ${results.latestEpoch.epoch}`);
            console.log(`   Start Time: ${new Date(results.latestEpoch.start_time * 1000).toISOString()}`);
        }
        
        if (results.health) {
            console.log(`💚 Health: ${results.health.is_healthy ? 'Healthy' : 'Unhealthy'}`);
        }
        
        if (results.pools && results.pools.length > 0) {
            console.log(`🏊 Sample Pools (${results.pools.length}):`);
            results.pools.slice(0, 3).forEach((pool, index) => {
                console.log(`   ${index + 1}. ${pool}`);
            });
        }
        
        if (results.addressInfo) {
            const lovelace = results.addressInfo.amount?.find(a => a.unit === 'lovelace')?.quantity || 0;
            const ada = parseInt(lovelace) / 1000000;
            console.log(`🏠 Test Address Balance: ${ada} ADA`);
            console.log(`   UTXOs: ${results.addressUtxos?.length || 0}`);
            
            if (results.addressInfo.amount && results.addressInfo.amount.length > 1) {
                console.log(`   Native Assets: ${results.addressInfo.amount.length - 1}`);
            }
        }
        
        return results;
        
    } catch (error) {
        console.error("❌ Blockfrost API test failed:", error.message);
        throw error;
    }
}

async function testBlockfrostIPFS() {
    console.log("\n🌐 TESTING BLOCKFROST IPFS");
    console.log("===========================");
    
    try {
        // Test IPFS service status
        const ipfsStatus = blockfrostService.getServiceStatus();
        console.log("📊 IPFS Status:", {
            available: ipfsStatus.ipfsAvailable,
            projectId: ipfsStatus.ipfsProjectId
        });
        
        if (!ipfsStatus.ipfsAvailable) {
            console.log("ℹ️  IPFS not available. Set BLOCKFROST_IPFS_PROJECT_ID to enable.");
            return { available: false };
        }
        
        // Create test file
        console.log("📁 Creating test SVG file...");
        const testFilePath = await createTestFile();
        console.log(`   Created: ${testFilePath}`);
        
        // Test IPFS functionality (similar to your second code snippet)
        console.log("\n🚀 Running IPFS example...");
        
        const ipfsResults = await blockfrostService.testIPFS(testFilePath);
        
        if (ipfsResults.added) {
            console.log("✅ IPFS Test Results:");
            console.log(`   IPFS Hash: ${ipfsResults.added.ipfs_hash}`);
            console.log(`   Size: ${ipfsResults.added.size} bytes`);
            console.log(`   Gateway URL: ${ipfsResults.gatewayUrl}`);
            
            if (ipfsResults.pinned) {
                console.log(`   Pinned: ✅ ${ipfsResults.pinned.ipfs_hash}`);
            }
        }
        
        // Test with our enhanced IPFS service
        console.log("\n🔧 Testing enhanced IPFS service...");
        
        try {
            const enhancedResult = await ipfsService.addFile(testFilePath);
            console.log("✅ Enhanced IPFS Service:");
            console.log(`   Hash: ${enhancedResult.ipfs_hash}`);
            console.log(`   Size: ${enhancedResult.size} bytes`);
            
            const pinResult = await ipfsService.pinContent(enhancedResult.ipfs_hash);
            console.log(`   Pinned: ✅ ${pinResult.ipfs_hash}`);
            
            const gatewayUrl = ipfsService.getGatewayUrl(enhancedResult.ipfs_hash);
            console.log(`   Gateway: ${gatewayUrl}`);
            
        } catch (enhancedError) {
            console.warn("⚠️  Enhanced IPFS service test failed:", enhancedError.message);
        }
        
        // Clean up test file
        try {
            fs.unlinkSync(testFilePath);
            console.log("🧹 Cleaned up test file");
        } catch (cleanupError) {
            console.warn("⚠️  Could not clean up test file:", cleanupError.message);
        }
        
        return ipfsResults;
        
    } catch (error) {
        console.error("❌ IPFS test failed:", error.message);
        throw error;
    }
}

async function testMetadataUpload() {
    console.log("\n📄 TESTING METADATA UPLOAD");
    console.log("============================");
    
    try {
        const testMetadata = {
            name: "CraftConnect Test Profile",
            description: "Test profile for CraftConnect platform",
            image: "ipfs://QmTestHash",
            attributes: [
                {
                    trait_type: "Platform",
                    value: "CraftConnect"
                },
                {
                    trait_type: "Type",
                    value: "Artisan Profile"
                },
                {
                    trait_type: "Verified",
                    value: "true"
                }
            ],
            created: new Date().toISOString(),
            version: "1.0"
        };
        
        console.log("📝 Uploading test metadata to IPFS...");
        const result = await ipfsService.uploadMetadata(testMetadata);
        
        console.log("✅ Metadata Upload Results:");
        console.log(`   IPFS Hash: ${result.ipfsHash}`);
        console.log(`   Gateway URL: ${result.url}`);
        console.log(`   Pinned: ${result.pinned ? '✅' : '❌'}`);
        
        return result;
        
    } catch (error) {
        console.error("❌ Metadata upload test failed:", error.message);
        throw error;
    }
}

async function runAllTests() {
    console.log("🧪 BLOCKFROST COMPREHENSIVE TEST SUITE");
    console.log("=======================================");
    console.log(`Network: ${process.env.CARDANO_NETWORK || 'preprod'}`);
    console.log(`Project ID: ${process.env.BLOCKFROST_PROJECT_ID ? 'Set' : 'Not Set'}`);
    console.log(`IPFS Project ID: ${process.env.BLOCKFROST_IPFS_PROJECT_ID ? 'Set' : 'Not Set'}`);
    
    const results = {};
    
    try {
        // Test 1: Main Blockfrost API
        results.api = await testBlockfrostAPI();
        
        // Test 2: IPFS functionality
        results.ipfs = await testBlockfrostIPFS();
        
        // Test 3: Metadata upload
        results.metadata = await testMetadataUpload();
        
        console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
        console.log("====================================");
        
        return results;
        
    } catch (error) {
        console.error("\n💥 TEST SUITE FAILED:", error.message);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests()
        .then(results => {
            console.log("\n✅ Test suite completed successfully");
            process.exit(0);
        })
        .catch(error => {
            console.error("\n❌ Test suite failed:", error.message);
            process.exit(1);
        });
}

module.exports = {
    runAllTests,
    testBlockfrostAPI,
    testBlockfrostIPFS,
    testMetadataUpload
};