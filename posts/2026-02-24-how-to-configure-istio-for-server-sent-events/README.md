# How to Configure Istio for Server-Sent Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Server-Sent Events, SSE, Kubernetes, Envoy, Streaming

Description: A practical guide to configuring Istio for Server-Sent Events (SSE) including timeout tuning, buffering issues, and VirtualService configuration for long-lived HTTP streams.

---

Server-Sent Events (SSE) is a straightforward way to push real-time updates from a server to a browser over a single HTTP connection. Unlike WebSockets, SSE is unidirectional and works over plain HTTP/1.1 (or HTTP/2). It sounds simple, but when you throw Istio into the mix, there are a few configuration details that you need to get right or your SSE streams will drop unexpectedly.

## How SSE Works at the Protocol Level

An SSE connection starts as a regular HTTP GET request. The client sends a request with `Accept: text/event-stream`, and the server responds with `Content-Type: text/event-stream` and a `Transfer-Encoding: chunked` header. The connection stays open, and the server sends events as they happen, each formatted as a `data:` line followed by two newlines.

From Envoy's perspective, this is a long-lived HTTP response with chunked transfer encoding. There is no protocol upgrade like with WebSockets. The connection stays at the HTTP layer the entire time, which means HTTP-level features like headers, routing, and (unfortunately) timeouts all remain active.

## The Timeout Problem

The number one issue with SSE in Istio is timeouts. Envoy has several timeout settings that can kill your SSE connection:

- **Route timeout**: By default, Envoy expects a complete response within a certain time window. For SSE, the response never "completes" because the server keeps sending events.
- **Idle timeout**: If there is a gap between events, Envoy may consider the connection idle and close it.
- **Stream idle timeout**: Similar to idle timeout but specifically for HTTP streams.

You need to address all of these. The route timeout is the most critical one.

## VirtualService Configuration

Here is how to configure a VirtualService for an SSE endpoint with proper timeout handling:

```yaml
apiVersion: networking.istio.io/v1beta1
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

Setting `timeout: 0s` disables the route timeout entirely. This tells Envoy not to enforce any deadline on the response, which is exactly what you want for an SSE stream that could run for hours or days.

## DestinationRule for Idle Timeout

The route timeout handles one part of the problem, but you also need to deal with idle timeouts. If your SSE endpoint might have long periods between events, configure the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
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

Setting `idleTimeout: 0s` disables the idle timeout. If you prefer not to disable it entirely, set it to something generous like `3600s`. Just make sure your application sends heartbeat events more frequently than this timeout. A common pattern is to send a comment line (starting with `:`) every 30 seconds as a keepalive:

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
apiVersion: networking.istio.io/v1beta1
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
apiVersion: networking.istio.io/v1beta1
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

Istio uses HTTP/2 between sidecars by default. SSE works fine over HTTP/2 since each SSE stream maps to a single HTTP/2 stream. However, be aware that HTTP/2 has its own flow control mechanisms that can affect delivery of small events.

If you are running into issues with HTTP/2, you can force HTTP/1.1 between the sidecar and your application using a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
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

This keeps the connection on HTTP/1.1, which can sometimes be more predictable for SSE workloads.

## Retries and SSE

Do not configure retries on SSE routes. The initial request that establishes the SSE connection should not be retried by the proxy, because the client-side EventSource API already handles reconnection. If Envoy retries and both requests succeed, you end up with duplicate event streams.

If you have a VirtualService that mixes SSE and regular API routes, keep them in separate route rules:

```yaml
apiVersion: networking.istio.io/v1beta1
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

If you see a lot of `cx_destroy_remote_with_active_rq`, that means connections are being closed while there are still active requests (your SSE streams). This usually points to a timeout configuration issue.

## Summary

SSE in Istio works well once you handle the timeout configuration. The key settings are `timeout: 0s` on your VirtualService routes, generous or disabled idle timeouts in your DestinationRule, and proper port naming on your Service. Make sure your application sends keepalive comments during quiet periods, and avoid configuring retries on SSE routes. With these settings in place, your SSE streams should stay connected reliably through the mesh.
