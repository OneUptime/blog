# How to Configure Envoy Proxy Concurrency

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Performance, Kubernetes, Service Mesh

Description: Learn how to configure Envoy proxy concurrency settings in Istio to optimize sidecar performance and resource utilization across your Kubernetes workloads.

---

In Istio sidecar mode, Envoy proxy runs alongside every pod in your mesh, and one of the most impactful performance knobs you can turn is the concurrency setting. Concurrency controls how many worker threads Envoy uses to process requests, and getting it wrong can mean wasted CPU or bottlenecked traffic.

By default, Istio leaves concurrency unset and automatically determines it from the proxy container's CPU requests and limits. That works fine for most workloads, but if you're running high-throughput services or you've allocated significant CPU to your proxies, you might want to tune this number.

## What Concurrency Actually Controls

Envoy uses an event-driven architecture. Each worker thread runs its own event loop and handles connections independently. When a request comes in, it gets assigned to one worker thread and stays on that thread for the duration of the connection.

More worker threads means Envoy can handle more concurrent connections in parallel - up to a point. Each thread consumes memory and CPU, so there's a tradeoff. Leaving concurrency unset lets Istio size it from the proxy CPU requests and limits. Setting concurrency to 0 tells Envoy to use all cores on the machine, ignoring CPU requests and limits, which can cause problems in containerized environments.

## Configuring Concurrency Globally

The simplest way to set concurrency across your entire mesh is through the Istio MeshConfig. You can do this during installation or by editing the istio ConfigMap.

During installation with istioctl:

```bash
istioctl install --set meshConfig.defaultConfig.concurrency=4
```

Or if you're using the IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 4
```

You can also edit the ConfigMap directly:

```bash
kubectl edit configmap istio -n istio-system
```

Find the `defaultConfig` section and add or modify the concurrency value:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |-
    defaultConfig:
      concurrency: 4
```

After changing the global setting, you need to restart your workloads for the new sidecar configuration to take effect:

```bash
kubectl rollout restart deployment -n my-namespace
```

## Configuring Concurrency Per Workload

Sometimes you want different concurrency values for different services. A lightweight API gateway might need more threads than a background job processor. You can override the global setting using the `proxy.istio.io/config` annotation on individual pods.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-throughput-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: high-throughput-api
  template:
    metadata:
      labels:
        app: high-throughput-api
      annotations:
        proxy.istio.io/config: |
          concurrency: 8
    spec:
      containers:
      - name: api
        image: my-api:latest
        resources:
          requests:
            cpu: "4"
            memory: "2Gi"
          limits:
            cpu: "8"
            memory: "4Gi"
```

This sets the Envoy sidecar for this specific deployment to use 8 worker threads, regardless of the global mesh setting.

## Setting Concurrency to Zero

When you set concurrency to 0, Envoy uses all cores on the machine and ignores the CPU requests or limits set on the sidecar container. In Kubernetes, this can create many more worker threads than you intended if the node has far more cores than the proxy should use.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auto-concurrency-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 0
    spec:
      containers:
      - name: app
        image: my-app:latest
```

With `concurrency: 0`, Envoy will create one worker thread for each core on the node. Be careful with this approach - for most Kubernetes sidecars, leaving concurrency unset is safer because Istio can size it from the proxy's CPU requests and limits.

## How to Choose the Right Value

Here's a practical approach to picking the right concurrency value:

**Start with the automatic default.** For most services handling moderate traffic, Istio's automatically selected value is plenty. Envoy is extremely efficient, and a single thread can handle thousands of concurrent connections.

**Monitor first.** Before changing anything, check your current Envoy resource usage:

```bash
kubectl top pods -n my-namespace --containers
```

Look at the `istio-proxy` container specifically. If it's consistently using more than 1.5 CPU cores, bumping concurrency might help.

**Match CPU resources.** A good rule of thumb is to set concurrency to roughly match the number of CPU cores you've allocated to the sidecar. If your sidecar has a CPU limit of 2, keep concurrency at 2. If you've given it 4 CPUs, try concurrency of 4.

**Don't over-provision.** Setting concurrency to 16 when you only have 2 CPU cores allocated to the proxy means most threads will be fighting for the same CPU time. That adds overhead without improving throughput.

## Verifying Your Configuration

After setting concurrency, you can verify what Envoy is actually using by checking the proxy configuration:

```bash
istioctl proxy-config bootstrap <pod-name> -n <namespace> -o json | grep -A 2 concurrency
```

You can also check the Envoy admin interface directly:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n <namespace> -- curl -s localhost:15000/server_info | python3 -m json.tool | grep concurrency
```

This will show you the actual number of worker threads Envoy is running.

## Monitoring the Impact

After changing concurrency, watch these metrics to see if things improved:

```bash
# Check Envoy upstream connection stats

kubectl exec -it <pod-name> -c istio-proxy -n <namespace> -- curl -s localhost:15000/stats | grep downstream_cx_active
```

Key metrics to watch in your monitoring system (Prometheus/Grafana):

- `envoy_server_concurrency` - the configured number of worker threads
- `envoy_server_total_connections` - total connections across Envoy hot-restart generations
- `envoy_http_downstream_rq_time` - request latency
- CPU usage of the istio-proxy container

If latency drops and throughput increases without a proportional spike in CPU usage, you've found a good setting.

## Common Pitfalls

**Using `concurrency: 0` when you meant automatic sizing.** When `concurrency` is unset, Istio uses CPU requests and limits to determine thread count. When it is set to 0, Envoy uses all machine cores and ignores those requests and limits.

**Not restarting pods.** Changing the MeshConfig or ConfigMap doesn't automatically update running sidecars. You need to restart your workloads.

**Setting concurrency too high on small nodes.** If you're running on nodes with 2 CPUs and you set concurrency to 8, you're just adding context-switching overhead.

**Ignoring memory.** Each worker thread has its own connection pools and buffers. More threads means more memory usage. If your sidecar is hitting memory limits, check if concurrency is set too high.

## A Realistic Example

Say you have a payment processing service that handles 10,000 requests per second. The automatically selected concurrency is causing occasional latency spikes during peak hours.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 5
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 4
        sidecar.istio.io/proxyCPU: "500m"
        sidecar.istio.io/proxyCPULimit: "4"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
    spec:
      containers:
      - name: payment
        image: payment-service:v2.1
        resources:
          requests:
            cpu: "2"
            memory: "1Gi"
```

With this setup, each sidecar gets 4 worker threads and a CPU limit of 4, giving you ample headroom for high-throughput traffic without wasting resources.

Concurrency is one of those settings that most people never need to touch, but when you do need it, it makes a big difference. Start with monitoring, identify whether Envoy CPU is actually a bottleneck, and then adjust incrementally.
