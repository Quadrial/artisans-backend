#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Test Blockfrost API and IPFS functionality

.DESCRIPTION
    This PowerShell script tests the Blockfrost integration by running the Node.js test script
    and also provides API endpoint testing capabilities.

.PARAMETER TestType
    Type of test to run: 'script', 'api', or 'both' (default: 'both')

.PARAMETER ServerUrl
    Base URL of the server (default: 'http://localhost:5000')

.EXAMPLE
    .\test-blockfrost.ps1
    .\test-blockfrost.ps1 -TestType script
    .\test-blockfrost.ps1 -TestType api -ServerUrl "http://localhost:5000"
#>

param(
    [Parameter()]
    [ValidateSet('script', 'api', 'both')]
    [string]$TestType = 'both',
    
    [Parameter()]
    [string]$ServerUrl = 'http://localhost:5000'
)

Write-Host "🧪 BLOCKFROST TEST SUITE" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host "Test Type: $TestType" -ForegroundColor Yellow
Write-Host "Server URL: $ServerUrl" -ForegroundColor Yellow
Write-Host ""

function Test-NodeScript {
    Write-Host "🚀 Running Node.js Test Script..." -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    
    try {
        # Change to backend directory
        Push-Location $PSScriptRoot
        
        # Run the test script
        node test-blockfrost.js
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Node.js test script completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Node.js test script failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error running Node.js test script: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        Pop-Location
    }
    
    return $true
}

function Test-APIEndpoints {
    Write-Host "🌐 Testing API Endpoints..." -ForegroundColor Green
    Write-Host "============================" -ForegroundColor Green
    
    $endpoints = @(
        @{ Path = "/api/blockfrost/status"; Description = "Service Status" },
        @{ Path = "/api/blockfrost/network"; Description = "Network Information" },
        @{ Path = "/api/blockfrost/pools?count=5"; Description = "Stake Pools" },
        @{ Path = "/api/blockfrost/test"; Description = "Comprehensive Test" }
    )
    
    $testAddress = "addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz"
    $endpoints += @{ Path = "/api/blockfrost/address/$testAddress"; Description = "Address Information" }
    
    $allPassed = $true
    
    foreach ($endpoint in $endpoints) {
        $url = "$ServerUrl$($endpoint.Path)"
        Write-Host "📡 Testing: $($endpoint.Description)" -ForegroundColor Cyan
        Write-Host "   URL: $url" -ForegroundColor Gray
        
        try {
            $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 30
            
            if ($response.success) {
                Write-Host "   ✅ Success" -ForegroundColor Green
                
                # Display some key information
                if ($endpoint.Path -eq "/api/blockfrost/status") {
                    Write-Host "      Network: $($response.status.network)" -ForegroundColor Gray
                    Write-Host "      API Available: $($response.status.apiAvailable)" -ForegroundColor Gray
                    Write-Host "      IPFS Available: $($response.status.ipfsAvailable)" -ForegroundColor Gray
                }
                elseif ($endpoint.Path -eq "/api/blockfrost/network") {
                    Write-Host "      Latest Block: $($response.data.latestBlock.height)" -ForegroundColor Gray
                    Write-Host "      Current Epoch: $($response.data.latestEpoch.epoch)" -ForegroundColor Gray
                }
                elseif ($endpoint.Path.Contains("/address/")) {
                    Write-Host "      Balance: $($response.data.balance.ada) ADA" -ForegroundColor Gray
                    Write-Host "      UTXOs: $($response.data.utxos)" -ForegroundColor Gray
                }
                elseif ($endpoint.Path.Contains("/pools")) {
                    Write-Host "      Pools Retrieved: $($response.data.pools.Count)" -ForegroundColor Gray
                }
            }
            else {
                Write-Host "   ❌ API returned success=false: $($response.error)" -ForegroundColor Red
                $allPassed = $false
            }
        }
        catch {
            Write-Host "   ❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
            $allPassed = $false
        }
        
        Write-Host ""
    }
    
    # Test IPFS endpoints if available
    Write-Host "🌐 Testing IPFS Endpoints..." -ForegroundColor Cyan
    
    $testMetadata = @{
        name = "Test Profile"
        description = "Test metadata upload"
        platform = "CraftConnect"
        timestamp = (Get-Date).ToString("o")
    }
    
    try {
        $ipfsUrl = "$ServerUrl/api/blockfrost/ipfs/metadata"
        Write-Host "📡 Testing: IPFS Metadata Upload" -ForegroundColor Cyan
        Write-Host "   URL: $ipfsUrl" -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri $ipfsUrl -Method POST -Body ($testMetadata | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 30
        
        if ($response.success) {
            Write-Host "   ✅ IPFS Upload Success" -ForegroundColor Green
            Write-Host "      IPFS Hash: $($response.data.ipfsHash)" -ForegroundColor Gray
            Write-Host "      Gateway URL: $($response.data.url)" -ForegroundColor Gray
        }
        else {
            Write-Host "   ❌ IPFS Upload failed: $($response.error)" -ForegroundColor Red
            $allPassed = $false
        }
    }
    catch {
        Write-Host "   ⚠️  IPFS test skipped (might not be configured): $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    return $allPassed
}

function Test-ServerConnection {
    Write-Host "🔍 Checking server connection..." -ForegroundColor Cyan
    
    try {
        $healthUrl = "$ServerUrl/api/health"
        $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 10
        
        if ($response.success) {
            Write-Host "✅ Server is running and accessible" -ForegroundColor Green
            Write-Host "   Message: $($response.message)" -ForegroundColor Gray
            return $true
        }
        else {
            Write-Host "❌ Server health check failed" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Cannot connect to server: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Make sure the server is running on $ServerUrl" -ForegroundColor Yellow
        return $false
    }
}

# Main execution
$overallSuccess = $true

if ($TestType -eq 'script' -or $TestType -eq 'both') {
    if (-not (Test-NodeScript)) {
        $overallSuccess = $false
    }
    Write-Host ""
}

if ($TestType -eq 'api' -or $TestType -eq 'both') {
    if (Test-ServerConnection) {
        if (-not (Test-APIEndpoints)) {
            $overallSuccess = $false
        }
    }
    else {
        $overallSuccess = $false
    }
}

# Final result
Write-Host "🏁 TEST RESULTS" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

if ($overallSuccess) {
    Write-Host "✅ All tests passed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Your Blockfrost integration is working correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📚 Available API endpoints:" -ForegroundColor Cyan
    Write-Host "   GET  $ServerUrl/api/blockfrost/status" -ForegroundColor Gray
    Write-Host "   GET  $ServerUrl/api/blockfrost/network" -ForegroundColor Gray
    Write-Host "   GET  $ServerUrl/api/blockfrost/pools" -ForegroundColor Gray
    Write-Host "   GET  $ServerUrl/api/blockfrost/address/{address}" -ForegroundColor Gray
    Write-Host "   GET  $ServerUrl/api/blockfrost/transaction/{txHash}" -ForegroundColor Gray
    Write-Host "   POST $ServerUrl/api/blockfrost/ipfs/upload" -ForegroundColor Gray
    Write-Host "   POST $ServerUrl/api/blockfrost/ipfs/metadata" -ForegroundColor Gray
    Write-Host "   GET  $ServerUrl/api/blockfrost/test" -ForegroundColor Gray
    exit 0
}
else {
    Write-Host "❌ Some tests failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "   1. Check your .env file has BLOCKFROST_PROJECT_ID set" -ForegroundColor Gray
    Write-Host "   2. Verify your Blockfrost API key is valid" -ForegroundColor Gray
    Write-Host "   3. Make sure the server is running (npm run dev)" -ForegroundColor Gray
    Write-Host "   4. Check network connectivity" -ForegroundColor Gray
    exit 1
}