# How to Configure Endpoint Discovery Service Across Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EDS, Multi-Cluster, Service Discovery, xDS

Description: How Istio's Endpoint Discovery Service works across clusters and how to configure it for reliable cross-cluster endpoint resolution.

---

Endpoint Discovery Service (EDS) is the Envoy API that Istiod uses to tell sidecar proxies about the actual IP addresses of backend pods. In a single cluster, Istiod watches the Kubernetes API for Endpoints and EndpointSlices, then translates them into EDS responses that get pushed to every proxy. In a multi-cluster mesh, this same mechanism extends across cluster boundaries.

Understanding how EDS works across clusters helps you troubleshoot endpoint issues, optimize configuration push performance, and make informed decisions about your multi-cluster architecture.

## EDS in the Context of xDS

Envoy proxies get their configuration from Istiod via a set of APIs collectively called xDS:

- **LDS** (Listener Discovery Service) - what ports to listen on
- **RDS** (Route Discovery Service) - how to route requests
- **CDS** (Cluster Discovery Service) - what upstream clusters exist
- **EDS** (Endpoint Discovery Service) - what IP addresses belong to each cluster

When a request arrives at a sidecar, Envoy uses LDS to match the listener, RDS to determine the route, CDS to find the upstream cluster, and EDS to pick an actual endpoint IP to send the request to.

In a multi-cluster setup, EDS is where cross-cluster magic happens. Istiod aggregates endpoints from all clusters and pushes them as a single EDS response.

## How Istiod Discovers Remote Endpoints

When you create a remote secret (a kubeconfig for a remote cluster), Istiod uses it to establish a Kubernetes watch on the remote cluster's API server. It watches:

- Services
- Endpoints
- EndpointSlices
- Pods
- Nodes

When a new pod comes up in the remote cluster, Istiod detects the change through the watch, updates its internal endpoint registry, and pushes new EDS configuration to all proxies that subscribe to that service.

Check what endpoints Istiod knows about:

```bash
# See all endpoints for a specific service
istioctl proxy-config endpoints deployment/sleep -n sample --context="${CTX_CLUSTER1}" | grep helloworld
```

The output looks something like:

```
10.10.1.5:5000    HEALTHY     outbound|5000||helloworld.sample.svc.cluster.local
10.20.2.8:5000    HEALTHY     outbound|5000||helloworld.sample.svc.cluster.local
```

If both clusters have healthy endpoints, you see IPs from both clusters listed here.

## Same-Network vs Different-Network Endpoints

The way endpoints appear in EDS differs based on network topology.

**Same network**: Endpoints show the actual pod IPs from both clusters. The sidecar connects directly to the remote pod.

**Different networks**: Endpoints from the remote cluster show the east-west gateway IP instead of actual pod IPs. Istiod rewrites the endpoint address to the gateway address because the actual pod IP is not reachable.

You can verify this:

```bash
# Check endpoint addresses
istioctl proxy-config endpoints deployment/sleep -n sample --context="${CTX_CLUSTER1}" -o json | \
  jq '.[] | select(.hostName | contains("helloworld")) | .endpoint'
```

For different-network endpoints, you will see the east-west gateway IP with metadata indicating the actual destination.

## Controlling Endpoint Scope

By default, Istiod distributes endpoints for all services to all proxies. In large meshes, this can create excessive memory usage and configuration push overhead. You can scope which endpoints a proxy sees using Sidecar resources:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: sample
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "other-namespace/*"
```

This tells Istiod to only push endpoints for services in the same namespace, istio-system, and other-namespace. Services from other namespaces (including those from remote clusters) will not show up in EDS.

For cross-cluster traffic, make sure the Sidecar resource includes the namespaces of the remote services you need:

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
```

This works across clusters. If `backend/reviews` exists in a remote cluster, it will still show up in EDS because the Sidecar allows the `backend` namespace.

## Endpoint Health Checking

Istiod relies on Kubernetes readiness probes to determine endpoint health. If a pod fails its readiness probe, Kubernetes removes it from the Endpoints resource, and Istiod propagates that removal through EDS.

For cross-cluster scenarios, this means:

1. A pod in cluster2 fails its readiness probe
2. Kubernetes in cluster2 removes it from the Endpoints
3. Istiod (watching cluster2's API) detects the change
4. Istiod pushes updated EDS to all proxies, removing the unhealthy endpoint

The latency of this propagation depends on the Kubernetes watch connection. Typically it takes a few seconds.

Additionally, Envoy's outlier detection provides client-side health checking. If a remote endpoint starts returning 5xx errors, the sidecar can eject it locally before the Kubernetes-level health check catches up:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews
  namespace: backend
spec:
  host: reviews.backend.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## EDS Push Performance

In large multi-cluster meshes, EDS pushes can become a bottleneck. Every time a pod starts or stops in any cluster, Istiod needs to push updated endpoint lists to all relevant proxies.

Monitor push performance:

```bash
# Check pilot push metrics
kubectl exec -n istio-system deployment/istiod -- \
  pilot-agent request GET /metrics | grep pilot_xds_pushes
```

Key metrics to watch:
- `pilot_xds_pushes` - total number of pushes
- `pilot_proxy_convergence_time` - time from change detection to push completion
- `pilot_xds_push_time` - time spent on each push

To reduce push overhead:

1. **Use Sidecar resources**: Limit which services each proxy sees
2. **Set `PILOT_FILTER_GATEWAY_CLUSTER_CONFIG`**: In Istiod environment, set this to `true` to filter gateway configurations
3. **Debounce settings**: Adjust `PILOT_DEBOUNCE_AFTER` and `PILOT_DEBOUNCE_MAX` to batch multiple changes into fewer pushes

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        PILOT_DEBOUNCE_AFTER: "100ms"
        PILOT_DEBOUNCE_MAX: "1s"
```

## Debugging EDS Issues

If endpoints are missing from a proxy's configuration:

```bash
# Check what Istiod thinks the endpoints should be
istioctl proxy-config endpoints deployment/sleep -n sample --context="${CTX_CLUSTER1}" | grep reviews

# Check the raw EDS response
istioctl proxy-config endpoints deployment/sleep -n sample --context="${CTX_CLUSTER1}" -o json | \
  jq '.[] | select(.clusterName | contains("reviews"))'
```

If remote endpoints are missing:

1. Verify the remote secret is applied and Istiod can connect:

```bash
kubectl logs -n istio-system -l app=istiod --context="${CTX_CLUSTER1}" | grep "remote cluster"
```

2. Check that the service exists in the remote cluster:

```bash
kubectl get svc reviews -n backend --context="${CTX_CLUSTER2}"
kubectl get endpoints reviews -n backend --context="${CTX_CLUSTER2}"
```

3. Verify the mesh ID matches:

```bash
istioctl proxy-config bootstrap deployment/sleep -n sample --context="${CTX_CLUSTER1}" -o json | jq '.bootstrap.node.metadata.MESH_ID'
```

## Summary

EDS is the mechanism by which Istio distributes endpoint information to sidecar proxies. Across clusters, Istiod watches remote Kubernetes APIs via remote secrets and aggregates endpoints from all clusters. For same-network setups, proxies get actual pod IPs. For different-network setups, remote endpoints point to the east-west gateway. Use Sidecar resources to control endpoint scope, outlier detection for client-side health checking, and monitor push performance to keep your multi-cluster mesh responsive.
