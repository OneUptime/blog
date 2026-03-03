# How to Handle Service Discovery for External Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, External Services, ServiceEntry, Kubernetes

Description: Register and manage external services in Istio's service registry using ServiceEntry for proper traffic management and observability.

---

Not every service your application depends on runs inside your Kubernetes cluster. You probably call third-party APIs, SaaS platforms, databases hosted elsewhere, or legacy services running on VMs. Istio's service registry doesn't know about these external services by default, which means you lose observability, traffic management, and security controls for that traffic. The ServiceEntry resource fixes this by registering external services in Istio's mesh registry.

## Why Register External Services

When traffic leaves the mesh to an external service without a ServiceEntry, Istio treats it as unknown. You get limited metrics (the destination shows up as "PassthroughCluster"), no retry or timeout configuration, and no mTLS. By creating a ServiceEntry, you tell Istio "this external host is a real service I care about." This gives you:

- Full telemetry (metrics, traces, access logs) for external calls
- The ability to configure timeouts, retries, and circuit breakers
- Control over which workloads can access the external service
- TLS origination from the sidecar

## Basic ServiceEntry Configuration

Register an external HTTPS API:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: backend
spec:
  hosts:
  - "api.stripe.com"
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```

The key fields:

- `hosts`: The DNS hostname of the external service
- `location: MESH_EXTERNAL`: Indicates the service is outside the mesh
- `resolution: DNS`: Tells Istio to resolve the hostname using DNS
- `protocol: TLS`: The traffic is TLS-encrypted by the client (your application handles TLS)

## Registering Multiple External Services

You'll likely have many external dependencies. Register each one:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-apis
  namespace: backend
spec:
  hosts:
  - "api.sendgrid.com"
  - "api.twilio.com"
  - "hooks.slack.com"
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```

You can group related services in a single ServiceEntry, but keep them separate if you want different traffic policies for each.

## Adding Traffic Management for External Services

Once registered, you can apply Istio traffic management rules. Add timeouts and retries with a DestinationRule and VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: stripe-api
  namespace: backend
spec:
  host: api.stripe.com
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 5s
      http:
        h2UpgradePolicy: DEFAULT
    tls:
      mode: SIMPLE
```

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: stripe-api
  namespace: backend
spec:
  hosts:
  - "api.stripe.com"
  http:
  - timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: "5xx,reset,connect-failure"
    route:
    - destination:
        host: api.stripe.com
        port:
          number: 443
```

Now if Stripe's API is slow or returns a 500 error, Istio automatically retries the request up to 3 times.

## TLS Origination for External Services

If your application makes HTTP requests to an external service and you want the sidecar to upgrade them to HTTPS, use TLS origination:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: backend
spec:
  hosts:
  - "api.example.com"
  location: MESH_EXTERNAL
  ports:
  - number: 80
    name: http
    protocol: HTTP
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-tls
  namespace: backend
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
  name: external-api
  namespace: backend
spec:
  hosts:
  - "api.example.com"
  http:
  - match:
    - port: 80
    route:
    - destination:
        host: api.example.com
        port:
          number: 443
```

Your application sends HTTP to port 80, the sidecar intercepts it, upgrades to TLS, and forwards to port 443. This is useful when your application code doesn't handle TLS natively or when you want centralized certificate management.

## Registering External Services by IP Address

Some external services don't have DNS hostnames. For IP-based services, use `resolution: STATIC` with explicit endpoint addresses:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: legacy-database
  namespace: backend
spec:
  hosts:
  - "legacy-db.internal"
  location: MESH_EXTERNAL
  ports:
  - number: 3306
    name: mysql
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 10.0.5.100
  - address: 10.0.5.101
```

The `hosts` value is a synthetic hostname that your application uses. Istio routes it to the specified IP addresses.

## External Services with Multiple Endpoints

For external services that have multiple backends (like a database cluster), specify multiple endpoints with labels for traffic splitting:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-db-cluster
  namespace: backend
spec:
  hosts:
  - "db-cluster.external"
  location: MESH_EXTERNAL
  ports:
  - number: 5432
    name: postgres
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 10.10.1.100
    labels:
      role: primary
  - address: 10.10.1.101
    labels:
      role: replica
  - address: 10.10.1.102
    labels:
      role: replica
```

Then use a DestinationRule to route reads to replicas and writes to the primary:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-db-routing
  namespace: backend
spec:
  host: db-cluster.external
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 3s
  subsets:
  - name: primary
    labels:
      role: primary
  - name: replica
    labels:
      role: replica
```

## Monitoring External Service Traffic

With ServiceEntry in place, you get full Istio telemetry for external calls. Check metrics in Prometheus:

```text
istio_requests_total{destination_service="api.stripe.com",reporter="source"}
```

```text
istio_request_duration_milliseconds_bucket{destination_service="api.stripe.com",reporter="source"}
```

You can now see request rates, latency distributions, and error rates for every external service your application depends on. This is incredibly useful for diagnosing issues. If Stripe is having a bad day, you'll see it in your Istio metrics before you see it in your application logs.

Check access logs for external traffic:

```bash
kubectl logs deploy/payment-service -c istio-proxy -n backend | grep "api.stripe.com"
```

## Handling DNS Resolution Issues

External services depend on DNS resolution. If DNS is unreliable, your ServiceEntry with `resolution: DNS` will have problems. You can mitigate this by:

Using DNS caching in the proxy:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: backend
spec:
  hosts:
  - "api.stripe.com"
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```

Istio's DNS proxy caches resolutions, so brief DNS outages won't immediately affect your external service calls.

For critical external services where you want maximum reliability, consider using `resolution: STATIC` with known IP addresses, though this requires manual updates when IPs change.

ServiceEntry is one of those Istio features that's easy to overlook but makes a big difference in production. Register your external services, add traffic management, and enjoy the same observability and control you have for internal services.
