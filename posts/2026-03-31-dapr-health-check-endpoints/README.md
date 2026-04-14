# How to Set Up Dapr Health Check Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Health, Monitoring, Kubernetes, Sidecar

Description: Set up and use Dapr health check endpoints to verify sidecar readiness, check outbound component availability, and implement startup sequencing for Dapr-enabled services.

---

## Dapr Health Check Endpoints

The Dapr sidecar exposes several health check endpoints that you can use for Kubernetes probes, startup sequencing, and operational monitoring:

| Endpoint | Purpose |
|----------|---------|
| `/v1.0/healthz` | Sidecar is running and healthy |
| `/v1.0/healthz/outbound` | Sidecar and all components are initialized |
| `/v1.0/metadata` | Full sidecar metadata including component status |

## Configuring Kubernetes Liveness Probe

Dapr's sidecar injector automatically adds liveness and readiness probes to the daprd sidecar container. You can customize the probe settings using Dapr annotations on your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-app"
        dapr.io/sidecar-liveness-probe-delay-seconds: "10"
        dapr.io/sidecar-liveness-probe-period-seconds: "10"
        dapr.io/sidecar-liveness-probe-threshold: "3"
        dapr.io/sidecar-readiness-probe-delay-seconds: "5"
        dapr.io/sidecar-readiness-probe-period-seconds: "5"
        dapr.io/sidecar-readiness-probe-threshold: "3"
    spec:
      containers:
        - name: app
          image: my-app:latest
```

Note: Port 3500 is the default Dapr HTTP port on the sidecar. The injected probes target `/v1.0/healthz` on this port automatically.

## Configuring Readiness Probe with Outbound Check

You can also check the outbound health endpoint directly from your application. The `/v1.0/healthz/outbound` endpoint verifies that all Dapr components are initialized and the HTTP port is available, without requiring the app channel to be established. This is useful for startup sequencing — your app can call Dapr APIs (like the secrets API) before the app channel is ready.

The outbound endpoint returns HTTP 204 when the sidecar and all components are initialized, or HTTP 500 otherwise.

## Waiting for Dapr to Be Ready at App Startup

Implement startup sequencing in your application to wait for the Dapr sidecar:

```python
import time
import requests
import logging

logger = logging.getLogger(__name__)

def wait_for_dapr(max_retries: int = 30, delay: float = 1.0):
    """Wait for Dapr sidecar to be ready before starting the app."""
    for attempt in range(max_retries):
        try:
            response = requests.get(
                "http://localhost:3500/v1.0/healthz/outbound",
                timeout=2
            )
            if response.status_code == 204:
                logger.info("Dapr sidecar is ready")
                return True
        except requests.exceptions.RequestException:
            pass

        logger.info(f"Waiting for Dapr... attempt {attempt + 1}/{max_retries}")
        time.sleep(delay)

    raise RuntimeError("Dapr sidecar did not become ready in time")

# Call at application startup
wait_for_dapr()
# Now safe to use Dapr APIs
```

## Checking Component Health via Metadata API

Get detailed component health status:

```bash
curl http://localhost:3500/v1.0/metadata | python3 -m json.tool | grep -A 5 "components"
```

Response includes each registered component's details:

```json
{
  "components": [
    {
      "name": "statestore",
      "type": "state.redis",
      "version": "v1",
      "capabilities": ["ETAG", "TRANSACTIONAL"]
    }
  ]
}
```

## Implementing Health Check in Your App

Expose your own health endpoint that checks Dapr component availability:

```javascript
app.get('/health', async (req, res) => {
  try {
    const daprHealth = await fetch('http://localhost:3500/v1.0/healthz/outbound');
    if (daprHealth.status !== 204) {
      return res.status(503).json({ status: 'degraded', reason: 'dapr-not-ready' });
    }
    res.status(200).json({ status: 'healthy' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', reason: err.message });
  }
});
```

## Summary

Dapr provides `/v1.0/healthz` for basic sidecar health and `/v1.0/healthz/outbound` for component initialization checks. Both endpoints return HTTP 204 when healthy. Dapr's sidecar injector automatically configures liveness and readiness probes on the sidecar container, which you can customize via annotations. Implement startup sequencing in your application to wait for the sidecar before making Dapr API calls, preventing race conditions during pod initialization.
