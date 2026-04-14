# How to Configure Sidecar Health Checks in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Health Check, Sidecar, Kubernetes, Liveness

Description: Learn how Dapr sidecar health checks work, how Kubernetes uses them for liveness and readiness probes, and how to monitor sidecar health in production.

---

## Overview

The Dapr sidecar exposes its own health endpoint that Kubernetes uses for liveness and readiness probes. These probes ensure that pods with unhealthy sidecars are restarted or removed from service endpoints. Understanding how sidecar health checks work helps you tune probe settings for your deployment speed and availability requirements.

## Dapr Sidecar Health Endpoint

The Dapr sidecar exposes a health endpoint at:

```text
GET http://localhost:3500/v1.0/healthz
```

This endpoint returns `204 No Content` when the sidecar is healthy. It returns an error when the sidecar has not yet completed initialization or is in a degraded state.

## How Dapr Configures Kubernetes Probes

When Dapr injects the sidecar via the admission webhook, it automatically adds liveness and readiness probes to the sidecar container. The default configuration:

```yaml
livenessProbe:
  httpGet:
    path: /v1.0/healthz
    port: 3500
  initialDelaySeconds: 3
  periodSeconds: 6
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /v1.0/healthz
    port: 3500
  initialDelaySeconds: 3
  periodSeconds: 6
  failureThreshold: 3
```

## Customizing Probe Settings via Annotations

Override the default probe settings on your pod:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "my-service"
  dapr.io/sidecar-liveness-probe-delay-seconds: "10"
  dapr.io/sidecar-liveness-probe-period-seconds: "5"
  dapr.io/sidecar-liveness-probe-threshold: "5"
  dapr.io/sidecar-readiness-probe-delay-seconds: "5"
  dapr.io/sidecar-readiness-probe-period-seconds: "5"
  dapr.io/sidecar-readiness-probe-threshold: "3"
```

Increase `liveness-probe-delay-seconds` if the sidecar takes longer to initialize in your environment (e.g., slow secret resolution or large component loading).

## Checking Sidecar Health Manually

During debugging, check sidecar health directly from within the pod:

```bash
kubectl exec -it my-pod -c daprd -- wget -qO- http://localhost:3500/v1.0/healthz
# Expected: 204 (no body for healthy)

# Or from within the app container
kubectl exec -it my-pod -c my-app -- wget -qO- http://localhost:3500/v1.0/healthz
```

## Sidecar Readiness Blocking App Traffic

The Dapr sidecar waits for your app to be ready before accepting incoming traffic. Combined with sidecar readiness probes, this creates a two-way readiness gate:

1. Kubernetes marks the sidecar as ready when `/v1.0/healthz` returns 204
2. The sidecar waits for the app health check to pass before accepting inbound calls
3. Only after both are healthy does traffic flow to the pod

## Monitoring Sidecar Health Over Time

Set up alerts for sidecar restarts (indicating probe failures):

```bash
kubectl get events --field-selector reason=Unhealthy \
  --sort-by='.metadata.creationTimestamp' | grep daprd
```

Prometheus query for sidecar restart rate:

```text
rate(kube_pod_container_status_restarts_total{container="daprd"}[5m]) > 0
```

## Summary

Dapr sidecar health checks are automatically configured as Kubernetes liveness and readiness probes when the sidecar is injected. Customizing the probe delays and thresholds through annotations lets you balance between fast failure detection and tolerating normal startup latency, ensuring robust pod lifecycle management in your Dapr deployment.
