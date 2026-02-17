# How to Deploy a Node.js Application to App Engine Flexible Environment with Custom Docker Runtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Node.js, Docker, Flexible Environment

Description: A complete guide to deploying Node.js applications on App Engine Flexible Environment using a custom Docker runtime for full control over your environment.

---

App Engine Flexible Environment lets you run applications in Docker containers on Google-managed infrastructure. While it provides built-in runtimes for Node.js, sometimes you need more control - maybe you need specific system libraries, a particular Node.js version, or custom binary dependencies. That is where the custom runtime comes in. You define your own Dockerfile, and App Engine builds and runs it for you.

In this post, I will walk through deploying a Node.js application to App Engine Flex using a custom Docker runtime, covering the Dockerfile, configuration, health checks, and common pitfalls.

## When to Use Custom Runtime vs Built-in Runtime

The built-in Node.js runtime works for straightforward applications. Use a custom runtime when you need:

- A Node.js version not yet supported by the built-in runtime
- Native system dependencies (like ImageMagick, FFmpeg, or specific C libraries)
- Custom OS-level configuration
- Multi-stage builds to reduce container size
- Specific base images for security compliance

## Project Structure

Here is the project structure we will work with:

```
my-node-app/
  src/
    server.js
    routes/
    middleware/
  package.json
  package-lock.json
  Dockerfile
  .dockerignore
  app.yaml
```

## Writing the Dockerfile

The Dockerfile is the core of a custom runtime deployment. Here is a production-ready Dockerfile for a Node.js application:

```dockerfile
# Dockerfile - Custom runtime for App Engine Flexible
# Use a specific Node.js version on Alpine for smaller image size
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source code
COPY src/ ./src/

# --- Production stage ---
FROM node:20-alpine

# Install runtime-only system dependencies if needed
# RUN apk add --no-cache imagemagick ffmpeg

WORKDIR /app

# Copy built node_modules and source from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY package.json ./

# App Engine Flex requires the app to listen on port 8080
ENV PORT=8080
EXPOSE 8080

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Start the application
CMD ["node", "src/server.js"]
```

The multi-stage build keeps the final image small by leaving build tools (Python, make, g++) in the builder stage. Only the compiled node_modules and source code make it to the production image.

## The Application Code

Here is the Node.js server that works with App Engine Flex:

```javascript
// src/server.js - Main application entry point
const express = require("express");
const app = express();

// App Engine Flex sets the PORT environment variable
const PORT = process.env.PORT || 8080;

// Parse JSON request bodies
app.use(express.json());

// Main application route
app.get("/", (req, res) => {
  res.json({
    message: "Hello from App Engine Flex Custom Runtime",
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development"
  });
});

// Health check endpoint - App Engine Flex checks this periodically
app.get("/_ah/health", (req, res) => {
  res.status(200).send("OK");
});

// Liveness check - confirms the process is running
app.get("/_ah/live", (req, res) => {
  res.status(200).send("OK");
});

// Readiness check - confirms the app can handle requests
app.get("/_ah/ready", (req, res) => {
  // Add any readiness checks here (DB connection, cache warmup, etc.)
  res.status(200).send("OK");
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});
```

Two critical things to note. First, the app must listen on the port specified by the `PORT` environment variable (defaults to 8080). Second, the health check endpoints (`/_ah/health`, `/_ah/live`, `/_ah/ready`) are how App Engine determines if your instance is healthy.

## Creating the .dockerignore

Keep your Docker build context clean by ignoring unnecessary files:

```
# .dockerignore - Files to exclude from Docker build
node_modules
npm-debug.log
.git
.gitignore
.env
*.md
tests/
.dockerignore
Dockerfile
app.yaml
```

This is especially important because the Docker build context includes everything in the current directory. Without `.dockerignore`, you would be copying your local `node_modules` directory into the build context even though the Dockerfile installs dependencies fresh.

## Configuring app.yaml

The `app.yaml` for a custom runtime is shorter than you might expect:

```yaml
# app.yaml - App Engine Flexible custom runtime configuration
runtime: custom
env: flex

# Resource allocation per instance
resources:
  cpu: 1
  memory_gb: 0.5
  disk_size_gb: 10

# Scaling configuration
automatic_scaling:
  min_num_instances: 1
  max_num_instances: 10
  cool_down_period_sec: 120
  cpu_utilization:
    target_utilization: 0.6

# Health check configuration
liveness_check:
  path: "/_ah/live"
  check_interval_sec: 30
  timeout_sec: 4
  failure_threshold: 4
  success_threshold: 2

readiness_check:
  path: "/_ah/ready"
  check_interval_sec: 5
  timeout_sec: 4
  failure_threshold: 4
  success_threshold: 2
  app_start_timeout_sec: 300

# Environment variables
env_variables:
  NODE_ENV: "production"

# Network configuration
network:
  forwarded_ports:
    # Add any additional ports if needed
```

The `runtime: custom` tells App Engine to use your Dockerfile. The `env: flex` specifies the Flexible environment.

## Deploying the Application

Deploy with the standard gcloud command:

```bash
# Deploy to App Engine Flexible
gcloud app deploy app.yaml --project=your-project-id
```

The deployment process for Flex with a custom runtime involves several steps:

1. Uploading your source code to Cloud Storage
2. Building the Docker image using Cloud Build
3. Pushing the image to Container Registry
4. Creating new VM instances with your image
5. Running health checks until instances pass
6. Routing traffic to the new instances

This process takes significantly longer than Standard environment deployments - typically 5 to 15 minutes. The Cloud Build step alone can take a few minutes depending on your Docker build complexity.

## Viewing Build Logs

If the deployment fails during the build phase, check the Cloud Build logs:

```bash
# List recent builds
gcloud builds list --limit=5

# View logs for a specific build
gcloud builds log BUILD_ID
```

Common build failures include missing files referenced in the Dockerfile, npm install failures due to missing system dependencies, and syntax errors in the Dockerfile.

## Local Testing

Test your Docker image locally before deploying:

```bash
# Build the image locally
docker build -t my-app .

# Run it with the same port configuration as App Engine
docker run -p 8080:8080 -e PORT=8080 -e NODE_ENV=production my-app

# Test the health endpoint
curl http://localhost:8080/_ah/health
```

This catches most issues before you spend time on a full deployment cycle.

## Handling WebSocket Connections

App Engine Flex supports WebSockets, which is one of the advantages over Standard. Your custom runtime can include WebSocket support:

```javascript
// src/server.js - Adding WebSocket support
const http = require("http");
const WebSocket = require("ws");

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("message", (message) => {
    // Handle incoming messages
    console.log("Received:", message.toString());
    ws.send(JSON.stringify({ echo: message.toString() }));
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

// Use server.listen instead of app.listen for WebSocket support
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server with WebSocket support running on port ${PORT}`);
});
```

## Environment Variables and Secrets

Pass configuration through environment variables in `app.yaml`:

```yaml
env_variables:
  NODE_ENV: "production"
  API_KEY: "your-api-key"  # Not recommended for secrets
```

For sensitive values, use Secret Manager instead:

```javascript
// src/config.js - Load secrets from Secret Manager
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

async function getSecret(secretName) {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: `projects/your-project-id/secrets/${secretName}/versions/latest`,
  });
  return version.payload.data.toString("utf8");
}
```

## Summary

Deploying Node.js to App Engine Flex with a custom runtime gives you the control of Docker with the convenience of App Engine's managed infrastructure. The key pieces are a well-crafted Dockerfile with multi-stage builds, proper health check endpoints in your application, and an `app.yaml` that specifies `runtime: custom`. Deployments take longer than Standard, so test locally with Docker first to catch issues early. Once running, you get automatic scaling, managed SSL, and the full App Engine operational experience.
