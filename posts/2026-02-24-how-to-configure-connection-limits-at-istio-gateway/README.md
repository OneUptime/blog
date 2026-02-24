# How to Configure Connection Limits at Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Limits, Gateway, Rate Limiting, Kubernetes

Description: How to configure TCP connection limits and HTTP request limits at the Istio ingress gateway to protect backend services from overload and denial of service.

---

Without connection limits, a single misbehaving client can open thousands of connections to your gateway and exhaust resources. Or a traffic spike from a viral post can overwhelm your backend services. Connection limits at the Istio gateway are your first line of defense against overload, whether it is accidental or intentional.

There are several types of limits you can configure: TCP connection limits, HTTP request limits, rate limits per client, and global throughput limits.

## TCP Connection Limits

The most basic limit is the total number of TCP connections the gateway accepts. You configure this through an EnvoyFilter on the gateway's listener:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-connection-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: LISTENER
      match:
        context: GATEWAY
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 32768
          connection_balance_config:
            exact_balance: {}
```

For limiting the actual number of connections, use the connection limit filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: connection-limit-filter
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
        operation: INSERT_BEFORE
        value:
          name: "envoy.filters.network.connection_limit"
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.connection_limit.v3.ConnectionLimit
            stat_prefix: gateway_connection_limit
            max_connections: 10000
            delay: 0s
```

This limits the gateway to 10,000 concurrent TCP connections. New connections beyond this limit are rejected immediately.

## HTTP Concurrent Streams Limit

For HTTP/2 connections, a single TCP connection can carry many concurrent streams (requests). Limit the number of concurrent streams per connection:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: http2-stream-limit
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
            http2_protocol_options:
              max_concurrent_streams: 100
            common_http_protocol_options:
              max_requests_per_connection: 1000
              idle_timeout: 300s
              max_stream_duration: 300s
```

Key settings:

- `max_concurrent_streams: 100` - Max 100 concurrent HTTP/2 streams per connection
- `max_requests_per_connection: 1000` - Close the connection after 1000 requests (forces clients to reconnect)
- `idle_timeout: 300s` - Close idle connections after 5 minutes
- `max_stream_duration: 300s` - Maximum time a single stream (request/response) can last

## Upstream Connection Limits via DestinationRule

To protect your backend services from the gateway sending too much traffic, set connection limits in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-service-dr
  namespace: default
spec:
  host: backend-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
        maxRequestsPerConnection: 50
```

When these limits are reached, additional requests get a 503 with the `UO` (upstream overflow) response flag. This is the bulkhead pattern in action, preventing one backend from consuming all the gateway's resources.

## Per-Client Rate Limiting

To prevent a single client from consuming too much capacity, implement per-client rate limiting:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-client-rate-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            value:
              stat_prefix: gateway_rate_limit
              token_bucket:
                max_tokens: 1000
                tokens_per_fill: 100
                fill_interval: 1s
              filter_enabled:
                runtime_key: local_rate_limit_enabled
                default_value:
                  numerator: 100
                  denominator: HUNDRED
              filter_enforced:
                runtime_key: local_rate_limit_enforced
                default_value:
                  numerator: 100
                  denominator: HUNDRED
              response_headers_to_add:
                - append_action: OVERWRITE_IF_EXISTS_OR_ADD
                  header:
                    key: x-ratelimit-limit
                    value: "1000"
                - append_action: OVERWRITE_IF_EXISTS_OR_ADD
                  header:
                    key: x-ratelimit-remaining
                    value: "0"
```

This implements a local rate limiter on each gateway pod. The token bucket starts with 1000 tokens and refills at 100 tokens per second. When a client exceeds the limit, they get a 429 Too Many Requests response.

Note that this is a per-pod limit. If you have 3 gateway replicas, the effective global limit is 3x the configured value.

## Global Rate Limiting

For precise, global rate limiting across all gateway pods, you need an external rate limit service. Envoy supports this through the `ratelimit` filter.

Deploy the rate limit service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ratelimit
  template:
    metadata:
      labels:
        app: ratelimit
    spec:
      containers:
        - name: ratelimit
          image: envoyproxy/ratelimit:master
          env:
            - name: USE_STATSD
              value: "false"
            - name: RUNTIME_ROOT
              value: /data
            - name: RUNTIME_SUBDIRECTORY
              value: ratelimit
            - name: REDIS_SOCKET_TYPE
              value: tcp
            - name: REDIS_URL
              value: redis.default.svc.cluster.local:6379
          ports:
            - containerPort: 8080
            - containerPort: 8081
          volumeMounts:
            - name: config
              mountPath: /data/ratelimit/config
      volumes:
        - name: config
          configMap:
            name: ratelimit-config
---
apiVersion: v1
kind: Service
metadata:
  name: ratelimit
  namespace: default
spec:
  selector:
    app: ratelimit
  ports:
    - name: http
      port: 8080
    - name: grpc
      port: 8081
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: default
data:
  config.yaml: |
    domain: gateway-ratelimit
    descriptors:
      - key: remote_address
        rate_limit:
          unit: minute
          requests_per_unit: 100
      - key: path
        value: "/api/search"
        rate_limit:
          unit: second
          requests_per_unit: 10
```

This configuration limits each IP address to 100 requests per minute and the search endpoint to 10 requests per second globally.

## Connection Draining

When you need to scale down or update the gateway, you want existing connections to finish gracefully. Configure connection draining:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: drain-config
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: LISTENER
      match:
        context: GATEWAY
      patch:
        operation: MERGE
        value:
          drain_type: MODIFY_ONLY
```

And set the termination drain duration on the Istio installation:

```bash
istioctl install --set meshConfig.defaultConfig.terminationDrainDuration=30s
```

This gives 30 seconds for existing connections to complete before the gateway pod is terminated.

## Monitoring Connection Metrics

Track connection metrics to understand your capacity:

```promql
# Active connections at the gateway
envoy_server_total_connections{pod=~"istio-ingressgateway.*"}

# Connection rate
sum(rate(envoy_cluster_upstream_cx_total{pod=~"istio-ingressgateway.*"}[5m]))

# Connection overflow (limits hit)
sum(rate(envoy_cluster_upstream_rq_pending_overflow{pod=~"istio-ingressgateway.*"}[5m]))

# HTTP/2 active streams
envoy_cluster_upstream_rq_active{pod=~"istio-ingressgateway.*"}

# Rate limit denials
sum(rate(envoy_http_local_rate_limit_rate_limited{pod=~"istio-ingressgateway.*"}[5m]))
```

Set up alerts for when you are approaching your limits:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gateway-connection-alerts
spec:
  groups:
    - name: gateway.connections
      rules:
        - alert: HighConnectionCount
          expr: |
            envoy_server_total_connections{pod=~"istio-ingressgateway.*"} > 8000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Gateway connection count approaching limit"
        - alert: HighRateLimitDenials
          expr: |
            sum(rate(envoy_http_local_rate_limit_rate_limited[5m])) > 10
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "High rate of rate-limited requests"
```

## Sizing Your Gateway

Connection limits need to match your gateway pod resources. A rough guideline:

- Each TCP connection uses about 30-50 KB of memory in Envoy
- 10,000 connections need roughly 300-500 MB of memory
- Each active HTTP request uses additional memory for buffering

Size your gateway deployment accordingly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: istio-proxy
          resources:
            requests:
              cpu: "1"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "2Gi"
```

## Summary

Connection limits at the Istio gateway protect your infrastructure from overload. Configure TCP connection limits to cap the total number of connections, HTTP/2 stream limits to prevent stream exhaustion, and upstream connection pools via DestinationRule to protect backend services. Use local rate limiting for per-pod limits and an external rate limit service for global limits. Monitor connection metrics to understand your actual capacity and set alerts before you hit the limits. Size your gateway pods with enough memory to handle the connection count you have configured.
