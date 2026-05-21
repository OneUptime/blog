# How to Configure VirtualService for gRPC Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, gRPC, Traffic Management, Kubernetes

Description: Learn how to configure Istio VirtualService for gRPC traffic routing including method-based matching, retries, and timeouts.

---

gRPC has become the go-to protocol for microservice communication, and Istio supports it natively. Since gRPC runs over HTTP/2, most VirtualService features work with gRPC out of the box. But there are some gRPC-specific considerations for routing, retries, and timeouts that are worth knowing about.

## How gRPC Works with Istio

gRPC uses HTTP/2 as its transport protocol. When you call a gRPC method like `ProductService.GetProduct`, it translates to an HTTP/2 POST request with:

- Path: `/package.ProductService/GetProduct`
- Content-Type: `application/grpc`

Since Istio VirtualService matches on HTTP paths and headers, you can route gRPC traffic based on the service name, method name, or any metadata (headers) attached to the call.

## Basic gRPC VirtualService

Here is a straightforward gRPC routing configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: default
spec:
  hosts:
    - product-service
  http:
    - route:
        - destination:
            host: product-service
            port:
              number: 50051
```

Nothing special here - it looks exactly like an HTTP VirtualService. The key is that gRPC uses the HTTP route rules even though the protocol is gRPC.

## Method-Based Routing

Route different gRPC methods to different backends:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: default
spec:
  hosts:
    - product-service
  http:
    - match:
        - uri:
            prefix: "/mypackage.ProductService/GetProduct"
      route:
        - destination:
            host: product-read-service
            port:
              number: 50051
    - match:
        - uri:
            prefix: "/mypackage.ProductService/CreateProduct"
      route:
        - destination:
            host: product-write-service
            port:
              number: 50051
    - route:
        - destination:
            host: product-service
            port:
              number: 50051
```

Read operations go to a read-optimized service, while write operations go to a write service. This is useful for CQRS patterns.

## Service-Level Routing

Route all methods of a service to the same destination:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-router
  namespace: default
spec:
  hosts:
    - grpc-gateway
  http:
    - match:
        - uri:
            prefix: "/mypackage.ProductService/"
      route:
        - destination:
            host: product-service
            port:
              number: 50051
    - match:
        - uri:
            prefix: "/mypackage.OrderService/"
      route:
        - destination:
            host: order-service
            port:
              number: 50051
    - match:
        - uri:
            prefix: "/mypackage.UserService/"
      route:
        - destination:
            host: user-service
            port:
              number: 50051
```

## gRPC Metadata-Based Routing

gRPC metadata maps directly to HTTP headers. You can route based on metadata values:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: default
spec:
  hosts:
    - product-service
  http:
    - match:
        - headers:
            x-tenant-id:
              exact: "premium-tenant"
      route:
        - destination:
            host: product-service
            subset: premium
    - route:
        - destination:
            host: product-service
            subset: standard
```

When your gRPC client sets metadata like this:

```go
md := metadata.Pairs("x-tenant-id", "premium-tenant")
ctx := metadata.NewOutgoingContext(context.Background(), md)
resp, err := client.GetProduct(ctx, &pb.GetProductRequest{Id: "123"})
```

Istio routes it to the premium subset.

## Canary Deployments for gRPC

Traffic splitting works the same as HTTP:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: default
spec:
  hosts:
    - product-service
  http:
    - route:
        - destination:
            host: product-service
            subset: v1
          weight: 90
        - destination:
            host: product-service
            subset: v2
          weight: 10
```

10% of gRPC calls go to v2.

## gRPC Retries

gRPC retry configuration needs special attention. The retry conditions for gRPC are different from HTTP:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: default
spec:
  hosts:
    - product-service
  http:
    - route:
        - destination:
            host: product-service
            port:
              number: 50051
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: "unavailable,resource-exhausted,deadline-exceeded"
```

The `retryOn` field accepts gRPC status codes as strings:
- `unavailable` - Service is not reachable
- `resource-exhausted` - Rate limited
- `deadline-exceeded` - Timeout
- `internal` - Internal server error
- `cancelled` - Request was cancelled

Envoy applies these gRPC retry policies to gRPC status codes in response headers, so trailer-only statuses may not trigger a retry.

You can also use the standard HTTP retry conditions like `5xx`, `connect-failure`, and `reset`.

## gRPC Timeouts

Setting timeouts for gRPC is the same as HTTP:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: default
spec:
  hosts:
    - product-service
  http:
    - route:
        - destination:
            host: product-service
            port:
              number: 50051
      timeout: 5s
```

This sets a 5-second timeout for all gRPC calls to the product service. For streaming RPCs, this is the timeout for the entire stream, not individual messages.

## gRPC with Gateway (External Access)

To expose gRPC services through the Istio ingress gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
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
        name: grpc-tls
        protocol: HTTPS
      hosts:
        - "grpc.example.com"
      tls:
        mode: SIMPLE
        credentialName: grpc-tls-cert
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-external
  namespace: default
spec:
  hosts:
    - "grpc.example.com"
  gateways:
    - grpc-gateway
  http:
    - match:
        - uri:
            prefix: "/mypackage.ProductService/"
      route:
        - destination:
            host: product-service
            port:
              number: 50051
```

Note: TLS is common for external gRPC, but it is not required by Istio. For plaintext gRPC through a Gateway, use `GRPC` or `HTTP2` as the Gateway port protocol. Also make sure the backend Kubernetes Service port is explicitly declared as `grpc` or `http2` using the port name or `appProtocol`; otherwise gateways may forward backend HTTP traffic as HTTP/1.1.

## gRPC Mirror

You can mirror gRPC traffic just like HTTP:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: default
spec:
  hosts:
    - product-service
  http:
    - route:
        - destination:
            host: product-service
            subset: v1
      mirror:
        host: product-service
        subset: v2
      mirrorPercentage:
        value: 100.0
```

Be careful with mirroring write operations. If your gRPC methods have side effects (creating records, sending notifications), the mirror will execute those side effects too.

## DestinationRule for gRPC

When configuring a DestinationRule for gRPC, you usually do not need to force HTTP/2 in the DestinationRule. gRPC traffic is already HTTP/2 when Istio detects the protocol or the Kubernetes Service port is declared as `grpc` or `http2`. DestinationRules are still useful for subsets and traffic policies:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
  namespace: default
spec:
  host: product-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

If you do use `h2UpgradePolicy: UPGRADE`, remember that it upgrades HTTP/1.1 upstream connections to HTTP/2. It is not a substitute for correctly declaring native gRPC service ports.

## Fault Injection for gRPC Testing

You can inject faults into gRPC traffic for testing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: default
spec:
  hosts:
    - product-service
  http:
    - fault:
        delay:
          percentage:
            value: 10.0
          fixedDelay: 3s
        abort:
          percentage:
            value: 5.0
          grpcStatus: "UNAVAILABLE"
      route:
        - destination:
            host: product-service
            port:
              number: 50051
```

This injects a 3-second delay into 10% of requests and returns a gRPC UNAVAILABLE status for 5% of requests. The `grpcStatus` field uses gRPC status code names.

## Debugging gRPC Routing

```bash
# Check the proxy config

istioctl proxy-config routes deploy/my-grpc-client -o json

# Enable debug logging
istioctl proxy-config log deploy/my-grpc-client --level router:debug

# Test with grpcurl
grpcurl -plaintext product-service.default.svc.cluster.local:50051 mypackage.ProductService/GetProduct
```

gRPC routing in Istio follows the same patterns as HTTP routing. The main differences are the path format (`/package.Service/Method`), retry conditions (gRPC status codes instead of HTTP codes), and the protocol requirements (HTTP/2). If you already know how to configure VirtualService for HTTP, you know most of what you need for gRPC.
