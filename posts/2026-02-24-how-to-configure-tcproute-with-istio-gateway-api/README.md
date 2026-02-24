# How to Configure TCPRoute with Istio Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, TCPRoute, Kubernetes, Networking

Description: Learn how to configure TCPRoute resources with Istio and the Kubernetes Gateway API for raw TCP traffic routing, including database proxying, multi-backend setups, and weighted routing.

---

Not everything speaks HTTP. Databases, message queues, custom binary protocols, and legacy services all use raw TCP connections. TCPRoute is the Kubernetes Gateway API resource for routing these non-HTTP TCP connections through your gateway. In Istio, it replaces the TCP routing capabilities that were previously handled by VirtualService.

## When You Need TCPRoute

TCPRoute is for scenarios where:

- You're exposing a database like PostgreSQL or MySQL through the gateway
- Your services use custom TCP protocols
- You need to route MQTT, Redis, or other non-HTTP traffic
- You have legacy services that communicate over raw TCP

If your service speaks HTTP or HTTPS, use HTTPRoute instead. If it's encrypted TLS and you want to route based on SNI without terminating, use TLSRoute.

## Prerequisites

TCPRoute is part of the experimental Gateway API channel:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

Verify the CRD is installed:

```bash
kubectl get crd tcproutes.gateway.networking.k8s.io
```

## Setting Up a TCP Gateway Listener

The Gateway needs a TCP listener for TCPRoute to attach to:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tcp-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: postgres
    protocol: TCP
    port: 5432
    allowedRoutes:
      kinds:
      - kind: TCPRoute
```

This creates a gateway that listens on port 5432 for raw TCP connections. The `protocol: TCP` tells Istio not to attempt any HTTP processing on this traffic.

## Basic TCPRoute

Route TCP traffic to a backend service:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: postgres-route
  namespace: production
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: postgres
  rules:
  - backendRefs:
    - name: postgres-service
      port: 5432
```

Any TCP connection hitting the gateway on port 5432 gets forwarded to the `postgres-service` on port 5432.

## Multiple TCP Ports on One Gateway

You can expose multiple TCP services through the same gateway by adding multiple listeners:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tcp-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: postgres
    protocol: TCP
    port: 5432
    allowedRoutes:
      kinds:
      - kind: TCPRoute
  - name: redis
    protocol: TCP
    port: 6379
    allowedRoutes:
      kinds:
      - kind: TCPRoute
  - name: mysql
    protocol: TCP
    port: 3306
    allowedRoutes:
      kinds:
      - kind: TCPRoute
```

Then create a TCPRoute for each service:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: postgres-route
  namespace: production
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: postgres
  rules:
  - backendRefs:
    - name: postgres-primary
      port: 5432
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: redis-route
  namespace: production
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: redis
  rules:
  - backendRefs:
    - name: redis-service
      port: 6379
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: mysql-route
  namespace: production
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: mysql
  rules:
  - backendRefs:
    - name: mysql-primary
      port: 3306
```

## Weighted TCP Routing

Distribute TCP connections across multiple backends with weights:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: redis-weighted-route
  namespace: production
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: redis
  rules:
  - backendRefs:
    - name: redis-primary
      port: 6379
      weight: 80
    - name: redis-secondary
      port: 6379
      weight: 20
```

This sends 80% of new TCP connections to the primary Redis and 20% to the secondary. Keep in mind that the weight applies to new connections, not individual requests. Once a TCP connection is established, all data on that connection goes to the same backend.

## TCP Route with Different Backend Port

The backend port doesn't have to match the listener port:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: custom-service-route
  namespace: production
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: postgres
  rules:
  - backendRefs:
    - name: pgbouncer
      port: 6432
```

Here the gateway listens on port 5432 but forwards to PgBouncer on port 6432.

## Cross-Namespace TCP Routing

To route TCP traffic to services in other namespaces, set up the Gateway to allow cross-namespace routes and create a ReferenceGrant:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tcp-gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
  - name: postgres
    protocol: TCP
    port: 5432
    allowedRoutes:
      namespaces:
        from: All
      kinds:
      - kind: TCPRoute
```

TCPRoute in the application namespace:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: db-route
  namespace: database
spec:
  parentRefs:
  - name: tcp-gateway
    namespace: istio-ingress
  rules:
  - backendRefs:
    - name: postgres-cluster
      port: 5432
```

ReferenceGrant in the database namespace (if routing to a different namespace than the TCPRoute):

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-tcp-from-ingress
  namespace: database
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: TCPRoute
    namespace: istio-ingress
  to:
  - group: ""
    kind: Service
```

## Combining TCP and HTTP on One Gateway

A single Gateway can serve both HTTP and TCP traffic:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: mixed-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: tls-cert
    allowedRoutes:
      namespaces:
        from: Same
  - name: postgres
    protocol: TCP
    port: 5432
    allowedRoutes:
      kinds:
      - kind: TCPRoute
  - name: redis
    protocol: TCP
    port: 6379
    allowedRoutes:
      kinds:
      - kind: TCPRoute
```

HTTPRoutes attach to the HTTP/HTTPS listeners, and TCPRoutes attach to the TCP listeners.

## Configuring Timeouts for TCP Services

TCP connections to databases and other services often need different timeout settings. You can configure these using Istio's DestinationRule alongside the TCPRoute:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-connection-config
  namespace: production
spec:
  host: postgres-primary.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        idleTimeout: 3600s
```

This limits the number of TCP connections and sets appropriate timeouts for database traffic.

## Checking TCPRoute Status

```bash
kubectl get tcproute -n production
kubectl get tcproute postgres-route -n production -o yaml
```

Look at the status:

```yaml
status:
  parents:
  - parentRef:
      name: tcp-gateway
      sectionName: postgres
    controllerName: istio.io/gateway-controller
    conditions:
    - type: Accepted
      status: "True"
    - type: ResolvedRefs
      status: "True"
```

## Debugging TCPRoute

Check the gateway's Envoy configuration:

```bash
istioctl proxy-config listener deploy/tcp-gateway-istio -n production
```

You should see a listener on the TCP port. Check that the cluster is configured:

```bash
istioctl proxy-config cluster deploy/tcp-gateway-istio -n production | grep postgres
```

And check that endpoints exist:

```bash
istioctl proxy-config endpoint deploy/tcp-gateway-istio -n production | grep postgres
```

Test the connection:

```bash
# Test TCP connectivity
kubectl run tcp-test --rm -it --image=busybox -- nc -vz <gateway-ip> 5432
```

For PostgreSQL specifically:

```bash
kubectl run psql-test --rm -it --image=postgres:16 -- psql -h <gateway-ip> -p 5432 -U myuser -d mydb
```

Monitor TCP connection stats:

```bash
kubectl exec -it deploy/tcp-gateway-istio -c istio-proxy -n production -- curl -s localhost:15000/stats | grep tcp
```

## Limitations

TCPRoute has some limitations compared to HTTPRoute:

- No path-based routing (there are no paths in TCP)
- No header-based routing (there are no headers in raw TCP)
- No request-level features like redirects or rewrites
- Routing decisions are made at the connection level, not per-request
- No SNI-based routing (use TLSRoute for that)

The only routing knob you have is the port the connection arrives on and the weights assigned to backends.

TCPRoute fills an important gap in the Gateway API for non-HTTP services. While it's simpler than HTTPRoute, it provides the same consistent declarative model for managing how TCP traffic enters your cluster.
