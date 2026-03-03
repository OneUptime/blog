# How to Set Proxy Concurrency in Istio MeshConfig

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Proxy, Performance, MeshConfig, Envoy

Description: Learn how to configure the proxy concurrency setting in Istio MeshConfig to control the number of Envoy worker threads for optimal performance.

---

Every Envoy sidecar in your Istio mesh runs with a configurable number of worker threads. These threads handle all the network I/O for proxied connections - accepting connections, processing HTTP requests, applying filters, and forwarding traffic. The `concurrency` setting in MeshConfig controls how many of these worker threads each sidecar runs.

Getting this number right matters. Too few threads and your proxy becomes a bottleneck for high-throughput services. Too many and you waste CPU resources that your application could use.

## Default Behavior

By default, Istio sets the concurrency to 2 worker threads. This is a conservative default that works for most services. The Envoy proxy is event-driven and quite efficient, so 2 threads can handle a surprising amount of traffic.

To check the current concurrency on a running proxy:

```bash
kubectl exec deploy/my-service -c istio-proxy -n default -- \
  pilot-agent request GET server_info | grep concurrency
```

Or check the bootstrap configuration:

```bash
istioctl proxy-config bootstrap deploy/my-service -n default -o json | \
  grep -A2 concurrency
```

## Setting Concurrency Mesh-Wide

To change the default concurrency for all sidecars:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 4
```

Apply the change:

```bash
istioctl install -f concurrency-config.yaml
```

Existing pods need to be restarted to pick up the new setting:

```bash
kubectl rollout restart deployment -n my-namespace
```

## Setting Concurrency Per Workload

Different services have different throughput requirements. A high-traffic API gateway needs more threads than a low-traffic background worker. Use pod annotations to override the mesh default:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 8
    spec:
      containers:
        - name: api-gateway
          image: api-gateway:v1
          resources:
            requests:
              cpu: "4"
            limits:
              cpu: "8"
```

For a low-traffic service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: config-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 1
    spec:
      containers:
        - name: config-service
          image: config-service:v1
          resources:
            requests:
              cpu: 100m
```

## The Special Value: 0

Setting concurrency to 0 has special meaning. It tells Envoy to create one worker thread per CPU core available to the container:

```yaml
meshConfig:
  defaultConfig:
    concurrency: 0
```

This sounds appealing, but there are caveats:

- If your container has no CPU limit set, Envoy will detect all cores on the node and create a thread for each one. On a 64-core node, that is 64 Envoy threads per pod.
- If your container has a CPU limit, Envoy uses that to determine the number of cores. A limit of 2 CPUs means 2 threads.

For most production environments, setting an explicit number is safer than using 0 because it gives you predictable behavior regardless of the node configuration.

## Relationship Between Concurrency and CPU Limits

The sidecar container's CPU limit should be at least as high as the concurrency value. Each worker thread can use up to one CPU core. If you set concurrency to 4 but the sidecar only has 1 CPU limit, the threads will contend for CPU time and performance will actually be worse than using fewer threads.

Here is a good rule of thumb:

```yaml
# Good: CPU limit >= concurrency
annotations:
  proxy.istio.io/config: |
    concurrency: 4
  sidecar.istio.io/proxyCPU: "500m"
  sidecar.istio.io/proxyCPULimit: "4"

# Bad: CPU limit < concurrency (thread contention)
annotations:
  proxy.istio.io/config: |
    concurrency: 8
  sidecar.istio.io/proxyCPULimit: "2"
```

Set sidecar resource limits with annotations:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "200m"
    sidecar.istio.io/proxyCPULimit: "4"
    sidecar.istio.io/proxyMemory: "256Mi"
    sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

## How to Determine the Right Concurrency

There is no universal answer. It depends on your traffic patterns. Here is how to figure it out:

### Step 1: Measure Current Proxy CPU Usage

```bash
kubectl top pods -n my-namespace --containers | grep istio-proxy
```

Or use Prometheus to query sidecar CPU usage over time:

```text
rate(container_cpu_usage_seconds_total{container="istio-proxy", namespace="my-namespace"}[5m])
```

### Step 2: Load Test with Different Settings

Run the same load test with different concurrency values and measure latency:

```bash
# Deploy with concurrency=2
kubectl annotate deployment my-service \
  proxy.istio.io/config='{"concurrency": 2}' --overwrite

kubectl rollout restart deployment my-service -n default
# Run load test and record p50, p99 latency

# Deploy with concurrency=4
kubectl annotate deployment my-service \
  proxy.istio.io/config='{"concurrency": 4}' --overwrite

kubectl rollout restart deployment my-service -n default
# Run load test and record p50, p99 latency
```

### Step 3: Find the Sweet Spot

Plot the latency results against concurrency values. You will typically see:

- Latency decreasing as concurrency increases (more threads to handle requests)
- A plateau where adding more threads does not help
- Eventually, increased latency from thread contention if you go too far

The sweet spot is usually where the latency curve starts to plateau.

## Concurrency for Gateways

Ingress gateways handle all incoming traffic and typically need higher concurrency than sidecars:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: "2"
              memory: 1Gi
            limits:
              cpu: "8"
              memory: 4Gi
  values:
    gateways:
      istio-ingressgateway:
        env:
          ISTIO_META_ROUTER_MODE: standard
```

For the gateway's concurrency, set it through the proxy config in the gateway deployment:

```bash
kubectl edit deployment istio-ingressgateway -n istio-system
```

Add the concurrency environment variable:

```yaml
env:
  - name: ISTIO_META_REQUESTED_NETWORK_VIEW
    value: network1
  - name: PROXY_CONCURRENCY
    value: "8"
```

## Monitoring Thread Usage

Once you set the concurrency, monitor whether the threads are actually being utilized:

```bash
# Check Envoy's worker thread stats
kubectl exec deploy/my-service -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "server.total_connections"
```

The Envoy admin interface shows per-thread stats that help you understand if all threads are being used or if some are idle:

```bash
kubectl exec deploy/my-service -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "listener_manager"
```

## Summary

- Default concurrency is 2, which works for most services
- Set concurrency to 0 to use all available cores (be careful with this)
- Match CPU limits to concurrency values to avoid thread contention
- Use per-workload annotations for services with different throughput needs
- Load test to find the optimal value for your high-traffic services
- Gateways typically need higher concurrency than sidecars

Proxy concurrency is a performance tuning knob that most users never need to touch. But for high-throughput services or environments where sidecar CPU usage is a concern, understanding this setting can help you squeeze more performance out of your mesh.
