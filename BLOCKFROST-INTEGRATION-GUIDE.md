# Blockfrost Integration Guide

This guide shows you how to use the Blockfrost API and IPFS functionality in your CraftConnect application, based on the code examples you provided.

## ✅ Current Status

Your Blockfrost integration is **working correctly**! The basic API test passed successfully.

## 🔧 Setup Complete

- ✅ Blockfrost API client configured
- ✅ Environment variables set
- ✅ Services implemented
- ✅ API routes created
- ✅ Test scripts ready

## 📚 Available Services

### 1. Main Blockfrost API Service (`blockfrostService.js`)

Based on your first code example:

```javascript
const Blockfrost = require("@blockfrost/blockfrost-js");
const API = new Blockfrost.BlockFrostAPI({
    projectId: "YOUR API KEY HERE",
    network: "preprod" // or "mainnet"
});
```

**Available Methods:**
- `getLatestBlock()` - Get latest block information
- `getNetworkInfo()` - Get network information  
- `getLatestEpoch()` - Get latest epoch information
- `getHealth()` - Get API health status
- `getAddressInfo(address)` - Get address information
- `getPools(options)` - Get stake pools with pagination
- `getTransaction(txHash)` - Get transaction information
- `submitTransaction(txBytes)` - Submit a transaction

### 2. IPFS Service (`ipfsService.js`)

Based on your second code example:

```javascript
const Blockfrost = require("@blockfrost/blockfrost-js");
const IPFS = new Blockfrost.BlockFrostIPFS({
    projectId: "YOUR IPFS KEY HERE"
});
```

**Available Methods:**
- `addFile(filePath)` - Add file to IPFS
- `addContent(content, filename)` - Add content to IPFS
- `pinContent(ipfsHash)` - Pin content to IPFS
- `uploadProfileImage(imagePath)` - Upload and pin profile images
- `uploadMetadata(metadata)` - Upload JSON metadata to IPFS

## 🚀 Usage Examples

### Example 1: Basic Blockchain Data (Your First Example)

```javascript
const blockfrostService = require('./services/blockfrostService');

async function runExample() {
    try {
        const latestBlock = await blockfrostService.getLatestBlock();
        const networkInfo = await blockfrostService.getNetworkInfo();
        const latestEpoch = await blockfrostService.getLatestEpoch();
        const health = await blockfrostService.getHealth();
        const pools = await blockfrostService.getPools({ page: 1, count: 10, order: "asc" });

        console.log("pools", pools);
        console.log("networkInfo", networkInfo);
        console.log("latestEpoch", latestEpoch);
        console.log("latestBlock", latestBlock);
        console.log("health", health);
    } catch (err) {
        console.log("error", err);
    }
}
```

### Example 2: IPFS Upload (Your Second Example)

```javascript
const ipfsService = require('./services/ipfsService');

async function runExample() {
    try {
        // Upload a file
        const added = await ipfsService.addFile('./path/to/img.svg');
        console.log("added", added);

        // Pin the content
        const pinned = await ipfsService.pinContent(added.ipfs_hash);
        console.log("pinned", pinned);
        
        // Get gateway URL
        const url = ipfsService.getGatewayUrl(added.ipfs_hash);
        console.log("Gateway URL:", url);
    } catch (err) {
        console.log("error", err);
    }
}
```

## 🌐 API Endpoints

Your server now includes these Blockfrost API endpoints:

### Blockchain Endpoints
- `GET /api/blockfrost/status` - Service status
- `GET /api/blockfrost/network` - Network information
- `GET /api/blockfrost/pools` - Stake pools
- `GET /api/blockfrost/address/{address}` - Address information
- `GET /api/blockfrost/transaction/{txHash}` - Transaction details
- `GET /api/blockfrost/test` - Run comprehensive test

### IPFS Endpoints
- `POST /api/blockfrost/ipfs/upload` - Upload content to IPFS
- `POST /api/blockfrost/ipfs/metadata` - Upload JSON metadata to IPFS

## 🧪 Testing

### Run Basic Test
```bash
node basic-blockfrost-test.js
```

### Run Comprehensive Test
```bash
node test-blockfrost.js
```

### Test API Endpoints (PowerShell)
```powershell
.\test-blockfrost.ps1
```

## 📋 Test Results

✅ **Basic API Test Results:**
- Health: Healthy
- Network: preprod
- Latest Block: 4240918
- Current Epoch: 259
- Stake Pools: 5 retrieved

## ⚙️ Configuration

### Environment Variables (.env)
```env
# Cardano Network
CARDANO_NETWORK=preprod

# Main Blockfrost API
BLOCKFROST_PROJECT_ID=preprod1LQa8hebwkCQryofauO42QVJWhgPVorK

# IPFS (Optional - get from blockfrost.io)
BLOCKFROST_IPFS_PROJECT_ID=your_ipfs_project_id_here
```

### Getting IPFS Project ID

To enable IPFS functionality:

1. Go to [blockfrost.io](https://blockfrost.io)
2. Create a new project
3. Select "IPFS" as the project type
4. Copy the project ID
5. Add it to your `.env` file as `BLOCKFROST_IPFS_PROJECT_ID`

## 🔗 Integration with Your App

### In Your Verification System
```javascript
const blockfrostService = require('./services/blockfrostService');
const ipfsService = require('./services/ipfsService');

// Store verification metadata on IPFS
const metadata = {
    userId: user.id,
    verificationType: 'kyc',
    timestamp: new Date().toISOString(),
    platform: 'CraftConnect'
};

const ipfsResult = await ipfsService.uploadMetadata(metadata);
console.log('Metadata stored at:', ipfsResult.url);
```

### In Your Profile System
```javascript
// Upload profile image to IPFS
const imageResult = await ipfsService.uploadProfileImage('./uploads/profile.jpg');

// Store IPFS hash in your database
user.profileImageIPFS = imageResult.ipfsHash;
user.profileImageURL = imageResult.url;
```

## 🛠️ Advanced Usage

### Custom Blockchain Queries
```javascript
// Get specific block
const block = await blockfrostService.API.blocks('4240918');

// Get epoch parameters
const params = await blockfrostService.getProtocolParameters();

// Get address UTXOs
const utxos = await blockfrostService.getAddressUtxos('addr_test1...');
```

### Batch IPFS Operations
```javascript
// Upload multiple files
const files = ['image1.jpg', 'image2.jpg', 'metadata.json'];
const results = await Promise.all(
    files.map(file => ipfsService.addFile(file))
);

// Pin all uploaded content
await Promise.all(
    results.map(result => ipfsService.pinContent(result.ipfs_hash))
);
```

## 🔍 Monitoring

### Check Service Status
```javascript
const status = blockfrostService.getServiceStatus();
console.log('API Available:', status.apiAvailable);
console.log('IPFS Available:', status.ipfsAvailable);
```

### Health Monitoring
```javascript
const health = await blockfrostService.getHealth();
if (!health.is_healthy) {
    console.warn('Blockfrost API is unhealthy!');
}
```

## 🎯 Next Steps

1. **Enable IPFS**: Get an IPFS project ID from blockfrost.io
2. **Integrate with Profiles**: Use IPFS for profile images and metadata
3. **Blockchain Verification**: Store verification hashes on-chain
4. **Monitoring**: Set up health checks and alerts
5. **Caching**: Implement caching for frequently accessed data

## 📖 Resources

- [Blockfrost Documentation](https://docs.blockfrost.io/)
- [Blockfrost JavaScript SDK](https://github.com/blockfrost/blockfrost-js)
- [IPFS Documentation](https://docs.ipfs.io/)
- [Cardano Developer Portal](https://developers.cardano.org/)

---

Your Blockfrost integration is ready to use! 🎉