# How to Configure Termination Drain Duration in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Termination, Drain Duration, Kubernetes, Envoy

Description: Master the terminationDrainDuration setting in Istio to control how long Envoy waits for connections to finish during pod shutdown.

---

The `terminationDrainDuration` setting is one of the most important and least understood configurations in Istio. It controls how long the Envoy sidecar proxy waits for active connections and requests to finish after the pod receives a SIGTERM signal. Set it too low and connections get dropped. Set it too high and deployments take forever. Finding the right value depends on your workload.

## What terminationDrainDuration Actually Does

When a pod is being terminated, Kubernetes sends SIGTERM to all containers. The Istio sidecar (Envoy) receives this signal and starts a drain sequence:

1. Envoy's listener manager begins draining all listeners
2. No new connections are accepted on inbound listeners
3. For HTTP connections, `Connection: close` headers are added to responses
4. For HTTP/2, GOAWAY frames are sent
5. Envoy waits up to `terminationDrainDuration` for active requests to complete
6. After the duration expires, remaining connections are forcibly closed
7. Envoy process exits

The default value in Istio is 5 seconds. For many production workloads, 5 seconds is not enough.

## Setting It Globally

To change the drain duration for all sidecars in the mesh, modify the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 15s
```

If you're using Helm to install Istio:

```bash
helm upgrade istio-base istio/base -n istio-system

helm upgrade istiod istio/istiod -n istio-system \
  --set meshConfig.defaultConfig.terminationDrainDuration=15s
```

Or if you're editing the ConfigMap directly:

```bash
kubectl edit configmap istio -n istio-system
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    defaultConfig:
      terminationDrainDuration: 15s
```

After changing the global setting, existing pods won't pick up the change until they're restarted. The sidecar reads its configuration at startup.

## Setting It Per Workload

Override the global setting for specific workloads using pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 30s
    spec:
      terminationGracePeriodSeconds: 45
      containers:
      - name: payment-service
        image: payment-service:v1
```

Per-workload overrides are useful when different services have different requirements. An API gateway that handles short-lived requests needs a shorter drain than a service that processes long-running batch operations.

## How to Calculate the Right Value

The drain duration should be long enough for your longest typical request to complete, plus a buffer. Here's how to figure it out:

```bash
# Check the p99 latency for your service
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="payment-service.production.svc.cluster.local"}[5m])) by (le))'
```

If your p99 latency is 2 seconds, a drain duration of 10-15 seconds gives plenty of room. But if you have occasional requests that take 30+ seconds (like report generation), you need to account for those.

A reasonable formula: `terminationDrainDuration = max(p99_latency * 3, 10s)`

## Relationship with terminationGracePeriodSeconds

The Kubernetes `terminationGracePeriodSeconds` is the hard limit on how long a pod has to shut down. Your drain duration must fit within this window, along with any preStop hooks:

```
terminationGracePeriodSeconds >= preStop_duration + terminationDrainDuration + buffer
```

For example:

```yaml
spec:
  terminationGracePeriodSeconds: 60  # Total budget: 60 seconds
  containers:
  - name: app
    lifecycle:
      preStop:
        exec:
          command: ["sleep", "5"]     # Uses 5 seconds
  # Sidecar drain: 30 seconds
  # Buffer before SIGKILL: 25 seconds
```

If the drain duration exceeds the grace period, Kubernetes will SIGKILL the pod before the drain completes. You'll see this in the pod events:

```bash
kubectl describe pod payment-service-xxx | grep -A5 Events
```

Look for `Killing` events with a message about the grace period being exceeded.

## Drain Duration for Different Protocols

Different protocols drain differently, and the duration impacts them in distinct ways:

**HTTP/1.1:** Each request-response cycle is independent. Once the current response is sent, the connection is closed. The drain duration only needs to cover the longest in-flight request.

**HTTP/2 and gRPC:** Multiple streams share a single connection. The GOAWAY frame stops new streams, but existing streams continue until they complete or the drain period ends. If you use gRPC streaming, the drain duration needs to be long enough for both sides to wrap up the stream.

**Raw TCP:** Envoy can't gracefully signal the application over TCP. It just waits for the connection to close on its own. If the application doesn't close the connection, it stays open until the drain period expires and then gets forcibly terminated.

For TCP workloads, consider a longer drain duration:

```yaml
annotations:
  proxy.istio.io/config: |
    terminationDrainDuration: 60s
```

## Monitoring Drain Behavior

Check if your drain duration is adequate by monitoring connection states during deployments:

```bash
# Watch the Envoy admin endpoint during shutdown
kubectl exec pod/my-app-xxx -c istio-proxy -- \
  pilot-agent request GET /server_info

# The state field shows:
# LIVE - normal operation
# DRAINING - drain in progress
# PRE_INITIALIZING / INITIALIZING - startup
```

You can also check for forced connection closures:

```bash
# Look for drain-related log entries
kubectl logs pod/my-app-xxx -c istio-proxy | grep -i "drain\|closing\|timeout"
```

If you see messages about connections being forcibly closed when the drain period ends, increase the duration.

## Common Configurations by Workload Type

Here are some starting points for different types of services:

**Fast APIs (p99 < 500ms):**
```yaml
terminationDrainDuration: 10s
terminationGracePeriodSeconds: 20
```

**Standard web applications:**
```yaml
terminationDrainDuration: 15s
terminationGracePeriodSeconds: 30
```

**gRPC services with streaming:**
```yaml
terminationDrainDuration: 30s
terminationGracePeriodSeconds: 60
```

**Database proxy / connection pooler:**
```yaml
terminationDrainDuration: 60s
terminationGracePeriodSeconds: 90
```

**Long-running batch processing:**
```yaml
terminationDrainDuration: 300s
terminationGracePeriodSeconds: 600
```

## Gotchas to Watch Out For

A few things that trip people up with termination drain duration:

1. **Changed values don't apply immediately.** Pods need to be restarted to pick up new drain duration settings. A `kubectl rollout restart` will do it.

2. **The annotation format matters.** The `proxy.istio.io/config` annotation expects valid YAML. If you get the indentation wrong, the setting silently falls back to the default.

3. **Drain duration of 0s means no drain.** Envoy will close all connections immediately on SIGTERM. This is almost never what you want.

4. **Global vs. per-pod precedence.** Per-pod annotations override the global mesh config. If you set a global value of 30s but a pod annotation of 5s, that pod gets 5s.

5. **The value is in seconds with an 's' suffix.** Writing `terminationDrainDuration: 15` without the `s` can cause parsing issues.

Start with a conservative value, monitor during deployments, and adjust based on what you observe. It's better to have a slightly longer drain than to drop connections during deployments.
