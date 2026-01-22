# How to Clear npm Cache and Fix Related Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, npm, Cache, Debugging, PackageManager

Description: Learn how to clear npm cache, understand when and why to clear it, troubleshoot cache-related issues, and manage npm cache effectively.

---

npm cache stores downloaded packages to speed up future installations. Sometimes this cache becomes corrupted or causes issues. This guide covers how to manage npm cache and resolve cache-related problems.

## Quick Cache Clear

```bash
# Clear npm cache (force required since npm 5)
npm cache clean --force

# Verify cache integrity
npm cache verify
```

## Understanding npm Cache

### Cache Location

```bash
# Find cache location
npm config get cache

# Default locations:
# macOS/Linux: ~/.npm
# Windows: %AppData%/npm-cache
```

### Cache Contents

```bash
# List cache contents
ls ~/.npm/_cacache

# Check cache size
du -sh ~/.npm

# More detailed breakdown
du -sh ~/.npm/*
```

### How Cache Works

When you run `npm install`, npm:
1. Checks the cache for the package
2. Verifies package integrity with checksums
3. Copies from cache if valid
4. Downloads if not in cache or invalid

## When to Clear Cache

Clear npm cache when:

- Getting integrity check failures
- Seeing `EINTEGRITY` errors
- Packages install incorrectly
- npm hangs during installation
- Disk space is low
- Switching npm versions

## Cache Commands

### Clean Cache

```bash
# Force clean (required since npm v5)
npm cache clean --force

# This removes all data from the cache folder
```

### Verify Cache

```bash
# Check cache integrity
npm cache verify

# Output example:
# Cache verified and compressed (~/.npm/_cacache):
# Content verified: 1423 (234567890 bytes)
# Index entries: 2156
# Finished in 3.234s
```

### Add to Cache

```bash
# Manually add a package to cache
npm cache add lodash@4.17.21
```

## Clearing Related Caches

### Complete Clean

```bash
# Delete node_modules
rm -rf node_modules

# Delete lock file
rm package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

### Clear All npm Directories

```bash
# Full cleanup script
rm -rf node_modules
rm -rf package-lock.json
rm -rf ~/.npm
npm cache clean --force
npm install
```

### Other Package Manager Caches

```bash
# Yarn
yarn cache clean

# pnpm
pnpm store prune

# npm global cache and packages
npm cache clean --force
rm -rf ~/.npm
```

## Troubleshooting Cache Issues

### EINTEGRITY Errors

```bash
npm ERR! code EINTEGRITY
npm ERR! sha512-xxx... integrity checksum failed

# Solution
npm cache clean --force
rm package-lock.json
npm install
```

### Corrupted Cache

```bash
# Signs of corrupted cache:
# - Installation hangs
# - Random package errors
# - Incomplete installations

# Solution
npm cache verify
npm cache clean --force
```

### ENOENT Cache Errors

```bash
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path ~/.npm/_cacache/...

# Solution
npm cache clean --force
# If persists, remove entire cache directory
rm -rf ~/.npm/_cacache
```

### Offline Installation Issues

```bash
# If offline install fails despite cached packages
npm cache verify

# Force online installation
npm install --prefer-online

# Force offline installation
npm install --prefer-offline
```

## Cache Configuration

### Change Cache Location

```bash
# Set custom cache location
npm config set cache /path/to/new/cache

# Per-project cache (useful for CI)
npm install --cache /tmp/npm-cache

# Environment variable
export npm_config_cache=/path/to/cache
npm install
```

### Cache Settings

```bash
# Check current settings
npm config list

# Prefer offline (use cache when available)
npm config set prefer-offline true

# Prefer online (always check registry)
npm config set prefer-online true

# Reset to default
npm config delete prefer-offline
```

## CI/CD Cache Management

### GitHub Actions

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'  # Built-in caching
      
      - name: Install dependencies
        run: npm ci
```

### Manual Cache in CI

```yaml
# GitLab CI
cache:
  paths:
    - node_modules/
    - .npm/

before_script:
  - npm ci --cache .npm --prefer-offline
```

### Docker Build Cache

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Use mount cache for npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

COPY . .
```

## Cache for Offline Work

### Prepare Packages for Offline

```bash
# Download and cache packages
npm pack lodash
npm pack express

# Or install to populate cache
npm install --prefer-offline
```

### Create Local Package Mirror

```bash
# Using verdaccio
npm install -g verdaccio
verdaccio

# Configure npm to use local registry
npm config set registry http://localhost:4873/

# Install packages (they'll be cached locally)
npm install express lodash
```

## Debugging Cache

### Enable Verbose Logging

```bash
# See cache operations
npm install --verbose

# Or set environment variable
npm_config_loglevel=silly npm install
```

### Check Package in Cache

```bash
# Search cache for a package
ls ~/.npm/_cacache/content-v2/sha512 | head -20

# The cache uses content-addressable storage
# Package names aren't directly visible
```

### Cache Metrics

```bash
# Get cache info
npm cache verify

# See detailed cache stats
npm cache ls 2>/dev/null | wc -l
```

## Troubleshooting Script

Create a script to diagnose and fix cache issues:

```bash
#!/bin/bash
# fix-npm.sh

echo "=== npm Cache Diagnostics ==="

echo -e "\n1. npm version:"
npm --version

echo -e "\n2. Cache location:"
npm config get cache

echo -e "\n3. Cache size:"
du -sh ~/.npm 2>/dev/null || echo "Cache not found"

echo -e "\n4. Verifying cache..."
npm cache verify

echo -e "\n5. Clearing cache..."
npm cache clean --force

echo -e "\n6. Removing node_modules..."
rm -rf node_modules

echo -e "\n7. Removing lock file..."
rm -f package-lock.json

echo -e "\n8. Reinstalling..."
npm install

echo -e "\n=== Done ==="
```

## npm vs npx Cache

npx has its own cache:

```bash
# Clear npx cache
rm -rf ~/.npm/_npx

# npx cache location
# macOS/Linux: ~/.npm/_npx
# Windows: %LocalAppData%/npm-cache/_npx
```

## Summary

| Command | Purpose |
|---------|---------|
| `npm cache clean --force` | Clear all cached data |
| `npm cache verify` | Check and fix cache integrity |
| `npm config get cache` | Show cache location |
| `npm install --prefer-offline` | Use cached packages |
| `npm install --prefer-online` | Force fresh downloads |
| `rm -rf ~/.npm` | Nuclear option: remove everything |

When in doubt:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

This solves most cache-related issues. If problems persist, check for disk space issues, permissions problems, or network connectivity.
