# How to Configure Dapr Sidecar Shutdown Grace Period

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Kubernetes, Graceful Shutdown, Configuration

Description: Configure the Dapr sidecar shutdown grace period to ensure in-flight requests complete and components flush state before the sidecar process exits.

---

When a Kubernetes pod is deleted or evicted, containers receive a SIGTERM signal followed by a forced SIGKILL after a grace period. The Dapr sidecar needs time to drain in-flight requests, flush pending telemetry, and cleanly disconnect from component backends. Configuring the right grace period prevents data loss and dropped requests.

## Default Behavior

By default, Kubernetes gives a pod 30 seconds to terminate gracefully (`terminationGracePeriodSeconds`). The Dapr sidecar uses a subset of that time. If your pod processes long-running requests, the default may not be enough.

## Setting the Sidecar Grace Period

You can configure the Dapr sidecar's graceful shutdown duration using a pod annotation:

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
        dapr.io/graceful-shutdown-seconds: "10"
```

This tells daprd to wait up to 10 seconds for in-flight requests to complete before shutting down.

## Align with Pod Termination Grace Period

Make sure the pod's `terminationGracePeriodSeconds` is greater than the Dapr grace period. Otherwise Kubernetes will force-kill the pod before Dapr finishes shutting down.

```yaml
spec:
  template:
    metadata:
      annotations:
        dapr.io/graceful-shutdown-seconds: "10"
    spec:
      terminationGracePeriodSeconds: 20
```

A good rule: set `terminationGracePeriodSeconds` to at least the Dapr grace period plus a buffer for application-level cleanup.

## How Dapr Shuts Down

When SIGTERM is received, daprd follows these steps:

1. Stops accepting new inbound requests from the app
2. Stops accepting new inbound traffic from other services
3. Waits for in-flight requests to complete (up to the grace period)
4. Flushes telemetry spans to the configured exporter
5. Closes connections to state stores, pub/sub brokers, and other components
6. Exits cleanly

## Observing Shutdown Logs

Enable debug logging to see the shutdown sequence:

```yaml
annotations:
  dapr.io/log-level: "debug"
  dapr.io/log-as-json: "true"
```

Then tail the sidecar logs during a rolling update:

```bash
kubectl logs -f my-pod -c daprd | jq 'select(.msg | test("shutdown|drain|closing"))'
```

## Pre-Stop Hook for Application-Level Draining

For applications that need extra time to finish processing, add a pre-stop hook to the application container:

```yaml
containers:
  - name: order-service
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 5"]
```

This delays the SIGTERM to the application container by 5 seconds, giving the app time to stop accepting new work. Note that the Dapr sidecar receives its own SIGTERM independently and begins its shutdown in parallel.

## Summary

Configuring the Dapr sidecar shutdown grace period ensures that in-flight requests complete and component connections close cleanly before the process exits. Aligning this value with the pod's termination grace period prevents data loss and connection errors during rolling updates and node drains.
