# How to Handle Long-Running Connections in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Long-Running Connections, Timeout, Envoy, Kubernetes

Description: How to configure Istio for long-running connections like streaming, server-sent events, and persistent TCP connections with proper timeout settings.

---

Long-running connections are common in modern applications. Server-sent events (SSE), long-polling, streaming APIs, database connections, and message queue consumers all maintain connections that stay open for minutes, hours, or sometimes days. Istio's default timeout settings assume relatively short-lived request-response interactions, which means long-running connections often get killed prematurely.

If your connections are dying after 15 seconds, a few minutes, or seemingly at random intervals, your Istio timeout configuration probably needs adjustment. There are multiple timeout settings across different Istio resources, and you need to address all of them for long-running connections to survive.

## Understanding the Timeout Stack

When a connection passes through Istio, it encounters several timeout layers:

1. **Route timeout** - Set in VirtualService, defaults to 15s for HTTP routes
2. **Stream idle timeout** - Envoy closes idle streams after this duration (default varies)
3. **Connection idle timeout** - Envoy closes idle TCP connections
4. **Upstream connection timeout** - How long to wait for establishing an upstream connection
5. **TCP keepalive** - Detects dead TCP connections at the OS level

Each of these can independently kill your long-running connection. You need to address all of them.

## Disabling Route Timeout

The most common culprit is the VirtualService route timeout. For long-running connections, set it to `0s`:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: streaming-service
  namespace: default
spec:
  hosts:
    - streaming-service.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /stream
      route:
        - destination:
            host: streaming-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 0s
    - match:
        - uri:
            prefix: /events
      route:
        - destination:
            host: streaming-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 0s
    - route:
        - destination:
            host: streaming-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 30s
```

This configuration disables timeouts for the `/stream` and `/events` paths while keeping a 30-second timeout for regular API calls. Mixing long-running and short-lived routes on the same service is perfectly fine.

## Configuring Stream Idle Timeout

The stream idle timeout closes connections that have no data flowing. For Server-Sent Events, data might not flow for extended periods between events. For long-polling, the connection is intentionally idle until something happens.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: stream-idle-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: streaming-service
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

Setting `stream_idle_timeout: 0s` disables the idle timeout entirely. This means a connection can sit idle forever without being closed by the proxy. Your application should implement its own heartbeat or keepalive mechanism to detect truly dead connections.

If you'd rather not disable it completely, set it to a large value:

```yaml
stream_idle_timeout: 3600s  # 1 hour
```

## Configuring the Client Side

The above settings affect the server-side sidecar. But there's also a client-side sidecar that needs configuration. Apply similar settings for outbound traffic:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: client-stream-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: client-service
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_OUTBOUND
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

If you're using the ingress gateway, apply the settings there too:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-stream-timeout
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
            stream_idle_timeout: 3600s
```

## TCP Keepalives

For long-running TCP connections (databases, message queues), configure keepalives in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: long-running-dr
  namespace: default
spec:
  host: streaming-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 10s
        tcpKeepalive:
          time: 60s
          interval: 20s
          probes: 5
```

The keepalive settings:
- `time: 60s` - Start sending keepalive probes after 60 seconds of idle time
- `interval: 20s` - Send a probe every 20 seconds
- `probes: 5` - Close the connection after 5 failed probes

These settings help detect connections that have been silently dropped by network infrastructure. Without keepalives, a dead connection can sit around indefinitely, consuming resources without doing anything useful.

## Server-Sent Events Configuration

SSE is a common use case for long-running connections. The server sends events over a single HTTP connection that stays open. Here's a complete configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: sse-service
  namespace: default
spec:
  hosts:
    - sse-service.default.svc.cluster.local
  http:
    - match:
        - headers:
            accept:
              exact: text/event-stream
      route:
        - destination:
            host: sse-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 0s
      retries:
        attempts: 0
    - route:
        - destination:
            host: sse-service.default.svc.cluster.local
            port:
              number: 8080
```

Retries are disabled for SSE because retrying a streaming connection doesn't make sense - the client needs to re-establish from its last known event ID.

## gRPC Streaming

gRPC streaming (both server-side and bidirectional) also needs timeout adjustments. gRPC uses HTTP/2, so the same HTTP timeout settings apply:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-streaming
  namespace: default
spec:
  hosts:
    - grpc-stream-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: grpc-stream-service.default.svc.cluster.local
            port:
              number: 50051
      timeout: 0s
```

For gRPC, also consider the max connection age. Some gRPC servers close connections after a certain duration to force clients to reconnect and rebalance. This interacts with Istio's timeout settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-stream-dr
  namespace: default
spec:
  host: grpc-stream-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 0
        maxConcurrentStreams: 100
```

## Handling Rolling Updates

When pods are replaced during a rolling update, long-running connections get disrupted. Istio supports connection draining to handle this gracefully.

The pod's `terminationGracePeriodSeconds` should be long enough for connections to close gracefully:

```yaml
spec:
  terminationGracePeriodSeconds: 300
  containers:
    - name: streaming-service
      image: my-streaming-app:latest
```

And configure the sidecar's drain duration:

```yaml
annotations:
  proxy.istio.io/config: |
    terminationDrainDuration: 120s
```

This gives the sidecar 120 seconds to drain active connections during shutdown. During draining, the sidecar stops accepting new connections but continues serving existing ones.

## Monitoring Long-Running Connections

Track active connections:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "downstream_cx_active\|upstream_cx_active\|downstream_cx_length_ms"
```

The `downstream_cx_length_ms` histogram shows how long connections last. For long-running services, you should see values in the tens of thousands of milliseconds or more.

Check for unexpected connection closures:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "idle_timeout\|max_duration\|cx_destroy_with_active"
```

`cx_destroy_with_active` indicates connections that were closed while there were still active streams. This often points to a timeout that's too aggressive.

Long-running connections in Istio need attention at every layer of the timeout stack. Set route timeouts to `0s`, increase or disable stream idle timeouts, configure TCP keepalives, and don't forget to handle connection draining during deployments. Get all these right and your streaming connections will stay alive as long as they need to.
