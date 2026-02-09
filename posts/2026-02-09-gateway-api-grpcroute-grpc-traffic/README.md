# How to Set Up Kubernetes Gateway API GRPCRoute for gRPC Traffic Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, gRPC

Description: Configure GRPCRoute resources in the Kubernetes Gateway API to route gRPC traffic with method-based matching, header filters, and traffic splitting for modern microservices using Protocol Buffers and HTTP/2.

---

gRPC is a high-performance RPC framework that uses HTTP/2 and Protocol Buffers. The Kubernetes Gateway API provides GRPCRoute for routing gRPC traffic with awareness of service and method names, enabling sophisticated routing patterns for gRPC microservices. This guide shows you how to configure GRPCRoute for various scenarios.

## Understanding gRPC Routing

Traditional HTTP routing matches on URLs and headers. gRPC routing adds awareness of the gRPC service and method structure. A gRPC request has this format:

```
POST /package.ServiceName/MethodName HTTP/2
Content-Type: application/grpc
```

GRPCRoute can match on:
- Service name (e.g., `package.UserService`)
- Method name (e.g., `GetUser`, `CreateUser`)
- Request headers
- Request metadata

This enables routing different methods of the same service to different backends, implementing canary deployments per method, or applying rate limiting based on gRPC methods.

## Setting Up a gRPC Gateway

Create a Gateway that accepts gRPC traffic:

```yaml
# grpc-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: grpc-gateway
  namespace: default
spec:
  gatewayClassName: kong
  listeners:
  - name: grpc
    protocol: HTTP
    port: 80
    allowedRoutes:
      kinds:
      - kind: GRPCRoute
      namespaces:
        from: All
  - name: grpcs
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: grpc-tls-cert
    allowedRoutes:
      kinds:
      - kind: GRPCRoute
      namespaces:
        from: All
```

Apply the gateway:

```bash
kubectl apply -f grpc-gateway.yaml
kubectl wait --for=condition=Programmed gateway/grpc-gateway --timeout=300s
```

## Basic GRPCRoute Configuration

Route all methods of a gRPC service to a backend:

```yaml
# basic-grpcroute.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: user-service-route
  namespace: default
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "grpc.example.com"
  rules:
  - matches:
    - method:
        service: user.v1.UserService
    backendRefs:
    - name: user-service
      port: 50051
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-server
  ports:
  - name: grpc
    protocol: TCP
    port: 50051
    targetPort: 50051
```

Deploy a gRPC backend server:

```yaml
# grpc-server-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-server
  template:
    metadata:
      labels:
        app: user-server
    spec:
      containers:
      - name: grpc-server
        image: mycompany/user-service:v1.0.0
        ports:
        - containerPort: 50051
          name: grpc
        env:
        - name: GRPC_PORT
          value: "50051"
```

Apply the manifests:

```bash
kubectl apply -f basic-grpcroute.yaml
kubectl apply -f grpc-server-deployment.yaml
```

Test with a gRPC client:

```bash
# Using grpcurl
GATEWAY_IP=$(kubectl get gateway grpc-gateway -o jsonpath='{.status.addresses[0].value}')

grpcurl -plaintext -authority grpc.example.com \
  $GATEWAY_IP:80 \
  user.v1.UserService/GetUser
```

## Method-Based Routing

Route different gRPC methods to different backends:

```yaml
# method-based-routing.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: user-service-methods
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "grpc.example.com"
  rules:
  # Route read methods to read-optimized service
  - matches:
    - method:
        service: user.v1.UserService
        method: GetUser
    - method:
        service: user.v1.UserService
        method: ListUsers
    backendRefs:
    - name: user-read-service
      port: 50051
  # Route write methods to write service
  - matches:
    - method:
        service: user.v1.UserService
        method: CreateUser
    - method:
        service: user.v1.UserService
        method: UpdateUser
    - method:
        service: user.v1.UserService
        method: DeleteUser
    backendRefs:
    - name: user-write-service
      port: 50051
```

This pattern works well for CQRS (Command Query Responsibility Segregation) architectures.

## Header-Based Routing

Route based on gRPC metadata (headers):

```yaml
# header-based-grpcroute.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: version-based-routing
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "grpc.example.com"
  rules:
  # Route v2 API requests
  - matches:
    - method:
        service: user.v1.UserService
      headers:
      - type: Exact
        name: x-api-version
        value: v2
    backendRefs:
    - name: user-service-v2
      port: 50051
  # Route v1 API requests (default)
  - matches:
    - method:
        service: user.v1.UserService
    backendRefs:
    - name: user-service-v1
      port: 50051
```

Client code to set metadata:

```go
// Go client example
package main

import (
    "context"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

func main() {
    conn, _ := grpc.Dial("grpc.example.com:80", grpc.WithInsecure())
    client := userpb.NewUserServiceClient(conn)

    // Set metadata for routing
    md := metadata.Pairs("x-api-version", "v2")
    ctx := metadata.NewOutgoingContext(context.Background(), md)

    // Make request with metadata
    resp, _ := client.GetUser(ctx, &userpb.GetUserRequest{
        UserId: "123",
    })
}
```

## Traffic Splitting for Canary Deployments

Gradually shift traffic to a new version:

```yaml
# grpc-canary.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: user-service-canary
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "grpc.example.com"
  rules:
  - matches:
    - method:
        service: user.v1.UserService
    backendRefs:
    # 95% to stable version
    - name: user-service-stable
      port: 50051
      weight: 95
    # 5% to canary version
    - name: user-service-canary
      port: 50051
      weight: 5
```

Monitor canary health and gradually increase weight:

```bash
# Increase canary to 20%
kubectl patch grpcroute user-service-canary --type=json -p='[
  {"op": "replace", "path": "/spec/rules/0/backendRefs/0/weight", "value": 80},
  {"op": "replace", "path": "/spec/rules/0/backendRefs/1/weight", "value": 20}
]'
```

## Request Header Manipulation

Add or modify gRPC metadata before forwarding to backends:

```yaml
# header-modification.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: user-service-headers
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "grpc.example.com"
  rules:
  - matches:
    - method:
        service: user.v1.UserService
    filters:
    # Add tracking headers
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: x-gateway-name
          value: grpc-gateway
        - name: x-request-id
          value: "${request_id}"  # If supported by implementation
        set:
        - name: x-forwarded-proto
          value: grpc
    backendRefs:
    - name: user-service
      port: 50051
```

## Multiple Service Routing

Route multiple gRPC services through one gateway:

```yaml
# multi-service-grpc.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: multi-service-routing
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "grpc.example.com"
  rules:
  # User service
  - matches:
    - method:
        service: user.v1.UserService
    backendRefs:
    - name: user-service
      port: 50051
  # Product service
  - matches:
    - method:
        service: product.v1.ProductService
    backendRefs:
    - name: product-service
      port: 50051
  # Order service
  - matches:
    - method:
        service: order.v1.OrderService
    backendRefs:
    - name: order-service
      port: 50051
```

## Exact Method Matching

Match specific methods only:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: specific-methods
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "grpc.example.com"
  rules:
  # Route only GetUser method
  - matches:
    - method:
        service: user.v1.UserService
        method: GetUser
        type: Exact
    backendRefs:
    - name: user-cache-service
      port: 50051
  # Route all other methods
  - matches:
    - method:
        service: user.v1.UserService
    backendRefs:
    - name: user-service
      port: 50051
```

## Cross-Namespace Backend References

Route to services in different namespaces using ReferenceGrant:

```yaml
# cross-namespace-grpc.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: cross-ns-route
  namespace: frontend
spec:
  parentRefs:
  - name: grpc-gateway
    namespace: default
  rules:
  - matches:
    - method:
        service: backend.v1.BackendService
    backendRefs:
    - name: backend-service
      namespace: backend
      port: 50051
---
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-frontend-to-backend
  namespace: backend
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: GRPCRoute
    namespace: frontend
  to:
  - group: ""
    kind: Service
    name: backend-service
```

## Monitoring gRPC Routes

Check GRPCRoute status:

```bash
kubectl describe grpcroute user-service-route
```

Monitor gRPC-specific metrics in your services:

```go
// Go server with Prometheus metrics
package main

import (
    "github.com/grpc-ecosystem/go-grpc-prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "google.golang.org/grpc"
    "net/http"
)

func main() {
    // Create gRPC server with metrics
    grpcServer := grpc.NewServer(
        grpc.StreamInterceptor(grpc_prometheus.StreamServerInterceptor),
        grpc.UnaryInterceptor(grpc_prometheus.UnaryServerInterceptor),
    )

    // Register your service
    userpb.RegisterUserServiceServer(grpcServer, &userServer{})

    // Initialize metrics
    grpc_prometheus.Register(grpcServer)

    // Expose metrics endpoint
    http.Handle("/metrics", promhttp.Handler())
    go http.ListenAndServe(":9090", nil)

    // Start gRPC server
    grpcServer.Serve(listener)
}
```

Query method-level metrics:

```promql
# Request rate by method
sum(rate(grpc_server_handled_total[5m])) by (grpc_method)

# Error rate by method
sum(rate(grpc_server_handled_total{grpc_code!="OK"}[5m])) by (grpc_method)
```

## Testing GRPCRoute

Use grpcurl to test routing:

```bash
# List available services
grpcurl -plaintext -authority grpc.example.com $GATEWAY_IP:80 list

# Describe a service
grpcurl -plaintext -authority grpc.example.com $GATEWAY_IP:80 \
  describe user.v1.UserService

# Call a method
grpcurl -plaintext -authority grpc.example.com $GATEWAY_IP:80 \
  -d '{"user_id": "123"}' \
  user.v1.UserService/GetUser

# Call with metadata (headers)
grpcurl -plaintext -authority grpc.example.com $GATEWAY_IP:80 \
  -H 'x-api-version: v2' \
  -d '{"user_id": "123"}' \
  user.v1.UserService/GetUser
```

## Load Testing gRPC Services

Use ghz for gRPC load testing:

```bash
# Install ghz
go install github.com/bojand/ghz/cmd/ghz@latest

# Run load test
ghz --insecure \
  --authority grpc.example.com \
  --proto ./user.proto \
  --call user.v1.UserService/GetUser \
  -d '{"user_id": "123"}' \
  -c 100 \
  -n 10000 \
  $GATEWAY_IP:80
```

Compare performance across different routes or backends.

## TLS Configuration for gRPC

Configure TLS termination for secure gRPC:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: secure-grpc
spec:
  parentRefs:
  - name: grpc-gateway
    sectionName: grpcs  # Reference the HTTPS listener
  hostnames:
  - "grpc.example.com"
  rules:
  - matches:
    - method:
        service: user.v1.UserService
    backendRefs:
    - name: user-service
      port: 50051
```

Client code for TLS:

```go
// Go client with TLS
creds := credentials.NewClientTLSFromCert(certPool, "grpc.example.com")
conn, _ := grpc.Dial("grpc.example.com:443", grpc.WithTransportCredentials(creds))
```

GRPCRoute provides powerful, gRPC-aware routing that HTTPRoute cannot match. Use method-based routing for CQRS patterns, traffic splitting for safe canary deployments of specific methods, and header-based routing for API versioning. The type-safe matching on gRPC service and method names makes routing configuration clear and less error-prone than path-based routing.
