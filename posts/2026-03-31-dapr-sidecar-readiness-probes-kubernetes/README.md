# How to Configure Dapr Sidecar Readiness Probes on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Readiness Probe, Sidecar, Health Check

Description: Tune Dapr sidecar readiness probe settings to control when pods receive traffic, preventing requests from reaching pods before Dapr components are initialized.

---

## Why Readiness Probes Matter for Dapr

Readiness probes control when Kubernetes adds a pod to the load balancer endpoints. For Dapr pods, the sidecar must complete component initialization (connecting to Redis, Kafka, etc.) before the pod should receive traffic. Without proper readiness settings, pods may receive requests before the sidecar is ready.

## Default Readiness Probe Settings

Dapr's default readiness probe calls `/v1.0/healthz` which returns 204 when the sidecar is healthy:

- `initialDelaySeconds`: 3
- `periodSeconds`: 6
- `failureThreshold`: 3
- `timeoutSeconds`: 3

## Tuning Readiness Probes via Annotations

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-processor"
        dapr.io/app-port: "8080"
        # Wait longer for components to connect
        dapr.io/sidecar-readiness-probe-delay-seconds: "10"
        # Check every 5 seconds
        dapr.io/sidecar-readiness-probe-period-seconds: "5"
        # More lenient failure threshold
        dapr.io/sidecar-readiness-probe-threshold: "10"
        dapr.io/sidecar-readiness-probe-timeout-seconds: "3"
    spec:
      containers:
      - name: order-processor
        image: myregistry/order-processor:v2
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          failureThreshold: 5
```

## Checking Readiness State

```bash
# Port-forward to the sidecar HTTP port
kubectl port-forward pod/order-processor-xxxxxxxxx 3500:3500

# Check basic health
curl -v http://localhost:3500/v1.0/healthz
# HTTP 204 = healthy

# Check outbound component readiness
curl -v http://localhost:3500/v1.0/healthz/outbound
# HTTP 204 = all components initialized
# HTTP 500 = still initializing or component error
```

## Watching Readiness During Deployment

```bash
# Watch pods become ready during a rollout
kubectl rollout status deployment/order-processor

# Check readiness condition directly
kubectl get pods -l app=order-processor -o wide
# Pod shows 0/2 READY until both app and sidecar are ready

# See readiness probe events
kubectl describe pod order-processor-xxxxxxxxx | grep -E "Readiness|READY|probe"
```

## Handling Slow Component Connections

For components that take longer to connect (e.g., Kafka with auth):

```yaml
annotations:
  dapr.io/sidecar-readiness-probe-delay-seconds: "30"
  dapr.io/sidecar-readiness-probe-threshold: "20"
  dapr.io/sidecar-readiness-probe-period-seconds: "5"
```

This allows up to 30 + (20 * 5) = 130 seconds before marking the pod as failed.

## Summary

Dapr sidecar readiness probes use the `/v1.0/healthz` endpoint to verify the sidecar is healthy before accepting traffic. Tune `sidecar-readiness-probe-delay-seconds` and `sidecar-readiness-probe-threshold` for components with longer startup times to prevent premature readiness failures during rolling deployments.
