# How to Configure Cross-Cluster Service Routing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Routing, Kubernetes, Service Mesh

Description: How to set up and configure cross-cluster service routing in Istio so services in one cluster can seamlessly reach services in another.

---

Cross-cluster service routing is what makes a multi-cluster Istio mesh actually useful. Without it, you just have two isolated meshes. With it, a service in cluster A can call a service in cluster B using the same hostname it would use locally, with full traffic management capabilities like weighted routing, retries, and circuit breaking.

## How Cross-Cluster Routing Works

When you set up a multi-cluster Istio mesh with remote secrets, each cluster's istiod discovers services in all clusters. When a client calls `my-service.production.svc.cluster.local`, the client cluster still needs a DNS entry for that host. Istio then uses its service registry to route to endpoints from all clusters where that service exists.

The proxy then routes based on the configuration you provide, with VirtualService and DestinationRule resources controlling the routing behavior.

There are two paths for cross-cluster traffic:

- **Flat network**: Direct pod-to-pod communication (no gateway needed)
- **Multi-network**: Traffic goes through the east-west gateway

## Prerequisites

You need a working multi-cluster Istio setup with:

- Both clusters connected via remote secrets
- Shared root CA for mTLS
- East-west gateways if on different networks

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2

# Verify remote secrets are in place

kubectl --context=${CTX_CLUSTER1} get secrets -n istio-system -l istio/multiCluster=true
kubectl --context=${CTX_CLUSTER2} get secrets -n istio-system -l istio/multiCluster=true
```

## Basic Cross-Cluster Service Discovery

The simplest case is automatic. Deploy a service in cluster2 and access it from cluster1:

```bash
# Create the namespace and service in cluster2
kubectl --context=${CTX_CLUSTER2} create namespace backend
kubectl --context=${CTX_CLUSTER2} label namespace backend istio-injection=enabled

kubectl --context=${CTX_CLUSTER2} apply -n backend -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment
          image: nginx:latest
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  selector:
    app: payment-service
  ports:
    - port: 80
      targetPort: 80
EOF
```

Now create the same namespace and a matching Service in cluster1 (even if there are no local pods there). Kubernetes is not multi-cluster-aware, so the client cluster needs a DNS entry for the service before Istio can route the request:

```bash
kubectl --context=${CTX_CLUSTER1} create namespace backend
kubectl --context=${CTX_CLUSTER1} label namespace backend istio-injection=enabled

kubectl --context=${CTX_CLUSTER1} apply -n backend -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  selector:
    app: payment-service
  ports:
    - port: 80
      targetPort: 80
EOF
```

From a pod in cluster1, you can now call the service:

```bash
kubectl --context=${CTX_CLUSTER1} exec -n backend deploy/sleep -c sleep -- \
  curl -s payment-service.backend:80
```

Kubernetes DNS handles the service name resolution in cluster1, and the proxy routes the traffic to cluster2's endpoints. You can also use Istio DNS proxying with address auto-allocation instead of creating matching Services in every consuming cluster.

## Weighted Cross-Cluster Routing

You can split traffic between clusters using VirtualService weights. This is useful for canary deployments across clusters:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: backend
spec:
  hosts:
    - payment-service.backend.svc.cluster.local
  http:
    - route:
        - destination:
            host: payment-service.backend.svc.cluster.local
            subset: cluster1
          weight: 80
        - destination:
            host: payment-service.backend.svc.cluster.local
            subset: cluster2
          weight: 20
```

For this to work, you need a DestinationRule that defines the subsets. Istio provides the built-in `topology.istio.io/cluster` label for per-cluster subset selection:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: backend
spec:
  host: payment-service.backend.svc.cluster.local
  subsets:
    - name: cluster1
      labels:
        topology.istio.io/cluster: cluster1
    - name: cluster2
      labels:
        topology.istio.io/cluster: cluster2
```

The subset names can be whatever you want, but the label values must match the Istio cluster names from your multi-cluster installation.

## Routing Based on Headers

You can route traffic to a specific cluster based on request headers. This is great for testing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: backend
spec:
  hosts:
    - payment-service.backend.svc.cluster.local
  http:
    - match:
        - headers:
            x-route-to:
              exact: cluster2
      route:
        - destination:
            host: payment-service.backend.svc.cluster.local
            subset: cluster2
    - route:
        - destination:
            host: payment-service.backend.svc.cluster.local
```

Now requests with `x-route-to: cluster2` header go to cluster2, and everything else uses default load balancing.

## Cross-Cluster Ingress Routing

For external traffic entering through an ingress gateway, you can route to services in any cluster:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: api-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: api-tls-cert
      hosts:
        - "api.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routing
  namespace: backend
spec:
  hosts:
    - "api.example.com"
  gateways:
    - istio-system/api-gateway
  http:
    - match:
        - uri:
            prefix: /payments
      route:
        - destination:
            host: payment-service.backend.svc.cluster.local
            port:
              number: 80
    - match:
        - uri:
            prefix: /orders
      route:
        - destination:
            host: order-service.backend.svc.cluster.local
            port:
              number: 80
```

If `payment-service` only exists in cluster2, the ingress gateway in cluster1 will route traffic to it through the east-west gateway.

## Handling Service Name Conflicts

What if both clusters have a service with the same name but different implementations? By default, Istio merges the endpoints. If you don't want that, use Sidecar resources to control which services are visible:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
    - hosts:
        - "backend/*"
        - "istio-system/*"
```

This limits which namespaces the frontend namespace can reach, but it doesn't distinguish between clusters. For true cluster-level isolation, you'd need to use different service names or namespaces.

## Debugging Cross-Cluster Routes

When cross-cluster routing isn't working, check these things:

```bash
# Check if endpoints from both clusters are visible
istioctl --context=${CTX_CLUSTER1} proxy-config endpoints deploy/sleep -n backend | grep payment-service
```

You should see endpoints from both clusters. If you only see local endpoints, the remote secret might not be working:

```bash
# Check istiod logs for remote cluster errors
kubectl --context=${CTX_CLUSTER1} logs -n istio-system deploy/istiod --tail=50 | grep "remote"
```

Check the proxy configuration:

```bash
# See the full route configuration
istioctl --context=${CTX_CLUSTER1} proxy-config routes deploy/sleep -n backend -o json | \
  python3 -m json.tool | grep -A 20 "payment-service"
```

Verify the VirtualService is applied correctly:

```bash
istioctl --context=${CTX_CLUSTER1} analyze -n backend
```

This will flag any configuration issues like referencing hosts that don't exist or conflicts between VirtualServices.

## Performance Considerations

Cross-cluster routing adds latency. On flat networks, the additional latency is just the network distance between clusters. On multi-network setups, the east-west gateway adds another hop.

Measure the impact:

```bash
# Direct (local) call
kubectl --context=${CTX_CLUSTER2} exec -n backend deploy/sleep -c sleep -- \
  curl -s -w "\nTotal time: %{time_total}s\n" payment-service.backend:80

# Cross-cluster call
kubectl --context=${CTX_CLUSTER1} exec -n backend deploy/sleep -c sleep -- \
  curl -s -w "\nTotal time: %{time_total}s\n" payment-service.backend:80
```

If the cross-cluster latency is too high for your use case, consider deploying the service locally in both clusters and using locality-aware routing to prefer local endpoints.

Cross-cluster service routing in Istio is transparent to your applications. They use the same DNS names and ports regardless of where the service lives. The routing configuration through VirtualServices and DestinationRules gives you fine-grained control over how traffic flows between clusters.
