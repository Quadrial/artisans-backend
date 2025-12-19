#!/usr/bin/env node

/**
 * Simple Blockfrost Test - Based on your original examples
 */

require('dotenv').config();
const Blockfrost = require("@blockfrost/blockfrost-js");

// Example 1: Main Blockfrost API (from your first code snippet)
async function testMainAPI() {
    console.log("🔗 Testing Main Blockfrost API");
    console.log("===============================");
    
    try {
        const API = new Blockfrost.BlockFrostAPI({
            projectId: process.env.BLOCKFROST_PROJECT_ID,
            network: process.env.CARDANO_NETWORK || 'preprod'
        });

        console.log("📊 Fetching blockchain data...");
        
        const latestBlock = await API.blocksLatest();
        const networkInfo = await API.network();
        const latestEpoch = await API.epochsLatest();
        const health = await API.health();
        // Use a known preprod testnet address or skip if none available
        let address = null;
        const testAddress = process.env.CARDANO_WALLET_ADDRESS || "addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7";
        
        try {
            address = await API.addresses(testAddress);
        } catch (addrError) {
            console.log("⚠️  Address test skipped:", addrError.message);
        }
        const pools = await API.pools({ page: 1, count: 10, order: "asc" });

        console.log("✅ Results:");
        console.log("pools", pools.length, "pools retrieved");
        if (address) {
            console.log("address", address.amount?.find(a => a.unit === 'lovelace')?.quantity || 0, "lovelace");
        } else {
            console.log("address", "test skipped");
        }
        console.log("networkInfo", networkInfo.network_info);
        console.log("latestEpoch", latestEpoch.epoch);
        console.log("latestBlock", latestBlock.height);
        console.log("health", health.is_healthy ? "✅ Healthy" : "❌ Unhealthy");
        
        return true;
    } catch (err) {
        console.log("❌ Main API Error:", err.message);
        return false;
    }
}

// Example 2: IPFS Test (from your second code snippet)
async function testIPFS() {
    console.log("\n🌐 Testing Blockfrost IPFS");
    console.log("===========================");
    
    try {
        // Check if IPFS project ID is available
        const ipfsProjectId = process.env.BLOCKFROST_IPFS_PROJECT_ID;
        
        if (!ipfsProjectId) {
            console.log("⚠️  No BLOCKFROST_IPFS_PROJECT_ID found. Skipping IPFS test.");
            console.log("   To test IPFS, get an IPFS project ID from https://blockfrost.io");
            console.log("   and add BLOCKFROST_IPFS_PROJECT_ID to your .env file");
            return true;
        }
        
        const IPFS = new Blockfrost.BlockFrostIPFS({
            projectId: ipfsProjectId
        });

        // Create a simple test file
        const fs = require('fs');
        const path = require('path');
        
        const testDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        const testFile = path.join(testDir, 'test.svg');
        const svgContent = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
  <text x="50" y="55" text-anchor="middle" fill="white">Test</text>
</svg>`;
        
        fs.writeFileSync(testFile, svgContent);
        
        console.log("📁 Adding file to IPFS...");
        const added = await IPFS.add(testFile);
        console.log("added", added);

        console.log("📌 Pinning content...");
        const pinned = await IPFS.pin(added.ipfs_hash);
        console.log("pinned", pinned);
        
        // Clean up
        fs.unlinkSync(testFile);
        
        console.log("✅ IPFS test completed successfully!");
        console.log(`🔗 IPFS Hash: ${added.ipfs_hash}`);
        console.log(`🌐 Gateway URL: https://ipfs.blockfrost.dev/ipfs/${added.ipfs_hash}`);
        
        return true;
    } catch (err) {
        console.log("❌ IPFS Error:", err.message);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log("🧪 SIMPLE BLOCKFROST TEST");
    console.log("=========================");
    console.log(`Network: ${process.env.CARDANO_NETWORK || 'preprod'}`);
    console.log(`Project ID: ${process.env.BLOCKFROST_PROJECT_ID ? 'Set' : 'Not Set'}`);
    console.log("");
    
    let allPassed = true;
    
    // Test 1: Main API
    const apiResult = await testMainAPI();
    if (!apiResult) allPassed = false;
    
    // Test 2: IPFS
    const ipfsResult = await testIPFS();
    if (!ipfsResult) allPassed = false;
    
    // Final result
    console.log("\n🏁 TEST RESULTS");
    console.log("================");
    
    if (allPassed) {
        console.log("✅ All tests passed!");
        console.log("🎉 Your Blockfrost integration is working!");
    } else {
        console.log("❌ Some tests failed!");
        console.log("🔧 Check your BLOCKFROST_PROJECT_ID in .env file");
    }
    
    return allPassed;
}

// Run if called directly
if (require.main === module) {
    runTests()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error("💥 Test failed:", error);
            process.exit(1);
        });
}

module.exports = { runTests, testMainAPI, testIPFS };