# How to Run Node.js Applications in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Podman, Container, JavaScript, DevOps, Linux, Containerization, Docker

Description: Learn how to containerize and run Node.js applications with Podman, from a basic setup to multi-stage production builds with health checks and resource limits.

---

> Containerizing Node.js applications with Podman gives you reproducible builds, consistent environments, and support for rootless execution. No Docker daemon required.

Node.js is one of the most popular runtime environments for building web applications and APIs. Running Node.js applications inside Podman containers provides environment consistency across development, staging, and production, eliminates dependency conflicts, and takes advantage of Podman's rootless architecture for better security. This guide covers everything from running a simple Node.js app to building production-optimized container images with multi-stage builds.

---

## Prerequisites

- A Linux, macOS, or Windows host with Podman installed (version 4.0 or later).
- Node.js installed locally for development (the container handles runtime).
- Basic familiarity with Node.js and npm.

---

## Step 1: Create a Sample Node.js Application

Start with a simple Express.js application to demonstrate the containerization process:

```bash
# Create a project directory

mkdir ~/nodeapp && cd ~/nodeapp

# Initialize a new Node.js project
npm init -y

# Install Express as a dependency
npm install express
```

Create the application file:

```javascript
// server.js
// A simple Express.js web server that responds with JSON

const express = require('express');

const app = express();

// Use PORT from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

// Health check endpoint for container orchestration
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Main route
app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Node.js running in Podman!',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

Create a `.dockerignore` file to exclude unnecessary files from the build context:

```text
# .dockerignore
# Exclude files that should not be copied into the container image

node_modules
npm-debug.log
.git
.gitignore
.env
README.md
Dockerfile
.dockerignore
```

---

## Step 2: Write a Basic Containerfile

Create a `Containerfile` (Podman's equivalent of a Dockerfile - both names work):

```dockerfile
# Containerfile
# Basic Node.js container image

# Use the official Node.js LTS Alpine image for a small footprint
FROM docker.io/library/node:24-alpine

# Create a non-root user for security
# Alpine uses addgroup/adduser instead of groupadd/useradd
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage layer caching
# If package.json hasn't changed, npm install won't re-run
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy the application source code
COPY . .

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Expose the application port (documentation only, does not publish)
EXPOSE 3000

# Set the default command to start the application
CMD ["node", "server.js"]
```

---

## Step 3: Build the Container Image

```bash
# Build the image with a descriptive tag
podman build -t nodeapp:latest ~/nodeapp/

# List images to verify the build
podman images | grep nodeapp

# Check the image size
podman image inspect nodeapp:latest --format '{{.Size}}'
```

---

## Step 4: Run the Container

```bash
# Run the Node.js application container
podman run -d \
  --name nodeapp \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --restart unless-stopped \
  nodeapp:latest

# Verify the container is running
podman ps

# Test the application
curl http://localhost:3000/
curl http://localhost:3000/health
```

Expected output from the health endpoint:

```json
{
  "status": "healthy",
  "uptime": 5.123,
  "timestamp": "2026-03-18T12:00:00.000Z"
}
```

---

## Step 5: Multi-Stage Production Build

For production deployments, use a multi-stage build to minimize image size and reduce the attack surface:

```dockerfile
# Containerfile.production
# Multi-stage build for a production Node.js application

# ---- Stage 1: Build ----
# Use the Node.js LTS Alpine image for building
# Add packages like python3, make, and g++ here if native dependencies require them
FROM docker.io/library/node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies including devDependencies
# (needed if you have a build step like TypeScript compilation)
RUN npm ci

# Copy source code
COPY . .

# Run your build step if applicable (TypeScript, Webpack, etc.)
# RUN npm run build

# Remove devDependencies to keep only production modules
RUN npm prune --omit=dev

# ---- Stage 2: Runtime ----
# Use a minimal base image for the final container
FROM docker.io/library/node:24-alpine AS runtime

# Install dumb-init for proper signal handling in containers
# Node.js does not handle PID 1 responsibilities well on its own
RUN apk add --no-cache dumb-init

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only the production node_modules from the builder stage
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy the application code (or built output)
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Set production environment
ENV NODE_ENV=production

# Expose the port
EXPOSE 3000

# Use dumb-init as PID 1 to properly handle signals (SIGTERM, SIGINT)
# This ensures graceful shutdown works correctly in containers
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
```

Build the production image:

```bash
# Build using the production Containerfile
podman build -f Containerfile.production -t nodeapp:production ~/nodeapp/

# Compare sizes between basic and production builds
podman images | grep nodeapp
```

---

## Step 6: Add a Health Check

Add a health check so Podman can monitor whether your application is responding:

```bash
# Run with a health check that polls the /health endpoint
podman run -d \
  --name nodeapp \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --health-cmd "wget -q --spider http://localhost:3000/health || exit 1" \
  --health-interval 30s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-start-period 10s \
  --restart unless-stopped \
  nodeapp:production

# Check the health status
podman inspect nodeapp --format '{{.State.Health.Status}}'

# View detailed health check results
podman inspect nodeapp --format '{{json .State.Health}}'
```

---

## Step 7: Set Resource Limits

Prevent a Node.js application from consuming excessive resources:

```bash
# Run with memory and CPU limits
podman run -d \
  --name nodeapp \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --memory 512m \
  --cpus 1.0 \
  --restart unless-stopped \
  nodeapp:production
```

When limiting memory, also set the Node.js heap size to stay within bounds:

```bash
# Set both container memory limit and Node.js heap limit
podman run -d \
  --name nodeapp \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NODE_OPTIONS="--max-old-space-size=384" \
  --memory 512m \
  --cpus 1.0 \
  --restart unless-stopped \
  nodeapp:production
```

The `--max-old-space-size` should be lower than the container memory limit to leave room for the stack, native code, and other overhead.

---

## Step 8: Development Mode with Live Reload

During development, mount your source code into the container and use a file watcher:

```bash
# Install nodemon as a dev dependency on the host
cd ~/nodeapp && npm install --save-dev nodemon

# Run the container with source code mounted for live reload
podman run -d \
  --name nodeapp-dev \
  -p 3000:3000 \
  -v ~/nodeapp:/app:Z \
  -w /app \
  -e NODE_ENV=development \
  docker.io/library/node:24-alpine \
  npx nodemon server.js
```

When you edit files on the host, nodemon detects the changes and restarts the application inside the container automatically.

---

## Step 9: Environment Variables and Configuration

Pass configuration through environment variables or an env file:

```bash
# Create an environment file
cat > ~/nodeapp/.env.production << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@db-host:5432/myapp
REDIS_URL=redis://cache-host:6379
LOG_LEVEL=info
EOF

# Run with the environment file
podman run -d \
  --name nodeapp \
  -p 3000:3000 \
  --env-file ~/nodeapp/.env.production \
  --restart unless-stopped \
  nodeapp:production
```

---

## Managing the Container

```bash
# View application logs
podman logs --tail 100 nodeapp

# Follow logs in real time
podman logs -f nodeapp

# Open a shell inside the running container
podman exec -it nodeapp /bin/sh

# Restart the application
podman restart nodeapp

# Stop and remove
podman stop nodeapp
podman rm nodeapp
```

---

## Running as a Systemd Service

```bash
# Generate the systemd unit file
podman generate systemd --name nodeapp --new --files

# Install and enable as a user service for rootless Podman
mkdir -p ~/.config/systemd/user
mv container-nodeapp.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable container-nodeapp.service
systemctl --user start container-nodeapp.service

# Check status
systemctl --user status container-nodeapp.service
```

---

## Conclusion

Running Node.js applications in Podman containers provides reproducible environments, security through rootless execution and non-root users, and straightforward deployment. The multi-stage build pattern keeps production images small by separating build dependencies from runtime dependencies. Health checks and resource limits add production resilience, while volume mounts support a smooth development workflow. Podman's Docker-compatible CLI means existing Dockerfiles and workflows transfer directly, with the added benefits of daemonless operation and native systemd integration.
