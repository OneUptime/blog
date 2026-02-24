# How to Configure Kubernetes Services for Egress Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Egress, ServiceEntry, ExternalName

Description: How to use Kubernetes service types and Istio ServiceEntry to properly route egress traffic to external endpoints from within an Istio service mesh.

---

There are several ways to represent external services in Kubernetes when using Istio. You can use Istio's ServiceEntry, Kubernetes ExternalName services, or Kubernetes services with external endpoints. Each approach has different implications for how Istio handles the traffic, what metrics you get, and what traffic management features are available.

This guide explains each approach, when to use it, and how it interacts with Istio's egress traffic handling.

## Kubernetes ExternalName Services

A Kubernetes ExternalName service creates a CNAME alias for an external DNS name:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-api
  namespace: default
spec:
  type: ExternalName
  externalName: api.external-service.com
```

With this, pods can access the external service using `external-api.default.svc.cluster.local` instead of the real hostname.

### How Istio Handles ExternalName Services

When Istio sees an ExternalName service, it creates a routing entry in the sidecar proxies. However, the behavior depends on your `outboundTrafficPolicy` mode:

- **ALLOW_ANY mode:** The traffic passes through. The sidecar does DNS resolution for the external name and forwards the connection.
- **REGISTRY_ONLY mode:** The ExternalName service is in the Kubernetes service registry, so traffic is allowed. But you may still need a ServiceEntry if you want full Istio traffic management features.

Test it:

```bash
kubectl exec deploy/sleep -- curl -s http://external-api.default.svc.cluster.local/health
```

### Limitations of ExternalName

ExternalName services have some quirks with Istio:

- They don't support port mapping. The external service must listen on the same port you request.
- HTTPS doesn't work well because the SNI and Host header won't match the real external hostname.
- Istio metrics may show the internal service name rather than the real external host.

## Kubernetes Services with External Endpoints

You can create a regular Kubernetes service and manually define endpoints that point to external IP addresses:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-database
  namespace: default
spec:
  ports:
  - port: 5432
    targetPort: 5432
    name: tcp-postgres
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: external-database-1
  namespace: default
  labels:
    kubernetes.io/service-name: external-database
addressType: IPv4
ports:
- name: tcp-postgres
  port: 5432
  protocol: TCP
endpoints:
- addresses:
  - "10.0.1.50"
```

This approach creates a proper Kubernetes service that Istio can route to. Pods access the database using `external-database.default.svc.cluster.local:5432`.

### Advantages

- Port mapping works (you can map port 5432 on the service to a different port on the endpoint)
- Istio sees it as a regular service and generates full metrics
- You can apply DestinationRules and VirtualServices
- No DNS dependency for the external address

### When to Use This

Use this when the external service has a stable IP address and you want Istio to treat it like an internal service. Common use cases:

- On-premises databases accessible by IP
- Services in peered VPCs
- Legacy systems with static IPs

## Istio ServiceEntry vs Kubernetes Services

The Istio ServiceEntry is the native way to register external services. Here is how it compares to Kubernetes service approaches:

| Feature | ServiceEntry | ExternalName | Service + Endpoints |
|---------|-------------|-------------|-------------------|
| DNS-based external service | Yes | Yes | No (IP only) |
| IP-based external service | Yes | No | Yes |
| Port mapping | Yes | No | Yes |
| Full Istio metrics | Yes | Partial | Yes |
| VirtualService routing | Yes | Limited | Yes |
| DestinationRule support | Yes | Limited | Yes |
| Works in REGISTRY_ONLY | Yes | Varies | Yes |

For most cases, ServiceEntry is the recommended approach because it gives you the most control and best integration with Istio features.

## Combining ServiceEntry with Kubernetes Services

You can use both together. A common pattern is creating a Kubernetes service for internal DNS resolution and a ServiceEntry for Istio routing features:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-api
  namespace: default
spec:
  type: ExternalName
  externalName: api.stripe.com
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: default
spec:
  hosts:
  - "api.stripe.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: stripe-circuit-breaker
spec:
  host: api.stripe.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

The ExternalName service provides a local DNS name. The ServiceEntry enables Istio features. The DestinationRule adds circuit breaking.

## ServiceEntry with Specific Endpoints

When you need to control exactly which IPs the mesh can reach for an external service, use ServiceEntry with static endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-postgres
spec:
  hosts:
  - "external-postgres.local"
  addresses:
  - "10.0.1.50/32"
  - "10.0.1.51/32"
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 10.0.1.50
    labels:
      az: us-east-1a
  - address: 10.0.1.51
    labels:
      az: us-east-1b
```

You can even use Istio's load balancing and locality features with these endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-lb
spec:
  host: external-postgres.local
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
    connectionPool:
      tcp:
        maxConnections: 50
```

## Headless Services for External Endpoints

For databases with connection pooling, you might want a headless service so each pod gets the direct IP of the database:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-db
  namespace: default
spec:
  clusterIP: None
  ports:
  - port: 5432
    name: tcp-postgres
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: external-db-1
  namespace: default
  labels:
    kubernetes.io/service-name: external-db
addressType: IPv4
ports:
- name: tcp-postgres
  port: 5432
  protocol: TCP
endpoints:
- addresses:
  - "10.0.1.50"
- addresses:
  - "10.0.1.51"
```

Istio handles headless services differently. Each endpoint gets its own DNS record, and the sidecar routes to the specific IP returned by DNS.

## Working with Service Mesh Egress and ExternalName

If your application uses an ExternalName service to reach an external HTTPS endpoint, you need to be careful about how Istio intercepts the traffic.

For HTTPS connections, the application initiates a TLS handshake. The sidecar proxy sees this as opaque TLS and uses SNI to route it. The SNI will contain the external hostname (not the ExternalName service name), so routing works correctly for HTTPS.

For HTTP connections, the Host header contains the ExternalName service's name. The sidecar routes based on this header to the external name resolved by DNS.

```bash
# HTTP - works, Host header is rewritten to external service
kubectl exec deploy/sleep -- curl -s http://external-api.default.svc.cluster.local/get

# HTTPS - works, SNI matches the real hostname
kubectl exec deploy/sleep -- curl -s https://external-api.default.svc.cluster.local/get
```

## Migrating from ExternalName to ServiceEntry

If you started with ExternalName services and want to migrate to ServiceEntry for better Istio integration:

1. Create the ServiceEntry for the external host
2. Add any DestinationRules or VirtualServices you need
3. Update your application to use the external hostname directly (or keep the ExternalName service as an alias)
4. Verify traffic flows correctly and metrics are generated
5. Remove the ExternalName service if no longer needed

```bash
# Verify the ServiceEntry is working
istioctl proxy-config clusters deploy/my-app | grep api.stripe.com

# Check metrics are being generated
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep stripe
```

## Summary

Kubernetes offers multiple ways to represent external services: ExternalName services, services with explicit endpoints, and Istio ServiceEntry. For Istio meshes, ServiceEntry is the most powerful option because it provides full metrics, traffic management, and works correctly with all Istio features. Use Kubernetes services with endpoints for IP-based services, and ExternalName for simple DNS aliasing. The best practice is to use ServiceEntry as the primary mechanism for egress traffic management and combine it with Kubernetes services when you need local DNS resolution.
