# How to Use Sidecar Configuration to Improve Mesh Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Performance, Service Mesh, Envoy

Description: Practical techniques for using Istio Sidecar resource configuration to reduce proxy memory, speed up config pushes, and improve overall mesh performance.

---

Every Envoy sidecar in your Istio mesh carries configuration for the entire service catalog by default. In a mesh with 100 services, that might be fine. In a mesh with 1,000 services, each proxy is holding configuration it will never use, burning memory and slowing down configuration pushes. The Istio Sidecar resource is your primary tool for fixing this, and using it effectively can dramatically improve mesh performance.

This post focuses specifically on how to use Sidecar configurations to get meaningful performance improvements out of your Istio mesh.

## Measuring the Baseline

Before making changes, measure where you stand. You need baseline numbers to know if your optimizations worked.

Check the current configuration size for a proxy:

```bash
# Configuration size in bytes
istioctl proxy-config all deploy/my-app -n production -o json | wc -c

# Number of clusters (upstream services) configured
istioctl proxy-config clusters deploy/my-app -n production | wc -l

# Number of endpoints
istioctl proxy-config endpoints deploy/my-app -n production | wc -l
```

Check proxy memory usage:

```bash
kubectl top pods -n production --containers | grep istio-proxy | sort -k4 -h
```

Check istiod push metrics:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_push_time_bucket
```

Write these numbers down. You'll compare against them after each optimization.

## Namespace-Scoped Sidecar: The Quick Win

The fastest way to improve performance is to apply a namespace-scoped Sidecar resource to every namespace in your mesh. This limits each proxy to only knowing about services in its own namespace (plus istio-system for control plane communication):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

Create one of these for each namespace. You can script it:

```bash
for ns in $(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: $ns
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
EOF
done
```

Now re-measure. In a mesh with 20 namespaces and 50 services per namespace, each proxy goes from knowing about 1,000 services to knowing about 50. That's a 95% reduction in configuration.

## Adding Cross-Namespace Dependencies

After applying namespace-scoped Sidecars, some services will break because they need to reach services in other namespaces. This is expected. You need to add those cross-namespace dependencies explicitly.

Use your observability tools to figure out which services talk to which namespaces. Kiali's service graph is great for this. Or check Istio's telemetry:

```bash
# Query Prometheus for cross-namespace traffic
# Look for source_workload_namespace != destination_workload_namespace
kubectl exec -n istio-system deploy/prometheus -- curl -s 'localhost:9090/api/v1/query?query=istio_requests_total{source_workload_namespace!%3Ddestination_workload_namespace}' | jq '.data.result[] | {source: .metric.source_workload_namespace, dest: .metric.destination_workload_namespace}' | sort -u
```

Then update the Sidecar resources to include the needed namespaces:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "backend/*"
        - "auth/*"
```

## Per-Workload Sidecar for High-Impact Services

For services that you know have very limited dependencies, create workload-specific Sidecars that are even more restrictive:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: cache-worker-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: cache-worker
  egress:
    - hosts:
        - "./redis.backend.svc.cluster.local"
        - "istio-system/*"
```

This cache worker only talks to Redis. Its proxy only gets configuration for Redis and istio-system. The configuration is minimal, startup is fast, and memory usage is as low as it gets.

## Reducing Inbound Configuration

The Sidecar resource also lets you explicitly declare inbound ports, which can help the proxy skip ports it doesn't need to configure listeners for:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: api-sidecar
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-server
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http
      defaultEndpoint: 127.0.0.1:8080
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

By explicitly declaring the ingress port, you tell the proxy exactly what to expect. This eliminates any guesswork around protocol detection and removes listeners for ports that don't matter.

## Impact on Configuration Push Time

One of the biggest performance improvements from Sidecar resources isn't on the proxy side - it's on the control plane. When istiod pushes configuration, it only needs to compute and send configuration that's relevant to each proxy. With Sidecar resources, the amount of configuration per proxy shrinks, which means:

- Faster push computation in istiod
- Smaller xDS payloads sent over the network
- Faster processing on the proxy side when receiving updates

Monitor the improvement:

```bash
# Before and after comparison of push times
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_push_time
```

In large meshes, push times can drop from seconds to milliseconds when Sidecar resources are properly configured.

## Sidecar Configuration and Startup Time

Pod startup time is affected by how long it takes the sidecar to receive its initial configuration. In large meshes without Sidecar resources, a new pod might wait several seconds for istiod to push the full mesh configuration.

With `holdApplicationUntilProxyStarts` enabled:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

The application container waits for the proxy to be ready. If the proxy takes 5 seconds to get its configuration, the application waits 5 seconds to start. Sidecar resources reduce this by reducing the configuration the proxy needs to receive and process.

## Combining with Other Optimizations

Sidecar resources work best when combined with other performance optimizations:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
      holdApplicationUntilProxyStarts: true
    discoverySelectors:
      - matchLabels:
          istio-mesh: "true"
```

Discovery selectors reduce what istiod watches. Sidecar resources reduce what each proxy receives. Together, they attack the problem from both sides.

## Tracking Performance Improvements

Set up a dashboard that tracks these metrics over time:

| Metric | What It Tells You |
|---|---|
| `container_memory_working_set_bytes{container="istio-proxy"}` | Proxy memory usage |
| `pilot_xds_push_time` | How long istiod takes to push config |
| `pilot_proxy_convergence_time` | Time from change to all proxies updated |
| `envoy_server_memory_allocated` | Envoy's internal memory tracking |

After applying Sidecar resources, you should see clear improvements in all of these metrics. If you don't, check that the Sidecar resources are actually being applied correctly:

```bash
istioctl analyze -n production
```

The Sidecar resource is the single most effective tool Istio provides for mesh performance. It's not just a nice-to-have for large meshes - it should be part of your standard deployment process from the start. Getting into the habit of declaring dependencies explicitly pays dividends as your mesh grows.
