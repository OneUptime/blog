# How to Configure Sidecar Proxy Startup and Shutdown Order

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Lifecycle, Kubernetes, Service Mesh

Description: How to configure Istio sidecar proxy startup and shutdown ordering to prevent dropped requests, failed health checks, and pod lifecycle issues.

---

The order in which the sidecar proxy starts and stops relative to your application container matters more than most people realize. If the sidecar is not ready when your application starts making outbound requests, those requests fail. If the sidecar shuts down before your application finishes processing in-flight requests, those requests get dropped.

These problems are intermittent and hard to debug because they only happen during pod startup and shutdown, which makes them easy to miss in testing but painful in production.

This guide covers exactly how to configure the sidecar lifecycle to avoid these issues.

## The Startup Problem

When a pod starts, Kubernetes launches all containers roughly simultaneously. The application container and the sidecar container start at about the same time. But the sidecar needs to:

1. Start the pilot-agent process
2. Connect to istiod over gRPC
3. Receive xDS configuration (listeners, clusters, routes, endpoints)
4. Start the Envoy process
5. Envoy processes the configuration and opens listeners

This takes a few seconds. If your application starts faster and immediately tries to make an HTTP call to another service, iptables redirects that traffic to the sidecar, which is not yet listening. The result is a connection refused error.

Here is what the failure looks like in application logs:

```
Error: connect ECONNREFUSED 127.0.0.1:15001
```

Or for HTTP clients:

```
Error: upstream connect error or disconnect/reset before headers. reset reason: connection failure
```

## Solution 1: holdApplicationUntilProxyStarts

This is the recommended approach. It adds a postStart lifecycle hook to the sidecar container that blocks until Envoy is ready:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

When this is enabled, the pod startup sequence changes:

1. Init containers run (istio-init sets up iptables)
2. Sidecar container starts
3. Sidecar's postStart hook polls the health endpoint until Envoy is ready
4. Only after the hook completes does Kubernetes start the application container

This guarantees the sidecar is accepting traffic before the application starts.

To enable per-pod instead of globally:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: my-service
        image: my-service:latest
```

The tradeoff is slightly slower pod startup (typically 2-5 seconds extra). For most workloads this is fine. For workloads where startup speed is critical (serverless-style scale-from-zero), you may want to leave this disabled and handle connection retries in the application instead.

## Solution 2: Native Sidecar Containers (Kubernetes 1.28+)

Kubernetes 1.28 introduced native sidecar support through the `restartPolicy: Always` field on init containers. When Istio uses this feature, the sidecar runs as a native sidecar that starts before regular containers and stops after them.

To use this, enable native sidecars in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        startupProbe:
          enabled: true
          failureThreshold: 30
          periodSeconds: 1
```

With native sidecars, the startup order is:

1. Init containers run (istio-init)
2. Sidecar starts as a native sidecar (init container with `restartPolicy: Always`)
3. Sidecar becomes ready (passes startup probe)
4. Application containers start

This is the cleanest solution because it uses Kubernetes-native lifecycle management rather than lifecycle hooks.

Check if your cluster supports native sidecars:

```bash
kubectl version --short
```

You need Kubernetes 1.28 or later with the `SidecarContainers` feature gate enabled.

## The Shutdown Problem

Shutdown is the reverse of startup, and it is actually harder to get right. When a pod is terminated, Kubernetes does the following simultaneously:

1. Removes the pod from Service endpoints (so new traffic stops arriving)
2. Sends SIGTERM to all containers

The problem: endpoint removal and SIGTERM happen at roughly the same time, but they propagate through different systems. Other pods may still send traffic to this pod for a few seconds after SIGTERM is received (because the endpoint removal has not propagated to all kube-proxies yet).

If the sidecar shuts down immediately on SIGTERM, it drops these in-flight requests. If the application shuts down before the sidecar finishes draining, outbound requests from the application during cleanup also fail.

## Configuring Sidecar Drain Duration

The `terminationDrainDuration` controls how long the sidecar waits before fully shutting down:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 10s
```

When the sidecar receives SIGTERM:

1. It stops accepting new connections on its listeners
2. It continues processing existing connections for `terminationDrainDuration`
3. After the drain period, it shuts down

Per-pod override:

```yaml
annotations:
  proxy.istio.io/config: |
    terminationDrainDuration: 15s
```

Set this to be slightly longer than your application's graceful shutdown period. If your application takes 10 seconds to finish in-flight requests, set the drain to 15 seconds.

## Configuring the Application's Termination Grace Period

Kubernetes has a `terminationGracePeriodSeconds` on the pod that sets the maximum time from SIGTERM to force kill:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: my-service
        image: my-service:latest
```

The relationship between these timeouts should be:

```
terminationGracePeriodSeconds > terminationDrainDuration > application shutdown time
```

For example:
- `terminationGracePeriodSeconds: 30`
- `terminationDrainDuration: 15s`
- Application graceful shutdown: ~10 seconds

This ensures:
1. The application has 10 seconds to finish in-flight requests
2. The sidecar drains for 15 seconds (covering the application's shutdown plus propagation delay)
3. Kubernetes force-kills everything at 30 seconds if something is stuck

## Handling the Endpoint Propagation Delay

Even with drain configured, there is a window where traffic arrives at a pod that is shutting down. This happens because kube-proxy on other nodes has not yet removed the endpoint.

Add a preStop hook to your application to give endpoints time to propagate:

```yaml
containers:
- name: my-service
  lifecycle:
    preStop:
      exec:
        command: ["sleep", "5"]
```

This 5-second sleep happens before SIGTERM is sent to the application. During those 5 seconds, the endpoint removal propagates through the cluster, so by the time the application starts shutting down, no new traffic is arriving.

The full shutdown sequence becomes:

1. Kubernetes starts termination
2. Pod is removed from Service endpoints
3. preStop hook runs (sleep 5)
4. SIGTERM is sent to application and sidecar
5. Application starts graceful shutdown
6. Sidecar drains connections for `terminationDrainDuration`
7. Everything finishes within `terminationGracePeriodSeconds`

## Sidecar Exit on Application Completion

For Jobs and batch workloads, you want the sidecar to exit when the application finishes:

```yaml
annotations:
  proxy.istio.io/config: |
    proxyMetadata:
      EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
```

When the application container exits and all connections are closed, the sidecar detects zero active connections and exits. This prevents the common problem where a Job completes but the pod stays Running because the sidecar is still alive.

## Checking Sidecar Health

During startup, you can check if the sidecar is ready:

```bash
# From inside the pod or another pod on the same node
curl http://localhost:15021/healthz/ready
```

A 200 response means the sidecar is ready. A 503 means it is still starting up.

From outside the pod:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s http://localhost:15021/healthz/ready
```

## Debugging Startup Issues

If pods are crashing during startup due to sidecar timing issues:

```bash
# Check sidecar startup logs
kubectl logs deploy/my-service -c istio-proxy --previous

# Check if the sidecar connected to istiod
kubectl logs deploy/my-service -c istio-proxy | grep "ads]"

# Check the init container (iptables setup)
kubectl logs deploy/my-service -c istio-init

# Check the proxy status
istioctl proxy-status | grep my-service
```

Common startup failures:
- **Sidecar cannot reach istiod**: Check NetworkPolicies and DNS
- **Init container fails**: Missing `NET_ADMIN` capability (use Istio CNI instead)
- **OOM during startup**: Increase sidecar memory limits

## Complete Production Configuration

Here is a production-ready configuration that handles both startup and shutdown correctly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-service
  namespace: production
spec:
  replicas: 3
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
          terminationDrainDuration: 15s
          concurrency: 2
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: production-service
        image: production-service:v1.2.3
        ports:
        - containerPort: 8080
        lifecycle:
          preStop:
            exec:
              command: ["sleep", "5"]
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

This configuration ensures:
- The sidecar is ready before the application starts
- The application has 5 seconds of endpoint propagation time before shutdown
- The sidecar drains connections for 15 seconds during shutdown
- Kubernetes force-kills at 30 seconds as a safety net
- Sidecar resources are appropriately sized

## Summary

Sidecar startup and shutdown ordering is about preventing request failures during pod transitions. Use `holdApplicationUntilProxyStarts` to fix startup races, `terminationDrainDuration` plus a preStop sleep to fix shutdown races, and make sure your `terminationGracePeriodSeconds` is large enough to cover the entire shutdown sequence. These three settings eliminate the vast majority of pod lifecycle issues with Istio sidecars.
