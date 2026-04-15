# How to Configure Dapr HTTP Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, Port, Configuration, REST API

Description: Configure Dapr's HTTP API port, customize it to avoid conflicts, and use the HTTP API for state management, pub/sub, and service invocation.

---

## Dapr HTTP Port Overview

Dapr's HTTP API (default port 3500) provides a RESTful interface for your application to interact with Dapr building blocks. This is the most accessible integration path - any language that can make HTTP requests can use Dapr without an SDK.

## Configuring the HTTP Port

Enable Dapr on your pod with annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "inventory-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: inventory-service
        image: inventory-service:latest
```

In Kubernetes, the Dapr sidecar HTTP port defaults to 3500 and is not configurable via annotation. To use a custom HTTP port, configure it in self-hosted mode with the `--dapr-http-port` flag (see the local development section below).

## Using the HTTP API

Once configured, your app can call Dapr over HTTP:

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "order1", "value": {"item": "laptop", "qty": 1}}]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/order1

# Publish a message
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123", "item": "laptop"}'

# Invoke another service
curl http://localhost:3500/v1.0/invoke/checkout/method/placeOrder \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123"}'
```

## Changing the HTTP Port

When port 3500 conflicts with your existing services, use the `--dapr-http-port` flag in self-hosted mode:

```bash
dapr run --app-id inventory-service --dapr-http-port 3600 -- node server.js
```

Update your application to use the new port:

```javascript
// Node.js example
const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || 3500;
const DAPR_BASE_URL = `http://localhost:${DAPR_HTTP_PORT}`;

async function getState(storeName, key) {
  const response = await fetch(`${DAPR_BASE_URL}/v1.0/state/${storeName}/${key}`);
  return response.json();
}
```

## HTTP Max Request Body Size

For large payloads, configure the maximum body size:

```yaml
dapr.io/max-body-size: "16Mi"  # default is 4Mi
```

## HTTP Read Buffer Size

Tune the HTTP read buffer for applications sending large headers:

```yaml
dapr.io/read-buffer-size: "16Ki"  # default is 4Ki
```

## Health Check Endpoint

The Dapr HTTP API includes a health endpoint:

```bash
# Check sidecar health
curl http://localhost:3500/v1.0/healthz

# Check sidecar outbound health
curl http://localhost:3500/v1.0/healthz/outbound
```

Use this in your Kubernetes liveness probe:

```yaml
livenessProbe:
  httpGet:
    path: /v1.0/healthz
    port: 3500
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Local Development with dapr run

```bash
dapr run \
  --app-id inventory-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --components-path ./components \
  -- node server.js
```

## Summary

Dapr's HTTP port provides a universally accessible REST interface to all Dapr building blocks - from state management to pub/sub and service invocation. Customizing the port through annotations is straightforward when defaults conflict, and tuning parameters like max request size and read buffer ensure the HTTP layer performs well for your specific workload characteristics.
