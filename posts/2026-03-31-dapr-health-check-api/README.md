# How to Use Dapr Health Check API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Health Check, API, Monitoring, Observability

Description: Learn how to use the Dapr Health Check API to query sidecar health, check component connectivity, and build health dashboards for your microservices platform.

---

## Overview

The Dapr Health Check API provides HTTP endpoints that expose sidecar health status and component connectivity. These endpoints are used by Kubernetes probes, monitoring tools, and custom health dashboards. Understanding what each endpoint returns helps you build better observability into your Dapr-based platform.

## Core Health Endpoints

The Dapr sidecar exposes these health-related HTTP endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/v1.0/healthz` | GET | Basic sidecar health |
| `/v1.0/healthz/outbound` | GET | Sidecar and component connectivity |
| `/v1.0/metadata` | GET | Loaded components and app registration |

## Basic Health Check

```bash
curl -i http://localhost:3500/v1.0/healthz
```

Response when healthy:

```text
HTTP/1.1 204 No Content
```

Response when unhealthy (e.g., sidecar still initializing):

```text
HTTP/1.1 500 Internal Server Error
```

## Outbound Health Check

The outbound health check validates not just sidecar health but also that configured components have initialized successfully:

```bash
curl -i http://localhost:3500/v1.0/healthz/outbound
```

This checks:
- All component initialization status
- Dapr HTTP port availability

If any component has not initialized, the endpoint returns `500`.

## Metadata API for Component Health

The metadata API provides comprehensive information about what is loaded and running:

```bash
curl http://localhost:3500/v1.0/metadata | jq .
```

Example response:

```json
{
  "id": "order-service",
  "actors": [
    {"type": "OrderActor", "count": 3}
  ],
  "components": [
    {
      "name": "redis-state",
      "type": "state.redis",
      "version": "v1",
      "capabilities": ["ETAG", "TRANSACTIONAL"]
    },
    {
      "name": "kafka-pubsub",
      "type": "pubsub.kafka",
      "version": "v1",
      "capabilities": []
    }
  ],
  "extended": {
    "daprRuntimeVersion": "1.12.0"
  }
}
```

## Building a Health Check Script

Use the health API in a readiness check script:

```bash
#!/bin/bash
# check-dapr-health.sh

DAPR_HTTP_PORT=${DAPR_HTTP_PORT:-3500}
MAX_RETRIES=30
SLEEP_SECONDS=2

for i in $(seq 1 $MAX_RETRIES); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:${DAPR_HTTP_PORT}/v1.0/healthz)
  if [ "$STATUS" = "204" ]; then
    echo "Dapr sidecar is healthy"
    exit 0
  fi
  echo "Waiting for Dapr sidecar (attempt $i/$MAX_RETRIES)..."
  sleep $SLEEP_SECONDS
done

echo "Dapr sidecar failed to become healthy"
exit 1
```

## Application Startup Waiting for Dapr

Applications that need Dapr to be ready before initializing should poll the health endpoint at startup:

```javascript
const axios = require('axios');

async function waitForDapr() {
  const daprPort = process.env.DAPR_HTTP_PORT || 3500;
  const url = `http://localhost:${daprPort}/v1.0/healthz`;

  for (let i = 0; i < 30; i++) {
    try {
      const response = await axios.get(url);
      if (response.status === 204) {
        console.log('Dapr sidecar is ready');
        return;
      }
    } catch (err) {
      console.log(`Waiting for Dapr... attempt ${i + 1}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Dapr sidecar did not become ready in time');
}
```

## Summary

The Dapr Health Check API provides simple HTTP endpoints to verify sidecar and component health programmatically. Using `/v1.0/healthz` for basic liveness, `/v1.0/healthz/outbound` for component connectivity, and `/v1.0/metadata` for detailed component information gives you the building blocks for health dashboards, readiness checks, and startup coordination in your microservices platform.
