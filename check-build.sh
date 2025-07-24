#!/bin/bash

echo "🔍 Checking TypeScript compilation..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation passed!"
else
    echo "❌ TypeScript compilation failed!"
    exit 1
fi

echo "🔍 Checking ESLint..."
npx eslint src/ --ext .ts,.tsx

if [ $? -eq 0 ]; then
    echo "✅ ESLint checks passed!"
else
    echo "❌ ESLint checks failed!"
    exit 1
fi

echo "🎉 All checks passed! Ready for Vercel deployment."
