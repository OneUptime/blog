# How to Configure Sidecar Proxy Resource Limits

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Kubernetes, Resource Management, Envoy

Description: A hands-on guide to setting CPU and memory resource requests and limits for Istio sidecar proxies to control cluster resource usage.

---

Every pod in an Istio mesh gets a sidecar proxy container, and that container consumes CPU and memory. If you have 200 pods, you have 200 Envoy proxies, each using resources. Without setting proper resource limits, those proxies can eat up a surprising amount of your cluster capacity - or worse, get OOMKilled under load.

Setting resource requests and limits for sidecar proxies is essential for production meshes. This post walks through the different ways to configure them and provides guidance on what values to actually use.

## Default Sidecar Resource Usage

By default, Istio sets these resource requests and limits for the sidecar proxy:

- **CPU request**: 100m (0.1 CPU cores)
- **CPU limit**: 2000m (2 CPU cores)
- **Memory request**: 128Mi
- **Memory limit**: 1024Mi

These defaults are set in the Istio installation configuration and apply to every sidecar injected into the mesh. For many workloads, the defaults are fine. But for large meshes or resource-constrained environments, you'll want to tune them.

## Setting Resource Limits Globally

To change the default resource limits for all sidecars in the mesh, configure them in the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

If you're using Helm:

```bash
helm install istiod istio/istiod -n istio-system \
  --set global.proxy.resources.requests.cpu=50m \
  --set global.proxy.resources.requests.memory=64Mi \
  --set global.proxy.resources.limits.cpu=500m \
  --set global.proxy.resources.limits.memory=256Mi
```

These values apply to all newly injected sidecars. Existing pods need a restart to pick up the changes.

## Setting Resource Limits per Pod

You can override the global defaults for individual pods using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-api
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "200m"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyCPULimit: "1000m"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
    spec:
      containers:
        - name: api
          image: my-api:latest
```

The annotations are:

| Annotation | Description |
|---|---|
| `sidecar.istio.io/proxyCPU` | CPU request |
| `sidecar.istio.io/proxyMemory` | Memory request |
| `sidecar.istio.io/proxyCPULimit` | CPU limit |
| `sidecar.istio.io/proxyMemoryLimit` | Memory limit |

These annotations override the global defaults for that specific pod.

## Setting Resource Limits per Namespace

Istio doesn't have a native per-namespace resource configuration for sidecars, but you can achieve it using a ProxyConfig resource:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: namespace-proxy-config
  namespace: high-traffic
spec:
  concurrency: 2
```

For actual resource limits at the namespace level, a better approach is to use Kubernetes LimitRange:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: sidecar-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 256Mi
      defaultRequest:
        cpu: 50m
        memory: 64Mi
```

This applies to all containers in the namespace, including sidecar proxies, so adjust the values accordingly.

## Understanding Sidecar Memory Consumption

Envoy's memory usage depends on several factors:

1. **Number of services in the mesh**: More services means more configuration, more clusters, more routes
2. **Number of endpoints**: Each service endpoint adds to the proxy's working set
3. **Active connections**: Each open connection consumes memory for buffers
4. **Access logging**: Buffering log entries uses memory
5. **Filters and Wasm extensions**: Additional processing adds memory overhead

A rough guideline for memory sizing:

- **Small mesh (< 50 services)**: 64-128Mi is usually enough
- **Medium mesh (50-500 services)**: 128-256Mi
- **Large mesh (500+ services)**: 256Mi-1Gi, especially without Sidecar resources to limit scope

If you're using the Sidecar resource to limit what each proxy knows about, memory usage drops significantly because the proxy holds less configuration.

## Understanding Sidecar CPU Consumption

CPU usage scales primarily with:

1. **Request rate**: More requests per second means more CPU for proxying
2. **mTLS**: TLS handshakes and encryption/decryption consume CPU
3. **Telemetry collection**: Generating metrics and traces uses CPU
4. **HTTP parsing**: HTTP/1.1 and HTTP/2 parsing is CPU-intensive at high request rates
5. **Wasm extensions**: Custom extensions running in the proxy add CPU overhead

For CPU sizing:

- **Low traffic (< 100 RPS)**: 50-100m request, 200-500m limit
- **Medium traffic (100-1000 RPS)**: 100-200m request, 500m-1000m limit
- **High traffic (1000+ RPS)**: 200m+ request, 1000m+ limit

These are rough numbers. Your actual usage depends on request sizes, connection patterns, and what features you have enabled.

## Monitoring Resource Usage

Before tuning, measure actual usage. Use Prometheus queries to see real resource consumption:

```bash
# CPU usage per sidecar
container_cpu_usage_seconds_total{container="istio-proxy"}

# Memory usage per sidecar
container_memory_working_set_bytes{container="istio-proxy"}
```

Or use kubectl top:

```bash
# Check resource usage for all istio-proxy containers in a namespace
kubectl top pods -n production --containers | grep istio-proxy
```

You can also check if any proxies are being throttled:

```bash
# Check for OOMKilled sidecars
kubectl get events -n production | grep -i oom
```

## Example: Tuning for a Large Mesh

Here's a real-world example of a configuration for a mesh with 300+ services:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 1000m
            memory: 512Mi
  meshConfig:
    defaultConfig:
      concurrency: 2
      holdApplicationUntilProxyStarts: true
```

Combined with Sidecar resources that limit each proxy's scope:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

This combination - reasonable resource limits plus scoped Sidecar configuration - keeps memory usage manageable even in large meshes.

## Init Container Resources

Don't forget about the `istio-init` container. It runs briefly at pod startup to configure iptables rules. You can configure its resources too:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy_init:
        resources:
          requests:
            cpu: 10m
            memory: 10Mi
          limits:
            cpu: 100m
            memory: 50Mi
```

The init container only runs for a few seconds, so it doesn't need much. But setting requests is important for scheduling - Kubernetes considers init container resources when scheduling pods.

## Tips for Production

1. **Start with monitoring**: Deploy with defaults, monitor actual usage for a week, then set limits based on observed patterns
2. **Set requests based on steady-state**: The CPU and memory request should match your p50 usage
3. **Set limits with headroom**: Limits should be 2-3x the request to handle spikes
4. **Use Sidecar resources**: Reducing proxy configuration scope is the most effective way to reduce memory usage
5. **Watch for OOMKill**: If proxies get OOMKilled, increase memory limits. A killed proxy means dropped connections
6. **Consider pod QoS**: If requests equal limits, the pod gets Guaranteed QoS class, which makes it less likely to be evicted

Getting sidecar resource limits right is a balancing act. Too low and you get throttling, OOMKills, and degraded performance. Too high and you waste cluster resources. Measure first, then tune based on real data.
