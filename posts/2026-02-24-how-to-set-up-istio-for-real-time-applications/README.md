# How to Set Up Istio for Real-Time Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Real-Time, WebSocket, gRPC Streaming, Kubernetes

Description: Configure Istio for real-time applications that use WebSockets, gRPC streaming, and Server-Sent Events with proper timeout and connection management.

---

Real-time applications are built on long-lived connections. Chat apps, live dashboards, collaborative editors, stock tickers, gaming backends - they all need persistent connections that can push data to clients the moment something happens. The three main protocols for real-time communication on the web are WebSockets, gRPC streaming, and Server-Sent Events (SSE).

Istio supports all three, but the default configuration is optimized for short-lived request-response patterns. If you don't tune Istio for long-lived connections, you'll see unexpected disconnections, idle timeouts killing connections, and load balancing issues.

## WebSocket Support

WebSockets start as HTTP and upgrade to a persistent bidirectional connection. Istio supports the upgrade out of the box, but you need to configure timeouts properly.

### Basic WebSocket Configuration

Deploy your WebSocket server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ws-server
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ws-server
  template:
    metadata:
      labels:
        app: ws-server
    spec:
      containers:
      - name: ws-server
        image: myregistry/ws-server:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: ws-server
  namespace: default
spec:
  selector:
    app: ws-server
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

Configure the VirtualService with disabled timeouts for WebSocket connections:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-server-vs
  namespace: default
spec:
  hosts:
  - ws-server
  http:
  - match:
    - headers:
        upgrade:
          exact: websocket
    timeout: 0s
    route:
    - destination:
        host: ws-server
        port:
          number: 8080
  - timeout: 30s
    route:
    - destination:
        host: ws-server
        port:
          number: 8080
```

Setting `timeout: 0s` disables the idle timeout for WebSocket connections. Without this, Istio's default 15-second idle timeout would kill WebSocket connections that don't send data frequently enough.

### Exposing WebSockets Through the Gateway

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: ws-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "ws.example.com"
    tls:
      mode: SIMPLE
      credentialName: ws-tls
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-external
  namespace: default
spec:
  hosts:
  - "ws.example.com"
  gateways:
  - ws-gateway
  http:
  - match:
    - uri:
        prefix: /ws
    timeout: 0s
    route:
    - destination:
        host: ws-server
        port:
          number: 8080
```

## Adjusting Connection Timeouts

Envoy has several timeout settings that affect long-lived connections. Adjust them for real-time traffic:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: realtime-timeouts
  namespace: default
spec:
  workloadSelector:
    labels:
      app: ws-server
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stream_idle_timeout: 0s
          request_timeout: 0s
          upgrade_configs:
          - upgrade_type: websocket
```

The `stream_idle_timeout: 0s` prevents Envoy from closing idle streams, and the `upgrade_configs` explicitly enables WebSocket upgrades.

## gRPC Streaming

gRPC supports four streaming patterns: unary, server streaming, client streaming, and bidirectional streaming. Istio handles all of them, but streaming RPCs need timeout adjustments similar to WebSockets.

### Server Streaming Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: streaming-service
  namespace: default
spec:
  selector:
    app: streaming-service
  ports:
  - name: grpc
    port: 9090
    targetPort: 9090
```

The port name `grpc` tells Istio to use HTTP/2, which is required for gRPC.

Configure the VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: streaming-service-vs
  namespace: default
spec:
  hosts:
  - streaming-service
  http:
  - match:
    - uri:
        prefix: /mypackage.StreamService/Subscribe
    timeout: 0s
    route:
    - destination:
        host: streaming-service
        port:
          number: 9090
  - timeout: 10s
    route:
    - destination:
        host: streaming-service
        port:
          number: 9090
```

Streaming RPCs (`Subscribe`) get unlimited timeout. Regular unary RPCs keep a normal 10-second timeout.

### Connection Management for gRPC

gRPC uses HTTP/2 multiplexing, which means multiple streams over a single TCP connection. Configure connection pooling appropriately:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: streaming-service-dr
  namespace: default
spec:
  host: streaming-service
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
        http2MaxRequests: 1000
        maxRequestsPerConnection: 0
    loadBalancer:
      simple: LEAST_REQUEST
```

Setting `maxRequestsPerConnection: 0` means connections are never closed based on request count. This is important for long-lived gRPC streams.

## Server-Sent Events (SSE)

SSE is a simpler alternative to WebSockets for server-to-client push. The client opens an HTTP connection and the server sends events as they happen.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: sse-service-vs
  namespace: default
spec:
  hosts:
  - sse-service
  http:
  - match:
    - uri:
        prefix: /events/stream
    timeout: 0s
    route:
    - destination:
        host: sse-service
        port:
          number: 8080
  - timeout: 10s
    route:
    - destination:
        host: sse-service
        port:
          number: 8080
```

SSE connections are long-lived HTTP responses, so they need the same timeout treatment as WebSockets.

## Load Balancing Considerations

Real-time connections create a load balancing challenge. When a new pod scales up, it has zero connections while existing pods are loaded. New connections go to existing pods (unless you actively rebalance), and existing connections never migrate.

For WebSocket and gRPC streaming workloads, use LEAST_REQUEST load balancing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-server-dr
  namespace: default
spec:
  host: ws-server
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

This sends new connections to the pod with the fewest active connections, which helps balance the load as pods scale.

## Connection Draining on Scale-Down

When a pod is being terminated, you want to gracefully close all its real-time connections. Configure a preStop hook and termination grace period:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ws-server
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: ws-server
        image: myregistry/ws-server:latest
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - "sleep 5 && kill -SIGTERM 1"
```

The 5-second sleep gives Istio time to stop routing new connections to the pod. Then the SIGTERM lets your application close existing connections gracefully.

## Monitoring Real-Time Connections

Track active connections and streaming health:

```bash
# Active TCP connections per pod
sum(envoy_server_total_connections{pod=~"ws-server.*"}) by (pod)

# Connection duration distribution
histogram_quantile(0.50, rate(istio_request_duration_milliseconds_bucket{destination_workload="ws-server"}[5m]))

# Bytes transferred (useful for streaming workloads)
rate(istio_request_bytes_sum{destination_workload="ws-server"}[5m])
rate(istio_response_bytes_sum{destination_workload="ws-server"}[5m])
```

## Keepalive Configuration

For connections that might be idle for extended periods, configure TCP keepalives to prevent intermediate load balancers and firewalls from closing them:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-server-dr
  namespace: default
spec:
  host: ws-server
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10000
        tcpKeepalive:
          time: 300s
          interval: 60s
          probes: 3
```

This sends TCP keepalive probes every 60 seconds after 5 minutes of inactivity, which keeps the connection alive through firewalls and load balancers that would otherwise close idle connections.

Real-time applications work well with Istio once you address the timeout and connection management defaults. The key changes are disabling idle timeouts for long-lived connections, configuring proper connection pooling, using LEAST_REQUEST load balancing, and handling graceful connection draining. With these adjustments, your real-time services get the same observability and security benefits as the rest of your mesh.
