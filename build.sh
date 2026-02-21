#!/bin/bash
set -e
echo "🏗️  Building React app..."
npm run build:react
echo "✅ React build complete"

echo "🔧 Building server..."
npm run build:server
echo "✅ Server build complete"

echo "📁 Verifying build folder..."
ls -la build/ | head -10
ls -la dist/server.js

echo "🎉 Build complete!"
