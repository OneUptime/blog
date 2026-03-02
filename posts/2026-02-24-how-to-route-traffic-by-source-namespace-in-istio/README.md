# How to Route Traffic by Source Namespace in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, Namespace, Kubernetes, Service Mesh

Description: Configure Istio to route traffic differently based on the source namespace of the calling service for multi-tenant and environment isolation.

---

In a Kubernetes cluster with multiple namespaces, you often need different routing behavior depending on where the traffic comes from. Maybe requests from the `staging` namespace should hit a staging version of a shared service, while requests from `production` should hit the production version. Istio lets you do this using source namespace matching in VirtualService, combined with AuthorizationPolicy for enforcement.

## The Use Case

Consider a shared service like a payment gateway or a notification service that multiple teams use. Different namespaces in your cluster represent different teams, environments, or tenants. You want:

- Requests from the `team-a` namespace to route to `payment-service` v1
- Requests from the `team-b` namespace to route to `payment-service` v2
- Requests from the `staging` namespace to route to a staging version

Without Istio, you would need separate service endpoints or DNS entries per namespace. With Istio, you handle this at the mesh level.

## Prerequisites

- Kubernetes cluster with Istio installed
- Multiple namespaces with sidecar injection enabled
- Services deployed across namespaces

Enable sidecar injection for your namespaces:

```bash
kubectl label namespace team-a istio-injection=enabled
kubectl label namespace team-b istio-injection=enabled
kubectl label namespace staging istio-injection=enabled
kubectl label namespace shared-services istio-injection=enabled
```

## DestinationRule Setup

Deploy your shared service with version labels in the `shared-services` namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: shared-services
spec:
  host: payment-service.shared-services.svc.cluster.local
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
    - name: staging
      labels:
        version: staging
```

```bash
kubectl apply -f destination-rule.yaml
```

## Routing by Source Namespace with VirtualService

Istio VirtualService supports a `sourceNamespace` field in match conditions. This matches against the namespace of the pod making the request:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: shared-services
spec:
  hosts:
    - payment-service.shared-services.svc.cluster.local
  http:
    - match:
        - sourceNamespace: staging
      route:
        - destination:
            host: payment-service.shared-services.svc.cluster.local
            subset: staging
    - match:
        - sourceNamespace: team-a
      route:
        - destination:
            host: payment-service.shared-services.svc.cluster.local
            subset: v1
    - match:
        - sourceNamespace: team-b
      route:
        - destination:
            host: payment-service.shared-services.svc.cluster.local
            subset: v2
    - route:
        - destination:
            host: payment-service.shared-services.svc.cluster.local
            subset: v1
```

The `sourceNamespace` field matches against the Kubernetes namespace of the source workload. This information is available to the sidecar proxy because Istio's control plane populates it.

```bash
kubectl apply -f virtual-service.yaml
```

## How It Works Under the Hood

When a pod in namespace `team-a` makes a request to `payment-service.shared-services.svc.cluster.local`, the Envoy sidecar on the calling pod has access to its own namespace information. The VirtualService rules are pushed to the sidecars, and the sidecar applies the routing based on its own namespace identity.

This is different from header-based routing where the header comes from the request itself. Source namespace is derived from the workload identity, which makes it harder to spoof.

## Combining Source Namespace with Other Conditions

You can combine `sourceNamespace` with other match conditions:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: shared-services
spec:
  hosts:
    - payment-service.shared-services.svc.cluster.local
  http:
    - match:
        - sourceNamespace: staging
          uri:
            prefix: /api/v2
      route:
        - destination:
            host: payment-service.shared-services.svc.cluster.local
            subset: staging
      timeout: 30s
    - match:
        - sourceNamespace: staging
      route:
        - destination:
            host: payment-service.shared-services.svc.cluster.local
            subset: staging
      timeout: 10s
    - route:
        - destination:
            host: payment-service.shared-services.svc.cluster.local
            subset: v1
      timeout: 5s
```

Here, staging traffic to `/api/v2` gets a longer timeout, other staging traffic gets a moderate timeout, and all other traffic gets the default timeout.

## Multi-Tenant Routing

For multi-tenant setups where each tenant has their own namespace, you can route to tenant-specific deployments:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: shared-api-vs
  namespace: shared-services
spec:
  hosts:
    - shared-api.shared-services.svc.cluster.local
  http:
    - match:
        - sourceNamespace: tenant-acme
      route:
        - destination:
            host: shared-api.shared-services.svc.cluster.local
            subset: acme
    - match:
        - sourceNamespace: tenant-globex
      route:
        - destination:
            host: shared-api.shared-services.svc.cluster.local
            subset: globex
    - route:
        - destination:
            host: shared-api.shared-services.svc.cluster.local
            subset: default
```

## Applying Different Policies per Source Namespace

Beyond routing, you can set different fault injection, retry, and timeout policies based on the calling namespace. This is useful when staging namespaces should have different behavior than production:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: shared-services
spec:
  hosts:
    - payment-service.shared-services.svc.cluster.local
  http:
    - match:
        - sourceNamespace: staging
      route:
        - destination:
            host: payment-service.shared-services.svc.cluster.local
            subset: staging
      fault:
        delay:
          percentage:
            value: 10
          fixedDelay: 3s
      retries:
        attempts: 5
        perTryTimeout: 5s
    - route:
        - destination:
            host: payment-service.shared-services.svc.cluster.local
            subset: v1
      retries:
        attempts: 3
        perTryTimeout: 2s
```

Staging traffic gets fault injection (10% of requests get a 3-second delay) and more aggressive retries. Production traffic gets standard retries with tighter timeouts.

## Testing

Deploy a test pod in each namespace and verify routing:

```bash
# From team-a namespace
kubectl exec deploy/test-client -n team-a -c test-client -- curl -s http://payment-service.shared-services.svc.cluster.local/version

# From team-b namespace
kubectl exec deploy/test-client -n team-b -c test-client -- curl -s http://payment-service.shared-services.svc.cluster.local/version

# From staging namespace
kubectl exec deploy/test-client -n staging -c test-client -- curl -s http://payment-service.shared-services.svc.cluster.local/version
```

Check the proxy configuration:

```bash
istioctl proxy-config routes deploy/test-client -n team-a
istioctl proxy-config routes deploy/test-client -n team-b
```

## Important Notes

**VirtualService scope.** When a VirtualService is defined in one namespace but needs to affect traffic from other namespaces, make sure the `exportTo` field allows cross-namespace visibility. By default, VirtualServices are exported to all namespaces:

```yaml
spec:
  exportTo:
    - "*"
```

If you restrict this, some namespaces might not see the routing rules.

**Sidecar requirement.** Source namespace matching only works when the calling pod has an Istio sidecar. Without the sidecar, there is no way to identify the source namespace, and the traffic bypasses VirtualService rules entirely.

**Performance.** Source namespace matching adds minimal overhead. The routing decision is made locally at the sidecar, using identity information that is already available.

**Namespace creation.** If a new namespace is added later, requests from that namespace will fall through to the catch-all route. Plan your default route carefully.

## Validation

```bash
istioctl analyze -n shared-services
istioctl analyze -n team-a
istioctl analyze -n team-b
```

## Summary

Source namespace routing in Istio is a natural fit for multi-tenant clusters, environment isolation, and shared service management. It leverages Istio's workload identity to make routing decisions based on where traffic originates rather than what the traffic contains. This makes it more reliable than header-based approaches for namespace-level isolation, and it keeps your routing logic in the infrastructure layer rather than your application code.
