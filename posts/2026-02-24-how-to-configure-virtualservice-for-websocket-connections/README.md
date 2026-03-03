# How to Configure VirtualService for WebSocket Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, WebSocket, Traffic Management, Kubernetes

Description: Learn how to configure Istio VirtualService for WebSocket connections, including routing, timeouts, and gateway configuration.

---

WebSocket connections are long-lived, bidirectional connections that start as an HTTP upgrade request. Istio supports WebSocket traffic by default, but there are a few configuration details you need to get right - especially around timeouts, since WebSocket connections are meant to stay open much longer than typical HTTP requests.

## How WebSockets Work with Istio

A WebSocket connection starts with an HTTP Upgrade request. The client sends:

```text
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
```

Envoy (Istio's data plane proxy) detects this upgrade and switches the connection to WebSocket mode. From that point, the connection is a raw TCP pipe between client and server, carrying WebSocket frames in both directions.

The good news is that Envoy supports WebSocket upgrades by default. The tricky part is making sure your VirtualService does not accidentally close the connection due to timeouts.

## Basic WebSocket VirtualService

Here is a simple configuration for a WebSocket service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-service
  namespace: default
spec:
  hosts:
    - ws-service
  http:
    - match:
        - uri:
            prefix: "/ws"
      route:
        - destination:
            host: ws-service
            port:
              number: 8080
      timeout: 0s
```

The `timeout: 0s` is critical. By default, Istio applies a 15-second timeout to HTTP routes. For WebSocket connections that are supposed to stay open for minutes or hours, this timeout would kill the connection. Setting it to `0s` disables the timeout entirely.

## Mixed HTTP and WebSocket Service

If your service handles both regular HTTP and WebSocket traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - uri:
            prefix: "/ws"
      route:
        - destination:
            host: my-app
            port:
              number: 8080
      timeout: 0s
    - match:
        - uri:
            prefix: "/api"
      route:
        - destination:
            host: my-app
            port:
              number: 8080
      timeout: 30s
    - route:
        - destination:
            host: my-app
            port:
              number: 8080
```

The WebSocket route has no timeout, while regular API routes have a 30-second timeout. This is important because you do not want regular HTTP requests hanging forever either.

## WebSocket Through an Ingress Gateway

To expose WebSocket services externally:

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
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "ws.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "ws.example.com"
      tls:
        mode: SIMPLE
        credentialName: ws-tls-cert
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
    - route:
        - destination:
            host: ws-service
            port:
              number: 8080
      timeout: 0s
```

For production WebSocket services, always use TLS (wss://). Secure WebSocket connections are more reliable through load balancers and proxies.

## WebSocket with Multiple Rooms or Channels

If your WebSocket server uses different paths for different functionality:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-service
  namespace: default
spec:
  hosts:
    - ws-service
  http:
    - match:
        - uri:
            prefix: "/ws/chat"
      route:
        - destination:
            host: chat-service
            port:
              number: 8080
      timeout: 0s
    - match:
        - uri:
            prefix: "/ws/notifications"
      route:
        - destination:
            host: notification-service
            port:
              number: 8080
      timeout: 0s
    - match:
        - uri:
            prefix: "/ws/live-data"
      route:
        - destination:
            host: live-data-service
            port:
              number: 8080
      timeout: 0s
```

Different WebSocket endpoints get routed to different backend services.

## Session Stickiness for WebSockets

WebSocket connections are stateful, so you need to make sure reconnects go to the same backend pod. Use consistent hashing in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-service
  namespace: default
spec:
  host: ws-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

Or use a cookie for stickiness:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-service
  namespace: default
spec:
  host: ws-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: ws-sticky
          ttl: 0s
```

## Connection Limits

For WebSocket services, you might want to control connection pool settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-service
  namespace: default
spec:
  host: ws-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 0
```

Setting `maxRequestsPerConnection: 0` means unlimited requests per connection, which is what you want for WebSockets. The `h2UpgradePolicy: DO_NOT_UPGRADE` keeps the connection as HTTP/1.1, which WebSockets require (WebSocket upgrades happen over HTTP/1.1, not HTTP/2).

## Canary Deployments with WebSockets

You can do weight-based traffic splitting for WebSocket services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-service
  namespace: default
spec:
  hosts:
    - ws-service
  http:
    - route:
        - destination:
            host: ws-service
            subset: v1
          weight: 90
        - destination:
            host: ws-service
            subset: v2
          weight: 10
      timeout: 0s
```

The weight applies to new connection establishment. Once a WebSocket connection is established to v1 or v2, it stays connected to that version for the life of the connection.

## Idle Timeout Configuration

While you want to disable the route timeout, you might still want an idle timeout to clean up abandoned connections:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-service
  namespace: default
spec:
  host: ws-service
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
        tcpKeepalive:
          time: 300s
          interval: 75s
          probes: 3
```

The TCP keepalive settings detect dead connections. If no data is exchanged for 300 seconds, the proxy sends a keepalive probe every 75 seconds. After 3 failed probes, the connection is closed.

## Debugging WebSocket Issues

Common WebSocket problems and how to troubleshoot them:

```bash
# Check if the upgrade is happening
curl -v -H "Upgrade: websocket" -H "Connection: Upgrade" http://ws-service.default.svc.cluster.local/ws

# Check Envoy logs for upgrade requests
kubectl logs deploy/ws-service -c istio-proxy | grep "upgrade"

# Verify the route configuration
istioctl proxy-config routes deploy/ws-service -o json

# Check connection count
kubectl exec deploy/ws-service -c istio-proxy -- curl -s localhost:15090/stats/prometheus | grep downstream_cx_active
```

**Connection drops after 15 seconds?** You forgot to set `timeout: 0s`.

**Connection refused?** Check that the Gateway is set up correctly and the port matches.

**Intermittent disconnects?** Check the TCP keepalive settings and any load balancer timeouts in front of Istio.

## Things to Watch Out For

1. **Default timeout kills connections.** Always set `timeout: 0s` for WebSocket routes.
2. **Load balancer timeouts.** If you have a cloud load balancer in front of Istio, it might have its own idle timeout. AWS ALB defaults to 60 seconds, for example.
3. **HTTP/2 vs HTTP/1.1.** WebSocket uses HTTP/1.1 for the upgrade. Do not force HTTP/2 on WebSocket connections.
4. **Scale considerations.** WebSocket connections are persistent. If you have 10,000 connected clients, that is 10,000 open connections. Plan your connection pool and pod scaling accordingly.
5. **Retries do not make sense.** Do not configure retries for WebSocket routes - the connection upgrade either succeeds or fails. Retrying a long-lived connection is not meaningful.

WebSocket support in Istio works well once you handle the timeout issue. The biggest thing to remember is that WebSocket connections are fundamentally different from request-response HTTP, so features like retries and timeouts need different settings.
