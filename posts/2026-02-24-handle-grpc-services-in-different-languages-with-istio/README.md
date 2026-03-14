# How to Handle gRPC Services in Different Languages with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GRPC, Kubernetes, Microservices, Service Mesh

Description: Practical guide to running gRPC services across multiple programming languages in an Istio mesh with proper port naming, health checks, and load balancing.

---

gRPC is a natural choice for inter-service communication in a microservices architecture, and Istio has first-class support for it. But running gRPC services across different programming languages introduces some specific challenges around port configuration, health checking, and load balancing. This guide covers the practical details of getting gRPC services working properly in an Istio mesh, regardless of what language they are written in.

## Port Naming for gRPC

The most important thing to get right is port naming. Istio needs to know that a port is serving gRPC traffic so it can use HTTP/2 and apply gRPC-specific routing rules.

Name your service ports with the `grpc-` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  selector:
    app: payment-service
  ports:
  - name: grpc-api
    port: 9090
    targetPort: 9090
```

If you use just `grpc` as the full name, that works too. What does not work is naming it something like `api` or `rpc` - Istio will not detect the protocol correctly.

For services that expose both HTTP and gRPC:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  ports:
  - name: http-web
    port: 8080
    targetPort: 8080
  - name: grpc-api
    port: 9090
    targetPort: 9090
```

## gRPC Health Checking

Kubernetes 1.24+ supports native gRPC health probes. This is the recommended approach for gRPC services in Istio:

### Go

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    healthpb "google.golang.org/grpc/health/grpc_health_v1"
)

func main() {
    s := grpc.NewServer()

    // Register your service
    pb.RegisterPaymentServiceServer(s, &paymentServer{})

    // Register health service
    healthServer := health.NewServer()
    healthpb.RegisterHealthServer(s, healthServer)
    healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
    healthServer.SetServingStatus(
        "payment.PaymentService",
        healthpb.HealthCheckResponse_SERVING,
    )

    lis, _ := net.Listen("tcp", ":9090")
    s.Serve(lis)
}
```

### Java

```java
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.protobuf.services.HealthStatusManager;

public class PaymentServer {
    public static void main(String[] args) throws Exception {
        HealthStatusManager healthManager = new HealthStatusManager();

        Server server = ServerBuilder.forPort(9090)
            .addService(new PaymentServiceImpl())
            .addService(healthManager.getHealthService())
            .build()
            .start();

        healthManager.setStatus("", ServingStatus.SERVING);
        healthManager.setStatus(
            "payment.PaymentService",
            ServingStatus.SERVING
        );

        server.awaitTermination();
    }
}
```

### Python

```python
import grpc
from grpc_health.v1 import health, health_pb2_grpc

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Register your service
    payment_pb2_grpc.add_PaymentServiceServicer_to_server(
        PaymentServicer(), server
    )

    # Register health service
    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)
    health_servicer.set("", health_pb2.HealthCheckResponse.SERVING)
    health_servicer.set(
        "payment.PaymentService",
        health_pb2.HealthCheckResponse.SERVING
    )

    server.add_insecure_port('[::]:9090')
    server.start()
    server.wait_for_termination()
```

### Node.js

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { HealthImplementation } = require('grpc-health-check');

const healthImpl = new HealthImplementation({
  '': 'SERVING',
  'payment.PaymentService': 'SERVING',
});

const server = new grpc.Server();
server.addService(paymentProto.PaymentService.service, paymentServiceImpl);
healthImpl.addToServer(server);

server.bindAsync('0.0.0.0:9090', grpc.ServerCredentials.createInsecure(), () => {
  console.log('gRPC server running on port 9090');
});
```

### Kubernetes Deployment with gRPC Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    spec:
      containers:
      - name: payment-service
        image: myregistry/payment-service:1.0.0
        ports:
        - name: grpc-api
          containerPort: 9090
        livenessProbe:
          grpc:
            port: 9090
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          grpc:
            port: 9090
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Traffic Management for gRPC

### GRPCRoute (Gateway API)

If you use the Gateway API:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: payment-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "grpc.example.com"
  rules:
  - matches:
    - method:
        service: payment.PaymentService
        method: ProcessPayment
    backendRefs:
    - name: payment-service
      port: 9090
```

### VirtualService (Istio API)

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - match:
    - port: 9090
    route:
    - destination:
        host: payment-service
        port:
          number: 9090
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: unavailable,resource-exhausted,internal
```

Note the `retryOn` values - these are gRPC-specific status codes, not HTTP status codes. Valid gRPC retry conditions include: `cancelled`, `deadline-exceeded`, `internal`, `resource-exhausted`, `unavailable`.

### Canary Deployments for gRPC

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
        subset: v1
      weight: 90
    - destination:
        host: payment-service
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Load Balancing for gRPC

gRPC uses HTTP/2, which multiplexes many requests over a single TCP connection. This means that simple TCP-level load balancing does not work well because all requests end up on the same backend. Istio solves this by using Envoy's HTTP/2-aware load balancing.

Make sure your DestinationRule is configured for proper gRPC load balancing:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
        http2MaxRequests: 1000
        maxRequestsPerConnection: 0
```

Setting `maxRequestsPerConnection: 0` means unlimited requests per connection, which is fine for gRPC since Envoy handles request-level load balancing within each connection.

## Trace Header Propagation for gRPC

gRPC uses metadata (similar to HTTP headers) for trace propagation. Here is how to propagate trace headers in different languages:

### Go gRPC Interceptor

```go
func TraceUnaryInterceptor() grpc.UnaryClientInterceptor {
    return func(ctx context.Context, method string, req, reply interface{},
        cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {

        headers := tracing.FromContext(ctx)
        md := metadata.MD{}
        for _, name := range traceHeaderNames {
            if value := headers.Get(name); value != "" {
                md.Set(name, value)
            }
        }
        ctx = metadata.NewOutgoingContext(ctx, md)
        return invoker(ctx, method, req, reply, cc, opts...)
    }
}
```

### Python gRPC Interceptor

```python
class TraceClientInterceptor(grpc.UnaryUnaryClientInterceptor):
    def __init__(self, trace_headers):
        self._trace_headers = trace_headers

    def intercept_unary_unary(self, continuation, client_call_details, request):
        metadata = list(client_call_details.metadata or [])
        for key, value in self._trace_headers.items():
            metadata.append((key, value))

        new_details = client_call_details._replace(metadata=metadata)
        return continuation(new_details, request)
```

### Java gRPC Interceptor

```java
public class TraceClientInterceptor implements ClientInterceptor {
    @Override
    public <ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
            MethodDescriptor<ReqT, RespT> method, CallOptions options, Channel next) {

        return new ForwardingClientCall.SimpleForwardingClientCall<>(
                next.newCall(method, options)) {
            @Override
            public void start(Listener<RespT> responseListener, Metadata headers) {
                Map<String, String> traceHeaders = TraceContext.current();
                for (Map.Entry<String, String> entry : traceHeaders.entrySet()) {
                    headers.put(
                        Metadata.Key.of(entry.getKey(), Metadata.ASCII_STRING_MARSHALLER),
                        entry.getValue()
                    );
                }
                super.start(responseListener, headers);
            }
        };
    }
}
```

## Handling gRPC Errors with Istio

Istio maps gRPC status codes to HTTP status codes for metrics. Understanding this mapping helps when reading Istio metrics:

| gRPC Status | HTTP Status |
|---|---|
| OK | 200 |
| CANCELLED | 499 |
| UNKNOWN | 500 |
| INVALID_ARGUMENT | 400 |
| DEADLINE_EXCEEDED | 504 |
| NOT_FOUND | 404 |
| PERMISSION_DENIED | 403 |
| RESOURCE_EXHAUSTED | 429 |
| UNIMPLEMENTED | 501 |
| INTERNAL | 500 |
| UNAVAILABLE | 503 |
| UNAUTHENTICATED | 401 |

This mapping affects how Istio's circuit breaker and retry logic interprets gRPC errors.

## gRPC Reflection

Enable gRPC reflection in development/staging environments so you can use tools like grpcurl for debugging:

### Go

```go
import "google.golang.org/grpc/reflection"

s := grpc.NewServer()
pb.RegisterPaymentServiceServer(s, &paymentServer{})
reflection.Register(s)
```

Then use grpcurl through the mesh:

```bash
kubectl exec -it debug-pod -- grpcurl -plaintext payment-service:9090 list
kubectl exec -it debug-pod -- grpcurl -plaintext payment-service:9090 payment.PaymentService/ProcessPayment
```

## Common gRPC + Istio Issues

**Deadline propagation**: When Service A calls Service B with a deadline, and Service B calls Service C, the deadline should be propagated. Istio does not do this automatically. Your application code needs to propagate the deadline through the context.

**Large messages**: gRPC messages have a default max size of 4MB. If your services exchange large messages, configure Envoy's gRPC max message size or increase it in your application code.

**Streaming RPCs**: Istio supports gRPC streaming (server-streaming, client-streaming, and bidirectional). However, long-lived streams might be affected by Istio timeout settings. Set appropriate timeouts or disable them for streaming endpoints.

**Mixed HTTP and gRPC**: If your service exposes both HTTP and gRPC on the same port (like gRPC-Web), make sure Istio can detect the protocol correctly. Using separate ports for HTTP and gRPC is the safest approach.

gRPC and Istio work very well together. The key things to get right are port naming, gRPC-specific health checks, and understanding that Envoy handles HTTP/2-level load balancing for you. Once those basics are in place, your gRPC services get all the benefits of the mesh - mTLS, observability, and traffic management - without any protocol-specific issues.
