# How to Containerize Node.js Apps with Multi-Stage Dockerfiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Docker, DevOps, Security, Performance

Description: Learn to create minimal, secure Docker images for Node.js applications using multi-stage builds, layer caching optimization, and security scanning.

---

A typical Node.js Docker image can easily reach 1GB+ with development dependencies, build tools, and unnecessary files. Multi-stage builds let you create minimal production images that are faster to deploy, use less storage, and have a smaller attack surface.

For more Docker best practices, see our guide on [shrinking and hardening Docker images](https://oneuptime.com/blog/post/2025-11-27-shrink-and-harden-docker-images/view).

## The Problem with Single-Stage Builds

A single-stage Dockerfile includes everything in the final image: development dependencies, build tools, source code, and intermediate artifacts. This results in massive images that are slow to push/pull and have increased security exposure.

```dockerfile
# BAD: Single stage - everything ends up in the final image
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install            # Includes devDependencies like TypeScript, Jest, etc.
COPY . .                   # Includes source files, tests, docs
RUN npm run build          # Build artifacts plus original source

EXPOSE 3000
CMD ["node", "dist/index.js"]

# Result: 1.2GB image with dev dependencies, source files, build tools
# Contains: node_modules with devDeps, src/, tests/, .git/, etc.
```

## Multi-Stage Build Pattern

Multi-stage builds use multiple FROM statements. Each stage can access files from previous stages via COPY --from, but only the final stage becomes the production image. This lets you compile code in one stage and copy only the output to a minimal runtime image.

```dockerfile
# Stage 1: Install production dependencies only
# This stage's node_modules will be copied to the final image
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production  # No devDependencies

# Stage 2: Build the application
# This stage has full devDependencies for TypeScript, etc.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                    # All dependencies for build
COPY . .
RUN npm run build             # Compile TypeScript, bundle, etc.

# Stage 3: Production image (this is what gets deployed)
# Only contains the runtime - no build tools, no source code
FROM node:20-alpine AS production
WORKDIR /app

# Security: Create non-root user to run the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cherry-pick only what's needed from previous stages
COPY --from=deps /app/node_modules ./node_modules  # Prod deps only
COPY --from=build /app/dist ./dist                  # Compiled output
COPY --from=build /app/package.json ./              # For metadata

# Set ownership and switch to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
CMD ["node", "dist/index.js"]

# Result: ~150MB image with only production dependencies
# No source code, no devDependencies, no build tools
```

## Optimized Dockerfile for Node.js

This production-ready Dockerfile includes cache mounts for faster rebuilds, security updates, non-root user, and health checks. The syntax directive enables BuildKit features like cache mounts.

```dockerfile
# Enable BuildKit syntax for cache mounts and other advanced features
# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Base image with common setup
# ============================================
FROM node:20-alpine AS base

# Install security updates
RUN apk update && apk upgrade --no-cache

# Set working directory
WORKDIR /app

# ============================================
# Stage 2: Install production dependencies
# ============================================
FROM base AS deps

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
# Use cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================
# Stage 3: Build the application
# ============================================
FROM base AS build

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --production

# ============================================
# Stage 4: Production image
# ============================================
FROM base AS production

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

# Use non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/index.js"]
```

## TypeScript-Specific Build

TypeScript projects require a compile step that needs devDependencies. This Dockerfile runs type checking as part of the build to catch errors early, then creates a minimal production image with only JavaScript output.

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# ============================================
# Dependencies stage - install all deps for build
# ============================================
FROM base AS deps
COPY package.json package-lock.json ./
# Cache npm downloads for faster rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ============================================
# Build stage - compile TypeScript to JavaScript
# ============================================
FROM deps AS build
# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src ./src

# Run type checking first (fails fast on type errors)
# Then compile to JavaScript
RUN npm run typecheck && \
    npm run build

# ============================================
# Production dependencies - separate stage for clean deps
# ============================================
FROM base AS prod-deps
COPY package.json package-lock.json ./
# --ignore-scripts prevents postinstall scripts (security)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --ignore-scripts

# ============================================
# Production image - minimal runtime only
# ============================================
FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy only production deps and compiled JavaScript
# No TypeScript, no source files, no devDependencies
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package.json ./

USER nodejs
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## NestJS Dockerfile

NestJS applications follow a similar pattern. The libc6-compat package is needed for some native modules. Note that NestJS outputs to dist/main.js by default.

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
# libc6-compat is required for some native Node modules
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies - install all for build
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Build - compile NestJS application
FROM deps AS build
COPY . .
RUN npm run build  # Outputs to dist/

# Production deps only
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Production - minimal runtime image
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy production deps and compiled NestJS app
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

USER nodejs
EXPOSE 3000
# NestJS default entry point is dist/main.js
CMD ["node", "dist/main.js"]
```

## Layer Caching Optimization

Docker caches each layer. When a layer changes, all subsequent layers must rebuild. Order your Dockerfile from least to most frequently changed operations. This maximizes cache hits during development.

```dockerfile
# 1. Base image (rarely changes) - cached for months
FROM node:20-alpine

# 2. System dependencies (changes rarely) - cached until you need new packages
RUN apk add --no-cache dumb-init

# 3. Create user (changes rarely) - cached essentially forever
RUN adduser -S nodejs

# 4. Set working directory - cached forever
WORKDIR /app

# 5. Package files (changes when deps change) - cache invalidated by npm changes
COPY package.json package-lock.json ./

# 6. Install dependencies (changes when deps change) - slow step, cached when possible
RUN npm ci --only=production

# 7. Application code (changes frequently) - invalidated on every code change
COPY --chown=nodejs:nodejs . .

# 8. Build (changes when code changes) - runs after code changes
RUN npm run build

USER nodejs
# dumb-init handles signals properly for graceful shutdown
CMD ["dumb-init", "node", "dist/index.js"]
```

## Using .dockerignore

The .dockerignore file excludes files from the build context sent to the Docker daemon. This speeds up builds and prevents sensitive files from accidentally being included in images.

```
# .dockerignore

# Dependencies
node_modules
npm-debug.log

# Build outputs
dist
build
coverage

# Development files
.git
.gitignore
*.md
docs

# IDE
.vscode
.idea
*.swp

# Test files
test
tests
*.test.js
*.spec.js
jest.config.js

# Environment files (secrets!)
.env
.env.*
!.env.example

# Docker files
Dockerfile*
docker-compose*
.docker

# CI/CD
.github
.gitlab-ci.yml
.circleci
```

## Distroless Images

Distroless images contain only your application and its runtime dependencies. No shell, no package manager, no utilities. This dramatically reduces attack surface since attackers cannot install tools or spawn shells.

```dockerfile
# Build stage - use full image for building
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build and remove devDependencies
RUN npm run build && npm prune --production

# Production with distroless - no shell, no package manager
FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app
# Copy only the built application and production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3000
# Note: Distroless requires array syntax - no shell to parse commands
# Path is relative - "node" is already the entrypoint
CMD ["dist/index.js"]
```

Distroless images provide:
- No shell - attackers cannot spawn interactive sessions
- No package manager - cannot install malicious tools
- Only your application and runtime - minimal attack surface
- CVE scanning shows fewer vulnerabilities

## Security Scanning

Scan your images for known vulnerabilities before deploying. Trivy is a popular open-source scanner that checks both OS packages and application dependencies.

### Trivy Scan

```bash
# Scan image for all vulnerabilities (informational)
trivy image my-app:latest

# Scan with severity filter - show only HIGH and CRITICAL
trivy image --severity HIGH,CRITICAL my-app:latest

# Fail CI/CD pipeline if vulnerabilities found (exit code 1)
# Use this in your build pipeline to gate deployments
trivy image --exit-code 1 --severity HIGH,CRITICAL my-app:latest
```

### GitHub Actions Integration

Integrate security scanning into your CI/CD pipeline. This workflow builds the image, scans it for vulnerabilities, and uploads results to GitHub's security tab for visibility.

```yaml
name: Build and Scan

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Build image with commit SHA tag for traceability
      - name: Build image
        run: docker build -t my-app:${{ github.sha }} .

      # Scan the built image for vulnerabilities
      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: my-app:${{ github.sha }}
          format: 'sarif'                  # GitHub-compatible format
          output: 'trivy-results.sarif'
          severity: 'HIGH,CRITICAL'        # Only report serious issues

      # Upload results to GitHub Security tab
      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

## Build Arguments and Secrets

Never put secrets in your Dockerfile or pass them as build arguments - they are visible in image history. Use Docker BuildKit secrets which are mounted temporarily and never stored in the image.

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS build

# Build argument (visible in image history via `docker history`)
# OK for non-sensitive configuration
ARG NODE_ENV=production

# Secret mount (NOT visible in image history)
# The secret is mounted as a file during build, then removed
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm ci

COPY . .
RUN npm run build
```

Build with secrets from the command line:

```bash
# Create a file containing the secret (not committed to git!)
echo "npm_xxxxx" > npm_token.txt

# Build with secret - BuildKit mounts it only during build
# The secret is never stored in any image layer
docker build --secret id=npm_token,src=npm_token.txt -t my-app .
```

## Multi-Architecture Builds

Build images that run on both Intel/AMD (amd64) and Apple Silicon/AWS Graviton (arm64). Docker buildx can cross-compile and push multi-arch manifests in a single command.

```bash
# Create and use a buildx builder with multi-arch support
docker buildx create --name multiarch --use

# Build for multiple platforms and push to registry
# Docker creates a manifest that points to both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \  # Specify target architectures
  -t my-app:latest \
  --push \                               # Push directly (can't load multi-arch locally)
  .
```

## Size Comparison

| Configuration | Image Size |
|--------------|------------|
| node:20 (single stage) | ~1.2 GB |
| node:20-slim | ~250 MB |
| node:20-alpine | ~180 MB |
| Multi-stage alpine | ~150 MB |
| Multi-stage distroless | ~130 MB |

## Summary

| Technique | Benefit |
|-----------|---------|
| **Multi-stage builds** | Smaller images, no dev deps |
| **Alpine/distroless** | Minimal base image |
| **Layer ordering** | Better caching |
| **.dockerignore** | Faster builds, smaller context |
| **Non-root user** | Security |
| **Health checks** | Orchestrator integration |
| **Security scanning** | Vulnerability detection |

Multi-stage Docker builds are essential for production Node.js deployments. They produce smaller, more secure images that deploy faster and have reduced attack surface.
