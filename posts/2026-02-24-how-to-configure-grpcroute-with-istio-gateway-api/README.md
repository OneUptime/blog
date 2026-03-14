# How to Configure GRPCRoute with Istio Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, GRPCRoute, gRPC, Kubernetes

Description: A practical guide to configuring GRPCRoute resources with Istio and the Kubernetes Gateway API for routing gRPC traffic based on service names, methods, and headers.

---

gRPC has become the go-to protocol for service-to-service communication in microservices architectures. While you can route gRPC traffic using HTTPRoute (since gRPC runs over HTTP/2), the GRPCRoute resource gives you gRPC-native routing capabilities. You can route based on gRPC service names, method names, and metadata headers without having to think about the underlying HTTP/2 details.

## Why GRPCRoute Instead of HTTPRoute

You can technically route gRPC traffic with HTTPRoute by matching on the HTTP/2 path (which for gRPC is `/package.Service/Method`). But GRPCRoute makes this much cleaner:

- Match by gRPC service name directly instead of URL path patterns
- Match by method name
- Match by gRPC metadata (which maps to HTTP/2 headers)
- The intent is clearer - anyone reading the config knows it's for gRPC

## Prerequisites

GRPCRoute is part of the experimental Gateway API channel:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

Verify the CRD:

```bash
kubectl get crd grpcroutes.gateway.networking.k8s.io
```

## Setting Up the Gateway

The Gateway needs an HTTP or HTTPS listener. gRPC runs over HTTP/2, so you use the same listener types as for HTTP traffic:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: grpc-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: grpc
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: grpc-tls-cert
    allowedRoutes:
      namespaces:
        from: Same
      kinds:
      - kind: GRPCRoute
```

For internal traffic without TLS:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: internal-grpc-gateway
  namespace: production
  annotations:
    networking.istio.io/service-type: ClusterIP
spec:
  gatewayClassName: istio
  listeners:
  - name: grpc
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
      kinds:
      - kind: GRPCRoute
```

## Basic GRPCRoute

Route all gRPC traffic to a single backend:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: grpc-route
  namespace: production
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "grpc.example.com"
  rules:
  - backendRefs:
    - name: grpc-service
      port: 50051
```

This sends all gRPC traffic for `grpc.example.com` to the `grpc-service` backend.

## Routing by gRPC Service Name

The real power of GRPCRoute is matching on gRPC service and method names. Say you have a protobuf definition like:

```protobuf
package myapp;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
}

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc GetOrder(GetOrderRequest) returns (Order);
}
```

You can route each gRPC service to a different backend:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: grpc-service-routing
  namespace: production
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - method:
        service: myapp.UserService
    backendRefs:
    - name: user-service
      port: 50051
  - matches:
    - method:
        service: myapp.OrderService
    backendRefs:
    - name: order-service
      port: 50051
```

## Routing by gRPC Method

You can get even more granular and route individual methods:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: grpc-method-routing
  namespace: production
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - method:
        service: myapp.UserService
        method: GetUser
    backendRefs:
    - name: user-read-service
      port: 50051
  - matches:
    - method:
        service: myapp.UserService
        method: ListUsers
    backendRefs:
    - name: user-list-service
      port: 50051
  - matches:
    - method:
        service: myapp.UserService
    backendRefs:
    - name: user-service-default
      port: 50051
```

This lets you route read-heavy methods like `ListUsers` to a dedicated service optimized for reads while keeping other methods on the default service.

## Routing by gRPC Metadata (Headers)

gRPC metadata is equivalent to HTTP/2 headers. You can route based on metadata values:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: grpc-header-routing
  namespace: production
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - headers:
      - type: Exact
        name: x-tenant-id
        value: "premium"
    backendRefs:
    - name: premium-grpc-service
      port: 50051
  - matches:
    - headers:
      - type: Exact
        name: x-tenant-id
        value: "standard"
    backendRefs:
    - name: standard-grpc-service
      port: 50051
  - backendRefs:
    - name: default-grpc-service
      port: 50051
```

## Combining Matches

Match on both service name and metadata:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: combined-grpc-routing
  namespace: production
spec:
  parentRefs:
  - name: grpc-gateway
  rules:
  - matches:
    - method:
        service: myapp.OrderService
      headers:
      - name: x-priority
        value: high
    backendRefs:
    - name: priority-order-service
      port: 50051
  - matches:
    - method:
        service: myapp.OrderService
    backendRefs:
    - name: order-service
      port: 50051
```

High-priority order requests go to a dedicated service, while normal order requests go to the standard service.

## Traffic Splitting for gRPC

Canary deployments work with GRPCRoute just like HTTPRoute:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: grpc-canary
  namespace: production
spec:
  parentRefs:
  - name: grpc-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - method:
        service: myapp.UserService
    backendRefs:
    - name: user-service-stable
      port: 50051
      weight: 90
    - name: user-service-canary
      port: 50051
      weight: 10
```

10% of gRPC requests to the UserService go to the canary version.

## Header Modification

Add or modify gRPC metadata before forwarding to the backend:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: grpc-with-headers
  namespace: production
spec:
  parentRefs:
  - name: grpc-gateway
  rules:
  - filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: x-gateway-source
          value: "istio-grpc-gateway"
        set:
        - name: x-routing-version
          value: "v2"
    backendRefs:
    - name: grpc-service
      port: 50051
```

## Backend Service Configuration

Your gRPC backend services should be configured with the correct ports and protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: production
spec:
  selector:
    app: user-service
  ports:
  - name: grpc
    port: 50051
    targetPort: 50051
    protocol: TCP
    appProtocol: grpc
```

The `appProtocol: grpc` field helps Istio understand that this port carries gRPC traffic and should be treated as HTTP/2.

## Checking GRPCRoute Status

```bash
kubectl get grpcroute -n production
kubectl get grpcroute grpc-service-routing -n production -o yaml
```

The status tells you whether the route was accepted:

```yaml
status:
  parents:
  - parentRef:
      name: grpc-gateway
    controllerName: istio.io/gateway-controller
    conditions:
    - type: Accepted
      status: "True"
    - type: ResolvedRefs
      status: "True"
```

## Debugging gRPC Routing

Check the Envoy route configuration:

```bash
istioctl proxy-config route deploy/grpc-gateway-istio -n production -o json
```

Look for route entries matching gRPC paths like `/myapp.UserService/GetUser`.

Test gRPC connectivity with grpcurl:

```bash
# List available services
grpcurl -plaintext <gateway-ip>:80 list

# Call a specific method
grpcurl -plaintext -d '{"id": "123"}' <gateway-ip>:80 myapp.UserService/GetUser
```

If using TLS:

```bash
grpcurl -d '{"id": "123"}' grpc.example.com:443 myapp.UserService/GetUser
```

Check Envoy stats for gRPC metrics:

```bash
kubectl exec -it deploy/grpc-gateway-istio -c istio-proxy -n production -- curl -s localhost:15000/stats | grep grpc
```

## Mesh-Internal gRPC Routing

GRPCRoute can also be used for mesh-internal routing (not just at the gateway). Create a GRPCRoute with a mesh parentRef or use it with a mesh-internal gateway to control how gRPC traffic flows between services within the mesh.

GRPCRoute gives you first-class gRPC routing in the Gateway API. The service and method matching makes configurations much more readable than equivalent HTTPRoute path patterns, and it aligns perfectly with how gRPC developers think about their services.
