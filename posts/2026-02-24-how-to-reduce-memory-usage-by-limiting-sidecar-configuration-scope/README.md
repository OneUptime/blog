# How to Reduce Memory Usage by Limiting Sidecar Configuration Scope

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Memory, Performance, Kubernetes, Envoy

Description: Reduce Envoy proxy memory consumption in large Istio meshes by using Sidecar resources to limit the configuration pushed to each proxy.

---

If you have ever monitored memory usage in an Istio mesh, you might have been surprised by how much memory each Envoy sidecar consumes. In a mesh with hundreds of services, each sidecar can use 100MB or more of RAM just to hold the configuration for all those services. Multiply that by thousands of pods and you are looking at significant resource waste.

The root cause is that by default, istiod sends every proxy the full service mesh configuration. Every listener, every route, every cluster for every service - regardless of whether a particular pod actually communicates with those services. The Sidecar resource fixes this by scoping the configuration down to only what each workload needs.

## Understanding the Memory Problem

Each Envoy proxy maintains in-memory data structures for:
- **Listeners** - One for each port it needs to handle
- **Routes** - Routing rules for each service and port combination
- **Clusters** - Backend service definitions with connection pool settings
- **Endpoints** - Individual pod IP addresses for each service

In a mesh with 500 services, each with an average of 5 endpoints, that is:
- 500+ cluster definitions
- 2,500+ endpoint entries
- Hundreds of route rules
- Associated metadata, certificates, and configuration

Every time a service is added or a pod scales, istiod pushes updates to every proxy. In large meshes, this constant configuration churn also impacts CPU usage and network bandwidth.

## Measuring Current Memory Usage

Before optimizing, measure your baseline:

```bash
# Check memory usage of a sidecar proxy
kubectl top pod -n backend -l app=my-service --containers | grep istio-proxy

# Get detailed Envoy stats
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET /stats | grep "server.memory"

# Count the number of clusters (services) a proxy knows about
istioctl proxy-config cluster deploy/my-service -n backend | wc -l

# Count endpoints
istioctl proxy-config endpoints deploy/my-service -n backend | wc -l
```

If a proxy has hundreds of clusters and thousands of endpoints but only communicates with a handful of services, there is a lot of room for optimization.

## Strategy 1: Namespace-Level Sidecar

The quickest win is applying a namespace-level Sidecar that limits visibility to the current namespace plus essential namespaces:

```yaml
apiVersion: networking.istio.io/v1
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

Apply this to each namespace:

```bash
for ns in frontend backend payments notifications; do
  kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
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

Then add cross-namespace dependencies as needed:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "backend/api-gateway.backend.svc.cluster.local"
```

## Strategy 2: Per-Workload Sidecar

For maximum memory savings, create per-workload Sidecars:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: checkout-sidecar
  namespace: frontend
spec:
  workloadSelector:
    labels:
      app: checkout
  egress:
    - hosts:
        - "istio-system/*"
        - "backend/cart-service.backend.svc.cluster.local"
        - "backend/payment-service.backend.svc.cluster.local"
        - "*/api.stripe.com"
```

This proxy only loads configuration for 3 services plus istio-system. Compared to the full mesh configuration, this can reduce memory usage by 80-90%.

## Strategy 3: Global Mesh Default

Set a mesh-wide default Sidecar in the `istio-system` namespace that acts as the baseline:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: istio-system
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

This global Sidecar applies to any namespace that does not have its own Sidecar resource. It restricts every workload to its own namespace plus istio-system by default. You then add broader visibility only where needed.

Note: A Sidecar in the `istio-system` namespace with no `workloadSelector` serves as the mesh-wide default.

## Measuring the Impact

After applying Sidecar resources, measure the improvement:

```bash
# Compare cluster count before and after
istioctl proxy-config cluster deploy/my-service -n backend | wc -l

# Compare endpoint count
istioctl proxy-config endpoints deploy/my-service -n backend | wc -l

# Check memory after the config change takes effect (wait a minute)
kubectl top pod -l app=my-service -n backend --containers | grep istio-proxy
```

In a mesh with 500 services, if a workload only needs 10, you should see roughly a 98% reduction in cluster count and a proportional memory decrease.

## Real-World Numbers

Based on production experiences:

| Mesh Size | Default Memory per Proxy | With Sidecar (10 services) | Savings |
|-----------|------------------------|---------------------------|---------|
| 100 services | ~50 MB | ~15 MB | 70% |
| 500 services | ~120 MB | ~20 MB | 83% |
| 1000 services | ~250 MB | ~25 MB | 90% |
| 5000 services | ~1 GB | ~30 MB | 97% |

These numbers are approximate and depend on factors like the number of endpoints per service, the complexity of traffic policies, and certificate counts.

## Impact on Configuration Push Performance

Besides memory, Sidecar resources also improve configuration push performance:

- **Smaller configuration updates.** When a service changes, istiod only pushes updates to proxies that have that service in their Sidecar scope.
- **Faster proxy startup.** Less configuration to process means pods start faster.
- **Lower istiod CPU usage.** Computing and sending smaller configurations is less work.

You can see the push performance in istiod metrics:

```bash
# Configuration push latency
pilot_proxy_convergence_time_bucket

# Number of proxies updated per push
pilot_proxy_queue_time_bucket

# Push errors
pilot_xds_pushes{type="cds"}
```

## Handling Service Dependencies Automatically

Manually tracking which services each workload needs is tedious. Here are some approaches to automate it:

**Use Kiali's service graph** to identify actual service dependencies:

```bash
# Access Kiali
istioctl dashboard kiali
```

Look at the service graph for each namespace. The edges between services show real traffic patterns. Use these to build your Sidecar configurations.

**Use Prometheus metrics** to discover dependencies:

```promql
# Find all destination services called by a specific source
sum by (destination_service) (
  rate(istio_requests_total{
    source_workload="checkout",
    source_workload_namespace="frontend"
  }[7d])
) > 0
```

This query shows all services that the checkout workload called in the last 7 days.

**Export from istioctl:**

```bash
# See what clusters a proxy currently uses
istioctl proxy-config cluster deploy/checkout -n frontend -o json | \
  jq -r '.[].name' | sort | uniq
```

## Proxy Resource Limits

After optimizing with Sidecar resources, update your proxy resource requests and limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: frontend
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemory: "64Mi"
        sidecar.istio.io/proxyMemoryLimit: "128Mi"
        sidecar.istio.io/proxyCPU: "50m"
        sidecar.istio.io/proxyCPULimit: "200m"
```

With a scoped Sidecar, you can confidently lower these limits. Monitor for OOM kills after lowering limits:

```bash
kubectl get events -n frontend | grep OOM
```

## Progressive Optimization

Here is a practical rollout plan:

**Week 1:** Apply namespace-level Sidecars to all namespaces with `./*` and `istio-system/*`. This alone gives significant savings.

**Week 2:** Review cross-namespace dependencies and add them to the Sidecar egress lists. Fix any broken connections.

**Week 3:** For high-traffic namespaces, create per-workload Sidecars based on observed traffic patterns.

**Week 4:** Lower proxy resource limits based on actual memory usage after optimization.

**Ongoing:** Update Sidecar configurations as service dependencies change. Add this to your service deployment process.

## Common Pitfalls

**Forgetting istio-system.** If you exclude `istio-system/*`, some Istio features break (like certificate rotation and telemetry).

**Breaking cross-namespace communication.** Always test after applying Sidecars. Watch for NR (no route) flags in access logs.

**Over-restricting during rollout.** Start broad and narrow down. It is easier to remove services from the list than to debug why something broke.

**Not updating Sidecars when adding new dependencies.** If service A starts calling a new service B, the Sidecar needs to be updated. Include this in your deployment process.

Reducing sidecar memory usage through Sidecar resources is one of the most practical optimizations for large Istio meshes. It directly translates to lower infrastructure costs, faster pod startup, and better mesh stability. Start with namespace-level Sidecars and refine from there based on your actual service communication patterns.
