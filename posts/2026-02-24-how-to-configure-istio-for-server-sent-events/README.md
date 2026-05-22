# How to Configure Istio for Server-Sent Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Server-Sent Event, SSE, Kubernetes, Envoy, Streaming

Description: A practical guide to configuring Istio for Server-Sent Events (SSE) including timeout tuning, buffering issues, and VirtualService configuration for long-lived HTTP streams.

---

Server-Sent Events (SSE) is a straightforward way to push real-time updates from a server to a browser over a single HTTP connection. Unlike WebSockets, SSE is unidirectional and works over plain HTTP/1.1 (or HTTP/2). It sounds simple, but when you throw Istio into the mix, there are a few configuration details that you need to get right or your SSE streams will drop unexpectedly.

## How SSE Works at the Protocol Level

An SSE connection starts as a regular HTTP GET request. The client may send a request with `Accept: text/event-stream`, and the server responds with `Content-Type: text/event-stream`. With HTTP/1.1 this is commonly sent as a chunked response; with HTTP/2 there is no `Transfer-Encoding: chunked` header because HTTP/2 has its own framing. The connection stays open, and the server sends events as they happen, each formatted as a `data:` line followed by a blank line.

From Envoy's perspective, this is a long-lived HTTP response stream. There is no protocol upgrade like with WebSockets. The connection stays at the HTTP layer the entire time, which means HTTP-level features like headers, routing, and (unfortunately) timeouts all remain active.

## The Timeout Problem

The number one issue with SSE in Istio is timeouts. Envoy has several timeout settings that can kill your SSE connection:

- **Route timeout**: Envoy's native route timeout expects a complete response within a certain time window. Istio disables HTTP route timeouts by default, but if you configure one explicitly or inherit one from mesh policy, it is not compatible with SSE because the response never "completes" while the server keeps sending events.
- **Connection idle timeout**: If there are no active requests or streams on a pooled connection, Envoy may close that connection.
- **Stream idle timeout**: If there is a gap between events on an active SSE response stream, Envoy may consider the stream idle and reset it.

You need to address all of these. The route timeout is the most critical one when it has been configured.

## VirtualService Configuration

Here is how to configure a VirtualService for an SSE endpoint with proper timeout handling:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: sse-app
  namespace: default
spec:
  hosts:
    - sse-app.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /events
      timeout: 0s
      route:
        - destination:
            host: sse-app.default.svc.cluster.local
            port:
              number: 8080
```

Setting `timeout: 0s` keeps the route timeout disabled. This tells Envoy not to enforce any deadline on the response, which is exactly what you want for an SSE stream that could run for hours or days.

## DestinationRule for Connection Pool Idle Timeout

The route timeout handles one part of the problem, but you may also need to deal with connection pool idle timeouts. A DestinationRule can configure the upstream HTTP connection pool idle timeout:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: sse-app
  namespace: default
spec:
  host: sse-app.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 30s
      http:
        idleTimeout: 0s
```

This setting controls idle pooled upstream HTTP connections, not the per-stream gap between SSE events while a request is active. For quiet SSE streams, make sure your application sends heartbeat events more frequently than any HTTP stream idle timeout in your Envoy configuration. A common pattern is to send a comment line (starting with `:`) every 30 seconds as a keepalive:

```text
: keepalive

data: {"event": "update", "value": 42}

: keepalive

```

## Service Port Naming

Just like with any HTTP-based protocol in Istio, your Service port must be named correctly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sse-app
  namespace: default
spec:
  selector:
    app: sse-app
  ports:
    - name: http
      port: 8080
      targetPort: 8080
      protocol: TCP
```

The `http` prefix in the port name tells Istio to use the HTTP filter chain. If you name it `tcp` or leave it unnamed, Istio may treat the traffic as opaque TCP, and your routing rules will not work.

## Gateway Configuration for External SSE

Exposing SSE through an Istio ingress gateway requires the same timeout considerations:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: sse-gateway
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
        credentialName: sse-tls-cert
      hosts:
        - sse.example.com
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: sse-app-external
  namespace: default
spec:
  hosts:
    - sse.example.com
  gateways:
    - sse-gateway
  http:
    - match:
        - uri:
            prefix: /events
      timeout: 0s
      route:
        - destination:
            host: sse-app.default.svc.cluster.local
            port:
              number: 8080
```

Remember that the `timeout: 0s` needs to be on the VirtualService bound to the gateway, not just on the internal mesh VirtualService.

## Buffering and Flushing

One issue that is not strictly an Istio problem but shows up more often when using a service mesh is response buffering. Envoy can buffer response data before forwarding it to the client. For SSE, you want events delivered immediately, not buffered.

Most of the time, Envoy streams chunked responses without buffering, but if you are seeing delayed events, check that your application is explicitly flushing after each event. In Go, for example:

```go
flusher, ok := w.(http.Flusher)
if ok {
    flusher.Flush()
}
```

In Node.js:

```javascript
res.write(`data: ${JSON.stringify(event)}\n\n`);
res.flush(); // if using compression middleware
```

If you are using gzip compression in your Envoy config, that can also introduce buffering. Consider disabling compression for your SSE endpoint or setting a very small buffer size.

## HTTP/2 and SSE

Istio can use HTTP/2 between proxies when the service protocol or the mesh `h2UpgradePolicy` enables it. SSE works fine over HTTP/2 since each SSE stream maps to a single HTTP/2 stream. However, be aware that HTTP/2 has its own flow control mechanisms that can affect delivery of small events.

If HTTP/1.1 traffic is being upgraded and you are running into issues, you can opt out of the upgrade for the sidecar-to-application hop using a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: sse-app-h1
  namespace: default
spec:
  host: sse-app.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
```

This keeps HTTP/1.1 traffic from being upgraded to HTTP/2, which can sometimes be more predictable for SSE workloads.

## Retries and SSE

Do not configure retries on SSE routes. The initial request that establishes the SSE connection should not be retried by the proxy, because the client-side EventSource API already handles reconnection. If Envoy retries and both requests succeed, you end up with duplicate event streams.

If you have a VirtualService that mixes SSE and regular API routes, keep them in separate route rules:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app
  namespace: default
spec:
  hosts:
    - app.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /events
      timeout: 0s
      route:
        - destination:
            host: app.default.svc.cluster.local
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api
      retries:
        attempts: 3
        perTryTimeout: 5s
      route:
        - destination:
            host: app.default.svc.cluster.local
            port:
              number: 8080
```

## Monitoring SSE Connections

You can monitor active SSE connections through Envoy stats:

```bash
kubectl exec -it deploy/sse-app -c istio-proxy -- \
  pilot-agent request GET stats | grep downstream_cx_active
```

And check for connection resets or timeouts:

```bash
kubectl exec -it deploy/sse-app -c istio-proxy -- \
  pilot-agent request GET stats | grep -E "(cx_destroy|timeout)"
```

If you see a lot of `cx_destroy_remote_with_active_rq`, that means the remote peer closed connections while there were still active requests (your SSE streams). This can point to a timeout or idle-close behavior somewhere on the path, such as a client, load balancer, or upstream service.

## Summary

SSE in Istio works well once you handle the timeout configuration. The key settings are `timeout: 0s` on any VirtualService routes where a timeout might otherwise apply, appropriate connection pool idle timeout settings, and proper port naming on your Service. Make sure your application sends keepalive comments during quiet periods, and avoid configuring retries on SSE routes. With these settings in place, your SSE streams should stay connected reliably through the mesh.
