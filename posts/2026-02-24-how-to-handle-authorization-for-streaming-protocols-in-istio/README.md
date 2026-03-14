# How to Handle Authorization for Streaming Protocols in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Streaming, gRPC, WebSocket, Authorization, Kubernetes

Description: How to configure Istio authorization policies for streaming protocols including gRPC streaming, WebSocket connections, and server-sent events.

---

Streaming protocols add complexity to authorization in a service mesh. With standard HTTP request-response, each request gets its own authorization check. With streaming, a single connection can carry many messages over a long period of time. gRPC streams, WebSocket connections, and server-sent events (SSE) all behave differently from regular HTTP, and your authorization strategy needs to account for that.

Istio handles streaming protocols, but there are gotchas around when authorization is enforced, how long-lived connections interact with policy changes, and what metadata is available for authorization decisions.

## gRPC Streaming Authorization

gRPC supports four streaming patterns: unary (request-response), server streaming, client streaming, and bidirectional streaming. Istio treats gRPC as HTTP/2, so standard AuthorizationPolicy works, but with some nuances.

### Basic gRPC Authorization

For unary and streaming RPCs, you can authorize based on the service and method:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: grpc-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/web-app"]
    to:
    - operation:
        # gRPC paths follow the pattern: /package.Service/Method
        paths: ["/myapp.OrderService/CreateOrder"]
        methods: ["POST"]  # All gRPC calls use POST
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/web-app"]
    to:
    - operation:
        # Allow the streaming method
        paths: ["/myapp.OrderService/WatchOrders"]
        methods: ["POST"]
```

For gRPC, all requests use the POST method. The path is derived from the protobuf service definition: `/<package>.<Service>/<Method>`.

### Wildcard gRPC Authorization

Allow all methods on a specific service:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: grpc-service-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        paths: ["/myapp.OrderService/*"]
        methods: ["POST"]
```

### gRPC Metadata-Based Authorization

gRPC metadata is transmitted as HTTP/2 headers. You can authorize based on custom metadata:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: grpc-metadata-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/web-app"]
    to:
    - operation:
        paths: ["/myapp.OrderService/*"]
    when:
    - key: request.headers[x-api-key]
      notValues: [""]
```

Your gRPC client sends metadata:

```go
md := metadata.New(map[string]string{
    "x-api-key": "your-api-key",
})
ctx := metadata.NewOutgoingContext(context.Background(), md)
stream, err := client.WatchOrders(ctx, &pb.WatchRequest{})
```

## WebSocket Authorization

WebSocket connections start with an HTTP upgrade request. Istio's authorization is checked during the initial upgrade handshake, not on individual WebSocket frames.

### Authorizing WebSocket Upgrade

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: websocket-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: ws-service
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/ws/*"]
    when:
    - key: request.headers[upgrade]
      values: ["websocket"]
```

This only allows WebSocket upgrade requests from the frontend namespace. Regular HTTP requests to the same path need their own rule.

### Combining WebSocket and HTTP Authorization

If your service handles both WebSocket and HTTP:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mixed-protocol-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: realtime-service
  action: ALLOW
  rules:
  # WebSocket connections
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/ws/*"]
  # Regular HTTP API
  - from:
    - source:
        namespaces: ["frontend", "backend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

### Important: WebSocket Connection Lifetime

Once a WebSocket connection is established, it stays open until either side closes it. If you update an AuthorizationPolicy after the connection is established, the existing connection is NOT affected. Only new connection attempts will be evaluated against the updated policy.

This means that revoking access requires terminating existing connections. You can do this by restarting the pod or using the proxy admin API:

```bash
# Force close all connections on a pod (use with caution)
kubectl exec -n backend deployment/ws-service -c istio-proxy -- \
  curl -X POST localhost:15000/drain_listeners
```

## Server-Sent Events (SSE)

SSE uses regular HTTP with a long-lived response stream. Authorization works on the initial request:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: sse-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: event-service
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/events/stream"]
    when:
    - key: request.headers[accept]
      values: ["text/event-stream"]
```

Like WebSocket, SSE connections are long-lived. Policy changes won't affect existing streams.

## Handling Connection Timeouts

For long-lived streaming connections, configure appropriate timeouts to force periodic re-authorization:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: streaming-routes
  namespace: backend
spec:
  hosts:
  - ws-service
  http:
  - match:
    - uri:
        prefix: /ws/
    route:
    - destination:
        host: ws-service
    timeout: 3600s  # 1 hour max WebSocket connection
  - match:
    - uri:
        prefix: /events/
    route:
    - destination:
        host: event-service
    timeout: 1800s  # 30 minute max SSE connection
```

For gRPC streams, set the timeout in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-timeouts
  namespace: backend
spec:
  host: grpc-service
  trafficPolicy:
    connectionPool:
      http:
        idleTimeout: 3600s
        maxRequestsPerConnection: 0  # Unlimited for streaming
```

## gRPC Stream Authorization with JWT

For gRPC streams that carry user identity:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: grpc-jwt-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: grpc-service
  jwtRules:
  - issuer: "https://auth.example.com/"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: grpc-jwt-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: grpc-service
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    to:
    - operation:
        paths: ["/myapp.OrderService/WatchOrders"]
    when:
    - key: request.auth.claims[scope]
      values: ["orders:read"]
```

The JWT is validated when the gRPC stream is initiated. For long-lived streams, the token might expire during the connection. Your application should handle token refresh by establishing a new stream.

## Monitoring Streaming Authorization

Track streaming connection authorization:

```bash
# gRPC-specific metrics
# Request count by gRPC status:
# sum(rate(istio_requests_total{grpc_response_status!=""}[5m])) by (grpc_response_status, destination_workload)

# Denied streaming connections:
# sum(rate(istio_requests_total{response_code="403",destination_workload="ws-service"}[5m]))
```

Check active connections:

```bash
# View active connections on a service
kubectl exec -n backend deployment/ws-service -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep -c "cx_active"
```

## Practical Considerations

There are a few things to keep in mind when authorizing streaming traffic:

1. Authorization is checked once at connection establishment, not per message. Design your token expiry and connection lifetimes accordingly.

2. Long-lived connections resist policy changes. Plan for how you'll handle access revocation for streaming services.

3. gRPC health checks use the path `/grpc.health.v1.Health/Check`. Make sure your policy allows it if you're using gRPC health checking:

```yaml
  rules:
  - to:
    - operation:
        paths: ["/grpc.health.v1.Health/Check"]
```

4. WebSocket connections don't carry HTTP method or path after the initial upgrade. All authorization decisions must be made during the handshake.

Streaming protocols work well with Istio's authorization, but the one-time-check nature of long-lived connections means you need to think about connection lifecycle management. Use reasonable timeouts, handle token refresh in your application code, and have a plan for emergency revocation when needed.
