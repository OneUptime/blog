# How to Benchmark Istio Memory Overhead per Pod

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Benchmarking, Memory, Performance, Kubernetes

Description: How to measure and analyze the memory overhead that Istio sidecar proxies add to each pod in your Kubernetes cluster.

---

Every pod in an Istio mesh gets a sidecar container running Envoy proxy. That sidecar consumes memory. When you have hundreds or thousands of pods, this memory adds up fast and can significantly affect your cluster capacity and costs.

Understanding exactly how much memory each sidecar uses, and what drives that usage, helps you plan your cluster sizing and set appropriate resource limits. This post walks through how to measure and analyze Istio's per-pod memory overhead.

## Baseline Memory Measurement

Start by understanding what your pods use without Istio. Create a simple deployment in a non-injected namespace:

```bash
kubectl create namespace bench-no-istio
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: bench-no-istio
spec:
  replicas: 10
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
        - name: app
          image: fortio/fortio:latest
          args: ["server"]
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: 64Mi
            limits:
              memory: 128Mi
```

Wait for pods to stabilize, then measure:

```bash
kubectl top pods -n bench-no-istio --containers
```

Record the memory usage for each application container.

## Measuring Sidecar Memory

Now deploy the same workload with Istio injection:

```bash
kubectl create namespace bench-istio
kubectl label namespace bench-istio istio-injection=enabled
kubectl apply -f test-app.yaml -n bench-istio
```

Wait for pods to stabilize (give it 2-3 minutes for xDS configuration to sync), then measure:

```bash
kubectl top pods -n bench-istio --containers
```

You'll see two containers per pod: `app` and `istio-proxy`. Record the memory for each.

For more precise measurements, use Prometheus metrics:

```promql
# Memory usage of istio-proxy containers
container_memory_working_set_bytes{
  container="istio-proxy",
  namespace="bench-istio"
}
```

The `working_set_bytes` metric is more accurate than `usage_bytes` because it excludes cached memory that can be reclaimed.

## Factors That Affect Sidecar Memory

### Number of Services in the Mesh

This is the biggest factor. Each sidecar receives configuration for every service in the mesh. More services means more configuration, which means more memory.

Test this by deploying different numbers of services:

```bash
# Create 10 dummy services
for i in $(seq 1 10); do
  kubectl create -n bench-istio service clusterip svc-$i --tcp=8080:8080
done

# Measure sidecar memory
kubectl top pods -n bench-istio --containers | grep istio-proxy

# Create 100 dummy services
for i in $(seq 11 100); do
  kubectl create -n bench-istio service clusterip svc-$i --tcp=8080:8080
done

# Measure again
kubectl top pods -n bench-istio --containers | grep istio-proxy
```

You'll see memory increase roughly linearly with the number of services.

### Sidecar Scope Configuration

By default, each sidecar gets configuration for every service in the mesh. The Sidecar resource limits this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: limit-scope
  namespace: bench-istio
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

This tells sidecars in the `bench-istio` namespace to only receive configuration for services in their own namespace and `istio-system`. Measure memory before and after applying this:

```bash
# Before Sidecar resource
kubectl top pods -n bench-istio --containers | grep istio-proxy | awk '{print $3}'

# Apply Sidecar resource
kubectl apply -f sidecar-scope.yaml

# Wait for config push
sleep 30

# After Sidecar resource
kubectl top pods -n bench-istio --containers | grep istio-proxy | awk '{print $3}'
```

The difference can be dramatic in large meshes. In a mesh with 500 services, scoping sidecars to only their dependencies can reduce memory by 50-80%.

### Active Connections

Sidecar memory also scales with the number of active connections. Each connection requires buffers:

```bash
# Generate connections and measure memory growth
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 100 -qps 10 -t 120s http://test-app.bench-istio:8080/echo &

# Monitor memory during the test
watch kubectl top pods -n bench-istio --containers
```

### Request Size

Larger requests require bigger buffers:

```bash
# Test with small requests
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 100 -t 60s -payload-size 100 http://test-app.bench-istio:8080/echo

# Check memory
kubectl top pods -n bench-istio --containers | grep istio-proxy

# Test with large requests
kubectl exec -n bench-istio deploy/load-generator -c fortio -- \
  fortio load -c 16 -qps 100 -t 60s -payload-size 1048576 http://test-app.bench-istio:8080/echo

# Check memory again
kubectl top pods -n bench-istio --containers | grep istio-proxy
```

## Detailed Memory Profiling

For a deeper look at what's consuming memory inside the sidecar, use Envoy's admin interface:

```bash
kubectl port-forward -n bench-istio deploy/test-app 15000:15000

# Get memory stats
curl -s localhost:15000/memory | python3 -m json.tool

# Get server info including memory allocation
curl -s localhost:15000/server_info | python3 -m json.tool
```

Envoy also exposes memory metrics:

```bash
curl -s localhost:15000/stats | grep "server.memory"
```

Key stats to look at:

- `server.memory_allocated`: Total bytes allocated by Envoy
- `server.memory_heap_size`: Total heap size
- `server.total_connections`: Active connections (correlates with memory)

## Long-Term Memory Monitoring

Set up Prometheus recording rules to track sidecar memory over time:

```yaml
groups:
  - name: istio-memory
    rules:
      - record: istio_proxy_memory_avg
        expr: |
          avg(container_memory_working_set_bytes{container="istio-proxy"}) by (namespace)

      - record: istio_proxy_memory_p99
        expr: |
          quantile(0.99, container_memory_working_set_bytes{container="istio-proxy"}) by (namespace)

      - record: istio_proxy_memory_max
        expr: |
          max(container_memory_working_set_bytes{container="istio-proxy"}) by (namespace)
```

Create alerts for memory issues:

```yaml
groups:
  - name: istio-memory-alerts
    rules:
      - alert: SidecarMemoryHigh
        expr: |
          container_memory_working_set_bytes{container="istio-proxy"}
          /
          container_spec_memory_limit_bytes{container="istio-proxy"} > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Sidecar proxy using more than 90% of memory limit"

      - alert: SidecarOOMRisk
        expr: |
          container_memory_working_set_bytes{container="istio-proxy"}
          /
          container_spec_memory_limit_bytes{container="istio-proxy"} > 0.95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Sidecar proxy at risk of OOM kill"
```

## Setting Resource Limits Based on Benchmarks

Once you have your benchmark data, set appropriate memory requests and limits.

For a mesh with fewer than 100 services:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            memory: 64Mi
          limits:
            memory: 256Mi
```

For a mesh with 100-500 services:

```yaml
resources:
  requests:
    memory: 128Mi
  limits:
    memory: 512Mi
```

For a mesh with 500+ services (you should really be using Sidecar resources to scope):

```yaml
resources:
  requests:
    memory: 256Mi
  limits:
    memory: 1Gi
```

You can also set per-deployment overrides for pods that need different limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

## Calculating Cluster-Wide Memory Cost

Multiply the per-sidecar memory by the number of pods to get the total cost:

```promql
# Total memory consumed by all sidecars
sum(container_memory_working_set_bytes{container="istio-proxy"})
```

Express this as a percentage of total cluster memory:

```promql
sum(container_memory_working_set_bytes{container="istio-proxy"})
/
sum(node_memory_MemTotal_bytes) * 100
```

This tells you what percentage of your cluster capacity goes to Istio sidecars. If it's more than 10-15%, consider using Sidecar resources to reduce scope, or evaluate whether all namespaces actually need sidecar injection.

The memory overhead per pod is predictable once you understand the factors. Measure it in your specific environment, set appropriate limits, and monitor for growth over time as your mesh expands.
