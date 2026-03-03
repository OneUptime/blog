# How to Configure Server-Sent Events (SSE) Through Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Server-Sent Events, SSE, Streaming, Kubernetes

Description: How to configure Istio to properly handle Server-Sent Events including timeout settings, buffering, load balancing, and connection management for SSE streams.

---

Server-Sent Events (SSE) is a standard for pushing data from server to client over a single HTTP connection. Unlike WebSockets, SSE is unidirectional - the server sends events and the client listens. It uses regular HTTP, which makes it simpler than WebSockets but creates some challenges with proxies like Envoy that expect request-response cycles. This post covers how to configure Istio so SSE works reliably.

## How SSE Works

A client opens an HTTP connection and the server responds with `Content-Type: text/event-stream`. Instead of sending a complete response and closing the connection, the server keeps the connection open and periodically sends events in a specific format:

```text
data: {"temperature": 72.5, "unit": "F"}

data: {"temperature": 73.1, "unit": "F"}

event: alert
data: {"message": "Temperature threshold exceeded"}

```

Each event is separated by a blank line. The connection stays open indefinitely (or until the client disconnects).

## The Problem with Default Istio Settings

With default Istio configuration, SSE connections will get terminated after about 5 minutes due to the `stream_idle_timeout`. Even though data is flowing from server to client, Envoy may consider the stream "idle" from the request perspective since the client is not sending any data.

Additionally, the response buffering behavior in Envoy can cause events to be delayed rather than delivered immediately.

## Adjusting Stream Timeouts

The most critical setting for SSE is the stream idle timeout:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: sse-timeouts
  namespace: default
spec:
  workloadSelector:
    labels:
      app: sse-service
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
```

Setting `stream_idle_timeout` to `0s` disables the idle timeout entirely. This allows SSE connections to stay open as long as needed.

If you do not want to disable the timeout completely (which could lead to resource leaks from abandoned connections), set it to a long duration:

```yaml
stream_idle_timeout: 3600s
```

This gives SSE connections up to 1 hour before they time out from inactivity.

## VirtualService Timeout

The VirtualService timeout also applies to SSE connections. Disable or extend it for SSE routes:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: sse-routes
  namespace: default
spec:
  hosts:
    - sse-service
  http:
    - match:
        - uri:
            prefix: /events
      route:
        - destination:
            host: sse-service
            port:
              number: 8080
      timeout: 0s
    - route:
        - destination:
            host: sse-service
            port:
              number: 8080
```

Setting `timeout: 0s` disables the route-level timeout for the SSE endpoint. Other routes can keep their normal timeouts.

## Gateway Configuration for SSE

If SSE traffic enters through the Istio gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-sse-timeout
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
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            stream_idle_timeout: 0s
```

Note: setting this on the gateway affects ALL traffic through the gateway. To target only specific routes, you would need to use per-route configuration or a more specific listener match.

## Disabling Response Buffering

Envoy can buffer response data, which delays SSE event delivery. Make sure response buffering is not interfering:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: sse-no-buffer
  namespace: default
spec:
  workloadSelector:
    labels:
      app: sse-service
  configPatches:
    - applyTo: HTTP_ROUTE
      match:
        context: SIDECAR_INBOUND
        routeConfiguration:
          vhost:
            route:
              action: ANY
      patch:
        operation: MERGE
        value:
          typed_per_filter_config:
            envoy.filters.http.buffer:
              "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.BufferPerRoute
              disabled: true
```

This disables the buffer filter for SSE routes, ensuring events are streamed through immediately.

## Load Balancing for SSE

SSE connections are long-lived, which creates a problem with load balancing. If you have multiple replicas of your SSE service, connections get "stuck" on specific pods. New events always come from the pod the client is connected to.

To distribute connections more evenly:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: sse-service
  namespace: default
spec:
  host: sse-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      http:
        maxRequestsPerConnection: 1
```

`LEAST_REQUEST` load balancing sends new connections to the pod with the fewest active connections. `maxRequestsPerConnection: 1` prevents HTTP keep-alive from reusing connections, ensuring each SSE stream gets its own connection decision.

However, be aware that once an SSE connection is established, it stays on that pod for its lifetime. Load balancing only affects new connections.

## Retry Configuration

SSE connections should not be retried at the proxy level. Clients typically implement their own reconnection logic using the `EventSource` API:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: sse-routes
  namespace: default
spec:
  hosts:
    - sse-service
  http:
    - match:
        - uri:
            prefix: /events
      route:
        - destination:
            host: sse-service
            port:
              number: 8080
      timeout: 0s
      retries:
        attempts: 0
```

Disabling retries prevents Envoy from holding the connection while trying to reconnect to a failed upstream.

## Connection Draining

When a pod is shutting down (during a deployment rollout, for example), SSE connections need to be drained gracefully:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sse-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 60s
          terminationDrainDuration: 30s
    spec:
      terminationGracePeriodSeconds: 90
      containers:
        - name: sse-app
          image: sse-service:latest
```

The `drainDuration` gives existing SSE connections time to finish or reconnect before the proxy shuts down. The `terminationGracePeriodSeconds` on the pod should be longer than the drain duration.

## Circuit Breaking

Long-lived SSE connections count toward connection limits. Adjust the DestinationRule to accommodate:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: sse-service
  namespace: default
spec:
  host: sse-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10000
      http:
        http2MaxRequests: 10000
        maxRequestsPerConnection: 1
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 30s
```

The `maxConnections` and `http2MaxRequests` values should be high enough to handle all expected SSE connections plus normal API traffic. If these limits are too low, new SSE connections will be rejected.

## Testing SSE Through Istio

Test that SSE works correctly:

```bash
# Basic SSE test
curl -N -H "Accept: text/event-stream" http://sse-service/events

# With timeout verification (should not disconnect)
timeout 600 curl -N -H "Accept: text/event-stream" http://sse-service/events

# Through the gateway
curl -N -H "Accept: text/event-stream" https://app.example.com/events
```

The `-N` flag in curl disables output buffering, which is needed to see SSE events as they arrive.

## Monitoring SSE Connections

```bash
# Check active connections
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep cx_active

# Check for connection timeouts
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep timeout

# Watch for stream resets
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep downstream_rq_rx_reset
```

## Complete SSE Configuration

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: sse-service
  namespace: default
spec:
  hosts:
    - sse-service
  http:
    - match:
        - uri:
            prefix: /events
      route:
        - destination:
            host: sse-service
            port:
              number: 8080
      timeout: 0s
      retries:
        attempts: 0
    - route:
        - destination:
            host: sse-service
            port:
              number: 8080
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: sse-service
  namespace: default
spec:
  host: sse-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      tcp:
        maxConnections: 10000
      http:
        http2MaxRequests: 10000
        maxRequestsPerConnection: 1
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: sse-config
  namespace: default
spec:
  workloadSelector:
    labels:
      app: sse-service
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
```

SSE through Istio works well once you address the timeout and buffering issues. The key settings are disabling the stream idle timeout and the route timeout for SSE endpoints while keeping them active for your regular API routes.
