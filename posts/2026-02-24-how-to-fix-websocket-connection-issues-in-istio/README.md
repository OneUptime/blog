# How to Fix WebSocket Connection Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebSocket, Envoy, Networking, Troubleshooting

Description: How to configure Istio to properly handle WebSocket connections and troubleshoot common WebSocket routing problems.

---

WebSocket connections in Istio can be tricky. WebSockets start as an HTTP upgrade request and then switch to a persistent bidirectional connection. Envoy supports this, but the configuration needs to be right or connections will fail during the upgrade handshake, time out unexpectedly, or get silently dropped.

## How WebSockets Work in Envoy

When a client sends a WebSocket connection request, it sends an HTTP request with the `Upgrade: websocket` header. The server responds with HTTP 101 (Switching Protocols) and the connection switches from HTTP to a raw TCP stream.

Envoy handles this by supporting HTTP upgrade in its route configuration. By default, Istio allows WebSocket upgrades, but various configuration options can break this behavior.

## Basic WebSocket VirtualService Configuration

Here's a working VirtualService for a WebSocket backend:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-service-vs
  namespace: my-namespace
spec:
  hosts:
  - "ws.example.com"
  gateways:
  - my-gateway
  http:
  - match:
    - uri:
        prefix: "/ws"
    route:
    - destination:
        host: ws-service.my-namespace.svc.cluster.local
        port:
          number: 8080
```

Istio enables WebSocket upgrades by default on HTTP routes, so you don't need any special annotations for basic WebSocket support.

## Connection Timeouts

WebSocket connections are long-lived. By default, Envoy's idle timeout for HTTP connections might close your WebSocket before the client expects it.

If WebSocket connections drop after about 5 minutes of inactivity, it's the idle timeout. Configure the timeout in your VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-service-vs
  namespace: my-namespace
spec:
  hosts:
  - "ws.example.com"
  gateways:
  - my-gateway
  http:
  - match:
    - uri:
        prefix: "/ws"
    timeout: 0s
    route:
    - destination:
        host: ws-service.my-namespace.svc.cluster.local
        port:
          number: 8080
```

Setting `timeout: 0s` disables the request timeout. For idle timeout, you may need an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ws-idle-timeout
  namespace: my-namespace
spec:
  workloadSelector:
    labels:
      app: ws-service
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager"
          stream_idle_timeout: 3600s
```

This sets the stream idle timeout to 1 hour.

## Upgrade Headers Being Stripped

If the WebSocket upgrade fails with a 400 or 426 response, the Upgrade header might be getting stripped somewhere.

Check if the Ingress Gateway is passing upgrade headers correctly. The Gateway configuration should use HTTP, not HTTPS with TLS termination that might strip headers:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
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
```

For HTTPS with WebSockets, make sure TLS is configured as SIMPLE (not PASSTHROUGH):

```yaml
servers:
- port:
    number: 443
    name: https
    protocol: HTTPS
  hosts:
  - "ws.example.com"
  tls:
    mode: SIMPLE
    credentialName: ws-tls-secret
```

## Load Balancing Issues

WebSocket connections are persistent, so once established, they stick to one backend pod. Standard round-robin load balancing doesn't distribute WebSocket connections evenly.

If you have multiple backend pods and want even distribution of new connections, the default round-robin works for new connections. But if you're using consistent hash load balancing, make sure the hash key makes sense for WebSocket traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-service-dr
  namespace: my-namespace
spec:
  host: ws-service.my-namespace.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
```

## Connection Limits

If too many WebSocket connections overwhelm your service, configure connection limits:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-service-dr
  namespace: my-namespace
spec:
  host: ws-service.my-namespace.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
```

Keep in mind that each WebSocket connection counts as an active TCP connection.

## Retries and WebSockets

HTTP retry policies in VirtualServices don't apply to WebSocket connections once they're upgraded. But the initial upgrade request can be retried if it fails:

```yaml
http:
- match:
  - uri:
      prefix: "/ws"
  retries:
    attempts: 3
    retryOn: connect-failure,reset
  route:
  - destination:
      host: ws-service.my-namespace.svc.cluster.local
```

Be careful with retries on the upgrade request - if the upgrade partially succeeds on the first try, retrying can cause duplicate connections.

## Circuit Breaking with WebSockets

Outlier detection and circuit breaking affect WebSocket connections. If a backend pod gets ejected due to outlier detection, existing WebSocket connections to that pod will be disrupted:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-service-dr
  namespace: my-namespace
spec:
  host: ws-service.my-namespace.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 30s
```

Set conservative thresholds for WebSocket backends to avoid unnecessary ejections.

## Debugging WebSocket Issues

Test the WebSocket connection from inside the cluster:

```bash
kubectl run wscat --image=node:alpine --rm -it --restart=Never -- npx wscat -c ws://ws-service.my-namespace.svc.cluster.local:8080/ws
```

Check the Envoy access logs for the upgrade request:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep "upgrade\|websocket\|101"
```

Look at the response code. 101 means the upgrade succeeded. 400, 403, or 503 mean something is blocking it.

Enable debug logging for the connection manager:

```bash
istioctl proxy-config log <pod-name> -n my-namespace --level connection:debug,http:debug
```

## Sticky Sessions with WebSockets

If your WebSocket service requires session affinity (multiple initial connections from the same client must go to the same pod), use consistent hash load balancing with a header or cookie:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-service-dr
  namespace: my-namespace
spec:
  host: ws-service.my-namespace.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-session-id
```

The client must include the `x-session-id` header in the WebSocket upgrade request.

## Service Port Configuration

Make sure the service port is named correctly for HTTP-based protocols:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ws-service
  namespace: my-namespace
spec:
  ports:
  - name: http-ws
    port: 8080
    targetPort: 8080
```

The port name should start with `http` so Istio treats it as HTTP traffic and supports the WebSocket upgrade. If named as TCP, Istio treats it as raw TCP and HTTP-level features won't work.

## Summary

WebSocket connections work in Istio by default, but timeouts, header stripping, and connection limits can cause problems. Set appropriate timeouts (or disable them with `timeout: 0s`), make sure service ports are named with the `http` prefix, and configure connection pool limits that account for long-lived connections. Use EnvoyFilters for fine-grained idle timeout control, and test WebSocket upgrades from inside the cluster to isolate issues.
