#!/bin/bash

echo "🚀 Vercel Deployment Pre-check"
echo "================================"

# Check Node.js version requirement
echo "📋 Checking Node.js version..."
if [ -f ".nvmrc" ]; then
    echo "✅ .nvmrc found: $(cat .nvmrc)"
else
    echo "❌ .nvmrc not found"
    exit 1
fi

# Check package.json engines
echo "📋 Checking package.json engines..."
if grep -q '"engines"' package.json; then
    echo "✅ Node.js version constraint found in package.json"
else
    echo "❌ No engines field in package.json"
    exit 1
fi

# Validate vercel.json syntax
echo "📋 Validating vercel.json..."
if node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))" 2>/dev/null; then
    echo "✅ vercel.json is valid JSON"
else
    echo "❌ vercel.json has syntax errors"
    exit 1
fi

# Check for conflicting properties
echo "📋 Checking for configuration conflicts..."
if grep -q '"functions"' vercel.json && grep -q '"builds"' vercel.json; then
    echo "❌ Conflicting 'functions' and 'builds' properties found"
    exit 1
else
    echo "✅ No conflicting properties"
fi

# Check main server file exists
echo "📋 Checking main server file..."
if [ -f "advanced-server.js" ]; then
    echo "✅ advanced-server.js found"
else
    echo "❌ advanced-server.js not found"
    exit 1
fi

# Test production mode
echo "📋 Testing production mode..."
NODE_ENV=production node advanced-server.js &
SERVER_PID=$!
sleep 3

if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Server responds correctly in production mode"
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
else
    echo "❌ Server not responding"
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 All checks passed! Ready for Vercel deployment."
echo "📝 Run: vercel --prod"
