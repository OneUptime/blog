# How to Configure Docker Health Checks for Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker, Health Check, Readiness, Container

Description: Learn how to configure Docker HEALTHCHECK directives and Dapr health endpoints to ensure containers are restarted or replaced when they become unhealthy.

---

## Health Checks in Dapr Applications

Dapr exposes two health endpoints on every sidecar: `/v1.0/healthz` for liveness and `/v1.0/healthz/outbound` for outbound component readiness. Your application should expose its own health endpoint. Docker uses `HEALTHCHECK` to periodically probe these endpoints and mark containers healthy or unhealthy.

## Adding a Health Endpoint to Your Application

Expose a `/healthz` route that returns `200 OK` when the application is ready:

```javascript
const express = require('express');
const app = express();

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(3000);
```

For more thorough checks, verify internal dependencies:

```javascript
app.get('/healthz', async (req, res) => {
  try {
    await db.ping();
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});
```

## Configuring HEALTHCHECK in Dockerfile

Add a `HEALTHCHECK` instruction to your Dockerfile:

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ ./src/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "src/index.js"]
```

The parameters control behavior:
- `--interval=30s` - check every 30 seconds
- `--timeout=5s` - fail if no response within 5 seconds
- `--start-period=15s` - give the app 15 seconds to start before counting failures
- `--retries=3` - mark unhealthy after 3 consecutive failures

## Checking Health Status

Inspect the health status of a running container:

```bash
docker inspect --format='{{.State.Health.Status}}' order-service
docker inspect --format='{{json .State.Health}}' order-service | jq
```

Watch health status change in real time:

```bash
watch -n 5 "docker inspect --format='{{.State.Health.Status}}' order-service"
```

## Docker Compose Health Checks

Define health checks directly in Docker Compose without modifying the Dockerfile:

```yaml
version: "3.9"
services:
  order-service:
    image: order-service:1.0.0
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/healthz"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3

  order-service-dapr:
    image: daprio/daprd:1.13.0
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3500/v1.0/healthz"]
      interval: 15s
      timeout: 3s
      retries: 5
    depends_on:
      order-service:
        condition: service_healthy
```

Using `condition: service_healthy` ensures the Dapr sidecar only starts after the application container passes its health check.

## Probing the Dapr Sidecar Health

The Dapr sidecar exposes its own health endpoint. Poll it in scripts or `depends_on` conditions:

```bash
until curl -sf http://localhost:3500/v1.0/healthz; do
  echo "Waiting for Dapr sidecar..."
  sleep 2
done
echo "Dapr sidecar is healthy"
```

## Summary

Configuring Docker health checks for Dapr applications involves exposing a `/healthz` endpoint in your app, using the `HEALTHCHECK` Dockerfile directive or Compose `healthcheck` block, and leveraging Dapr's built-in `/v1.0/healthz` endpoint for sidecar readiness. Combining app and sidecar health checks with `depends_on` conditions ensures services start in the correct order and restart automatically when they degrade.
