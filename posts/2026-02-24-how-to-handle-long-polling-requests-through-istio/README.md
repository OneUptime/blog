# How to Handle Long-Polling Requests Through Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Long Polling, Timeout Configuration, Real-Time, Kubernetes

Description: How to configure Istio for long-polling requests including timeout adjustments, connection pool settings, load balancing, and retry behavior for real-time applications.

---

Long polling is a technique where the client sends an HTTP request and the server holds it open until new data is available or a timeout occurs. It is used by applications like chat systems, notification services, and dashboards that need near-real-time updates without WebSockets or SSE. The problem is that Istio's default timeout settings will kill these long-held connections before the server is ready to respond.

## How Long Polling Works

The typical long-polling flow:

1. Client sends an HTTP request (usually GET)
2. Server checks for new data
3. If data is available, it responds immediately
4. If no data is available, the server holds the request for 30-60 seconds
5. If the timeout expires without data, the server sends an empty response
6. The client immediately sends a new request

This cycle repeats continuously. The challenge with Istio is that step 4 looks like a hanging request to the proxy. Envoy's default timeouts (particularly the 15-second route timeout) will terminate the request before the server gets a chance to respond.

## The Core Problem: Route Timeout

Istio's default route timeout is 15 seconds (set by Istio, not Envoy). For regular API calls this is fine, but long polling requires the request to be held for 30 seconds or more. When the timeout fires, Envoy returns a 504 Gateway Timeout to the client.

## Adjusting VirtualService Timeout

The first and most important change is extending the route timeout:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: polling-service
  namespace: default
spec:
  hosts:
    - polling-service
  http:
    - match:
        - uri:
            prefix: /poll
      route:
        - destination:
            host: polling-service
            port:
              number: 8080
      timeout: 120s
    - route:
        - destination:
            host: polling-service
            port:
              number: 8080
      timeout: 15s
```

This sets a 120-second timeout for the long-polling endpoint and keeps the default 15-second timeout for everything else. The timeout should be longer than the server's long-poll hold time. If your server holds requests for 60 seconds, set the timeout to at least 90 seconds to allow for network latency and processing time.

## Stream Idle Timeout

The stream idle timeout is another timeout that can terminate long-polling requests:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: polling-idle-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: polling-service
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
            stream_idle_timeout: 300s
```

The stream idle timeout triggers when no data flows in either direction on a stream. During a long-poll hold, no data is flowing, so this timeout is very relevant. Set it higher than your long-poll hold time.

For the outbound direction (if the long-polling service calls another service that uses long polling):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: outbound-polling-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
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
            stream_idle_timeout: 300s
```

## Gateway Timeout Configuration

If long-polling traffic enters through the Istio gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: polling-gateway-routes
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - match:
        - uri:
            prefix: /poll
      route:
        - destination:
            host: polling-service
            port:
              number: 8080
      timeout: 120s
    - route:
        - destination:
            host: web-service
            port:
              number: 8080
```

And the gateway-level EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-long-poll
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
            stream_idle_timeout: 300s
```

## Retry Configuration

Retries on long-polling requests need special attention:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: polling-service
  namespace: default
spec:
  hosts:
    - polling-service
  http:
    - match:
        - uri:
            prefix: /poll
      route:
        - destination:
            host: polling-service
            port:
              number: 8080
      timeout: 120s
      retries:
        attempts: 1
        perTryTimeout: 120s
        retryOn: "connect-failure,reset"
```

Key points:

- `perTryTimeout` must be at least as long as the route timeout, otherwise the retry timeout will fire before the route timeout
- Only retry on connection failures and resets, not on 5xx errors. A long-poll timeout returning an empty response might look like a 5xx to some implementations
- Keep `attempts` low. Retrying a 60-second long-poll request means potentially holding the connection for 120 seconds before giving up

## Connection Pool Settings

Long-polling connections are held open for extended periods, so you need enough connection capacity:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: polling-service
  namespace: default
spec:
  host: polling-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 5000
        connectTimeout: 5s
        tcpKeepalive:
          probes: 3
          time: 60s
          interval: 30s
      http:
        http2MaxRequests: 5000
        maxRequestsPerConnection: 100
    loadBalancer:
      simple: LEAST_REQUEST
```

The `maxConnections` needs to handle all concurrent long-polling clients. If you have 2000 clients each holding one long-poll connection, you need at least 2000 connections available.

TCP keepalive is important for long-polling because the connections sit idle (from a TCP perspective) for extended periods. Without keepalive, intermediate network devices (firewalls, NATs, load balancers) might close idle connections.

## Load Balancing

Long-polling creates connection affinity issues similar to SSE. Each client maintains a persistent connection to one backend pod. Use `LEAST_REQUEST` to distribute new connections evenly:

```yaml
trafficPolicy:
  loadBalancer:
    simple: LEAST_REQUEST
```

If your application requires session affinity (clients need to reconnect to the same pod), use consistent hashing:

```yaml
trafficPolicy:
  loadBalancer:
    consistentHash:
      httpHeaderName: x-session-id
```

## Handling Rolling Updates

During a rolling deployment, pods get replaced one at a time. Long-polling connections on the old pod need to be drained:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: polling-service
spec:
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 90s
          terminationDrainDuration: 30s
    spec:
      terminationGracePeriodSeconds: 120
      containers:
        - name: polling-app
          image: polling-service:latest
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
```

The `drainDuration` gives the proxy time to finish serving existing long-poll requests before shutting down. The `terminationGracePeriodSeconds` should be longer than the drain duration. The `preStop` hook gives other components time to remove the pod from service before it starts draining.

## Outlier Detection

Be careful with outlier detection for long-polling services. A pod that frequently returns empty responses (normal for long polling) might look like it is failing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: polling-service
  namespace: default
spec:
  host: polling-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 10
      consecutiveGatewayErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 10
```

Set `consecutive5xxErrors` high enough that normal long-poll timeout responses (which should be 200 or 204, not 5xx) do not trigger ejection. Only eject on actual errors.

## Testing Long Polling

Verify the configuration works:

```bash
# Test a long-poll request (should hold for server's timeout, e.g., 60 seconds)
time curl -v http://polling-service:8080/poll

# Test through the gateway
time curl -v https://app.example.com/poll

# Test with timeout longer than the poll duration
timeout 120 curl -v http://polling-service:8080/poll

# Test multiple concurrent long-poll connections
for i in $(seq 1 10); do
  curl -s http://polling-service:8080/poll &
done
wait
```

## Complete Configuration

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: polling-service
  namespace: default
spec:
  hosts:
    - polling-service
  http:
    - match:
        - uri:
            prefix: /poll
      route:
        - destination:
            host: polling-service
            port:
              number: 8080
      timeout: 120s
      retries:
        attempts: 1
        perTryTimeout: 120s
        retryOn: "connect-failure,reset"
    - route:
        - destination:
            host: polling-service
            port:
              number: 8080
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: polling-service
  namespace: default
spec:
  host: polling-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 5000
        tcpKeepalive:
          probes: 3
          time: 60s
          interval: 30s
      http:
        http2MaxRequests: 5000
    loadBalancer:
      simple: LEAST_REQUEST
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 30s
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: polling-timeouts
  namespace: default
spec:
  workloadSelector:
    labels:
      app: polling-service
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
            stream_idle_timeout: 300s
```

Long polling through Istio is straightforward once you adjust the timeouts. The main things to remember are: extend the route timeout beyond your server's hold time, increase the stream idle timeout, size your connection pools for long-lived connections, and configure TCP keepalive to prevent intermediate devices from closing idle connections.
