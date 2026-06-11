# How to Create Docker Images for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Production, Security, DevOps

Description: Learn best practices for creating production-ready Docker images with security, size optimization, and reliability in mind.

---

Building Docker images for development is straightforward, but creating production-ready images requires careful consideration of security, size, performance, and reliability. This guide covers essential best practices that will help you build robust container images suitable for production environments.

## Use Minimal Base Images

Start with the smallest base image that meets your requirements. Alpine Linux and distroless images significantly reduce attack surface and image size.

```dockerfile
# Instead of using full ubuntu or debian

FROM node:22-alpine

# Or even better for production - distroless
FROM gcr.io/distroless/nodejs22-debian13
```

Distroless images contain only your application and its runtime dependencies, removing shells, package managers, and other utilities that attackers could exploit.

## Multi-Stage Builds

Multi-stage builds allow you to use different images for building and running your application, dramatically reducing final image size.

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Production stage
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/index.js"]
```

This approach keeps build tools, source code, and development dependencies out of your production image.

## Run as Non-Root User

Never run containers as root in production. Create a dedicated user with minimal privileges.

```dockerfile
FROM node:22-alpine

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -D appuser

WORKDIR /app
COPY --chown=appuser:appgroup . .

USER appuser
CMD ["node", "server.js"]
```

Running as non-root limits the damage an attacker can do if they compromise your container.

## Implement Health Checks

Health checks enable Docker and Docker Compose to monitor container health. In Kubernetes, configure liveness, readiness, and startup probes in your Pod specs instead of relying on Dockerfile `HEALTHCHECK`.

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

Your application should expose a health endpoint that verifies critical dependencies like database connections and external services.

## Handle Signals Properly

Containers receive SIGTERM when stopping. Your application must handle this signal to shut down gracefully.

```javascript
// Proper signal handling in Node.js
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    try {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        await database.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Graceful shutdown failed', error);
        process.exit(1);
    }
});
```

Use `exec` form for CMD to ensure signals reach your application directly:

```dockerfile
# Correct - exec form
CMD ["node", "server.js"]

# Avoid - shell form wraps in /bin/sh
CMD node server.js
```

## Configure Logging for Production

Send logs to stdout/stderr so container orchestrators can collect them properly.

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .

# Ensure logs go to stdout
ENV NODE_ENV=production
ENV LOG_FORMAT=json

CMD ["node", "server.js"]
```

In your application, use structured JSON logging for better parsing by log aggregation tools:

```javascript
const log = {
    level: 'info',
    timestamp: new Date().toISOString(),
    message: 'Request processed',
    requestId: req.id,
    duration: 45
};
console.log(JSON.stringify(log));
```

## Security Scanning

Integrate vulnerability scanning into your CI/CD pipeline to catch known vulnerabilities before deployment.

```bash
# Scan with Trivy
trivy image --severity HIGH,CRITICAL myapp:latest

# Scan with Docker Scout
docker scout cves myapp:latest
```

For source and dependency checks before building the image, run a filesystem scan in CI:

```bash
trivy fs --exit-code 1 --severity HIGH,CRITICAL .
```

## Pin Dependencies and Versions

Always pin base image versions and dependency versions to ensure reproducible builds.

```dockerfile
# Pin specific version
FROM node:22.22.3-alpine3.23

# Pin package versions
RUN apk add --no-cache \
    curl=8.19.0-r0 \
    dumb-init=1.2.5-r3
```

Use lock files for application dependencies and consider using a private registry to cache base images.

## Conclusion

Production-ready Docker images require attention to security, size, and operational concerns. By following these practices - using minimal base images, multi-stage builds, non-root users, health checks, proper signal handling, structured logging, and security scanning - you create containers that are secure, efficient, and reliable. Remember that container security is an ongoing process; regularly update base images and scan for vulnerabilities to maintain a strong security posture.
