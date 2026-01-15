# How to Containerize React Applications with Multi-Stage Docker Builds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Docker, Containers, Multi-Stage Build, DevOps, Deployment

Description: Learn to containerize React applications using multi-stage Docker builds to create optimized, production-ready images that are smaller, more secure, and faster to deploy.

---

Containerizing React applications presents unique challenges compared to backend services. React apps are static files that need to be built during the container creation process, served by a web server in production, and optimized for caching and performance. Multi-stage Docker builds solve these challenges elegantly by separating the build environment from the runtime environment.

This guide covers everything from basic multi-stage patterns to advanced optimization techniques for React applications in production.

## Why Multi-Stage Builds for React

React applications have a distinct lifecycle: development with hot reloading, build-time compilation, and static file serving in production. A naive Docker approach would include Node.js, npm, build tools, and all dependencies in the final image just to serve static files. This is wasteful and insecure.

Multi-stage builds let you:
- Build your React app with full Node.js tooling
- Serve the compiled static files with a lightweight web server
- Exclude all build dependencies from the production image
- Reduce image size from 1GB+ to under 50MB

## The Problem with Single-Stage Builds

A single-stage Dockerfile for React includes everything needed for building in the final image, even though you only need static HTML, CSS, and JavaScript files in production.

```dockerfile
# BAD: Single stage - includes Node.js, npm, and all dependencies
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install            # All dependencies including devDeps
COPY . .                   # All source code, tests, configs
RUN npm run build          # Build outputs to build/ or dist/

# Installing nginx in a Node image - wasteful
RUN apt-get update && apt-get install -y nginx

# Copy build output to nginx
RUN cp -r build/* /var/www/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Result: 1.5GB+ image with Node.js, npm, all deps, source code
# Only serving ~5MB of static files
```

This approach has several problems:
- Image size is 1.5GB+ instead of under 50MB
- Node.js and npm are installed but never used at runtime
- All source code and development dependencies are exposed
- Larger attack surface with unnecessary packages
- Slower deployments due to image size

## Basic Multi-Stage Build Pattern

The fundamental pattern uses two stages: one for building with Node.js and one for serving with Nginx.

```dockerfile
# Stage 1: Build the React application
# This stage has Node.js and all build dependencies
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first (better caching)
COPY package.json package-lock.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code
COPY . .

# Build the React application
# Output goes to build/ directory (Create React App)
# or dist/ directory (Vite, custom webpack)
RUN npm run build

# Stage 2: Serve with Nginx
# This is the production image - only contains static files
FROM nginx:alpine AS production

# Copy built static files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Result: ~25MB image with only Nginx and static files
# No Node.js, no npm, no source code, no dependencies
```

This reduces your image from 1.5GB+ to approximately 25MB while containing only what is needed to serve your application.

## Understanding the Build Stage

The build stage needs full access to Node.js, npm, and all your project's dependencies to compile your React application.

### Create React App (CRA) Build Stage

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install dependencies
# npm ci is faster and more reliable than npm install for CI/CD
RUN npm ci

# Copy source files
COPY public ./public
COPY src ./src

# Copy configuration files
COPY tsconfig.json ./
# Copy any additional config files your project needs
# COPY .env.production ./

# Build the application
# CRA outputs to build/ directory
RUN npm run build
```

### Vite Build Stage

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Copy Vite config and source
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY index.html ./
COPY src ./src
COPY public ./public

# Vite outputs to dist/ directory by default
RUN npm run build
```

### Next.js Static Export Build Stage

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Next.js static export outputs to out/ directory
# Requires "output: 'export'" in next.config.js
RUN npm run build
```

## Optimizing the Nginx Configuration

The default Nginx configuration works but is not optimized for single-page applications. You need to handle client-side routing and add caching headers.

### Custom Nginx Configuration

Create a file named `nginx.conf` in your project root:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression for faster transfers
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml
               application/javascript application/json;

    # Cache static assets aggressively
    # These files have content hashes in their names
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Do not cache HTML files
    # These need to be fresh to load latest JS/CSS
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Handle client-side routing
    # All routes should serve index.html for React Router to handle
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Health check endpoint for Kubernetes
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Updated Dockerfile with Custom Nginx Config

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=build /app/build /usr/share/nginx/html

# Non-root user for security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Production-Ready Dockerfile

This comprehensive Dockerfile includes all best practices: cache optimization, security hardening, health checks, and proper configuration.

```dockerfile
# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# ============================================
# Stage 2: Build the React application
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package.json package-lock.json ./

# Copy source code
COPY public ./public
COPY src ./src
COPY tsconfig.json ./

# Set build-time environment variables
# These are baked into the build output
ARG REACT_APP_API_URL
ARG REACT_APP_VERSION
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_VERSION=$REACT_APP_VERSION

# Build the application
RUN npm run build

# ============================================
# Stage 3: Production Nginx image
# ============================================
FROM nginx:1.25-alpine AS production

# Install security updates
RUN apk update && apk upgrade --no-cache

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create nginx user directories and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Security: Run as non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

## Environment Variables in React

React applications handle environment variables at build time, not runtime. This has important implications for Docker builds.

### Build-Time Environment Variables

Variables prefixed with `REACT_APP_` (CRA) or `VITE_` (Vite) are embedded into the JavaScript bundle during the build process.

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# These variables are baked into the bundle
ARG REACT_APP_API_URL=https://api.example.com
ARG REACT_APP_FEATURE_FLAG=true

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_FEATURE_FLAG=$REACT_APP_FEATURE_FLAG

RUN npm run build
```

Build with custom values:

```bash
docker build \
  --build-arg REACT_APP_API_URL=https://api.production.com \
  --build-arg REACT_APP_FEATURE_FLAG=false \
  -t my-react-app .
```

### Runtime Environment Variables

For true runtime configuration, you need to inject values when the container starts. This requires a shell script that modifies the built files.

Create `env.sh`:

```bash
#!/bin/sh

# Replace placeholder with runtime environment variable
# This runs when the container starts
for file in /usr/share/nginx/html/static/js/*.js; do
    sed -i "s|RUNTIME_API_URL_PLACEHOLDER|${API_URL}|g" "$file"
done

# Start nginx
exec nginx -g 'daemon off;'
```

Update your React code to use the placeholder:

```javascript
// config.js
export const API_URL = process.env.REACT_APP_API_URL || 'RUNTIME_API_URL_PLACEHOLDER';
```

Updated Dockerfile:

```dockerfile
FROM nginx:alpine AS production

COPY --from=build /app/build /usr/share/nginx/html
COPY env.sh /docker-entrypoint.d/40-env.sh
RUN chmod +x /docker-entrypoint.d/40-env.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Using .dockerignore

A proper `.dockerignore` file speeds up builds and prevents unnecessary files from being included in the build context.

```
# Dependencies - will be installed fresh
node_modules
npm-debug.log
yarn-error.log
.pnpm-store

# Build outputs - will be regenerated
build
dist
.next
out

# Development files
.git
.gitignore
*.md
LICENSE
docs

# IDE and editor files
.vscode
.idea
*.swp
*.swo
.DS_Store
Thumbs.db

# Test files - not needed in production
__tests__
*.test.js
*.test.jsx
*.test.ts
*.test.tsx
*.spec.js
*.spec.jsx
*.spec.ts
*.spec.tsx
coverage
jest.config.js
cypress
cypress.json

# Environment files - secrets should not be in images
.env
.env.local
.env.development
.env.test
!.env.example
!.env.production

# Docker files
Dockerfile*
docker-compose*
.dockerignore

# CI/CD
.github
.gitlab-ci.yml
.circleci
.travis.yml
Jenkinsfile

# Storybook
.storybook
storybook-static

# Misc
*.log
*.tmp
*.temp
```

## Layer Caching Optimization

Docker caches each layer. Order your Dockerfile instructions from least to most frequently changed to maximize cache hits.

```dockerfile
# 1. Base image - changes very rarely
FROM node:20-alpine AS build

# 2. Working directory - never changes
WORKDIR /app

# 3. Package files - change when dependencies change
# These are copied BEFORE source code for better caching
COPY package.json package-lock.json ./

# 4. Install dependencies - only reruns when package files change
RUN npm ci

# 5. Copy config files - change occasionally
COPY tsconfig.json ./
COPY vite.config.ts ./

# 6. Copy source code - changes most frequently
# This should be last to maximize cache usage
COPY public ./public
COPY src ./src

# 7. Build - runs whenever source changes
RUN npm run build
```

With this ordering, if you only change source code (step 6), steps 1-5 use cached layers. The `npm ci` step (often the slowest) only reruns when package.json changes.

## Alternative Base Images

You can use different base images depending on your requirements.

### Using Caddy Instead of Nginx

Caddy has automatic HTTPS and simpler configuration:

```dockerfile
# Build stage (same as before)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production with Caddy
FROM caddy:2-alpine AS production

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Copy built files
COPY --from=build /app/build /srv

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
```

Caddyfile:

```
:80 {
    root * /srv

    # Enable gzip
    encode gzip

    # Serve static files
    file_server

    # Handle SPA routing
    try_files {path} /index.html

    # Cache static assets
    @static {
        path *.js *.css *.png *.jpg *.jpeg *.gif *.ico *.svg *.woff *.woff2
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    # Health check
    respond /health 200
}
```

### Using Distroless for Minimal Attack Surface

For maximum security, use a distroless image with a statically compiled server:

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Build static file server (using a Go-based server)
FROM golang:1.21-alpine AS server-build
WORKDIR /app
RUN go install github.com/nicholasjackson/static-server@latest

# Distroless production image
FROM gcr.io/distroless/static-debian12 AS production

COPY --from=server-build /go/bin/static-server /static-server
COPY --from=build /app/build /public

EXPOSE 8080

CMD ["/static-server", "-path=/public", "-port=8080"]
```

## TypeScript React Project

For TypeScript projects, you might want to run type checking as part of the build:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

# Run type checking first
# This fails fast if there are type errors
RUN npm run typecheck

# Build the application
RUN npm run build

FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Add the typecheck script to your package.json:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "react-scripts build"
  }
}
```

## Vite-Specific Dockerfile

Vite has become the preferred build tool for React applications. Here is an optimized Dockerfile for Vite projects:

```dockerfile
# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy package and config files
COPY package.json package-lock.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./

# Copy source files
COPY index.html ./
COPY src ./src
COPY public ./public

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_APP_VERSION
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application (outputs to dist/)
RUN npm run build

# ============================================
# Stage 3: Production image
# ============================================
FROM nginx:1.25-alpine AS production

# Security updates
RUN apk update && apk upgrade --no-cache

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Add custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite build output (dist/ not build/)
COPY --from=build /app/dist /usr/share/nginx/html

# Set ownership
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

## Multi-Architecture Builds

Build images that run on both Intel/AMD (amd64) and Apple Silicon/AWS Graviton (arm64):

```bash
# Create buildx builder with multi-architecture support
docker buildx create --name multiarch --driver docker-container --use

# Build for multiple platforms and push to registry
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myregistry/my-react-app:latest \
  --push \
  .
```

## GitHub Actions CI/CD Pipeline

Automate building and deploying your containerized React app:

```yaml
name: Build and Deploy React App

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            REACT_APP_API_URL=${{ vars.API_URL }}
            REACT_APP_VERSION=${{ github.sha }}

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'HIGH,CRITICAL'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

## Docker Compose for Development

Use Docker Compose for local development with hot reloading:

```yaml
version: '3.8'

services:
  # Development container with hot reloading
  react-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    environment:
      - REACT_APP_API_URL=http://localhost:8080

  # Production container for testing
  react-prod:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - REACT_APP_API_URL=http://api.example.com
    ports:
      - "8080:80"
```

Dockerfile.dev for development:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# Start development server with hot reloading
CMD ["npm", "start"]
```

## Debugging Container Builds

When your build fails, use these techniques to debug:

### Build with Verbose Output

```bash
# Show all build output (not just errors)
docker build --progress=plain -t my-react-app .
```

### Interactive Debug Session

```bash
# Build up to a specific stage
docker build --target build -t my-react-app:debug .

# Start interactive shell in build stage
docker run -it my-react-app:debug sh

# Now you can inspect the build output
ls -la /app/build
```

### Check Build Context Size

```bash
# See what is being sent to Docker daemon
docker build -t my-react-app . 2>&1 | head -5

# Output shows: "Sending build context to Docker daemon  XXX MB"
# If XXX is large, improve your .dockerignore
```

## Security Best Practices

### Scan for Vulnerabilities

```bash
# Install Trivy
brew install trivy  # macOS
# or
apt-get install trivy  # Debian/Ubuntu

# Scan your image
trivy image my-react-app:latest

# Fail on HIGH or CRITICAL vulnerabilities
trivy image --exit-code 1 --severity HIGH,CRITICAL my-react-app:latest
```

### Add Security Headers

Update your nginx.conf with comprehensive security headers:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.example.com;" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Performance Optimization

### Enable Brotli Compression

Brotli provides better compression than gzip for text files:

```nginx
# nginx.conf with Brotli (requires ngx_brotli module)
server {
    listen 80;
    root /usr/share/nginx/html;

    # Brotli compression (better than gzip)
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css text/xml text/javascript
                 application/javascript application/json
                 application/xml image/svg+xml;

    # Fallback to gzip for older clients
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Use nginx with Brotli module:

```dockerfile
FROM fholzer/nginx-brotli:latest AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Size Comparison

| Configuration | Image Size | Notes |
|--------------|------------|-------|
| Single stage with node:20 | ~1.5 GB | Includes Node.js, npm, all dependencies |
| Single stage with node:20-alpine | ~500 MB | Smaller base, still includes everything |
| Multi-stage with nginx:alpine | ~25-40 MB | Just Nginx and static files |
| Multi-stage with nginx-slim | ~20-30 MB | Minimal Nginx |
| Multi-stage with Caddy | ~35-45 MB | Automatic HTTPS support |
| Multi-stage with distroless | ~15-25 MB | Minimal attack surface |

## Troubleshooting Common Issues

### Build Fails with Memory Error

React builds can be memory-intensive:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# Increase Node.js memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

### Cannot Find Module Errors

Ensure all required files are copied:

```dockerfile
# Copy all config files that might be needed
COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY .babelrc ./             # If using Babel
COPY postcss.config.js ./    # If using PostCSS
COPY tailwind.config.js ./   # If using Tailwind
```

### 404 on Page Refresh

Your nginx config needs to handle SPA routing:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Environment Variables Not Working

Remember that React environment variables are baked in at build time:

```bash
# Build with environment variables
docker build \
  --build-arg REACT_APP_API_URL=https://api.prod.com \
  -t my-app .
```

## Summary Table

| Technique | Benefit | When to Use |
|-----------|---------|-------------|
| **Multi-stage builds** | 95%+ smaller images | Always |
| **nginx:alpine** | Lightweight web server | Most deployments |
| **Layer caching** | Faster rebuilds | Development |
| **.dockerignore** | Smaller build context, faster builds | Always |
| **Non-root user** | Security hardening | Production |
| **Health checks** | Kubernetes/orchestrator integration | Production |
| **Build args** | Environment-specific builds | CI/CD pipelines |
| **Cache mounts** | Faster npm installs | Development |
| **Distroless** | Minimal attack surface | High-security environments |
| **Multi-arch builds** | ARM64/AMD64 support | Cloud deployments |
| **Security scanning** | Vulnerability detection | CI/CD pipelines |
| **Brotli compression** | Faster page loads | Production |

## Conclusion

Multi-stage Docker builds are essential for containerizing React applications in production. They allow you to:

1. Separate build-time dependencies from runtime requirements
2. Create minimal production images (25MB vs 1.5GB+)
3. Reduce security attack surface
4. Speed up deployments with smaller images
5. Optimize caching for faster rebuilds

Start with the basic two-stage pattern (Node.js build + Nginx serve), then add optimizations like cache mounts, security hardening, and health checks as your deployment requirements grow.

For more container optimization techniques, check out our guides on [shrinking and hardening Docker images](https://oneuptime.com/blog/post/2025-11-27-shrink-and-harden-docker-images/view) and [building production Docker images with GitHub Actions](https://oneuptime.com/blog/post/2025-11-27-docker-github-actions-ci/view).
