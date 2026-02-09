# How to Use Dive to Explore Docker Image Layers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Images, Dive, Layers, Optimization, DevOps, Image Analysis

Description: Learn how to use the Dive tool to inspect Docker image layers, find wasted space, and optimize your container images for smaller sizes.

---

Docker images are built from layers, and each layer adds files, packages, or configuration changes. When an image grows unexpectedly large, you need a way to look inside each layer and understand what is consuming space. Dive is an open-source tool that does exactly that.

Dive provides an interactive terminal UI where you can browse each layer's filesystem changes, identify wasted space, and make informed decisions about how to shrink your images.

## Installing Dive

Dive is available for all major platforms.

```bash
# Install on macOS using Homebrew
brew install dive

# Install on Ubuntu/Debian
DIVE_VERSION=$(curl -s "https://api.github.com/repos/wagoodman/dive/releases/latest" | jq -r .tag_name)
curl -OL "https://github.com/wagoodman/dive/releases/download/${DIVE_VERSION}/dive_${DIVE_VERSION#v}_linux_amd64.deb"
sudo dpkg -i "dive_${DIVE_VERSION#v}_linux_amd64.deb"

# Install on any platform using Go
go install github.com/wagoodman/dive@latest
```

Verify the installation:

```bash
# Check that dive is installed correctly
dive --version
```

## Basic Usage

Point Dive at any image to start exploring.

```bash
# Explore a local image
dive nginx:latest

# Explore an image directly from a registry (pulls and analyzes)
dive docker.io/library/python:3.12-slim
```

Dive opens an interactive terminal with two panes. The left pane shows image layers with their sizes. The right pane shows the filesystem tree for the selected layer.

## Understanding the Dive Interface

The interface has several key sections:

- **Layers panel (top-left)** - Lists every layer in the image, ordered from bottom (base) to top (most recent). Each layer shows the command that created it and its size.
- **File tree panel (right)** - Shows the filesystem state for the selected layer. Files are color-coded: green for added, yellow for modified, red for removed.
- **Image details (bottom-left)** - Shows total image size, potential wasted space, and an efficiency score.

Navigate with these keyboard shortcuts:

```
Tab         - Switch between layers and file tree panels
Up/Down     - Navigate within the current panel
Space       - Collapse/expand directories in the file tree
Ctrl+A      - Toggle showing only added/modified files
Ctrl+R      - Toggle showing only removed files
Ctrl+U      - Toggle showing unmodified files
Ctrl+L      - Toggle showing layer changes only
Ctrl+C      - Exit dive
```

## Analyzing Layer Sizes

When you select a layer, Dive highlights exactly what changed. This makes it easy to spot unexpected additions.

```bash
# Build an image and immediately analyze it
docker build -t myapp:test . && dive myapp:test
```

Look for layers with disproportionately large sizes. Common culprits include:

- Package manager caches (`/var/cache/apt`, `/var/cache/apk`)
- Build tool artifacts (`node_modules/.cache`, `__pycache__`)
- Temporary files from compilation
- Accidentally copied files from the build context

## Finding Wasted Space

Dive calculates wasted space automatically. Wasted space includes files that were added in one layer and removed in a later layer. Because Docker layers are immutable, the removed files still exist in the earlier layer and consume space.

```bash
# Quick efficiency check without the interactive UI
dive nginx:latest --ci
```

The `--ci` flag runs Dive in non-interactive mode and outputs a summary:

```
Image Source: docker://nginx:latest
Fetching image... (this can take a while for large images)
Analyzing image...
  efficiency: 98.4%
  wastedBytes: 1245678
  userWastedPercent: 1.6%
```

## CI Integration

Use Dive in your CI pipeline to enforce image efficiency standards.

```bash
# Fail CI if image efficiency drops below 95%
dive myapp:latest --ci --lowestEfficiency 0.95
```

The exit code is non-zero when the image fails the efficiency check.

```yaml
# GitHub Actions integration
name: Image Efficiency Check
on: push

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Install Dive
        run: |
          DIVE_VERSION=$(curl -s "https://api.github.com/repos/wagoodman/dive/releases/latest" | jq -r .tag_name)
          curl -OL "https://github.com/wagoodman/dive/releases/download/${DIVE_VERSION}/dive_${DIVE_VERSION#v}_linux_amd64.deb"
          sudo dpkg -i "dive_${DIVE_VERSION#v}_linux_amd64.deb"

      - name: Analyze image efficiency
        run: dive myapp:${{ github.sha }} --ci --lowestEfficiency 0.95
```

## Configuring Dive

Create a `.dive-ci` file in your project root to configure analysis rules.

```yaml
# .dive-ci - Dive configuration for CI checks
rules:
  # Fail if efficiency drops below this threshold
  lowestEfficiency: 0.95
  # Fail if wasted space exceeds this amount (in bytes)
  highestWastedBytes: 20000000
  # Fail if wasted space percentage exceeds this value
  highestUserWastedPercent: 0.10
```

Then run Dive without specifying flags:

```bash
# Dive reads .dive-ci from the current directory
dive myapp:latest --ci
```

## Practical Optimization Examples

Let us walk through a common scenario. You build a Node.js application and the image is 1.2GB. Time to investigate.

```dockerfile
# Before optimization - this produces a large image
FROM node:20-bullseye
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm prune --production
CMD ["node", "dist/index.js"]
```

Run Dive on this image:

```bash
docker build -t myapp:before .
dive myapp:before
```

Dive reveals several problems:
1. The `COPY . .` layer includes `.git/`, `node_modules/`, and test files
2. The `npm install` layer contains both dev and production dependencies
3. The `npm prune` layer removes dev dependencies, but they still exist in the install layer

Here is the optimized version:

```dockerfile
# After optimization - multi-stage build eliminates wasted space
FROM node:20-bullseye AS builder
WORKDIR /app

# Copy only package files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

# Production stage - clean slate
FROM node:20-alpine
WORKDIR /app

# Copy only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Run as non-root user
USER node
CMD ["node", "dist/index.js"]
```

Build and compare:

```bash
docker build -t myapp:after .
dive myapp:after
```

The optimized image will show a much higher efficiency score and significantly smaller total size.

## Analyzing Specific Layer Issues

When Dive shows a large layer, examine the file tree to identify exactly what files are responsible.

```bash
# Common things to look for in each layer:

# Layer from "apt-get install" - check for leftover cache
# Look for: /var/cache/apt/ and /var/lib/apt/lists/
# Fix: Add "rm -rf /var/cache/apt/*" in the same RUN command

# Layer from "npm install" - check for cache and dev deps
# Look for: node_modules/.cache/ and large dev-only packages
# Fix: Use npm ci --production and clean the cache

# Layer from "COPY" - check for unnecessary files
# Look for: .git/, tests/, docs/, *.md files
# Fix: Use a .dockerignore file
```

## Using .dockerignore Effectively

Many layer bloat issues stem from copying unnecessary files. Dive helps you identify them, then fix with `.dockerignore`.

```bash
# .dockerignore - Exclude files from the build context
.git
.gitignore
node_modules
*.md
docs/
tests/
.env
.env.*
docker-compose*.yml
Dockerfile
.dockerignore
coverage/
.nyc_output/
```

## Comparing Builds Side by Side

Dive does not have a built-in comparison mode, but you can run it on two images and compare the CI output.

```bash
# Compare efficiency of two builds
echo "=== Before ===" && dive myapp:before --ci
echo "=== After ===" && dive myapp:after --ci
```

For a more automated comparison:

```bash
#!/bin/bash
# compare-efficiency.sh - Compare two image builds
# Usage: ./compare-efficiency.sh myapp:before myapp:after

IMAGE1=$1
IMAGE2=$2

SIZE1=$(docker inspect --format '{{.Size}}' "$IMAGE1")
SIZE2=$(docker inspect --format '{{.Size}}' "$IMAGE2")

SAVINGS=$(( (SIZE1 - SIZE2) / 1048576 ))

echo "Image 1: $IMAGE1 - $((SIZE1 / 1048576))MB"
echo "Image 2: $IMAGE2 - $((SIZE2 / 1048576))MB"
echo "Savings: ${SAVINGS}MB"
```

## Conclusion

Dive transforms Docker image optimization from guesswork into a data-driven process. Install it, point it at your largest images, and let it show you exactly where the bloat lives. Use the CI mode to prevent efficiency regressions. Combine it with multi-stage builds and proper `.dockerignore` files to keep your images lean.

Small images build faster, push faster, pull faster, and present a smaller attack surface. Dive helps you achieve all of that by making image internals visible and actionable.
