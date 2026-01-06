# How to Containerize Node.js Apps with Multi-Stage Dockerfiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Docker, DevOps, Security, Performance

Description: Learn to create minimal, secure Docker images for Node.js applications using multi-stage builds, layer caching optimization, and security scanning.

---

A typical Node.js Docker image can easily reach 1GB+ with development dependencies, build tools, and unnecessary files. Multi-stage builds let you create minimal production images that are faster to deploy, use less storage, and have a smaller attack surface.

For more Docker best practices, see our guide on [shrinking and hardening Docker images](https://oneuptime.com/blog/post/2025-11-27-shrink-and-harden-docker-images/view).

## The Problem with Single-Stage Builds

```dockerfile
# BAD: Single stage - everything in final image
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]

# Result: 1.2GB image with dev dependencies, source files, build tools
```

## Multi-Stage Build Pattern

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only what's needed
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
CMD ["node", "dist/index.js"]

# Result: ~150MB image with only production dependencies
```

## Optimized Dockerfile for Node.js

```dockerfile
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

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# ============================================
# Dependencies stage
# ============================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ============================================
# Build stage
# ============================================
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src

# Type check and build
RUN npm run typecheck && \
    npm run build

# ============================================
# Production dependencies
# ============================================
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --ignore-scripts

# ============================================
# Production image
# ============================================
FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy production deps and built code
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package.json ./

USER nodejs
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## NestJS Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Build
FROM deps AS build
COPY . .
RUN npm run build

# Production deps only
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Production
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

USER nodejs
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

## Layer Caching Optimization

Order commands from least to most frequently changed:

```dockerfile
# 1. Base image (rarely changes)
FROM node:20-alpine

# 2. System dependencies (changes rarely)
RUN apk add --no-cache dumb-init

# 3. Create user (changes rarely)
RUN adduser -S nodejs

# 4. Set working directory
WORKDIR /app

# 5. Package files (changes when deps change)
COPY package.json package-lock.json ./

# 6. Install dependencies (changes when deps change)
RUN npm ci --only=production

# 7. Application code (changes frequently)
COPY --chown=nodejs:nodejs . .

# 8. Build (changes when code changes)
RUN npm run build

USER nodejs
CMD ["dumb-init", "node", "dist/index.js"]
```

## Using .dockerignore

Prevent unnecessary files from being copied:

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

For maximum security, use distroless base images:

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

# Production with distroless
FROM gcr.io/distroless/nodejs20-debian12

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3000
CMD ["dist/index.js"]
```

Distroless images:
- No shell, package manager, or other programs
- Only your application and runtime
- Reduced attack surface

## Security Scanning

### Trivy Scan

```bash
# Scan image for vulnerabilities
trivy image my-app:latest

# Scan with severity threshold
trivy image --severity HIGH,CRITICAL my-app:latest

# Fail build on vulnerabilities
trivy image --exit-code 1 --severity HIGH,CRITICAL my-app:latest
```

### GitHub Actions Integration

```yaml
name: Build and Scan

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t my-app:${{ github.sha }} .

      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: my-app:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'HIGH,CRITICAL'

      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

## Build Arguments and Secrets

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS build

# Build argument (visible in image history)
ARG NODE_ENV=production

# Secret (not visible in image history)
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm ci

COPY . .
RUN npm run build
```

Build with secrets:

```bash
# Create secret file
echo "npm_xxxxx" > npm_token.txt

# Build with secret
docker build --secret id=npm_token,src=npm_token.txt -t my-app .
```

## Multi-Architecture Builds

Build for both AMD64 and ARM64:

```bash
# Create builder
docker buildx create --name multiarch --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t my-app:latest \
  --push \
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
