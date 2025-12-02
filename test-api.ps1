# CraftConnect API Test Script
# Run this after starting the server with: npm run dev

$baseUrl = "http://localhost:5000"

Write-Host "`n╔═══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CraftConnect API Testing Script    ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════╝`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "1️⃣  Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
    Write-Host "✅ Health Check Passed" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Test 2: Register User
Write-Host "`n2️⃣  Testing User Registration..." -ForegroundColor Yellow
$registerData = @{
    username = "test_artisan_$(Get-Random -Maximum 9999)"
    email = "test$(Get-Random -Maximum 9999)@example.com"
    password = "password123"
    role = "artisan"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $registerData
    
    Write-Host "✅ Registration Successful" -ForegroundColor Green
    Write-Host "   Username: $($registerResponse.user.username)" -ForegroundColor Gray
    Write-Host "   Email: $($registerResponse.user.email)" -ForegroundColor Gray
    Write-Host "   Role: $($registerResponse.user.role)" -ForegroundColor Gray
    Write-Host "   Token: $($registerResponse.token.Substring(0, 20))..." -ForegroundColor Gray
    
    $token = $registerResponse.token
    $testEmail = ($registerData | ConvertFrom-Json).email
    $testPassword = ($registerData | ConvertFrom-Json).password
    
} catch {
    Write-Host "❌ Registration Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Start-Sleep -Seconds 1

# Test 3: Login
Write-Host "`n3️⃣  Testing User Login..." -ForegroundColor Yellow
$loginData = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginData
    
    Write-Host "✅ Login Successful" -ForegroundColor Green
    Write-Host "   Username: $($loginResponse.user.username)" -ForegroundColor Gray
    Write-Host "   Token: $($loginResponse.token.Substring(0, 20))..." -ForegroundColor Gray
    
    $token = $loginResponse.token
    
} catch {
    Write-Host "❌ Login Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Test 4: Get Current User (Protected Route)
Write-Host "`n4️⃣  Testing Protected Route (Get Me)..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $meResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✅ Protected Route Access Successful" -ForegroundColor Green
    Write-Host "   User ID: $($meResponse.user._id)" -ForegroundColor Gray
    Write-Host "   Username: $($meResponse.user.username)" -ForegroundColor Gray
    Write-Host "   Email: $($meResponse.user.email)" -ForegroundColor Gray
    Write-Host "   Role: $($meResponse.user.role)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Protected Route Access Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Test 5: Test Invalid Login
Write-Host "`n5️⃣  Testing Invalid Login (Should Fail)..." -ForegroundColor Yellow
$invalidLoginData = @{
    email = $testEmail
    password = "wrongpassword"
} | ConvertTo-Json

try {
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $invalidLoginData
    
    Write-Host "❌ Test Failed - Should have rejected invalid credentials" -ForegroundColor Red
    
} catch {
    Write-Host "✅ Invalid Login Correctly Rejected" -ForegroundColor Green
    Write-Host "   Expected behavior: Invalid credentials" -ForegroundColor Gray
}

# Summary
Write-Host "`n╔═══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Testing Complete! ✨          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📝 All tests completed. Check results above." -ForegroundColor White
Write-Host "🔗 API is ready to connect to frontend!`n" -ForegroundColor Green
