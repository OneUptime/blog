# How to Handle Container Lifecycle with Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Container Lifecycle, Kubernetes, Pod Management

Description: How to manage container lifecycle events alongside the Istio sidecar proxy including startup, readiness, liveness, and graceful shutdown.

---

When Istio injects a sidecar into your pod, it fundamentally changes the container lifecycle dynamics. You now have two containers that need to start up, run, and shut down in coordination. Getting this lifecycle management right is crucial for avoiding dropped connections, failed health checks, and mysterious startup errors.

## The Pod Lifecycle with Istio

A normal Kubernetes pod lifecycle looks like: init containers run, then all containers start simultaneously. With Istio, the story is more complex:

1. Kubernetes init containers run (including `istio-init` which sets up iptables rules)
2. The `istio-proxy` container starts
3. Your application container starts
4. Both containers run until the pod is terminated
5. Both containers receive SIGTERM
6. After the grace period, SIGKILL is sent

The problem with step 2 and 3 is that they happen concurrently. Your application might try to make network calls before the sidecar is ready to handle them, causing connection failures.

## Controlling Startup Order

### holdApplicationUntilProxyStarts

The cleanest solution is to use Istio's built-in feature to delay your application container:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

Or per-pod:

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
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

This adds a `postStart` hook to the sidecar that blocks until the proxy is ready to accept connections on port 15021 (the health check port). Your application container won't start its entrypoint until this check passes.

### Kubernetes Native Sidecar Containers

Starting with Kubernetes 1.28 (beta), there's native support for sidecar containers using the `restartPolicy: Always` field on init containers. Istio can use this feature:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        startupProbe:
          failureThreshold: 30
          periodSeconds: 1
```

With native sidecars, Kubernetes guarantees the sidecar starts before the application container and stops after it.

## Readiness and Liveness Probes

### Application Probes Through the Sidecar

Istio can rewrite your application's health check probes to go through the sidecar. This is controlled by the `rewriteAppHTTPProbers` setting:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  values:
    sidecarInjectorWebhook:
      rewriteAppHTTPProbers: true
```

When enabled, the kubelet sends health check requests to the sidecar's port 15020, which forwards them to your application. This means health checks go through the full Istio pipeline including mTLS.

The original probe:

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
```

Gets rewritten to:

```yaml
readinessProbe:
  httpGet:
    path: /app-health/my-app/readyz
    port: 15020
```

### Custom Probe Configuration

If you need more control over probe timing with the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /healthz
            port: 8080
          failureThreshold: 30
          periodSeconds: 2
```

The `startupProbe` is especially useful with Istio. It gives your application time to start up without the liveness probe killing it prematurely.

## PreStop Hooks and Graceful Shutdown

When a pod is being terminated, both the application container and the sidecar receive SIGTERM simultaneously. The problem is that the sidecar might shut down before your application finishes draining its connections.

### The Draining Problem

Here's what can happen:
1. Pod receives termination signal
2. Sidecar starts shutting down
3. Application tries to make a database call during its graceful shutdown
4. The call fails because the sidecar is already gone

### Solution: Exit on Zero Active Connections

Configure the sidecar to wait for active connections to drain:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 30s
```

This tells the sidecar to keep running for up to 30 seconds after receiving SIGTERM, waiting for active connections to complete.

### Solution: PreStop Hook on Application

Add a preStop hook to your application container to give the sidecar time to drain:

```yaml
containers:
- name: my-app
  image: my-app:latest
  lifecycle:
    preStop:
      exec:
        command: ["/bin/sh", "-c", "sleep 5"]
```

The 5-second sleep gives the sidecar time to stop accepting new connections while your application finishes processing in-flight requests.

### Solution: Customize the Sidecar PreStop

You can also customize the sidecar's preStop hook:

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

With `EXIT_ON_ZERO_ACTIVE_CONNECTIONS`, the sidecar monitors active connections and exits only when all connections have been drained (or the termination grace period expires).

## Pod Termination Grace Period

Make sure your termination grace period is long enough to accommodate both the application shutdown and the sidecar draining:

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
```

A good rule of thumb: set the grace period to at least the sum of your application's shutdown time and the sidecar's `terminationDrainDuration`.

## Handling Jobs and CronJobs

Jobs and CronJobs are a special case with Istio because the sidecar doesn't automatically exit when the main container completes. This means your Job will hang indefinitely.

The solution is to tell the sidecar to exit when the main container finishes:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: my-job
        image: my-job:latest
        command:
        - /bin/sh
        - -c
        - |
          # Do job work
          do_work
          # Signal sidecar to quit
          curl -X POST http://localhost:15020/quitquitquit
      restartPolicy: Never
```

The `/quitquitquit` endpoint tells the sidecar to shut down gracefully.

## Monitoring Lifecycle Events

You can monitor lifecycle events through Kubernetes events:

```bash
kubectl describe pod my-app-xyz | grep -A 20 Events
```

And through the sidecar's admin interface:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET server_info
```

This shows the proxy's current drain state and connection counts.

Managing the container lifecycle with Istio sidecars requires attention to startup ordering, probe configuration, and graceful shutdown. The key settings to remember are `holdApplicationUntilProxyStarts` for startup, `terminationDrainDuration` for shutdown, and the `/quitquitquit` endpoint for Jobs. Getting these right eliminates most of the lifecycle-related issues people run into with Istio.
