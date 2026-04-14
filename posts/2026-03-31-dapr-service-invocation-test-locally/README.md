# How to Test Dapr Service Invocation Locally Before Deploying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Local Development, Service Invocation, Self-Hosted

Description: Learn how to test Dapr service invocation locally using the Dapr CLI, multi-app run, and mocking techniques before deploying to a Kubernetes cluster.

---

## Why Test Locally First

Testing service invocation locally saves time compared to deploying to Kubernetes for every change. Dapr's self-hosted mode provides full service invocation capabilities using mDNS for discovery.

## Starting Multiple Services Locally

Use `dapr run` for each service in separate terminals:

```bash
# Terminal 1 - Start order-service
dapr run \
  --app-id order-service \
  --app-port 3001 \
  --dapr-http-port 3501 \
  -- node order-service.js

# Terminal 2 - Start inventory-service
dapr run \
  --app-id inventory-service \
  --app-port 3002 \
  --dapr-http-port 3502 \
  -- node inventory-service.js
```

## Using Multi-App Run

For more than two services, use the multi-app run configuration:

```yaml
# dapr.yaml
version: 1
apps:
  - appID: order-service
    appDirPath: ./order-service
    appPort: 3001
    daprHTTPPort: 3501
    command: ["node", "app.js"]

  - appID: inventory-service
    appDirPath: ./inventory-service
    appPort: 3002
    daprHTTPPort: 3502
    command: ["node", "app.js"]

  - appID: payment-service
    appDirPath: ./payment-service
    appPort: 3003
    daprHTTPPort: 3503
    command: ["node", "app.js"]
```

Start all services:

```bash
dapr run -f dapr.yaml
```

## Testing Invocation Manually

Once services are running, test invocation:

```bash
# Call order-service from the command line (using its sidecar)
curl http://localhost:3501/v1.0/invoke/inventory-service/method/items/42

# Or call via a running service's sidecar
curl http://localhost:3502/v1.0/invoke/order-service/method/orders
```

## Writing Integration Tests

```javascript
const axios = require('axios');

describe('Order Service Integration', () => {
  beforeAll(async () => {
    // Services started via dapr run in CI
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  it('should create an order via service invocation', async () => {
    const res = await axios.post(
      'http://localhost:3501/v1.0/invoke/order-service/method/orders',
      { item: 'widget', qty: 2 }
    );
    expect(res.status).toBe(200);
    expect(res.data.orderId).toBeDefined();
  });
});
```

## Using the Dapr CLI to Invoke Directly

```bash
# dapr invoke command for quick testing without curl
dapr invoke --app-id order-service --method orders --verb POST \
  --data '{"item": "widget", "qty": 2}'
```

## Checking Discovery Is Working

```bash
# List all running Dapr apps
dapr list
# Should show order-service, inventory-service, payment-service
```

## Summary

Test Dapr service invocation locally using `dapr run` for individual services or `dapr run -f dapr.yaml` for multi-service setups. Use `dapr invoke` for quick CLI-based testing or write integration tests against the local sidecar HTTP port. Invocation features including retries work in self-hosted mode. mTLS is also supported but requires running the Sentry service and configuring certificates.
