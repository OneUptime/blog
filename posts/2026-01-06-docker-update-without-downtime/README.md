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

```yaml
# docker-compose.yml
services:
  api:
    image: myapp:${VERSION:-latest}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

```bash
# Update to new version
VERSION=2.0.0 docker compose up -d

# Or pull and recreate
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

```bash
docker compose up -d --no-deps api
```

### Scale During Update

Temporarily increase replicas:

```bash
# Scale up
docker compose up -d --scale api=4

# Deploy new version
VERSION=2.0.0 docker compose up -d

# Scale back down
docker compose up -d --scale api=2
```

---

## Strategy 2: Blue-Green Deployments with Traefik

Blue-green maintains two identical environments: one live (blue), one staging (green). Updates deploy to green, then traffic switches instantly.

### Traefik Configuration

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  api-blue:
    image: myapp:1.0.0
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.service=api-blue"
      - "traefik.http.services.api-blue.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s

  api-green:
    image: myapp:2.0.0
    labels:
      - "traefik.enable=true"
      # Initially not routed
      - "traefik.http.routers.api-green.rule=Host(`api-staging.example.com`)"
      - "traefik.http.services.api-green.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
```

### Deployment Script

```bash
#!/bin/bash
# blue-green-deploy.sh

NEW_VERSION=$1
CURRENT_COLOR=$(docker compose ps --format json | jq -r 'select(.Service | startswith("api-")) | .Service' | head -1 | sed 's/api-//')

if [ "$CURRENT_COLOR" = "blue" ]; then
  NEW_COLOR="green"
else
  NEW_COLOR="blue"
fi

echo "Deploying $NEW_VERSION to $NEW_COLOR environment"

# Update new environment
sed -i "s|image: myapp:.*|image: myapp:$NEW_VERSION|" docker-compose.yml

# Start new environment
docker compose up -d "api-${NEW_COLOR}"

# Wait for health check
echo "Waiting for health check..."
sleep 30

# Verify health
if ! docker compose exec "api-${NEW_COLOR}" curl -sf http://localhost:3000/health; then
  echo "Health check failed, aborting"
  exit 1
fi

# Switch traffic
echo "Switching traffic to $NEW_COLOR"
docker compose exec traefik sh -c "
  # Update Traefik to route to new color
  # (In practice, update labels or file configuration)
"

# Stop old environment after drain period
echo "Draining old environment..."
sleep 60
docker compose stop "api-${CURRENT_COLOR}"

echo "Deployment complete"
```

---

## Strategy 3: Weighted Traffic Shifting (Canary)

Gradually shift traffic to the new version:

```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.file.filename=/etc/traefik/dynamic.yml"
      - "--providers.file.watch=true"
    volumes:
      - ./traefik:/etc/traefik

  api-v1:
    image: myapp:1.0.0
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.api-v1.loadbalancer.server.port=3000"

  api-v2:
    image: myapp:2.0.0
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.api-v2.loadbalancer.server.port=3000"
```

```yaml
# traefik/dynamic.yml
http:
  routers:
    api:
      rule: "Host(`api.example.com`)"
      service: api-weighted

  services:
    api-weighted:
      weighted:
        services:
          - name: api-v1
            weight: 90
          - name: api-v2
            weight: 10
```

Gradually update weights: 90/10 → 70/30 → 50/50 → 0/100

---

## Graceful Shutdown: Don't Drop Requests

The container must handle SIGTERM properly to complete in-flight requests.

### Node.js Example

```javascript
// server.js
const express = require('express');
const app = express();

const server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});

// Track connections
let connections = new Set();
server.on('connection', conn => {
  connections.add(conn);
  conn.on('close', () => connections.delete(conn));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Close existing connections after timeout
  setTimeout(() => {
    console.log('Forcing shutdown');
    connections.forEach(conn => conn.destroy());
    process.exit(1);
  }, 30000);
});
```

### Python (Flask/Gunicorn)

```python
# gunicorn.conf.py
graceful_timeout = 30
timeout = 60

def on_exit(server):
    print("Shutting down gracefully")
```

```bash
# Run with gunicorn
gunicorn --config gunicorn.conf.py app:app
```

### Dockerfile Configuration

```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY . .
RUN npm install

# Use exec form to receive signals properly
CMD ["node", "server.js"]

# Or with npm (needs signal forwarding)
# CMD ["npm", "start"]
```

**Important:** Shell form (`CMD npm start`) doesn't forward signals. Use exec form or configure npm to forward signals.

### Docker Stop Timeout

```yaml
services:
  api:
    image: myapp
    stop_grace_period: 30s  # Time before SIGKILL
```

---

## Health Checks for Safe Updates

Health checks are critical for zero-downtime updates. Without them, Compose might route traffic to containers that aren't ready.

### Comprehensive Health Check

```yaml
services:
  api:
    image: myapp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      update_config:
        order: start-first
        failure_action: rollback
```

### Health Endpoint

```javascript
app.get('/health', async (req, res) => {
  try {
    // Check dependencies
    await db.query('SELECT 1');
    await redis.ping();

    res.json({ status: 'healthy', timestamp: new Date() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

---

## Nginx/Load Balancer Integration

If using an external load balancer:

### Nginx Upstream

```nginx
upstream api {
    server api1:3000 weight=5;
    server api2:3000 weight=5;
    server api3:3000 backup;  # New version, initially backup
}

server {
    location / {
        proxy_pass http://api;
        proxy_next_upstream error timeout http_502 http_503;
    }
}
```

### Update Process

```bash
# 1. Deploy new version as backup
docker compose up -d api3

# 2. Verify health
curl http://api3:3000/health

# 3. Update nginx to include new server
# 4. Drain old servers by reducing weight
# 5. Remove old servers from upstream
```

---

## Complete Example: Production Update Flow

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  api:
    image: myapp:${VERSION:-latest}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    stop_grace_period: 30s
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
        failure_action: rollback
```

```bash
#!/bin/bash
# deploy.sh

set -e

NEW_VERSION=$1

echo "Deploying version $NEW_VERSION"

# Pull new image
docker compose pull

# Rolling update
VERSION=$NEW_VERSION docker compose up -d --no-deps api

# Wait for rollout
echo "Waiting for rollout..."
sleep 30

# Verify all instances healthy
HEALTHY=$(docker compose ps --format json | jq -r 'select(.Service=="api" and .Health=="healthy")' | wc -l)
TOTAL=$(docker compose ps --format json | jq -r 'select(.Service=="api")' | wc -l)

if [ "$HEALTHY" -ne "$TOTAL" ]; then
  echo "Not all instances healthy, rolling back"
  VERSION=$OLD_VERSION docker compose up -d --no-deps api
  exit 1
fi

echo "Deployment successful"
```

---

## Quick Reference

```bash
# Rolling update (Compose)
docker compose up -d

# Update single service
docker compose up -d --no-deps api

# Scale up during update
docker compose up -d --scale api=4

# Force recreate
docker compose up -d --force-recreate api

# View update progress
docker compose ps
docker compose logs -f api

# Rollback
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
