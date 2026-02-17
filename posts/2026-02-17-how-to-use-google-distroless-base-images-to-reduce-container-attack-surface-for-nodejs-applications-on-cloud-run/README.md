# How to Use Google Distroless Base Images to Reduce Container Attack Surface for Node.js Applications on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Docker, Node.js, Distroless, Cloud Run, Container Security, Google Cloud Platform

Description: Use Google distroless base images to build minimal Node.js containers that reduce the attack surface by removing shells, package managers, and unnecessary OS components for Cloud Run deployments.

---

Most Docker base images ship with a full Linux distribution - bash, apt, curl, wget, and hundreds of other utilities. Your Node.js application does not need any of that. But an attacker who compromises your container absolutely loves having those tools available to escalate their access.

Google's distroless images strip all of that away. They contain only your application runtime and its dependencies - no shell, no package manager, nothing extra. This reduces the attack surface dramatically and results in smaller images that deploy faster on Cloud Run.

Let me show you how to use distroless images for Node.js applications.

## What Is Distroless

Distroless images are maintained by Google and based on Debian. They come in several flavors:

- `gcr.io/distroless/base-debian12` - Base image with glibc
- `gcr.io/distroless/static-debian12` - Static binaries (Go, Rust)
- `gcr.io/distroless/nodejs22-debian12` - Node.js 22 runtime
- `gcr.io/distroless/python3-debian12` - Python 3 runtime
- `gcr.io/distroless/java21-debian12` - Java 21 runtime

The Node.js distroless image contains the Node.js binary and the minimal system libraries it needs. That is it. No bash, no npm, no apt, no ls, no cat.

## The Difference

Here is what you find in a typical Node.js image versus a distroless image:

```
# node:22 (standard image)
$ docker run --rm node:22 sh -c "find /usr/bin | wc -l"
168

# gcr.io/distroless/nodejs22-debian12
$ docker run --rm gcr.io/distroless/nodejs22-debian12 /bin/sh
# Error: /bin/sh not found (there is no shell!)
```

No shell means an attacker who gets remote code execution in your app cannot drop into a terminal, install tools, or explore the filesystem the way they normally would.

## Building the Multi-Stage Dockerfile

Since distroless images have no package manager, you cannot run `npm install` inside them. You use a multi-stage build: install dependencies in a full Node.js image, then copy the result into distroless.

Here is a production Dockerfile for a Node.js application:

```dockerfile
# Stage 1: Install dependencies using the full Node.js image
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files first for better cache utilization
# If dependencies have not changed, this layer is cached
COPY package.json package-lock.json ./

# Install production dependencies only
# --omit=dev skips devDependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# If you have a build step (TypeScript, bundling, etc.)
# RUN npm run build


# Stage 2: Runtime using distroless - minimal attack surface
FROM gcr.io/distroless/nodejs22-debian12

# Copy the application from the builder
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src

# Distroless runs as nonroot user (uid 65534) by default
# No need to create a user manually

# Cloud Run sets PORT environment variable
ENV PORT=8080
EXPOSE 8080

# Distroless uses ENTRYPOINT syntax since there is no shell
# The Node.js binary path is already in the PATH
CMD ["src/server.js"]
```

## The Application Code

A simple Express.js application:

```javascript
// src/server.js
// Express application entry point
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

// Parse JSON request bodies
app.use(express.json());

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Application routes
app.get('/', (req, res) => {
  res.json({ message: 'Running on distroless' });
});

app.get('/api/items', (req, res) => {
  // Your application logic here
  res.json({ items: [] });
});

// Graceful shutdown handling
// Cloud Run sends SIGTERM before stopping the container
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
```

## TypeScript Applications

For TypeScript apps, the build step happens in the builder stage:

```dockerfile
# Stage 1: Build TypeScript
FROM node:22-slim AS builder

WORKDIR /app

# Install all dependencies including devDependencies for building
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

# Copy source and compile
COPY src/ ./src/
RUN npm run build

# Remove devDependencies after building
RUN npm prune --omit=dev


# Stage 2: Runtime with distroless
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

# Copy compiled JavaScript and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV PORT=8080
EXPOSE 8080

# Run the compiled JavaScript
CMD ["dist/server.js"]
```

## Handling Native Modules

Some npm packages include native C/C++ addons (like `bcrypt` or `sharp`). These need to be compiled in the builder stage with the right architecture:

```dockerfile
# Stage 1: Build with native module support
FROM node:22-slim AS builder

# Install build tools for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# Install with native compilation
RUN npm ci --omit=dev

COPY . .

# Stage 2: Distroless runtime
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

CMD ["src/server.js"]
```

The native modules compiled in the builder stage work in the distroless image because both are based on Debian 12 with compatible glibc versions.

## Debugging Distroless Containers

Since distroless images have no shell, debugging is different. Google provides debug variants that include a busybox shell:

```bash
# For local debugging only - never use debug images in production
# The debug variant has a basic shell
docker run --rm -it gcr.io/distroless/nodejs22-debian12:debug sh

# In Cloud Run, use Cloud Logging instead of shell access
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=my-app" \
  --project=my-project \
  --limit=50
```

For production debugging, rely on structured logging and Cloud Trace rather than shell access.

## Deploying to Cloud Run

Push to Artifact Registry and deploy:

```bash
# Build the image
PROJECT_ID="my-project"
REGION="us-central1"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/backend/my-node-app:v1.0.0"

docker build -t ${IMAGE} .
docker push ${IMAGE}

# Deploy to Cloud Run
gcloud run deploy my-node-app \
  --image=${IMAGE} \
  --region=${REGION} \
  --platform=managed \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --allow-unauthenticated
```

## Image Size Comparison

The size difference is significant:

| Base Image | Size |
|-----------|------|
| node:22 | ~1.1 GB |
| node:22-slim | ~250 MB |
| node:22-alpine | ~180 MB |
| distroless/nodejs22-debian12 | ~130 MB |

Distroless is not always the smallest (Alpine can be comparable), but it has an important advantage over Alpine: it uses glibc instead of musl, which means better compatibility with npm packages that have native dependencies.

## Security Scanning Results

Run a vulnerability scan to see the difference:

```bash
# Scan the standard Node.js image
grype node:22
# Typically shows hundreds of vulnerabilities in OS packages

# Scan the distroless image
grype gcr.io/distroless/nodejs22-debian12
# Shows far fewer vulnerabilities since most OS packages are removed
```

The dramatic reduction in CVEs is the main reason security-conscious organizations prefer distroless images.

## CI/CD with Cloud Build

A complete Cloud Build configuration:

```yaml
# cloudbuild.yaml
steps:
  # Build with distroless
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/${_IMAGE}:$SHORT_SHA'
      - '.'

  # Scan for vulnerabilities before deploying
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: bash
    args:
      - '-c'
      - |
        gcloud artifacts docker images scan \
          ${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/${_IMAGE}:$SHORT_SHA \
          --format="value(response.scan)" > /workspace/scan_id.txt

  # Check scan results
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: bash
    args:
      - '-c'
      - |
        gcloud artifacts docker images list-vulnerabilities \
          $(cat /workspace/scan_id.txt) \
          --format="value(vulnerability.effectiveSeverity)" | \
        grep -c CRITICAL | \
        (read count; if [ "$count" -gt "0" ]; then echo "Critical vulnerabilities found"; exit 1; fi)

  # Push if scan passes
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/${_IMAGE}:$SHORT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - '${_IMAGE}'
      - '--image=${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/${_IMAGE}:$SHORT_SHA'
      - '--region=${_REGION}'

substitutions:
  _REGION: us-central1
  _REPO: backend
  _IMAGE: my-node-app
```

## Summary

Distroless images are the best choice for production Node.js containers on Cloud Run. They remove shells, package managers, and unnecessary OS components that attackers exploit. The multi-stage build pattern makes them practical - use a full Node.js image to install dependencies and build, then copy only the runtime artifacts into distroless. The result is a smaller, faster, and significantly more secure container. The only trade-off is that debugging requires logging and tracing rather than shell access, which is how production debugging should work anyway.
