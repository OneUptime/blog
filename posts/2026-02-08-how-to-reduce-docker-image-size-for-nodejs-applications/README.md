# How to Reduce Docker Image Size for Node.js Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, node.js, image optimization, multi-stage builds, alpine, production

Description: Step-by-step guide to shrinking Node.js Docker images from 1GB+ down to under 100MB

---

Node.js Docker images have a tendency to bloat. A simple Express API can balloon to over 1GB when you include the full Node.js base image, all development dependencies, and source files you do not need at runtime. Smaller images deploy faster, consume less registry storage, reduce network transfer time, and present a smaller attack surface. Let's walk through every technique for slimming down a Node.js image, with real measurements at each step.

## Starting Point: The Bloated Image

Here is a common Dockerfile that produces an unnecessarily large image:

```dockerfile
# Starting point: typically 1GB+
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Check the damage
docker build -t myapp:bloated .
docker images myapp:bloated
# REPOSITORY    TAG       SIZE
# myapp         bloated   1.2GB
```

Let's systematically reduce this.

## Step 1: Use a Slim Base Image

The `node:20` image is based on Debian with a full set of system packages. Switch to the slim variant:

```bash
# Compare base image sizes
docker pull node:20 && docker images node:20 --format "{{.Size}}"
# 1.1GB

docker pull node:20-slim && docker images node:20-slim --format "{{.Size}}"
# 200MB

docker pull node:20-alpine && docker images node:20-alpine --format "{{.Size}}"
# 130MB
```

```dockerfile
# Swap to slim: saves ~900MB immediately
FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Alpine is even smaller, but some npm packages with native addons (bcrypt, sharp, canvas) may have trouble compiling on it. The slim variant is the safest choice for most projects.

## Step 2: Multi-Stage Build

Separate the build environment from the production image. The build stage needs TypeScript, webpack, dev dependencies, and build tools. The production stage needs only the compiled output and production dependencies:

```dockerfile
# Stage 1: Build with all dependencies
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production with only what's needed to run
FROM node:20-slim
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled application
COPY --from=builder /app/dist ./dist

EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

The `--omit=dev` flag skips devDependencies (TypeScript, jest, eslint, webpack, etc.), which often account for 60-80% of `node_modules` size.

## Step 3: Use Alpine for Maximum Reduction

If your dependencies work on Alpine, the size savings are substantial:

```dockerfile
# Stage 1: Build on Alpine
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run on Alpine with production deps
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

## Step 4: Clean Up Unnecessary Files

Even with `--omit=dev`, `node_modules` contains files you do not need at runtime:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force && \
    # Remove unnecessary files from node_modules
    find /app/node_modules -name "*.md" -delete && \
    find /app/node_modules -name "*.txt" -delete && \
    find /app/node_modules -name "LICENSE*" -delete && \
    find /app/node_modules -name "CHANGELOG*" -delete && \
    find /app/node_modules -name "*.ts" ! -name "*.d.ts" -delete && \
    find /app/node_modules -name "*.map" -delete && \
    find /app/node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null; \
    find /app/node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null; \
    find /app/node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null; \
    find /app/node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null; \
    true
```

This removes markdown files, license files, TypeScript source maps, test directories, and documentation from installed packages. It typically saves 10-30% of `node_modules` size.

## Step 5: Use node-prune

`node-prune` automates the cleanup of unnecessary files from `node_modules`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install and run node-prune to clean up node_modules
RUN wget -qO- https://gobinaries.com/tj/node-prune | sh
RUN node-prune /app/node_modules

FROM node:20-alpine
WORKDIR /app
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json .
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

## Step 6: Bundle with esbuild or webpack

For the most aggressive size reduction, bundle your application into a single file that includes all dependencies:

```dockerfile
# Stage 1: Install dependencies and bundle everything
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Bundle the application with esbuild - includes all deps in one file
RUN npx esbuild dist/index.js --bundle --platform=node --outfile=bundle.js \
    --external:sharp --external:bcrypt

# Stage 2: No node_modules needed at all (unless you have native modules)
FROM node:20-alpine
WORKDIR /app

# Only copy the bundled file
COPY --from=builder /app/bundle.js .

EXPOSE 3000
USER node
CMD ["node", "bundle.js"]
```

This approach eliminates `node_modules` entirely from the production image. The trade-off is that some packages (native modules like sharp, bcrypt) cannot be bundled and must be installed separately.

## Step 7: Use .dockerignore

Prevent unnecessary files from entering the build context:

```
# .dockerignore
node_modules
.git
.gitignore
coverage
.env
.env.*
*.md
.vscode
.idea
test
tests
__tests__
.eslintrc*
.prettierrc*
tsconfig.json
jest.config.*
.nyc_output
docker-compose*.yml
Dockerfile*
```

## Measuring Progress

Let's see the size reduction at each step:

```bash
# Build each variant and compare
docker build -t myapp:base -f Dockerfile.base .
docker build -t myapp:slim -f Dockerfile.slim .
docker build -t myapp:multistage -f Dockerfile.multistage .
docker build -t myapp:alpine -f Dockerfile.alpine .
docker build -t myapp:bundled -f Dockerfile.bundled .

# Compare sizes
docker images myapp --format "table {{.Tag}}\t{{.Size}}"
```

Typical results for a medium Express/TypeScript API with 50 production dependencies:

| Approach | Image Size |
|---|---|
| node:20, all deps | 1.2 GB |
| node:20-slim, all deps | 400 MB |
| Multi-stage, prod deps only | 200 MB |
| Alpine, prod deps only | 150 MB |
| Alpine + node-prune | 120 MB |
| Alpine + esbuild bundle | 60 MB |

## Complete Production-Ready Dockerfile

Here is a Dockerfile that combines the most practical techniques:

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: Install ALL dependencies and build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

# Stage 2: Production dependencies only, cleaned up
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev && \
    npm cache clean --force

# Stage 3: Final slim image
FROM node:20-alpine
WORKDIR /app

# Security: add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY package.json .

# Set proper permissions
RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
EXPOSE 3000

# Use dumb-init for proper signal handling
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

This gives you a clean, secure, small image. Start with the multi-stage approach since it offers the best ratio of effort to size reduction. Add Alpine if your dependencies support it. Consider esbuild bundling only if you need the absolute smallest image and your dependency tree allows full bundling.
