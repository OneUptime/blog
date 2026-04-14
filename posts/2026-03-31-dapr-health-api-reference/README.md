# How to Use the Dapr Health API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Health, API, Readiness, Liveness

Description: A practical reference for the Dapr Health API covering sidecar health checks, app health probes, and outbound health checks for component availability.

---

## Overview

The Dapr Health API provides endpoints to check the health of the Dapr sidecar and its ability to communicate with configured components. These endpoints integrate with Kubernetes liveness and readiness probes, load balancers, and monitoring systems.

## Sidecar Health Check

**GET** `/v1.0/healthz`

Check whether the Dapr sidecar itself is healthy:

```bash
curl http://localhost:3500/v1.0/healthz
```

Returns HTTP 204 when the sidecar is running and ready. Returns HTTP 500 when the sidecar is not ready.

## Sidecar Outbound Health Check

**GET** `/v1.0/healthz/outbound`

Check whether the sidecar can reach all configured components (state stores, pub/sub, bindings):

```bash
curl http://localhost:3500/v1.0/healthz/outbound
```

Unlike `/healthz`, this endpoint does not require the app channel to be established. It confirms that components are initialized and the HTTP port is available, making it useful for applications that need to call Dapr APIs before the app is fully ready.

## Kubernetes Probe Configuration

Configure both probes in your deployment:

```yaml
containers:
  - name: myapp
    image: myapp:latest
    livenessProbe:
      httpGet:
        path: /v1.0/healthz
        port: 3500
      initialDelaySeconds: 10
      periodSeconds: 30
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /v1.0/healthz/outbound
        port: 3500
      initialDelaySeconds: 15
      periodSeconds: 10
      failureThreshold: 5
```

## Application Health Probe

Dapr can also probe your application and pause sidecar operations if the app is unhealthy:

```yaml
annotations:
  dapr.io/enable-app-health-check: "true"
  dapr.io/app-health-check-path: "/health"
  dapr.io/app-health-probe-interval: "30"
  dapr.io/app-health-probe-timeout: "500"
  dapr.io/app-health-threshold: "3"
```

Your app must expose a health endpoint:

```javascript
app.get("/health", (req, res) => {
  const isHealthy = checkDatabaseConnection() && checkCacheConnection();
  if (isHealthy) {
    res.status(200).json({ status: "healthy" });
  } else {
    res.status(500).json({ status: "unhealthy" });
  }
});
```

When the app fails health checks, the sidecar stops forwarding pub/sub messages and binding events until the app recovers.

## Checking Health in Scripts

```bash
#!/bin/bash
MAX_RETRIES=30
RETRY_INTERVAL=2

for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf http://localhost:3500/v1.0/healthz/outbound > /dev/null; then
    echo "Dapr sidecar is ready"
    exit 0
  fi
  echo "Waiting for sidecar... attempt $i/$MAX_RETRIES"
  sleep $RETRY_INTERVAL
done

echo "ERROR: Dapr sidecar did not become ready"
exit 1
```

## Using in Integration Tests

Wait for the sidecar before running tests:

```python
import requests
import time

def wait_for_dapr(port=3500, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"http://localhost:{port}/v1.0/healthz/outbound")
            if r.status_code == 204:
                print("Dapr sidecar ready")
                return
        except requests.ConnectionError:
            pass
        time.sleep(1)
    raise TimeoutError("Dapr sidecar did not become ready in time")
```

## Summary

The Dapr Health API provides two distinct probes: `/healthz` for sidecar process health and `/healthz/outbound` for component connectivity. Use the outbound probe for Kubernetes readiness to prevent traffic from reaching pods before their components are reachable. The app health probe feature lets the sidecar protect unhealthy applications from receiving events until they recover.
