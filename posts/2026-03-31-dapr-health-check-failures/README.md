# How to Fix Dapr Health Check Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Health Check, Troubleshooting, Kubernetes, Sidecar

Description: Learn how to diagnose and resolve Dapr sidecar health check failures that prevent your application pods from starting or receiving traffic.

---

Dapr health check failures can prevent pods from becoming ready or cause the Dapr sidecar to restart repeatedly. Understanding how Dapr performs health checks is key to diagnosing these issues.

## How Dapr Health Checks Work

The Dapr sidecar exposes a health endpoint at port 3500:

```text
GET http://localhost:3500/v1.0/healthz
```

Kubernetes uses this endpoint in the liveness and readiness probes injected automatically by the Dapr admission webhook. If your application takes a long time to start, the sidecar probe may time out before the app is ready.

## Checking Health Check Status

Inspect pod events for probe failures:

```bash
kubectl describe pod <pod-name> -n <namespace>
```

Look for lines like:

```text
Liveness probe failed: HTTP probe failed with statuscode: 500
Readiness probe failed: Get "http://...": dial tcp: connection refused
```

Also check the daprd container logs:

```bash
kubectl logs <pod-name> -c daprd -n <namespace>
```

## Adjusting Probe Timeouts

If the app needs more time to initialize, annotate the deployment to increase initial delay:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/app-port: "8080"
  dapr.io/sidecar-liveness-probe-delay-seconds: "15"
  dapr.io/sidecar-readiness-probe-delay-seconds: "15"
  dapr.io/sidecar-liveness-probe-period-seconds: "20"
  dapr.io/sidecar-readiness-probe-period-seconds: "20"
  dapr.io/sidecar-liveness-probe-timeout-seconds: "5"
```

## Application Health Endpoint

Dapr can also check your application's health before marking it ready. Configure the app health check via annotations:

```yaml
annotations:
  dapr.io/enable-app-health-check: "true"
  dapr.io/app-health-check-path: "/healthz"
  dapr.io/app-health-probe-interval: "5"
  dapr.io/app-health-probe-timeout: "500"
  dapr.io/app-health-threshold: "3"
```

Your application must return a `200` status at the specified path:

```python
@app.route('/healthz')
def health():
    return '', 200
```

## Testing the Health Endpoint Manually

Exec into the pod and check the Dapr sidecar directly:

```bash
kubectl exec -it <pod-name> -c <app-container> -- \
  curl -s http://localhost:3500/v1.0/healthz
```

A healthy response returns an empty body with a `204 No Content` status code.

## Component Health Failures

If a required component (like a state store) fails to connect, Dapr may report as unhealthy. Check component status:

```bash
dapr components -k --namespace <namespace>
```

Fix the underlying component connectivity issue - incorrect credentials, unreachable host, or wrong port.

## Summary

Dapr health check failures are typically caused by insufficient startup time, misconfigured probe settings, or underlying component connectivity issues. Adjust probe delays using Dapr annotations, ensure your application exposes a health endpoint, and verify all Dapr components initialize successfully.
