#!/usr/bin/env bash
set -e

echo "======================================================"
echo "  MatchValue Engine - GitHub Setup & Release Script"
echo "======================================================"
echo ""

# Prompt for repository URL
read -p "Enter your GitHub repository URL (e.g. https://github.com/USERNAME/matchvalue-engine.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
  echo "Error: Repository URL cannot be empty."
  exit 1
fi

# Configure remote origin
echo ""
echo "Setting git remote origin to $REPO_URL..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# Push main branch
echo "Pushing main branch to GitHub..."
git push -u origin main

# Tag and push release v1.0.0
echo ""
echo "Creating release tag v1.0.0..."
git tag -f v1.0.0

echo "Pushing release tag v1.0.0 to trigger GitHub Actions .exe build workflow..."
git push origin v1.0.0 --force

echo ""
echo "======================================================"
echo "  SUCCESS! Release workflow triggered."
echo "  Check GitHub Actions tab in your repository to download the .exe installer once built!"
echo "======================================================"
