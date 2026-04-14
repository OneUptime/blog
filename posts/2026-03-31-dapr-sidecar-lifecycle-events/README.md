# How to Understand Dapr Sidecar Lifecycle Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Lifecycle, Kubernetes, Observability

Description: Understand the startup, ready, and shutdown lifecycle events of the Dapr sidecar and how they interact with your application container in Kubernetes.

---

The Dapr sidecar (daprd) runs alongside your application container in the same Kubernetes pod. Understanding its lifecycle is essential for avoiding startup race conditions, graceful shutdown issues, and unexpected connection errors. This post walks through each lifecycle phase and what happens during it.

## Sidecar Injection

When a pod is created with the `dapr.io/enabled: "true"` annotation, the Dapr injector webhook adds the `daprd` container automatically before the pod starts.

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "my-service"
  dapr.io/app-port: "8080"
```

The sidecar runs as a regular container alongside your application in the same pod.

## Startup Phase

During startup, daprd:
1. Connects to the Dapr control plane (operator, placement service for actors)
2. Loads all component definitions from Kubernetes CRDs
3. Initializes each component (Redis, Kafka, etc.)
4. Starts its HTTP and gRPC API servers on ports 3500 and 50001
5. Optionally calls your app's health endpoint if app health checks are enabled via `dapr.io/enable-app-health-check: "true"` (the default health check path is `/healthz`)

Only after these steps does daprd report itself as ready.

You can observe startup in logs:

```bash
kubectl logs my-pod -c daprd | grep -E "component|ready|starting"
```

## Ready Signal

Dapr exposes a readiness endpoint you can probe directly:

```bash
curl http://localhost:3500/v1.0/healthz
# HTTP 204 = ready
```

Kubernetes readiness probes on the sidecar use this endpoint. Until Dapr is ready, the pod will not receive traffic.

## App-to-Dapr Ordering

A common issue is the application starting and immediately trying to call Dapr APIs before daprd has finished loading components. To avoid this, your application should check the Dapr health endpoint before making API calls:

```bash
curl http://localhost:3500/v1.0/healthz
```

Dapr SDKs include built-in retry logic that handles this automatically. You can also use Kubernetes native sidecars (available in Kubernetes 1.29+) by setting `dapr.io/sidecar-container: "true"` to ensure the sidecar starts before the application container.

## Shutdown Phase

When a pod receives a SIGTERM (during rolling updates or node drains), Kubernetes sends it to all containers. Dapr handles shutdown gracefully:

1. Stops accepting new requests
2. Waits for in-flight requests to complete
3. Flushes pending telemetry
4. Closes component connections
5. Exits

You can control the grace period:

```yaml
annotations:
  dapr.io/graceful-shutdown-seconds: "5"
```

## Sidecar Container Image

The Dapr sidecar runs using the `daprio/daprd` container image. In air-gapped environments, you may need to pre-pull the sidecar image.

```bash
docker pull daprio/daprd:1.14.0
```

## Observing Lifecycle Events in Logs

Enable JSON logging for structured lifecycle events:

```yaml
annotations:
  dapr.io/log-as-json: "true"
  dapr.io/log-level: "debug"
```

Then filter for lifecycle-related log entries:

```bash
kubectl logs my-pod -c daprd | jq 'select(.msg | test("start|ready|shutdown|component"))'
```

## Summary

The Dapr sidecar goes through distinct startup, ready, and shutdown phases that directly affect your application's reliability. Understanding these phases helps you configure the right probes, grace periods, and ordering constraints so your services start cleanly and shut down without dropping in-flight requests.
