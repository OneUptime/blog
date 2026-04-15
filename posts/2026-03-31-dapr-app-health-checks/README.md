# How to Configure App Health Checks in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Health Check, Application, Configuration, Kubernetes

Description: Learn how to configure Dapr app health checks so the sidecar delays traffic until your application is fully ready and stops routing to unhealthy instances.

---

## Overview

Dapr app health checks allow the sidecar to probe your application's health endpoint before accepting inbound traffic and during normal operation. If your app becomes unhealthy, Dapr stops forwarding incoming requests to it. This prevents failed deployments from receiving traffic and removes unhealthy pods from serving live requests.

## How App Health Checks Work

When app health checks are enabled, the Dapr sidecar periodically calls a health endpoint on your application. If the endpoint returns a status code outside the 200-299 range or fails to respond within the threshold window, Dapr marks the app as unhealthy and stops forwarding incoming service invocations, unsubscribes from pub/sub topics, stops input bindings, and unregisters actor types.

## Configuring App Health Checks via Annotations

The simplest way to enable health checks is through pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "3000"
        dapr.io/enable-app-health-check: "true"
        dapr.io/app-health-check-path: "/healthz"
        dapr.io/app-health-probe-interval: "5"
        dapr.io/app-health-probe-timeout: "500"
        dapr.io/app-health-threshold: "3"
```

- `app-health-check-path`: The health endpoint path on your application (default: `/healthz`)
- `app-health-probe-interval`: Seconds between health probes (default: 5)
- `app-health-probe-timeout`: Milliseconds to wait for a health response before counting as failed (default: 500)
- `app-health-threshold`: Number of consecutive failures before marking the app unhealthy (default: 3)

## Implementing the Health Endpoint

Your application must expose the health endpoint:

```javascript
const express = require('express');
const app = express();

let isReady = false;

// Simulate startup delay
setTimeout(() => { isReady = true; }, 5000);

app.get('/healthz', (req, res) => {
  if (!isReady) {
    return res.status(503).json({ status: 'starting' });
  }
  // Check critical dependencies
  const dbHealthy = checkDatabase();
  if (!dbHealthy) {
    return res.status(503).json({ status: 'db_unavailable' });
  }
  res.status(200).json({ status: 'healthy' });
});

app.listen(3000);
```

In Python:

```python
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/healthz')
def health():
    try:
        db.ping()  # Check DB connection
        return jsonify(status='healthy'), 200
    except Exception as e:
        return jsonify(status='unhealthy', error=str(e)), 503
```

## Configuring via CLI Flags

When running Dapr in self-hosted mode, you can enable and configure app health checks using CLI flags with `daprd`:

```bash
daprd --app-id order-service \
  --app-port 3000 \
  --enable-app-health-check \
  --app-health-check-path /healthz \
  --app-health-probe-interval 5 \
  --app-health-probe-timeout 500 \
  --app-health-threshold 3
```

## Observing Health Check Events

Watch sidecar logs for health check results:

```bash
kubectl logs deployment/order-service -c daprd \
  | grep -i "health\|probe" | tail -20
```

You will see entries like:
- `App is healthy`
- `App is unhealthy, pausing inbound traffic`
- `App has recovered, resuming inbound traffic`

## Summary

Dapr app health checks prevent traffic from reaching applications that are not yet ready or have become unhealthy. Configuring the health endpoint path, probe interval, and failure threshold through annotations or a Configuration resource ensures graceful startup and automatic traffic isolation when your service encounters problems.
