# How to Write ServiceEntry YAML (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, YAML, Cheat Sheet, External Services, Kubernetes

Description: Complete cheat sheet for writing Istio ServiceEntry YAML to register external services, databases, and APIs with your mesh.

---

ServiceEntry is the Istio resource that lets you add entries to Istio's internal service registry. This is how you make external services (APIs, databases, SaaS providers) known to the mesh so that Istio can apply traffic management, security, and observability to outbound connections.

Without a ServiceEntry, external traffic either goes through a global passthrough or gets blocked entirely, depending on your mesh configuration. With a ServiceEntry, you get full control.

Here is a comprehensive YAML reference.

## Basic Structure

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: my-external-service
  namespace: default
spec:
  hosts:
    - external-api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## Key Fields Explained

### Location

- `MESH_EXTERNAL`: The service is outside the mesh. Envoy acts as a client-side proxy.
- `MESH_INTERNAL`: The service is part of the mesh but not discovered by Kubernetes (like VMs).

### Resolution

- `DNS`: Resolve the hostname using DNS. Use for external services with domain names.
- `STATIC`: Use the provided `endpoints` list. Use when you know the exact IPs.
- `NONE`: No resolution needed. Use with wildcard hosts.

## External HTTPS API

Register an external HTTPS API:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## External HTTP Service

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-http
spec:
  hosts:
    - httpbin.org
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## External TCP Service (Database)

Register an external database:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-postgres
spec:
  hosts:
    - my-db.us-east-1.rds.amazonaws.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
```

For MongoDB:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-mongodb
spec:
  hosts:
    - mongo-primary.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 27017
      name: tcp-mongo
      protocol: TCP
  resolution: DNS
```

## Static IP Endpoints

When you know the exact IP addresses:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: static-service
spec:
  hosts:
    - internal-legacy.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: STATIC
  endpoints:
    - address: 192.168.1.100
      ports:
        http: 8080
    - address: 192.168.1.101
      ports:
        http: 8080
```

## Wildcard Host

Capture all traffic to a domain:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: wildcard-google
spec:
  hosts:
    - "*.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: NONE
```

Use `protocol: TLS` with `resolution: NONE` for wildcard domains since the actual hostname is in the SNI header.

## Multiple Hosts in One Entry

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-apis
spec:
  hosts:
    - storage.googleapis.com
    - pubsub.googleapis.com
    - bigquery.googleapis.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## ServiceEntry with DestinationRule

Apply traffic policies to external services by combining ServiceEntry with DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.external-service.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-dr
spec:
  host: api.external-service.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
      http:
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
```

## ServiceEntry with VirtualService

Add retries, timeouts, and fault injection to external service calls:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: payment-gateway
spec:
  hosts:
    - payments.external-provider.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-gateway-vs
spec:
  hosts:
    - payments.external-provider.com
  http:
    - timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: connect-failure,refused-stream,503
      route:
        - destination:
            host: payments.external-provider.com
            port:
              number: 443
```

## TLS Origination

When your application sends HTTP but the external service requires HTTPS, use TLS origination:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: tls-origination
spec:
  hosts:
    - api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http-port
      protocol: HTTP
    - number: 443
      name: https-port
      protocol: HTTPS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: tls-origination-dr
spec:
  host: api.example.com
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 80
        tls:
          mode: SIMPLE
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tls-origination-vs
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - port: 80
      route:
        - destination:
            host: api.example.com
            port:
              number: 443
```

Your app calls `http://api.example.com:80`, Envoy upgrades it to HTTPS and connects to the external service on port 443.

## VM Workload Registration

Register a VM-based workload as part of the mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: vm-service
spec:
  hosts:
    - vm-service.default.svc.cluster.local
  location: MESH_INTERNAL
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: STATIC
  endpoints:
    - address: 10.0.0.50
      labels:
        app: vm-service
        version: v1
    - address: 10.0.0.51
      labels:
        app: vm-service
        version: v1
```

`MESH_INTERNAL` with static endpoints makes these VMs look like regular services in the mesh.

## Egress Control

When `outboundTrafficPolicy` is set to `REGISTRY_ONLY`, only services with ServiceEntry (or already in the Kubernetes registry) can be reached. This is how you lock down egress:

```yaml
# In the mesh config
meshConfig:
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
```

Then explicitly allow specific external services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allowed-external
spec:
  hosts:
    - api.allowed-service.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

## Export To (Visibility)

Control which namespaces can use this ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: limited-access
  namespace: backend
spec:
  hosts:
    - secret-api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  exportTo:
    - "."           # Only this namespace
    - "frontend"    # And the frontend namespace
```

## Subnet-Based Entry

For CIDR-based routing (useful for IP ranges):

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: internal-network
spec:
  hosts:
    - internal-services.local
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: STATIC
  endpoints:
    - address: 10.10.0.0/16
```

## Full Production Example

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: payment-provider
  namespace: checkout
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  exportTo:
    - "."
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-provider-dr
  namespace: checkout
spec:
  host: api.stripe.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
    tls:
      mode: SIMPLE
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-provider-vs
  namespace: checkout
spec:
  hosts:
    - api.stripe.com
  http:
    - timeout: 15s
      retries:
        attempts: 2
        perTryTimeout: 5s
        retryOn: connect-failure,refused-stream
      route:
        - destination:
            host: api.stripe.com
            port:
              number: 443
```

This registers the Stripe API as an external service, limits connections, adds timeouts and retries, and restricts visibility to just the `checkout` namespace. It is a solid pattern for any external API dependency.
