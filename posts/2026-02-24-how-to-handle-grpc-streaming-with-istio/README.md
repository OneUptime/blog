# How to Handle gRPC Streaming with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, gRPC, Streaming, Kubernetes, HTTP/2

Description: Learn how to configure Istio for gRPC streaming workloads including server streaming, client streaming, and bidirectional streaming RPCs.

---

gRPC supports four communication patterns: unary, server streaming, client streaming, and bidirectional streaming. Unary calls are straightforward and work with Istio out of the box. Streaming is where things get interesting. Long-lived streams behave differently from short request-response cycles, and Istio's default settings are not always a perfect fit.

## How gRPC Streaming Works Over HTTP/2

Under the hood, gRPC streaming uses HTTP/2 streams. Each RPC is a single HTTP/2 stream, and frames carry the messages back and forth:

- **Server streaming** - client sends one request, server sends multiple responses on the same stream
- **Client streaming** - client sends multiple requests, server sends one response
- **Bidirectional streaming** - both sides send messages independently on the same stream

Since Envoy understands HTTP/2, it can proxy all of these. But there are timeout, buffering, and load balancing considerations that differ from unary calls.

## Basic Service Setup

First, make sure your Kubernetes Service uses the correct port naming:

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
      port: 50051
      targetPort: 50051
```

The `grpc` port name is critical. Without it, Istio treats the traffic as opaque TCP and you lose L7 features.

## Timeout Configuration for Streams

The biggest issue with gRPC streaming through Istio is timeouts. The default route timeout can kill long-lived streams. You need to disable the route timeout for streaming RPCs:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: streaming-service
  namespace: default
spec:
  hosts:
    - streaming-service.default.svc.cluster.local
  http:
    - match:
        - headers:
            ":path":
              prefix: "/mypackage.StreamService/ServerStream"
      route:
        - destination:
            host: streaming-service.default.svc.cluster.local
      timeout: 0s
    - match:
        - headers:
            ":path":
              prefix: "/mypackage.StreamService/BidiStream"
      route:
        - destination:
            host: streaming-service.default.svc.cluster.local
      timeout: 0s
    - route:
        - destination:
            host: streaming-service.default.svc.cluster.local
      timeout: 10s
```

Setting `timeout: 0s` disables the route timeout for the streaming methods while keeping a 10-second timeout for unary methods. This is the most common configuration pattern for services that mix streaming and unary RPCs.

## Idle Timeout Settings

Even with route timeouts disabled, you need to think about idle timeouts. If no data flows on a stream for a while, Envoy might close it. Configure idle timeouts through the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: streaming-service
  namespace: default
spec:
  host: streaming-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        idleTimeout: 3600s
        h2UpgradePolicy: UPGRADE
      tcp:
        connectTimeout: 10s
```

Setting `idleTimeout: 3600s` keeps idle connections open for an hour. Adjust this based on your streaming patterns. If your streams can have long gaps between messages, set this high enough to avoid premature closure.

## Keepalive Configuration

HTTP/2 keepalive pings prevent intermediate proxies and load balancers from closing idle connections. Your gRPC client and server should send keepalive pings, and Envoy needs to be configured to allow them.

If your gRPC client sends keepalive pings, Envoy might reject them if they are too frequent. You can adjust this through an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: streaming-keepalive
  namespace: default
spec:
  workloadSelector:
    labels:
      app: streaming-service
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
      patch:
        operation: MERGE
        value:
          typed_extension_protocol_options:
            envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
              "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
              explicit_http_config:
                http2_protocol_options:
                  connection_keepalive:
                    interval: 30s
                    timeout: 5s
```

This tells Envoy to send keepalive pings every 30 seconds with a 5-second timeout.

## Load Balancing Considerations

For streaming RPCs, load balancing works differently than for unary calls. A streaming RPC is a single HTTP/2 stream, and once it starts, all messages go to the same backend pod. Envoy makes the load balancing decision when the stream starts, not per-message.

This means that if you have long-lived bidirectional streams, traffic can become unbalanced. A pod that started streams earlier will have more active streams than newly scaled pods.

There is no perfect solution for this. Some options:

1. Keep streams short and reconnect periodically
2. Use `LEAST_REQUEST` balancing so new streams go to less-loaded pods
3. Implement client-side logic to reconnect streams on a schedule

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: streaming-service
  namespace: default
spec:
  host: streaming-service.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

## Retries and Streaming

Retries do not work well with streaming RPCs. If a server-streaming RPC fails midway through, retrying means restarting from the beginning. The client would get duplicate messages for the data already received.

For streaming methods, it is usually best to disable retries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: streaming-service
  namespace: default
spec:
  hosts:
    - streaming-service.default.svc.cluster.local
  http:
    - match:
        - headers:
            ":path":
              prefix: "/mypackage.StreamService/ServerStream"
      route:
        - destination:
            host: streaming-service.default.svc.cluster.local
      timeout: 0s
      retries:
        attempts: 0
    - route:
        - destination:
            host: streaming-service.default.svc.cluster.local
      timeout: 10s
      retries:
        attempts: 3
        retryOn: unavailable
```

## Flow Control and Backpressure

gRPC uses HTTP/2 flow control for backpressure. If the receiver is slow, the sender gets backpressured through HTTP/2 window updates. Envoy respects this mechanism, but there are buffer limits to be aware of.

The default Envoy per-stream buffer limit is 1MB. For high-throughput streams, you might need to increase this:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: stream-buffer
  namespace: default
spec:
  workloadSelector:
    labels:
      app: streaming-service
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 10485760
```

## Monitoring Streaming RPCs

Streaming RPCs show up differently in metrics. A server-streaming RPC counts as one request in `istio_requests_total`, even if it sends thousands of messages. To get per-message metrics, you need application-level instrumentation.

However, you can monitor stream duration and connection counts:

```bash
# Check active streams
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "downstream_rq_active"

# Check HTTP/2 stream counts
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "http2.streams_active"
```

## Debugging Streaming Issues

When streams break unexpectedly, check these things:

```bash
# Look for stream reset reasons
kubectl logs <pod-name> -c istio-proxy | grep "stream_reset"

# Check for connection closures
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "cx_destroy"
```

Common issues include:
- Route timeout killing the stream (fix: set `timeout: 0s`)
- Idle timeout closing inactive streams (fix: increase `idleTimeout`)
- Keepalive pings being rejected (fix: adjust keepalive settings)
- Max concurrent streams limit being hit (default is 2147483647, which is effectively unlimited)

Streaming with gRPC through Istio works well once you get the timeouts right. The key is to treat streaming methods differently from unary methods in your Istio configuration and make sure idle connections are not being prematurely closed.
