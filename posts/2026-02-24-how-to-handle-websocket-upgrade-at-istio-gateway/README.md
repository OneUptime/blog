# How to Handle WebSocket Upgrade at Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebSocket, Gateway, Real-Time, Kubernetes

Description: How to configure the Istio ingress gateway and VirtualService to properly handle WebSocket connections including timeouts, load balancing, and monitoring.

---

WebSocket connections are fundamentally different from regular HTTP requests. They start as an HTTP request with an `Upgrade: websocket` header, and then the connection gets upgraded to a persistent, bidirectional TCP connection. This means the normal HTTP request/response model does not apply anymore. The connection stays open for minutes, hours, or even days.

Istio supports WebSocket out of the box since Envoy handles the HTTP upgrade protocol natively. But there are several gotchas around timeouts, load balancing, and scaling that you need to handle correctly.

## Basic WebSocket Configuration

The good news is that Istio handles WebSocket upgrades automatically. You do not need any special configuration to make basic WebSocket connections work through the gateway. A standard Gateway and VirtualService setup works:

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
      tls:
        mode: SIMPLE
        credentialName: ws-app-cert
      hosts:
        - "ws.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "ws.example.com"

---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-app-vs
  namespace: default
spec:
  hosts:
    - "ws.example.com"
  gateways:
    - ws-gateway
  http:
    - route:
        - destination:
            host: ws-app.default.svc.cluster.local
            port:
              number: 80
```

That is it for basic WebSocket support. The Envoy proxy recognizes the HTTP Upgrade header and handles the protocol upgrade.

## Fixing WebSocket Timeouts

Here is where most people run into problems. By default, Envoy has an idle timeout that closes connections after a period of inactivity. For regular HTTP, this makes sense. For WebSocket, where messages might be infrequent, it causes connections to drop unexpectedly.

The default stream idle timeout is 5 minutes. If no data flows on the WebSocket connection for 5 minutes, Envoy closes it. For many WebSocket applications, this is way too short.

Increase the timeout in the VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-app-vs
  namespace: default
spec:
  hosts:
    - "ws.example.com"
  gateways:
    - ws-gateway
  http:
    - route:
        - destination:
            host: ws-app.default.svc.cluster.local
            port:
              number: 80
      timeout: 0s
```

Setting `timeout: 0s` disables the route timeout entirely for WebSocket connections. However, you also need to disable the stream idle timeout at the Envoy level:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ws-idle-timeout
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            stream_idle_timeout: 3600s
            request_timeout: 0s
            upgrade_configs:
              - upgrade_type: websocket
```

This sets the stream idle timeout to 1 hour. If you need connections to stay open longer, increase this value. For applications like chat or live dashboards, you might set it to several hours.

The `upgrade_configs` section explicitly enables WebSocket upgrades. While this is usually enabled by default, setting it explicitly ensures it works regardless of other configuration changes.

## Handling WebSocket on the Sidecar

If your WebSocket backend service also has an Istio sidecar, you need to adjust the sidecar's timeout too:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ws-sidecar-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: ws-app
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            stream_idle_timeout: 3600s
            upgrade_configs:
              - upgrade_type: websocket
```

## Load Balancing WebSocket Connections

WebSocket connections are persistent, which means they stick to a single backend pod for the lifetime of the connection. This can cause uneven load distribution if you are not careful.

The default round-robin load balancing assigns new connections evenly, but if connections have very different lifetimes, some pods will end up with more active connections than others.

For WebSocket workloads, use the LEAST_REQUEST load balancing policy:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-app-dr
  namespace: default
spec:
  host: ws-app.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      tcp:
        maxConnections: 5000
      http:
        http1MaxPendingRequests: 1000
        http2MaxRequests: 5000
        maxRequestsPerConnection: 0
```

`LEAST_REQUEST` routes new connections to the pod with the fewest active connections, which helps balance long-lived WebSocket connections more evenly.

Setting `maxRequestsPerConnection: 0` means unlimited requests per connection, which is what you want for WebSocket since each connection handles many messages.

## WebSocket with Path-Based Routing

If your application uses WebSocket on a specific path (like `/ws` or `/socket.io`), you can set up path-based routing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-app-vs
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            prefix: /ws
      route:
        - destination:
            host: ws-app.default.svc.cluster.local
            port:
              number: 80
      timeout: 0s
    - match:
        - uri:
            prefix: /socket.io
      route:
        - destination:
            host: ws-app.default.svc.cluster.local
            port:
              number: 80
      timeout: 0s
    - route:
        - destination:
            host: web-app.default.svc.cluster.local
            port:
              number: 80
      timeout: 30s
```

The WebSocket paths get `timeout: 0s` while regular HTTP paths get a normal 30-second timeout.

## Sticky Sessions for WebSocket

Some WebSocket implementations (like Socket.IO) use HTTP polling as a fallback and need sticky sessions to work correctly. The polling requests need to go to the same pod that holds the WebSocket connection.

Configure consistent hashing based on a session cookie:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-sticky-dr
  namespace: default
spec:
  host: ws-app.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: io
          ttl: 0s
```

This routes all requests with the same `io` cookie (which Socket.IO sets) to the same backend pod. The `ttl: 0s` means the cookie-based routing never expires.

For other WebSocket libraries, you might hash on a different header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-sticky-dr
  namespace: default
spec:
  host: ws-app.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-session-id
```

## Graceful Shutdown for WebSocket Pods

When a WebSocket pod is being terminated (during a deployment or scale-down), you need to give existing connections time to close gracefully:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ws-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 120
      containers:
        - name: ws-app
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
```

The `preStop` hook delays the shutdown by 10 seconds, giving the Envoy sidecar time to stop routing new connections. The `terminationGracePeriodSeconds: 120` gives existing WebSocket connections up to 2 minutes to complete.

Your application should also handle SIGTERM by sending a close frame to all connected WebSocket clients so they know to reconnect.

## Monitoring WebSocket Connections

Track WebSocket connection metrics:

```promql
# Active connections
envoy_cluster_upstream_cx_active{cluster_name=~"outbound.*ws-app.*"}

# Connection duration
histogram_quantile(0.99, sum(rate(envoy_cluster_upstream_cx_length_ms_bucket{cluster_name=~"outbound.*ws-app.*"}[5m])) by (le))

# Connection errors
sum(rate(envoy_cluster_upstream_cx_connect_fail{cluster_name=~"outbound.*ws-app.*"}[5m]))

# Total bytes transferred (both directions)
sum(rate(envoy_cluster_upstream_cx_rx_bytes_total{cluster_name=~"outbound.*ws-app.*"}[5m]))
sum(rate(envoy_cluster_upstream_cx_tx_bytes_total{cluster_name=~"outbound.*ws-app.*"}[5m]))
```

## Testing WebSocket Through the Gateway

Use wscat or websocat to test WebSocket connections:

```bash
# Install wscat
npm install -g wscat

# Test WebSocket connection
wscat -c "wss://ws.example.com/ws"

# Or with curl for the initial handshake
curl -v -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  https://ws.example.com/ws
```

If the connection upgrades successfully, you should see a `101 Switching Protocols` response.

## Summary

WebSocket connections work through Istio with minimal configuration since Envoy handles the HTTP upgrade automatically. The main things to get right are the idle timeout (increase it to hours for long-lived connections), load balancing (use LEAST_REQUEST for even distribution), sticky sessions (use consistent hashing for Socket.IO or similar libraries), and graceful shutdown (set a long termination grace period). Test with wscat to verify the upgrade works end-to-end, and monitor active connections to track your WebSocket capacity.
