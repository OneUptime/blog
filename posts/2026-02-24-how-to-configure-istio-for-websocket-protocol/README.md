# How to Configure Istio for WebSocket Protocol

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebSocket, Service Mesh, Kubernetes, Real-Time

Description: How to configure Istio to properly handle WebSocket connections, including gateway setup, timeout configuration, and connection management.

---

WebSockets are essential for real-time applications like chat systems, live dashboards, collaborative editing, and streaming updates. Unlike regular HTTP requests, a WebSocket connection starts as an HTTP upgrade request and then transitions into a full-duplex persistent connection. This upgrade mechanism and the long-lived nature of WebSocket connections require some specific configuration in Istio.

The good news is that Istio supports WebSockets out of the box. The not-so-good news is that the default timeout settings can kill your WebSocket connections prematurely if you don't adjust them.

## How WebSockets Work Through Istio

A WebSocket connection lifecycle in Istio looks like this:

1. The client sends an HTTP GET request with `Upgrade: websocket` and `Connection: Upgrade` headers
2. The Envoy sidecar on the client side forwards this to the upstream
3. The Envoy sidecar on the server side passes it to the application
4. The server responds with HTTP 101 Switching Protocols
5. Both sides now communicate over the upgraded connection using WebSocket frames

Since the initial handshake is HTTP, Istio can see and route it using standard HTTP routing rules. Once upgraded, the connection is treated as a TCP stream flowing through the Envoy proxies.

## Basic WebSocket Service Configuration

Your Kubernetes Service should use the `http` protocol prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: websocket-app
  namespace: default
spec:
  selector:
    app: websocket-app
  ports:
    - name: http-ws
      port: 8080
      targetPort: 8080
```

WebSocket starts as HTTP, so naming the port with `http` prefix is correct. Don't use `tcp` - that would prevent Istio from understanding the HTTP upgrade request.

## VirtualService for WebSocket Traffic

Route WebSocket traffic using a standard VirtualService. The WebSocket upgrade happens automatically when the client sends the appropriate headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: websocket-routing
  namespace: default
spec:
  hosts:
    - websocket-app.default.svc.cluster.local
  http:
    - match:
        - headers:
            upgrade:
              exact: websocket
      route:
        - destination:
            host: websocket-app.default.svc.cluster.local
            port:
              number: 8080
      timeout: 0s
    - route:
        - destination:
            host: websocket-app.default.svc.cluster.local
            port:
              number: 8080
```

The `timeout: 0s` setting is critical. By default, Istio applies a 15-second timeout to HTTP routes. For regular HTTP requests, that's usually fine. But WebSocket connections are meant to stay open for minutes, hours, or even days. Setting the timeout to `0s` disables it entirely for the WebSocket route.

## Gateway Configuration for External WebSocket Access

To expose a WebSocket service through the Istio ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: ws-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "ws.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: ws-tls-cert
      hosts:
        - "ws.example.com"
```

And the VirtualService bound to the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ws-ingress
  namespace: default
spec:
  hosts:
    - "ws.example.com"
  gateways:
    - ws-gateway
  http:
    - route:
        - destination:
            host: websocket-app.default.svc.cluster.local
            port:
              number: 8080
      timeout: 0s
```

If you use TLS, make sure your TLS termination happens at the gateway. WebSocket over TLS (wss://) is just WebSocket over HTTPS, so the standard TLS configuration works.

## Timeout and Idle Connection Settings

The biggest source of problems with WebSockets in Istio is timeouts. There are several timeout settings that can affect WebSocket connections:

### Route Timeout

Already covered above. Set to `0s` in your VirtualService.

### Idle Timeout

Envoy has an idle timeout that closes connections with no activity. For WebSocket connections that might be idle between messages, you need to increase this.

Configure it through a mesh-level EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: websocket-idle-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: websocket-app
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 8080
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            stream_idle_timeout: 0s
```

Setting `stream_idle_timeout: 0s` disables the idle timeout for streams on this port. Be careful with this - disabling idle timeouts means abandoned connections will never be cleaned up by the proxy. Your application should handle its own connection cleanup.

### Connection Pool Idle Timeout

The DestinationRule can also affect WebSocket connections:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: websocket-dr
  namespace: default
spec:
  host: websocket-app.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 10s
        tcpKeepalive:
          time: 30s
          interval: 10s
          probes: 3
      http:
        maxRequestsPerConnection: 0
```

`maxRequestsPerConnection: 0` means unlimited requests per connection. This is appropriate for WebSocket because a single connection carries all messages.

The `maxConnections` limit applies to WebSocket connections too. Each active WebSocket client is a separate TCP connection. If you have thousands of concurrent WebSocket clients, set this high enough.

## Load Balancing WebSocket Connections

WebSocket connections are stateful - once established, all messages should go to the same backend pod. Istio's default round-robin load balancing works correctly because each WebSocket connection is a single TCP connection that stays bound to one upstream pod.

But if you're using connection draining (like during rolling updates), you need to handle WebSocket connection migration. Envoy drains connections during pod shutdown, but WebSocket clients need to reconnect to a new pod.

Configure graceful shutdown behavior:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: ws-graceful
  namespace: default
spec:
  host: websocket-app.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## Scaling WebSocket Services

Each WebSocket connection consumes resources on both the application and the sidecar proxy. When scaling WebSocket services:

1. Increase sidecar proxy resources for pods that handle many connections:

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "500m"
  sidecar.istio.io/proxyMemory: "256Mi"
  sidecar.istio.io/proxyCPULimit: "1000m"
  sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

2. Monitor connection counts:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep downstream_cx_active
```

3. Use horizontal pod autoscaling based on connection count or custom metrics.

## Debugging WebSocket Issues

If WebSocket connections fail to establish:

```bash
# Check if the upgrade header passes through
kubectl logs <pod-name> -c istio-proxy -n default | grep "101\|upgrade"

# Check listener config
istioctl proxy-config listener <pod-name> -n default --port 8080 -o json

# Check route config
istioctl proxy-config route <pod-name> -n default -o json | grep -A10 "websocket"
```

If connections establish but drop unexpectedly, check the timeout settings. Look at Envoy's connection statistics:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "cx_destroy\|idle_timeout\|max_duration"
```

Common patterns:

- Connections drop after exactly 15 seconds: the route timeout is not set to `0s`
- Connections drop after a few minutes of inactivity: the stream idle timeout needs to be increased
- Connections drop randomly under load: check `maxConnections` in the DestinationRule

WebSocket support in Istio is solid, but you need to adjust the timeout defaults. Set route timeout to `0s`, configure appropriate idle timeouts, and make sure your connection pool limits can handle the expected number of concurrent WebSocket clients. With these changes, WebSocket connections will stay alive as long as your application needs them.
