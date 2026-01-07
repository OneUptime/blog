# How to Update Running Containers Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Reliability, Releases, Reverse Proxy

Description: Implement rolling updates with Compose, blue-green deployments with Traefik, and handle graceful shutdown signals to update containers without dropping requests.

Updating containers in production shouldn't mean downtime. Whether you're deploying bug fixes or new features, your users expect continuous service. This guide covers techniques from simple rolling updates to sophisticated blue-green deployments.

---

## The Challenge

A naive update process:
1. Stop old container
2. Pull new image
3. Start new container

Gap between steps 1 and 3 = downtime. Even if it's only seconds, that's dropped requests, broken websockets, and frustrated users.

---

## Strategy 1: Rolling Updates with Docker Compose

Docker Compose can update services without stopping them entirely.

### Basic Rolling Update

This configuration defines a service with rolling update capabilities. The key settings ensure new containers start before old ones stop, and health checks verify the service is ready to receive traffic.

```yaml
# docker-compose.yml
services:
  api:
    image: myapp:${VERSION:-latest}  # Use VERSION env var, default to latest
    deploy:
      replicas: 3  # Run 3 instances for high availability
      update_config:
        parallelism: 1  # Update one container at a time
        delay: 10s  # Wait 10 seconds between updates
        order: start-first  # Start new container before stopping old one
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]  # Check if service responds
      interval: 10s  # Check every 10 seconds
      timeout: 5s  # Fail if no response in 5 seconds
      retries: 3  # Unhealthy after 3 consecutive failures
```

The following commands trigger the rolling update process. Docker Compose will automatically handle the orchestration based on the update_config settings defined above.

```bash
# Update to new version by setting VERSION environment variable
VERSION=2.0.0 docker compose up -d

# Or pull latest images first, then recreate containers
docker compose pull
docker compose up -d
```

**What happens:**
1. New container starts with new image
2. Health check passes
3. Traffic routes to new container
4. Old container stops

### The `--no-deps` Flag

Update a single service without touching dependencies:

This command is useful when you only want to update one specific service without restarting its dependencies like databases or caches.

```bash
# Update only the api service, leave database and other dependencies untouched
docker compose up -d --no-deps api
```

### Scale During Update

Temporarily increase replicas:

Scaling up before deployment ensures you maintain capacity during the update process. This approach provides extra headroom while containers are being replaced.

```bash
# Scale up to 4 replicas to add capacity buffer
docker compose up -d --scale api=4

# Deploy new version while extra replicas handle traffic
VERSION=2.0.0 docker compose up -d

# Scale back down to normal capacity after update completes
docker compose up -d --scale api=2
```

---

## Strategy 2: Blue-Green Deployments with Traefik

Blue-green maintains two identical environments: one live (blue), one staging (green). Updates deploy to green, then traffic switches instantly.

### Traefik Configuration

This setup creates a Traefik reverse proxy with two identical backend services. The blue service handles production traffic while green is prepared for the new version.

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"  # Enable Docker provider for service discovery
      - "--providers.docker.exposedbydefault=false"  # Require explicit exposure
      - "--entrypoints.web.address=:80"  # Listen on port 80
    ports:
      - "80:80"  # Expose HTTP port
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Allow Traefik to read Docker state

  api-blue:
    image: myapp:1.0.0  # Current production version
    labels:
      - "traefik.enable=true"  # Enable Traefik routing
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"  # Route by hostname
      - "traefik.http.routers.api.service=api-blue"  # Point to blue service
      - "traefik.http.services.api-blue.loadbalancer.server.port=3000"  # Container port
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s

  api-green:
    image: myapp:2.0.0  # New version to be deployed
    labels:
      - "traefik.enable=true"
      # Initially not routed - staging only
      - "traefik.http.routers.api-green.rule=Host(`api-staging.example.com`)"
      - "traefik.http.services.api-green.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
```

### Deployment Script

This script automates the blue-green deployment process. It determines which environment is currently active, deploys to the inactive one, validates health, and switches traffic.

```bash
#!/bin/bash
# blue-green-deploy.sh

NEW_VERSION=$1  # Version to deploy, passed as argument

# Determine current active color by checking running containers
CURRENT_COLOR=$(docker compose ps --format json | jq -r 'select(.Service | startswith("api-")) | .Service' | head -1 | sed 's/api-//')

# Toggle to the opposite color for deployment
if [ "$CURRENT_COLOR" = "blue" ]; then
  NEW_COLOR="green"
else
  NEW_COLOR="blue"
fi

echo "Deploying $NEW_VERSION to $NEW_COLOR environment"

# Update the image tag in compose file for new environment
sed -i "s|image: myapp:.*|image: myapp:$NEW_VERSION|" docker-compose.yml

# Start the new environment with updated image
docker compose up -d "api-${NEW_COLOR}"

# Wait for container to pass health checks
echo "Waiting for health check..."
sleep 30

# Verify the new environment is healthy before switching traffic
if ! docker compose exec "api-${NEW_COLOR}" curl -sf http://localhost:3000/health; then
  echo "Health check failed, aborting"
  exit 1
fi

# Switch traffic to new environment by updating Traefik configuration
echo "Switching traffic to $NEW_COLOR"
docker compose exec traefik sh -c "
  # Update Traefik to route to new color
  # (In practice, update labels or file configuration)
"

# Allow existing connections to drain before stopping old environment
echo "Draining old environment..."
sleep 60

# Stop the old environment after drain period
docker compose stop "api-${CURRENT_COLOR}"

echo "Deployment complete"
```

---

## Strategy 3: Weighted Traffic Shifting (Canary)

Gradually shift traffic to the new version:

This configuration sets up Traefik to distribute traffic between two versions. The dynamic configuration file allows you to adjust traffic weights without restarting containers.

```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.file.filename=/etc/traefik/dynamic.yml"  # Load routing from file
      - "--providers.file.watch=true"  # Auto-reload when file changes
    volumes:
      - ./traefik:/etc/traefik  # Mount configuration directory

  api-v1:
    image: myapp:1.0.0  # Current stable version
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.api-v1.loadbalancer.server.port=3000"

  api-v2:
    image: myapp:2.0.0  # New canary version
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.api-v2.loadbalancer.server.port=3000"
```

The dynamic configuration file controls traffic distribution between versions. Adjust the weights to gradually shift traffic from v1 to v2.

```yaml
# traefik/dynamic.yml
http:
  routers:
    api:
      rule: "Host(`api.example.com`)"  # Match requests to this hostname
      service: api-weighted  # Use weighted service for traffic splitting

  services:
    api-weighted:
      weighted:
        services:
          - name: api-v1
            weight: 90  # 90% of traffic to stable version
          - name: api-v2
            weight: 10  # 10% of traffic to canary version
```

Gradually update weights: 90/10 → 70/30 → 50/50 → 0/100

---

## Graceful Shutdown: Don't Drop Requests

The container must handle SIGTERM properly to complete in-flight requests.

### Node.js Example

This implementation tracks active connections and handles the SIGTERM signal gracefully. The server stops accepting new connections while allowing existing requests to complete within a timeout.

```javascript
// server.js
const express = require('express');
const app = express();

// Start the HTTP server
const server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});

// Track all active connections for graceful shutdown
let connections = new Set();

// Add new connections to the set for tracking
server.on('connection', conn => {
  connections.add(conn);
  // Remove connection from set when it closes
  conn.on('close', () => connections.delete(conn));
});

// Handle SIGTERM signal sent by Docker during container stop
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');

  // Stop accepting new connections immediately
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);  // Exit successfully after all connections close
  });

  // Force shutdown after 30 seconds if connections don't close
  setTimeout(() => {
    console.log('Forcing shutdown');
    connections.forEach(conn => conn.destroy());  // Forcefully close remaining connections
    process.exit(1);  // Exit with error code to indicate forced shutdown
  }, 30000);
});
```

### Python (Flask/Gunicorn)

This Gunicorn configuration sets the graceful timeout for worker processes. Workers will have up to 30 seconds to complete ongoing requests before being forcefully terminated.

```python
# gunicorn.conf.py
graceful_timeout = 30  # Seconds to wait for graceful worker shutdown
timeout = 60  # Maximum time for worker to handle a request

def on_exit(server):
    """Called when the server is shutting down"""
    print("Shutting down gracefully")
```

Run your Flask application with Gunicorn using this configuration file.

```bash
# Run with gunicorn using the graceful shutdown configuration
gunicorn --config gunicorn.conf.py app:app
```

### Dockerfile Configuration

This Dockerfile demonstrates the correct way to receive signals in containers. Using the exec form of CMD ensures signals are passed directly to the application process.

```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY . .
RUN npm install

# Use exec form to receive signals properly - this is critical for graceful shutdown
# The exec form ["executable", "arg1"] runs the command directly without a shell
CMD ["node", "server.js"]

# Avoid shell form (CMD npm start) as it doesn't forward signals to Node process
# If using npm, configure it to forward signals: CMD ["npm", "start"]
```

**Important:** Shell form (`CMD npm start`) doesn't forward signals. Use exec form or configure npm to forward signals.

### Docker Stop Timeout

This setting configures how long Docker waits before sending SIGKILL after SIGTERM. Match this with your application's graceful shutdown timeout.

```yaml
services:
  api:
    image: myapp
    stop_grace_period: 30s  # Time Docker waits before SIGKILL after SIGTERM
```

---

## Health Checks for Safe Updates

Health checks are critical for zero-downtime updates. Without them, Compose might route traffic to containers that aren't ready.

### Comprehensive Health Check

This configuration combines health checks with deployment settings to ensure safe rolling updates. The start-first order means new containers must be healthy before old ones stop.

```yaml
services:
  api:
    image: myapp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]  # Health check command
      interval: 10s  # How often to check
      timeout: 5s  # Max time for health check response
      retries: 3  # Failures before marking unhealthy
      start_period: 30s  # Grace period for container startup
    deploy:
      update_config:
        order: start-first  # New container starts before old stops
        failure_action: rollback  # Automatically rollback if update fails
```

### Health Endpoint

This health endpoint checks all critical dependencies before reporting healthy. This ensures traffic only routes to fully functional containers.

```javascript
// Health check endpoint that verifies all dependencies
app.get('/health', async (req, res) => {
  try {
    // Verify database connection is active
    await db.query('SELECT 1');
    // Verify Redis cache is reachable
    await redis.ping();

    // All checks passed - return healthy status
    res.json({ status: 'healthy', timestamp: new Date() });
  } catch (error) {
    // Any dependency failure means unhealthy - return 503 Service Unavailable
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

---

## Nginx/Load Balancer Integration

If using an external load balancer:

### Nginx Upstream

This Nginx configuration defines a backend pool with weighted servers. The backup directive marks the new version server as standby until verified.

```nginx
# Define upstream server pool with weighted distribution
upstream api {
    server api1:3000 weight=5;  # Primary server with weight 5
    server api2:3000 weight=5;  # Primary server with weight 5
    server api3:3000 backup;    # New version as backup, receives traffic only if primaries fail
}

server {
    location / {
        proxy_pass http://api;  # Forward requests to upstream pool
        proxy_next_upstream error timeout http_502 http_503;  # Retry on failures
    }
}
```

### Update Process

These steps outline the manual process for updating containers behind Nginx. This gradual approach ensures zero downtime during deployment.

```bash
# 1. Deploy new version as backup - receives no traffic initially
docker compose up -d api3

# 2. Verify the new container is healthy
curl http://api3:3000/health

# 3. Update nginx to include new server in active rotation
# 4. Drain old servers by reducing their weight gradually
# 5. Remove old servers from upstream after traffic drains
```

---

## Complete Example: Production Update Flow

This comprehensive example combines Traefik, health checks, and rolling updates into a production-ready configuration. It demonstrates all best practices for zero-downtime deployments.

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"  # Enable Docker service discovery
      - "--providers.docker.exposedbydefault=false"  # Require explicit enabling
      - "--entrypoints.web.address=:80"  # HTTP entrypoint
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Docker socket for service discovery

  api:
    image: myapp:${VERSION:-latest}  # Dynamic version via environment variable
    labels:
      - "traefik.enable=true"  # Enable Traefik routing
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"  # Routing rule
      - "traefik.http.services.api.loadbalancer.server.port=3000"  # Container port
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]  # Lightweight health check
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s  # Initial startup grace period
    stop_grace_period: 30s  # Graceful shutdown timeout
    deploy:
      replicas: 2  # Run 2 instances for availability
      update_config:
        parallelism: 1  # Update one at a time
        delay: 10s  # Wait between updates
        order: start-first  # Zero-downtime strategy
        failure_action: rollback  # Auto-rollback on failure
```

This deployment script automates the rolling update process with health verification and automatic rollback capability.

```bash
#!/bin/bash
# deploy.sh

set -e  # Exit immediately on any error

NEW_VERSION=$1  # Version to deploy

echo "Deploying version $NEW_VERSION"

# Pull the new image before starting update
docker compose pull

# Start rolling update with new version
VERSION=$NEW_VERSION docker compose up -d --no-deps api

# Wait for rolling update to complete
echo "Waiting for rollout..."
sleep 30

# Count healthy instances vs total instances
HEALTHY=$(docker compose ps --format json | jq -r 'select(.Service=="api" and .Health=="healthy")' | wc -l)
TOTAL=$(docker compose ps --format json | jq -r 'select(.Service=="api")' | wc -l)

# Verify all instances are healthy, rollback if not
if [ "$HEALTHY" -ne "$TOTAL" ]; then
  echo "Not all instances healthy, rolling back"
  VERSION=$OLD_VERSION docker compose up -d --no-deps api
  exit 1
fi

echo "Deployment successful"
```

---

## Quick Reference

These commands cover the most common operations for zero-downtime container updates.

```bash
# Rolling update (Compose) - updates all services
docker compose up -d

# Update single service without affecting dependencies
docker compose up -d --no-deps api

# Scale up during update for extra capacity
docker compose up -d --scale api=4

# Force recreate containers even if unchanged
docker compose up -d --force-recreate api

# View update progress and container status
docker compose ps
docker compose logs -f api

# Rollback by deploying previous version
docker compose up -d --no-deps api  # with old VERSION
```

---

## Summary

- Never stop containers before starting replacements
- Use health checks to verify readiness before routing traffic
- Implement graceful shutdown to complete in-flight requests
- Use `start-first` order in Compose for zero-gap updates
- Consider blue-green or canary for critical services
- Configure adequate stop grace periods
- Test your update process before you need it in production

Zero-downtime updates aren't magic - they're careful orchestration of health checks, traffic routing, and graceful shutdowns.
