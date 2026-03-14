# How to Set Up Istio for HTTP/2 and gRPC Protocol

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTP2, GRPC, Service Mesh, Kubernetes, Envoy

Description: Step-by-step instructions for setting up Istio to handle HTTP/2 and gRPC traffic including routing, load balancing, retries, and troubleshooting.

---

HTTP/2 and gRPC are increasingly common in microservice architectures. gRPC in particular is popular for internal service communication because of its strong typing, efficient binary serialization, and native streaming support. Since gRPC runs on top of HTTP/2, setting up one often means setting up the other.

Istio has first-class support for both protocols, but there are some configuration details you need to get right for everything to work smoothly.

## Port Naming for HTTP/2 and gRPC

Istio detects the protocol based on how you name your Service ports. For HTTP/2 and gRPC, use these naming conventions:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: grpc-service
  namespace: default
spec:
  selector:
    app: grpc-server
  ports:
    - name: grpc-api
      port: 50051
      targetPort: 50051
```

For HTTP/2 services that aren't gRPC:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: http2-service
  namespace: default
spec:
  selector:
    app: http2-server
  ports:
    - name: http2-web
      port: 8080
      targetPort: 8080
```

You can also use the `appProtocol` field:

```yaml
ports:
  - name: api
    port: 50051
    targetPort: 50051
    appProtocol: grpc
```

Getting the protocol right matters because Istio applies HTTP/2-specific features like stream-level load balancing, retries, and deadline propagation only when it knows the traffic is HTTP/2 or gRPC.

## gRPC Routing with VirtualService

Istio can route gRPC traffic based on headers, just like HTTP traffic. But gRPC also uses specific metadata that you can match on.

Basic gRPC routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-routing
  namespace: default
spec:
  hosts:
    - grpc-service.default.svc.cluster.local
  http:
    - match:
        - headers:
            content-type:
              prefix: "application/grpc"
      route:
        - destination:
            host: grpc-service.default.svc.cluster.local
            port:
              number: 50051
```

You can also split traffic between different versions of a gRPC service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-canary
  namespace: default
spec:
  hosts:
    - grpc-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: grpc-service.default.svc.cluster.local
            subset: v1
            port:
              number: 50051
          weight: 90
        - destination:
            host: grpc-service.default.svc.cluster.local
            subset: v2
            port:
              number: 50051
          weight: 10
```

With the corresponding DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-service-dr
  namespace: default
spec:
  host: grpc-service.default.svc.cluster.local
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## gRPC Retries

Retries for gRPC need special attention because gRPC uses its own status codes, which are different from HTTP status codes. Istio supports gRPC-specific retry conditions:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-with-retries
  namespace: default
spec:
  hosts:
    - grpc-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: grpc-service.default.svc.cluster.local
            port:
              number: 50051
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: unavailable,resource-exhausted,deadline-exceeded
```

The `retryOn` field accepts both HTTP retry conditions and gRPC-specific conditions:

- `unavailable` - gRPC status code 14
- `resource-exhausted` - gRPC status code 8
- `deadline-exceeded` - gRPC status code 4
- `cancelled` - gRPC status code 1
- `internal` - gRPC status code 13

Be careful with retries on non-idempotent gRPC methods. If your method creates a resource, retrying on failure could create duplicates. Only enable retries for methods you know are safe to retry.

## HTTP/2 Connection Management

One thing that trips people up with HTTP/2 in Istio is connection multiplexing. HTTP/2 multiplexes many requests over a single TCP connection. By default, Istio's Envoy proxy maintains a connection pool to each upstream service.

You can tune this with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: http2-connection-pool
  namespace: default
spec:
  host: grpc-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 0
        maxConcurrentStreams: 100
```

Key settings for HTTP/2:

- `maxConnections` controls the maximum number of TCP connections to the upstream
- `maxRequestsPerConnection` limits requests per connection (0 means unlimited)
- `maxConcurrentStreams` limits concurrent HTTP/2 streams per connection (this maps directly to the HTTP/2 `MAX_CONCURRENT_STREAMS` setting)

## Exposing gRPC Through the Ingress Gateway

To expose a gRPC service externally through the Istio ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: grpc-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: grpc
        protocol: GRPC
      tls:
        mode: SIMPLE
        credentialName: grpc-tls-cert
      hosts:
        - "grpc.example.com"
```

Then bind it with a VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-ingress
  namespace: default
spec:
  hosts:
    - "grpc.example.com"
  gateways:
    - grpc-gateway
  http:
    - route:
        - destination:
            host: grpc-service.default.svc.cluster.local
            port:
              number: 50051
```

Note that gRPC requires HTTP/2, which in turn usually requires TLS for browser-based clients. If your gRPC clients are other backend services (not browsers), you can use plain-text HTTP/2 (h2c). In that case, set the gateway protocol to `HTTP2` instead of `GRPC`:

```yaml
servers:
  - port:
      number: 80
      name: http2
      protocol: HTTP2
    hosts:
      - "grpc.example.com"
```

## gRPC Health Checking

Istio supports gRPC health checking through the standard gRPC health checking protocol. Your gRPC service should implement the `grpc.health.v1.Health` service. Then configure Kubernetes probes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-server
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grpc-server
  template:
    metadata:
      labels:
        app: grpc-server
    spec:
      containers:
        - name: grpc-server
          image: my-grpc-server:latest
          ports:
            - containerPort: 50051
          readinessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 15
            periodSeconds: 20
```

The native gRPC health probe was introduced in Kubernetes 1.24. For older versions, you would use `grpc_health_probe` as an exec probe.

## Troubleshooting HTTP/2 and gRPC Issues

When gRPC calls fail through Istio, the error messages can be cryptic. Here are common issues and how to debug them.

Check if the port protocol is correctly detected:

```bash
istioctl x describe service grpc-service -n default
```

Look at the Envoy access logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n default | tail -50
```

For gRPC-specific issues, the response flags in Envoy access logs are very helpful:

- `UF` - Upstream connection failure
- `UO` - Upstream overflow (circuit breaking)
- `UT` - Upstream request timeout
- `LR` - Connection local reset
- `UR` - Upstream remote reset
- `DC` - Downstream connection termination

If you see `UR` flags, the upstream service is closing connections. This often happens when the gRPC server has a `max_connection_age` setting that is too aggressive.

Check the cluster health status:

```bash
istioctl proxy-config cluster <pod-name> -n default --fqdn grpc-service.default.svc.cluster.local -o json
```

And verify that endpoints are healthy:

```bash
istioctl proxy-config endpoint <pod-name> -n default | grep grpc-service
```

gRPC and HTTP/2 in Istio work reliably once the basics are configured. Name your ports correctly, set appropriate timeouts and retries, and pay attention to connection pool settings. These three things resolve most issues people run into.
