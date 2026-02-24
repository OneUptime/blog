# How to Configure Sidecar Proxy Concurrency Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Envoy, Performance, Kubernetes

Description: Learn how to configure Envoy sidecar proxy concurrency and worker thread settings in Istio for optimal CPU utilization and throughput.

---

The Envoy sidecar proxy in Istio runs with a configurable number of worker threads. Each worker thread handles connections independently, and the number of threads directly affects how much CPU the proxy can use and how much throughput it can handle. Getting this right matters - too few threads and the proxy becomes a bottleneck, too many and you waste CPU on context switching and thread coordination.

This post explains how Envoy concurrency works in Istio and how to tune it for your workloads.

## How Envoy Worker Threads Work

Envoy uses an event-driven architecture with multiple worker threads. Each worker thread runs its own event loop and handles a subset of connections. When a new connection arrives, it gets assigned to one worker thread and stays there for its lifetime.

The key points:

- Each worker thread is pinned to handle its connections independently (no sharing between threads)
- More threads means more parallelism and higher throughput
- Each thread consumes roughly similar memory for its connection state
- The default behavior in Istio is to use the number of CPU cores available to the container

If your sidecar proxy container has a CPU limit of 2 cores, Envoy defaults to 2 worker threads. If the limit is 4 cores, it uses 4 threads. If there's no limit set, Envoy can detect all CPU cores on the node and spin up a thread for each one, which is usually way too many.

## Setting Concurrency Globally

To set the concurrency for all sidecar proxies in the mesh, use the MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
```

This tells every sidecar proxy to use exactly 2 worker threads, regardless of the CPU limit on the container.

If you want to restore the default behavior (auto-detect based on CPU limit), set concurrency to 0:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 0
```

## Setting Concurrency per Workload

For individual workloads, you can override the global setting using the `proxy.istio.io/config` annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-api
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 4
    spec:
      containers:
        - name: api
          image: my-api:latest
          resources:
            limits:
              cpu: "4"
              memory: 2Gi
```

This gives the high-traffic API's sidecar 4 worker threads while the rest of the mesh uses the global default.

You can also use the ProxyConfig resource:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: high-traffic-proxy
  namespace: production
spec:
  selector:
    matchLabels:
      app: high-traffic-api
  concurrency: 4
```

## Choosing the Right Concurrency Value

The right concurrency value depends on your workload characteristics. Here's how to think about it:

### Low-Traffic Services (under 100 RPS)

For services that handle modest request rates, 1 or 2 worker threads are plenty:

```yaml
annotations:
  proxy.istio.io/config: |
    concurrency: 1
```

One thread can handle thousands of concurrent connections with Envoy's event-driven model. You only need more threads when a single thread's CPU usage hits its limit.

### Medium-Traffic Services (100-1000 RPS)

Two worker threads is a good default:

```yaml
annotations:
  proxy.istio.io/config: |
    concurrency: 2
```

This gives you parallelism for TLS processing and HTTP parsing without wasting resources. Most services in a typical mesh fall into this category.

### High-Traffic Services (1000+ RPS)

For high-throughput services, especially those doing a lot of TLS termination, 4 or more threads might be necessary:

```yaml
annotations:
  proxy.istio.io/config: |
    concurrency: 4
```

Make sure the CPU limit on the proxy matches. Setting concurrency to 4 but limiting the container to 1 CPU means the threads compete for the same core, which hurts performance rather than helping.

## Concurrency and CPU Limits Interaction

There's an important relationship between the concurrency setting and the container's CPU limit. Envoy worker threads are CPU-bound when under load, so each thread ideally needs its own core.

Good combinations:

```yaml
# 2 threads with 2 CPU limit - each thread gets a core
resources:
  limits:
    cpu: "2"
# concurrency: 2

# 4 threads with 4 CPU limit
resources:
  limits:
    cpu: "4"
# concurrency: 4
```

Bad combinations:

```yaml
# 4 threads with 1 CPU limit - threads fight for CPU time
resources:
  limits:
    cpu: "1"
# concurrency: 4

# 1 thread with 4 CPU limit - wasting 3 cores worth of capacity
resources:
  limits:
    cpu: "4"
# concurrency: 1
```

A practical approach is to set the proxy CPU limit to match the concurrency value, and set the CPU request to a fraction of that (like 50% of the limit):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 2
        sidecar.istio.io/proxyCPU: "500m"
        sidecar.istio.io/proxyCPULimit: "2000m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
    spec:
      containers:
        - name: api
          image: my-api:latest
```

## Measuring Concurrency Impact

To see if your concurrency setting is appropriate, monitor the proxy's CPU usage and request latency.

Check CPU usage:

```bash
kubectl top pods -n production --containers | grep istio-proxy
```

Check proxy stats:

```bash
# Get worker thread stats
istioctl proxy-config bootstrap deploy/api-service -n production -o json | grep -A5 concurrency

# Check connection distribution across workers
kubectl exec deploy/api-service -c istio-proxy -n production -- curl -s localhost:15000/stats | grep worker
```

If the proxy's CPU usage is consistently near the limit and p99 latency is higher than expected, increasing concurrency (and the CPU limit) can help.

If CPU usage is low and you have concurrency set high, you're wasting resources. Lower it.

## The Admin Thread

Envoy also has an admin thread that handles the admin interface (port 15000), health checks, and stats collection. This thread runs separately from worker threads. It doesn't count toward the concurrency setting, but it does use some CPU.

In most cases you don't need to worry about the admin thread. But in very high-throughput scenarios where stats collection becomes expensive, the admin thread can become noticeable.

## Production Recommendations

Based on experience running large Istio meshes, here's what works well:

1. Set a global default of `concurrency: 2` for the mesh
2. Override to higher values only for specific high-traffic workloads
3. Match the proxy CPU limit to the concurrency value
4. Monitor CPU usage for the first week and adjust as needed
5. If using the Sidecar resource to reduce configuration scope, you may be able to lower concurrency since each push is smaller and faster

```yaml
# A solid default configuration
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 2000m
            memory: 256Mi
```

Concurrency tuning is not something you need to obsess over for every workload. Set a sensible default, monitor, and adjust the outliers. That's usually enough to keep things running smoothly.
