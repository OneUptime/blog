# How to Right-Size Istio Sidecar Resource Requests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Resource Management, Kubernetes, Cost Optimization

Description: Step-by-step guide to measuring actual Istio sidecar resource consumption and setting optimal CPU and memory requests to avoid waste.

---

Every pod in an Istio mesh runs an Envoy sidecar proxy. Each sidecar has CPU and memory requests that reserve cluster resources whether the sidecar actually uses them or not. If you leave the defaults in place, you are almost certainly over-provisioning. If you set them too low, you get OOM kills and CPU throttling that slow down your services.

Getting this right requires measuring actual usage and setting requests based on real data, not guesswork.

## Default Sidecar Resource Requests

Istio's default sidecar resource configuration depends on the version and installation profile, but a typical default looks like this:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: "2"
    memory: 1Gi
```

The requests are what matter for scheduling. If you have 200 pods in the mesh, that is 20 CPU cores and 25.6 GB of memory reserved just for sidecars. On a cloud provider, you are paying for those resources whether the sidecars use them or not.

## Measuring Actual Sidecar Usage

Before changing anything, measure what your sidecars actually consume. There are several ways to do this.

**kubectl top** gives you a quick snapshot:

```bash
kubectl top pods -n production --containers | grep istio-proxy
```

This shows current CPU and memory usage per container. Run it at different times of day to capture peak and off-peak patterns.

**Prometheus queries** give you historical data and percentiles. If you have Prometheus scraping container metrics (via cAdvisor or kubelet), use these queries:

CPU usage (95th percentile over the last 24 hours):

```promql
quantile(0.95,
  rate(container_cpu_usage_seconds_total{
    container="istio-proxy",
    namespace="production"
  }[5m])
) by (pod)
```

Memory usage (95th percentile):

```promql
quantile(0.95,
  container_memory_working_set_bytes{
    container="istio-proxy",
    namespace="production"
  }
) by (pod)
```

Peak CPU usage across all sidecars in a namespace:

```promql
max(
  rate(container_cpu_usage_seconds_total{
    container="istio-proxy",
    namespace="production"
  }[5m])
)
```

## Analyzing the Results

In most clusters, you will find that sidecar CPU usage falls into three buckets:

**Low-traffic services** (background jobs, admin tools, internal APIs with few callers): These sidecars typically use 5-15m CPU and 30-50Mi memory.

**Medium-traffic services** (user-facing APIs, backend services): These use 20-50m CPU and 60-100Mi memory.

**High-traffic services** (API gateways, high-throughput data pipelines): These can use 100-500m CPU and 100-200Mi memory.

Memory usage is primarily driven by the number of services the sidecar knows about (the xDS configuration size) and the number of active connections. CPU usage is driven by request throughput and whether you have access logging enabled.

## Setting Right-Sized Requests

Based on your measurements, set requests at about 20% above the 95th percentile. This gives enough headroom for normal variation without wasting resources.

For a global default that works for most services:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 25m
            memory: 64Mi
          limits:
            cpu: 300m
            memory: 256Mi
```

For specific high-traffic services, override the global defaults using pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "1"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
    spec:
      containers:
      - name: api-gateway
        image: api-gateway:latest
```

For low-traffic services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-dashboard
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "10m"
        sidecar.istio.io/proxyMemory: "40Mi"
        sidecar.istio.io/proxyCPULimit: "100m"
        sidecar.istio.io/proxyMemoryLimit: "128Mi"
    spec:
      containers:
      - name: admin-dashboard
        image: admin-dashboard:latest
```

## The Concurrency Factor

Envoy's `concurrency` setting controls how many worker threads the proxy uses. Each thread consumes memory for its own set of connection pools and listeners. The default is 2.

For low-traffic services, set concurrency to 1:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 1
```

Or per-pod:

```yaml
annotations:
  proxy.istio.io/config: |
    concurrency: 1
```

Dropping from 2 threads to 1 typically saves 15-25 MB of memory per sidecar. Across hundreds of pods, that adds up.

## Memory Impact of Configuration Size

Sidecar memory usage grows with the number of services in the mesh. Each service endpoint, routing rule, and cluster configuration adds to the xDS configuration that every sidecar holds in memory.

Measure the configuration size:

```bash
# Get the xDS config dump from a sidecar
kubectl exec -n production deploy/your-service -c istio-proxy -- \
  pilot-agent request GET /config_dump | wc -c
```

If the config dump is larger than 5 MB, you should use Sidecar resources to limit scope:

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

## Setting Limits vs Requests

There is a debate about whether to set CPU and memory limits on sidecars. Here is the practical guidance:

**CPU limits**: Consider leaving them unset or setting them high. CPU throttling on the sidecar means added latency for your application. If a sidecar briefly needs more CPU during a traffic spike, throttling it hurts user experience. Kubernetes uses CPU requests for scheduling, so you still get fair resource distribution.

**Memory limits**: Always set these. An Envoy proxy with a memory leak (rare but possible) should be killed and restarted rather than consuming all node memory.

A reasonable approach:

```yaml
resources:
  requests:
    cpu: 25m
    memory: 64Mi
  limits:
    memory: 256Mi
```

No CPU limit, but a memory limit set at 4x the request. This gives the sidecar room to handle spikes while preventing runaway memory consumption.

## Automating Right-Sizing with VPA

The Kubernetes Vertical Pod Autoscaler (VPA) can automatically adjust sidecar resource requests. Configure it to target the istio-proxy container:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: istio-proxy
      minAllowed:
        cpu: 10m
        memory: 32Mi
      maxAllowed:
        cpu: 500m
        memory: 512Mi
      controlledResources: ["cpu", "memory"]
    - containerName: my-service
      minAllowed:
        cpu: 50m
        memory: 64Mi
```

Start with `updateMode: "Off"` to get recommendations without automatic changes. Review the VPA recommendations, then switch to `"Auto"` once you are comfortable with the values.

## Monitoring After Changes

After right-sizing, monitor for problems:

```promql
# OOM kills on sidecars
kube_pod_container_status_last_terminated_reason{
  container="istio-proxy",
  reason="OOMKilled"
}

# CPU throttling on sidecars
rate(container_cpu_cfs_throttled_periods_total{
  container="istio-proxy"
}[5m])
/
rate(container_cpu_cfs_periods_total{
  container="istio-proxy"
}[5m])
```

If you see OOM kills, increase memory limits. If throttling exceeds 10-15%, either increase CPU limits or remove them entirely.

## Summary

Right-sizing Istio sidecars is a continuous process: measure actual usage, set requests based on data, reduce concurrency for low-traffic services, scope sidecars to reduce configuration size, and monitor for throttling or OOM kills. The effort pays off in lower compute costs and better cluster utilization. Start with the highest-replica deployments first since those give you the biggest savings for the least work.
