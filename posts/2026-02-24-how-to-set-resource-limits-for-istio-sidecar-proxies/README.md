# How to Set Resource Limits for Istio Sidecar Proxies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Proxy, Resource Limits, Kubernetes, Envoy

Description: How to configure CPU and memory resource requests and limits for Istio Envoy sidecar proxies at global and per-workload levels.

---

Every pod in an Istio mesh gets an Envoy sidecar proxy injected alongside the application container. That sidecar consumes CPU and memory, and in a cluster with thousands of pods, these resources add up fast. Setting appropriate resource limits for the sidecar is important both for cluster efficiency and for preventing your application containers from being starved of resources.

This guide covers how to set sidecar resource limits at the global level and how to override them for specific workloads.

## Default Sidecar Resource Consumption

Out of the box, Istio sets relatively modest defaults for the sidecar proxy. But these defaults might not be right for your workload. A sidecar handling high-throughput traffic needs more resources than one handling a few requests per minute. And a sidecar in a large mesh with thousands of services needs more memory just to hold the Envoy configuration.

To check the current defaults on your installation:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.values}' | grep -A 10 "resources"
```

## Setting Global Sidecar Resource Limits

You can set default resource limits for all sidecars through the IstioOperator:

```yaml
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
            cpu: 500m
            memory: 256Mi
```

If you are using Helm:

```bash
helm upgrade istiod istio/istiod -n istio-system \
  --set global.proxy.resources.requests.cpu=100m \
  --set global.proxy.resources.requests.memory=128Mi \
  --set global.proxy.resources.limits.cpu=500m \
  --set global.proxy.resources.limits.memory=256Mi
```

The `concurrency` setting controls how many worker threads Envoy uses. The default of 2 is fine for most workloads. High-throughput services might benefit from more, but increasing concurrency also increases CPU usage.

## Per-Workload Resource Overrides

Global defaults work as a baseline, but different workloads have different needs. Override resources for specific pods using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-api
  namespace: api-services
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "200m"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyCPULimit: "1"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

For a low-traffic internal service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: config-service
  namespace: internal
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "25m"
        sidecar.istio.io/proxyMemory: "64Mi"
        sidecar.istio.io/proxyCPULimit: "100m"
        sidecar.istio.io/proxyMemoryLimit: "128Mi"
```

## Understanding What Drives Sidecar Resource Usage

To set sensible limits, you need to understand what affects sidecar resource consumption.

**CPU usage** is primarily driven by:
- Traffic volume (requests per second)
- TLS handshakes (mTLS termination and origination)
- Number of active connections
- Access logging

**Memory usage** is primarily driven by:
- Number of services in the mesh (each service adds to the Envoy configuration)
- Number of listeners and routes configured
- Number of active connections (each connection uses buffer memory)
- Access log buffering

## Checking Actual Sidecar Resource Usage

Before setting limits, measure what your sidecars actually use:

```bash
# Get resource usage for all sidecar containers across the cluster
kubectl top pods -n api-services --containers | grep istio-proxy

# Get detailed resource usage for a specific pod
kubectl top pod my-pod-abc123 -n api-services --containers
```

You can also check Envoy's built-in stats:

```bash
# Memory allocated by Envoy
kubectl exec -n api-services deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep server.memory_allocated

# Active connections
kubectl exec -n api-services deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep downstream_cx_active
```

## Sizing Recommendations by Workload Type

### Low-Traffic Internal Services

These are services that handle maybe 10-50 requests per second. The sidecar barely needs anything:

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "25m"
  sidecar.istio.io/proxyMemory: "64Mi"
  sidecar.istio.io/proxyCPULimit: "200m"
  sidecar.istio.io/proxyMemoryLimit: "128Mi"
```

### Medium-Traffic API Services

Services handling 100-1000 requests per second:

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "100m"
  sidecar.istio.io/proxyMemory: "128Mi"
  sidecar.istio.io/proxyCPULimit: "500m"
  sidecar.istio.io/proxyMemoryLimit: "256Mi"
```

### High-Traffic Edge Services

Services handling thousands of requests per second with many concurrent connections:

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "500m"
  sidecar.istio.io/proxyMemory: "256Mi"
  sidecar.istio.io/proxyCPULimit: "2"
  sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

### Data-Intensive Services

Services that transfer large payloads (file uploads, streaming, etc.):

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "200m"
  sidecar.istio.io/proxyMemory: "512Mi"
  sidecar.istio.io/proxyCPULimit: "1"
  sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

## Reducing Sidecar Memory with Sidecar Resources

In large clusters, each sidecar gets the full mesh configuration pushed to it by default. You can reduce memory usage by restricting what each sidecar knows about:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: api-sidecar
  namespace: api-services
spec:
  workloadSelector:
    labels:
      app: orders-api
  egress:
  - hosts:
    - "api-services/*"
    - "data-services/*"
    - "istio-system/*"
```

This tells the sidecar to only load configuration for services in the listed namespaces, significantly reducing memory usage. In a mesh with 500 services, restricting a sidecar to only the 20 services it actually talks to can cut memory by 80%.

## Setting Envoy Concurrency

The number of Envoy worker threads affects CPU usage directly:

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
          concurrency: 1
```

Set `concurrency: 1` for low-traffic services to save CPU. For high-traffic services, `concurrency: 2` or `concurrency: 4` helps spread the load across cores.

## Monitoring Sidecar Resources Over Time

Set up Prometheus alerts to catch sidecars approaching their limits:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sidecar-resource-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio-sidecar-resources
    rules:
    - alert: SidecarHighMemoryUsage
      expr: |
        container_memory_working_set_bytes{container="istio-proxy"}
        / container_spec_memory_limit_bytes{container="istio-proxy"} > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio sidecar memory usage above 85%"
    - alert: SidecarHighCPUUsage
      expr: |
        rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])
        / container_spec_cpu_quota{container="istio-proxy"} * 100000 > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio sidecar CPU usage above 85%"
```

## Removing Limits for Testing

During performance testing, you might want to remove sidecar limits to see the true resource needs:

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "100m"
  sidecar.istio.io/proxyMemory: "128Mi"
  # Omit limit annotations to remove limits
```

Run your load test, observe the peak resource usage with `kubectl top`, and then set limits based on that data plus a 30-50% buffer.

## Summary

Setting sidecar resource limits is a balance between efficiency and reliability. Start with modest global defaults, use `kubectl top` and Envoy stats to measure actual usage, and override limits per workload based on traffic patterns. The biggest memory savings come from using the Sidecar resource to restrict configuration scope, especially in large meshes. Keep a buffer between requests and limits to handle traffic spikes, and set up monitoring alerts so you know when to adjust.
