#!/usr/bin/env node

/**
 * Basic Blockfrost Test - Just the essential API calls
 */

require('dotenv').config();
const Blockfrost = require("@blockfrost/blockfrost-js");

async function basicTest() {
    console.log("🔗 BASIC BLOCKFROST API TEST");
    console.log("=============================");
    console.log(`Network: ${process.env.CARDANO_NETWORK || 'preprod'}`);
    console.log(`Project ID: ${process.env.BLOCKFROST_PROJECT_ID ? 'Set' : 'Not Set'}`);
    console.log("");
    
    try {
        const API = new Blockfrost.BlockFrostAPI({
            projectId: process.env.BLOCKFROST_PROJECT_ID,
            network: process.env.CARDANO_NETWORK || 'preprod'
        });

        console.log("1. 🏥 Testing API Health...");
        const health = await API.health();
        console.log("   ✅ Health:", health.is_healthy ? "Healthy" : "Unhealthy");

        console.log("2. 🌐 Getting Network Info...");
        const networkInfo = await API.network();
        console.log("   ✅ Network:", networkInfo.network_info);

        console.log("3. 📦 Getting Latest Block...");
        const latestBlock = await API.blocksLatest();
        console.log("   ✅ Block Height:", latestBlock.height);
        console.log("   ✅ Block Hash:", latestBlock.hash.substring(0, 16) + "...");

        console.log("4. 📅 Getting Latest Epoch...");
        const latestEpoch = await API.epochsLatest();
        console.log("   ✅ Epoch:", latestEpoch.epoch);

        console.log("5. 🏊 Getting Stake Pools...");
        const pools = await API.pools({ page: 1, count: 5, order: "asc" });
        console.log("   ✅ Pools Retrieved:", pools.length);

        console.log("\n🎉 ALL BASIC TESTS PASSED!");
        console.log("Your Blockfrost API integration is working correctly!");
        
        return true;
        
    } catch (error) {
        console.log("\n❌ TEST FAILED:", error.message);
        console.log("\n🔧 Troubleshooting:");
        console.log("   1. Check your BLOCKFROST_PROJECT_ID in .env");
        console.log("   2. Make sure it's for the correct network (preprod/mainnet)");
        console.log("   3. Verify the API key is active on blockfrost.io");
        
        return false;
    }
}

// Run the test
if (require.main === module) {
    basicTest()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error("💥 Unexpected error:", error);
            process.exit(1);
        });
}

module.exports = { basicTest };