# How to Access External Services from Istio Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, External Services, Egress, Service Mesh

Description: How to configure Istio to allow mesh workloads to access external APIs, databases, and services using ServiceEntry and traffic management features.

---

Applications running inside an Istio service mesh often need to call external APIs, connect to managed databases, pull data from third-party services, or send notifications through external providers. Istio provides several mechanisms to handle this outbound traffic, with the ServiceEntry resource being the primary tool.

This guide shows you how to configure access to different types of external services from within the mesh.

## The Default Behavior

By default, Istio is configured with `outboundTrafficPolicy.mode: ALLOW_ANY`, meaning pods can reach any external endpoint. But this gives you no visibility or control over that traffic. Even in ALLOW_ANY mode, creating ServiceEntry resources is valuable because it brings external services into Istio's service registry, enabling metrics, tracing, and traffic management features.

## Creating a Basic ServiceEntry

Here is a ServiceEntry for accessing an external REST API:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: jsonplaceholder
  namespace: default
spec:
  hosts:
  - "jsonplaceholder.typicode.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

After applying this, you can test access from a pod:

```bash
kubectl exec deploy/sleep -- curl -s https://jsonplaceholder.typicode.com/posts/1
```

## Understanding ServiceEntry Fields

Each field in a ServiceEntry serves a specific purpose:

**hosts** - The DNS name(s) of the external service. This is what the sidecar uses to match outbound traffic.

**ports** - The port(s) the external service listens on. The protocol field tells Istio how to handle the traffic.

**resolution** - How to resolve the host to an IP address:
- `DNS` - Use DNS to resolve the hostname at connection time
- `STATIC` - Use the IP addresses specified in the `endpoints` field
- `NONE` - Let the application handle resolution

**location** - Either `MESH_EXTERNAL` (the service is outside the mesh) or `MESH_INTERNAL` (the service is inside the mesh but not registered with Kubernetes).

## Accessing External REST APIs

Most external API access uses HTTPS. Here are examples for common services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
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
kind: ServiceEntry
metadata:
  name: twilio-api
spec:
  hosts:
  - "api.twilio.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: sendgrid-api
spec:
  hosts:
  - "api.sendgrid.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Accessing External Databases

Managed databases like AWS RDS, Cloud SQL, or Azure Database are common external dependencies:

### PostgreSQL

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-postgres
spec:
  hosts:
  - "mydb.abcdef123456.us-east-1.rds.amazonaws.com"
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

### MySQL

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloud-sql-mysql
spec:
  hosts:
  - "my-project:us-central1:my-instance"
  addresses:
  - "10.0.0.100/32"
  ports:
  - number: 3306
    name: tcp-mysql
    protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 10.0.0.100
```

For Cloud SQL, if you are using the Cloud SQL Auth Proxy, the connection goes to localhost, so you may not need a ServiceEntry. But if connecting directly, use the instance's private IP.

### MongoDB

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas
spec:
  hosts:
  - "cluster0-shard-00-00.abc123.mongodb.net"
  - "cluster0-shard-00-01.abc123.mongodb.net"
  - "cluster0-shard-00-02.abc123.mongodb.net"
  ports:
  - number: 27017
    name: tcp-mongo
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

### Redis

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: elasticache-redis
spec:
  hosts:
  - "my-redis.abc123.use1.cache.amazonaws.com"
  ports:
  - number: 6379
    name: tcp-redis
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

## Adding Traffic Management to External Services

Once an external service is registered via ServiceEntry, you can apply Istio traffic management features to it.

### Timeouts

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: stripe-timeout
spec:
  hosts:
  - "api.stripe.com"
  tls:
  - match:
    - port: 443
      sniHosts:
      - "api.stripe.com"
    route:
    - destination:
        host: api.stripe.com
        port:
          number: 443
    timeout: 10s
```

### Retries

For HTTP external services, you can add retry policies:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api-retry
spec:
  hosts:
  - "api.external.com"
  http:
  - route:
    - destination:
        host: api.external.com
        port:
          number: 80
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: connect-failure,refused-stream,503
```

### Circuit Breaking

```yaml
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
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
```

## Accessing Services by IP Address

Some external services are accessed by IP address rather than hostname. Use the `addresses` field:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: legacy-service
spec:
  hosts:
  - "legacy.internal"
  addresses:
  - "192.168.1.100/32"
  ports:
  - number: 8080
    name: http
    protocol: HTTP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
  - address: 192.168.1.100
```

## Wildcard ServiceEntries

If you need to access multiple subdomains of the same domain:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-services
spec:
  hosts:
  - "*.amazonaws.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

With `resolution: NONE`, Istio does not attempt DNS resolution. It passes the traffic through and lets the application's DNS resolution handle it. This is necessary for wildcard entries because Istio cannot resolve `*.amazonaws.com` to IP addresses.

## Verifying Access

After creating ServiceEntry resources, verify they are working:

```bash
# Check that the ServiceEntry is registered
kubectl get serviceentry

# Test from a pod
kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" https://api.stripe.com

# Check the sidecar proxy knows about the service
istioctl proxy-config clusters deploy/sleep | grep stripe

# Check metrics are being collected
kubectl exec deploy/sleep -c istio-proxy -- \
  curl -s localhost:15000/stats | grep api.stripe.com
```

## Monitoring External Service Access

With ServiceEntry in place, Istio collects metrics for external service traffic. Query them in Prometheus:

```promql
# Requests to external services
sum(rate(istio_requests_total{destination_service_namespace="default", destination_service=~".*stripe.*"}[5m])) by (response_code)

# Latency to external services
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service=~".*stripe.*"}[5m])) by (le))
```

## Summary

Accessing external services from an Istio mesh works through ServiceEntry resources. Define the hostname, port, and protocol for each external dependency. This brings the service into Istio's registry, enabling metrics collection, traffic management features like timeouts and circuit breaking, and access control in REGISTRY_ONLY mode. Use the appropriate resolution strategy (DNS for hostnames, STATIC for IP addresses, NONE for wildcards) based on how the external service is addressed.
