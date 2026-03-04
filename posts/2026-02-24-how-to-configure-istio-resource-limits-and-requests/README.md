# How to Configure Istio Resource Limits and Requests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Resources, Kubernetes, Performance, Service Mesh

Description: A practical guide to properly sizing CPU and memory resource requests and limits for Istio control plane and sidecar proxy containers.

---

Getting Istio resource settings right is one of those things that can make or break your cluster. Set them too low and you get OOM kills and CPU throttling. Set them too high and you waste expensive compute. The tricky part is that Istio adds a sidecar to every pod, so the overhead multiplies across your entire fleet.

This guide covers how to think about resource allocation for both the Istio control plane and the Envoy sidecar proxies.

## Where Resources Are Consumed

Istio consumes resources in three places:

1. **istiod (control plane)** - Watches Kubernetes resources, computes Envoy config, distributes it to proxies
2. **Envoy sidecar proxies** - Run alongside every application container, handle all network traffic
3. **Gateways** - Ingress/egress gateways, essentially Envoy instances handling edge traffic

The sidecar proxies are the biggest overall consumers because there is one per pod. If you have 500 pods, that is 500 extra containers eating CPU and memory.

## Control Plane Resource Configuration

### istiod

istiod's resource needs scale with the number of services, endpoints, and configuration objects in your cluster. Here is how to set resources:

```yaml
# With IstioOperator
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: "2"
            memory: 4Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 75
```

With Helm:

```yaml
# values-istiod.yaml
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: "2"
      memory: 4Gi
  autoscaleEnabled: true
  autoscaleMin: 2
  autoscaleMax: 5
```

### istiod Sizing Guidelines

| Cluster Size | Services | CPU Request | Memory Request | CPU Limit | Memory Limit |
|---|---|---|---|---|---|
| Small | < 50 | 200m | 512Mi | 1 | 2Gi |
| Medium | 50-200 | 500m | 1Gi | 2 | 4Gi |
| Large | 200-1000 | 1 | 2Gi | 4 | 8Gi |
| Extra Large | 1000+ | 2 | 4Gi | 4 | 8Gi |

These are starting points. The actual numbers depend heavily on configuration complexity (number of VirtualServices, DestinationRules, etc.) and the rate of change in your cluster.

## Sidecar Proxy Resource Configuration

### Global Default

Set default resources for all sidecar proxies through the mesh configuration:

```yaml
# With IstioOperator
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
            cpu: "1"
            memory: 512Mi
```

With Helm:

```yaml
# values.yaml
global:
  proxy:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: "1"
        memory: 512Mi
```

### Per-Pod Override

Individual pods can override the global defaults using annotations:

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
        sidecar.istio.io/proxyCPULimit: "2"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
    spec:
      containers:
        - name: api
          image: my-api:latest
```

This is useful for high-traffic services that need more proxy resources than the default.

### Sidecar Sizing Guidelines

Envoy proxy resource needs depend on:

- **Requests per second** - More traffic means more CPU
- **Number of upstream clusters** - More services in the mesh means more memory for configuration
- **Connection count** - Each active connection uses memory
- **Access logging** - Writing logs uses CPU

| Traffic Level | RPS | CPU Request | Memory Request | CPU Limit | Memory Limit |
|---|---|---|---|---|---|
| Low | < 100 | 10m | 40Mi | 200m | 128Mi |
| Medium | 100-1000 | 100m | 128Mi | 500m | 256Mi |
| High | 1000-5000 | 200m | 256Mi | 1 | 512Mi |
| Very High | 5000+ | 500m | 512Mi | 2 | 1Gi |

## Gateway Resource Configuration

Gateways handle all ingress/egress traffic and typically need more resources than sidecars:

```yaml
# values-gateway.yaml
resources:
  requests:
    cpu: 500m
    memory: 256Mi
  limits:
    cpu: "2"
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

## Concurrency Settings

The Envoy `concurrency` setting controls how many worker threads the proxy uses. By default, it uses 2 threads. For most workloads, this is fine, but high-traffic pods might benefit from more:

```yaml
meshConfig:
  defaultConfig:
    concurrency: 2
```

Per-pod override:

```yaml
annotations:
  proxy.istio.io/config: '{"concurrency": 4}'
```

More threads means more CPU usage but better throughput for high-RPS workloads.

## Init Container Resources

The `istio-init` container (which sets up iptables) runs briefly during pod startup. It has its own resource settings:

```yaml
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

Since it only runs for a second or two, keep these minimal.

## Monitoring Actual Usage

The most important step is monitoring what your proxies actually consume:

```bash
# Check resource usage of all istio-proxy containers
kubectl top pods -n my-app --containers | grep istio-proxy
```

For more detailed metrics, query Prometheus:

```text
# Average CPU usage of sidecar proxies
avg(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (pod)

# Memory usage of sidecar proxies
container_memory_working_set_bytes{container="istio-proxy"}

# istiod resource usage
container_memory_working_set_bytes{pod=~"istiod.*"}
```

## Detecting Resource Issues

### OOM Kills

Check for out-of-memory kills:

```bash
kubectl get events -A --field-selector reason=OOMKilled | grep istio
```

If sidecar proxies are getting OOM-killed, increase memory limits.

### CPU Throttling

Check for CPU throttling:

```bash
kubectl exec deploy/my-app -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "server.total_connections"
```

If you see high latency and the proxy CPU is pegged at its limit, increase the CPU limit.

### Configuration Size

Large clusters generate large Envoy configurations. Check how much config istiod is pushing:

```bash
istioctl proxy-config cluster deploy/my-app -n my-app | wc -l
```

If a proxy has thousands of cluster entries, it will use more memory. Consider using the Sidecar resource to limit config scope:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: my-app
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "other-namespace/specific-service.other-namespace.svc.cluster.local"
```

This tells the proxy to only receive configuration for services it actually talks to, dramatically reducing memory usage.

## Right-Sizing Strategy

1. Start with conservative defaults (see the tables above)
2. Deploy and run for at least 24 hours under normal load
3. Check actual usage with `kubectl top` and Prometheus
4. Set requests to the P95 of actual usage
5. Set limits to 2-3x the requests
6. Re-check after any significant change in traffic or services

## Cost Impact

The per-pod sidecar overhead is the biggest cost factor. For a cluster with 1000 pods where each sidecar requests 100m CPU and 128Mi memory:

- Total sidecar CPU requests: 100 cores
- Total sidecar memory requests: 128 GiB

That is a significant amount of compute. This is why getting the sizing right matters. Oversized sidecars waste money; undersized sidecars cause outages.

## Wrapping Up

Resource configuration for Istio is not a set-it-and-forget-it task. Start with reasonable defaults, monitor actual consumption, and adjust. Use per-pod annotations for services that are outliers, and use the Sidecar resource to reduce configuration size in large meshes. The time you spend on proper sizing pays off in both stability and cost savings.
