# How to Handle Sidecar Container Resource Requests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Sidecar, Resource Management, Performance

Description: Learn how to properly configure resource requests and limits for Istio sidecar proxy containers to avoid resource contention and scheduling issues.

---

When you run Istio in production, every pod in your mesh gets an Envoy sidecar injected alongside your application container. That sidecar consumes real CPU and memory, and if you don't account for it in your resource planning, you'll run into scheduling failures, throttled proxies, or nodes that look underutilized but are actually packed tight.

Getting sidecar resource requests right is one of those things that seems simple but has a bunch of gotchas. This guide walks through the practical steps to configure and tune sidecar resource requests so your mesh runs smoothly.

## Why Sidecar Resources Matter

Every Envoy sidecar needs CPU cycles to process traffic and memory to hold its configuration, connection pools, and stats. If you don't set resource requests, Kubernetes treats the sidecar as a best-effort container, which means it can get killed first under memory pressure. On the flip side, if you set requests too high, you waste cluster capacity because Kubernetes reserves those resources even when the proxy is idle.

The default Istio sidecar resource configuration is intentionally minimal. For many production workloads, you need to adjust these values based on actual traffic patterns.

## Checking Default Sidecar Resources

First, look at what your current Istio installation sets for sidecar resources:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o jsonpath='{.data.values}' | jq '.global.proxy.resources'
```

You'll see something like:

```json
{
  "requests": {
    "cpu": "100m",
    "memory": "128Mi"
  },
  "limits": {
    "cpu": "2000m",
    "memory": "1024Mi"
  }
}
```

These defaults work fine for light traffic, but high-throughput services or services with large numbers of endpoints will need more.

## Setting Global Sidecar Resources

The most straightforward way to set sidecar resources is through the IstioOperator configuration. This applies to all newly injected sidecars across the mesh:

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
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

Apply it with:

```bash
istioctl install -f istio-resources.yaml
```

After changing global settings, you need to restart your workloads for the new sidecar resource values to take effect. A rolling restart does the trick:

```bash
kubectl rollout restart deployment -n my-namespace
```

## Per-Workload Resource Overrides

Not every service needs the same sidecar resources. A frontend that handles thousands of requests per second needs more proxy resources than an internal batch job that talks to one service. You can override the global defaults on individual pods using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-api
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "500m"
        sidecar.istio.io/proxyMemory: "512Mi"
        sidecar.istio.io/proxyCPULimit: "2000m"
        sidecar.istio.io/proxyMemoryLimit: "1024Mi"
    spec:
      containers:
      - name: api
        image: my-api:latest
        resources:
          requests:
            cpu: "1"
            memory: 1Gi
          limits:
            cpu: "2"
            memory: 2Gi
```

These annotations override the global values for that specific workload. The full list of supported annotations:

- `sidecar.istio.io/proxyCPU` - CPU request
- `sidecar.istio.io/proxyMemory` - Memory request
- `sidecar.istio.io/proxyCPULimit` - CPU limit
- `sidecar.istio.io/proxyMemoryLimit` - Memory limit

## Understanding What Drives Sidecar Resource Usage

To set sensible values, you need to understand what actually consumes resources in the Envoy sidecar:

**CPU usage** scales with:
- Requests per second through the proxy
- TLS handshakes (mTLS adds overhead)
- Number of active connections
- Complexity of routing rules and filters
- The `concurrency` setting (number of worker threads)

**Memory usage** scales with:
- Number of endpoints in the mesh (each service endpoint takes memory)
- Number of listeners and routes configured
- Size of the stats/metrics buffer
- Active connection state

You can check actual sidecar resource usage with:

```bash
kubectl top pods -n my-namespace --containers | grep istio-proxy
```

Or for more detailed metrics, query Prometheus:

```bash
# CPU usage of sidecar containers
container_cpu_usage_seconds_total{container="istio-proxy"}

# Memory usage of sidecar containers
container_memory_working_set_bytes{container="istio-proxy"}
```

## Setting Concurrency for CPU-Bound Proxies

The `concurrency` setting controls how many worker threads Envoy uses. By default, Istio sets this to 2. If your proxy is CPU-bound (handling very high request rates), you can increase it:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-rps-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 4
        sidecar.istio.io/proxyCPU: "1000m"
        sidecar.istio.io/proxyCPULimit: "4000m"
    spec:
      containers:
      - name: app
        image: my-app:latest
```

Make sure your CPU request and limit can actually support the number of threads you configure. Setting concurrency to 4 but limiting CPU to 500m doesn't make sense.

## Handling Resource Requests in Resource-Constrained Environments

In dev or staging clusters where resources are tight, you might want to minimize sidecar overhead:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 10m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

This is fine for environments with low traffic, but don't use these values in production. A sidecar with 10m CPU will get throttled quickly under any real load.

## Impact on Pod Scheduling

Here's something people overlook: sidecar resource requests are added to your pod's total resource requests. If your application container requests 1 CPU and 1Gi memory, and the sidecar requests 200m CPU and 256Mi memory, the scheduler needs to find a node with at least 1.2 CPU and ~1.3Gi memory available.

This can cause problems when your nodes are sized based on application requirements alone. You can check total pod resource requests with:

```bash
kubectl get pod my-pod -o jsonpath='{.spec.containers[*].resources.requests}'
```

Factor sidecar resources into your node sizing calculations. If you have 100 pods on a node, sidecar requests add up fast: 100 pods * 200m CPU = 20 CPU cores just for sidecars.

## Using Vertical Pod Autoscaler for Sidecars

If you don't want to manually tune sidecar resources, you can use the Kubernetes Vertical Pod Autoscaler (VPA). However, VPA works at the pod level, not the container level by default. You need to specify container-level policies:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  resourcePolicy:
    containerPolicies:
    - containerName: istio-proxy
      minAllowed:
        cpu: 50m
        memory: 64Mi
      maxAllowed:
        cpu: 2000m
        memory: 1Gi
      mode: Auto
    - containerName: my-app
      mode: Auto
```

## Monitoring and Adjusting Over Time

Once you set initial resource values, monitor them over a few days of normal traffic. Look for:

- **CPU throttling**: Check `container_cpu_cfs_throttled_seconds_total` for the istio-proxy container. Any significant throttling means your CPU limit is too low.
- **OOMKills**: Check pod events for OOMKilled on the istio-proxy container. Increase memory limits if this happens.
- **Wasted resources**: If actual usage is consistently below 50% of the request, you're over-provisioning.

```bash
# Check for OOMKilled sidecars
kubectl get events --field-selector reason=OOMKilling -A | grep istio-proxy
```

Getting sidecar resource requests right is an iterative process. Start with reasonable defaults, monitor actual usage under production traffic, and adjust. The goal is to give sidecars enough headroom to handle traffic spikes without wasting cluster resources during quiet periods.
