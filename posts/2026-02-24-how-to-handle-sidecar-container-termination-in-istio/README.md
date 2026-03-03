# How to Handle Sidecar Container Termination in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Termination, Kubernetes, Graceful Shutdown

Description: How to properly handle sidecar container termination in Istio to prevent dropped connections and ensure graceful shutdown of mesh workloads.

---

Graceful shutdown is one of those things that's easy to get wrong with Istio. When a pod is terminated, both your application and the sidecar proxy receive SIGTERM at the same time. If the sidecar shuts down before your application finishes draining connections, you'll see dropped requests, failed outbound calls, and unhappy users. Here's how to configure termination properly.

## The Termination Sequence

When Kubernetes decides to terminate a pod (due to a deployment update, scale-down, or node drain), this happens:

1. The pod is removed from Service endpoints (so new traffic stops arriving)
2. The pod's `preStop` hooks run on all containers simultaneously
3. SIGTERM is sent to all containers simultaneously
4. Containers have `terminationGracePeriodSeconds` to shut down
5. After the grace period, SIGKILL is sent to any remaining containers

The problem is that steps 1 and 2-3 happen asynchronously. There's a brief window where the pod is still receiving traffic even though it's being terminated. And the sidecar might exit before your application finishes handling those in-flight requests.

## The Default Behavior

By default, Istio configures the sidecar with:
- A `preStop` hook that sends a SIGTERM to the proxy
- A drain duration (configurable, defaults to 5 seconds)

During the drain period, the sidecar:
- Stops accepting new connections
- Continues processing existing connections
- Returns 503 for health checks (signaling to load balancers)

## Configuring terminationDrainDuration

The `terminationDrainDuration` controls how long the sidecar waits for active connections to finish after receiving SIGTERM:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 30s
```

Or per-workload:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 30s
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

Set this to at least as long as your application's shutdown time.

## EXIT_ON_ZERO_ACTIVE_CONNECTIONS

A smarter approach is to have the sidecar exit only when all active connections are drained, rather than using a fixed timeout:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

With this setting, the sidecar monitors active connections after receiving SIGTERM. Once all connections are closed (or the termination grace period expires), it exits. This is the most reliable way to ensure clean shutdown.

## PreStop Hooks for Coordination

You can add a preStop hook to your application container to coordinate with the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-app
        image: my-app:latest
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Stop accepting new work
                # Wait for in-flight requests to complete
                sleep 5
                # Application will receive SIGTERM after this
```

The 5-second sleep in the preStop hook gives the Kubernetes service endpoints time to update. This means that by the time your application starts shutting down, new requests have already stopped arriving.

## Handling the Endpoint Propagation Delay

When a pod is terminated, removing it from Service endpoints takes time to propagate to all kube-proxy instances and load balancers. During this propagation window, new requests might still arrive.

A common pattern is:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-app
        image: my-app:latest
        lifecycle:
          preStop:
            exec:
              command: ["sleep", "10"]
```

The 10-second sleep covers the typical endpoint propagation delay. After this, new requests should have stopped, and your application can safely drain existing connections.

## Native Sidecar Termination Order

With Kubernetes 1.28+ native sidecars, the termination order is guaranteed:

1. Application containers receive SIGTERM first
2. After application containers exit, sidecar containers receive SIGTERM
3. Sidecars have their own grace period to shut down

This eliminates the race condition entirely. Enable native sidecars:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        ENABLE_NATIVE_SIDECARS: "true"
```

With native sidecars, your application can make outbound calls during its shutdown sequence without worrying that the sidecar has already exited.

## Long-Running Connections

For services with long-running connections (like WebSocket or gRPC streaming), you need a longer grace period:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 120s
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
    spec:
      terminationGracePeriodSeconds: 150
      containers:
      - name: websocket-service
        image: websocket-service:latest
```

The `terminationGracePeriodSeconds` should be longer than `terminationDrainDuration` to give the sidecar time to drain after the application has shut down.

## HTTP/2 and GOAWAY

For HTTP/2 connections (including gRPC), Envoy sends a GOAWAY frame during shutdown. This tells clients to stop sending new requests on the connection and open a new one to a different backend:

```text
# This happens automatically during sidecar shutdown
# Envoy sends GOAWAY to all active HTTP/2 connections
```

Clients that respect GOAWAY will gracefully migrate to other pods. The drain period gives time for all in-flight requests on the connection to complete after GOAWAY is sent.

## Jobs and Sidecar Termination

For Kubernetes Jobs, the sidecar needs to exit when the job completes. Without special handling, the sidecar keeps running indefinitely after the job container exits:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
spec:
  template:
    spec:
      containers:
      - name: my-job
        image: my-job:latest
        command:
        - /bin/sh
        - -c
        - |
          # Run the job
          ./process-data

          # Tell the sidecar to exit
          curl -sf -X POST http://localhost:15020/quitquitquit
      restartPolicy: Never
```

The `/quitquitquit` endpoint on port 15020 tells the sidecar to shut down cleanly.

## Monitoring Termination Behavior

Check if pods are terminating cleanly by looking at pod events:

```bash
kubectl describe pod my-app-xyz | grep -A 20 Events
```

Look for events like `Killing` (SIGKILL sent, meaning the container didn't exit gracefully) or `BackOff` (container restarting after a crash).

Check the sidecar's drain statistics:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep drain
```

And monitor for 503 errors during deployments, which indicate the sidecar rejected requests during shutdown:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep "503"
```

## Full Example: Well-Configured Termination

Putting it all together:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 30s
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: my-app
        image: my-app:latest
        lifecycle:
          preStop:
            exec:
              command: ["sleep", "10"]
```

This configuration:
1. Gives 10 seconds for endpoint propagation
2. Drains the sidecar until all connections close (up to 30 seconds)
3. Allows a total of 60 seconds for the entire shutdown
4. Uses zero maxUnavailable to maintain capacity during rolling updates

Proper termination handling is essential for zero-downtime deployments with Istio. The key settings are `terminationDrainDuration`, `EXIT_ON_ZERO_ACTIVE_CONNECTIONS`, and a preStop sleep to cover endpoint propagation. If you're on Kubernetes 1.28+, native sidecars solve most of these issues automatically.
