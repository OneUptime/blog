# How to Configure API Throttling with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, API Throttling, EnvoyFilter, Service Mesh

Description: A practical guide to configuring API throttling and rate limiting in Istio using local rate limiting, global rate limiting, and EnvoyFilter configurations.

---

API throttling is essential for protecting your services from being overwhelmed by too many requests. Whether it is a misbehaving client, a retry storm, or an actual attack, you need rate limits in place. Istio provides multiple ways to throttle API traffic, from simple local rate limiting to distributed global rate limiting.

## Local Rate Limiting

Local rate limiting happens at each individual Envoy sidecar. It is simple to set up and does not require any external dependencies. The downside is that each pod enforces its own limits independently, so if you have 10 pods, your effective rate limit is 10x what you configure.

Here is a basic local rate limit configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-rate-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          stat_prefix: http_local_rate_limiter
          token_bucket:
            max_tokens: 100
            tokens_per_fill: 100
            fill_interval: 60s
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
              key: x-local-rate-limit
              value: "true"
```

This allows 100 requests per 60 seconds per pod. When the limit is hit, clients get a 429 Too Many Requests response.

## Route-Specific Rate Limits

You probably do not want the same rate limit on every endpoint. Your health check endpoint should not count toward API limits. You can use per-route configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: route-rate-limits
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          route:
            name: default
    patch:
      operation: MERGE
      value:
        typed_per_filter_config:
          envoy.filters.http.local_ratelimit:
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 50
              tokens_per_fill: 50
              fill_interval: 60s
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
```

## Global Rate Limiting

For proper distributed rate limiting, you need a global rate limit service. This is an external gRPC service that all Envoy sidecars talk to. The most common implementation is Envoy's own rate limit service.

First, deploy the rate limit service:

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
        image: envoyproxy/ratelimit:latest
        ports:
        - containerPort: 8081
          name: grpc
        env:
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
        - name: LOG_LEVEL
          value: debug
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis.default.svc.cluster.local:6379
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
  - port: 8081
    targetPort: 8081
    name: grpc
```

Next, create the rate limit configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: default
data:
  config.yaml: |
    domain: my-api-ratelimit
    descriptors:
    - key: PATH
      rate_limit:
        unit: minute
        requests_per_unit: 100
    - key: PATH
      value: "/api/v1/search"
      rate_limit:
        unit: minute
        requests_per_unit: 20
    - key: header_match
      value: "api-key"
      descriptors:
      - key: PATH
        rate_limit:
          unit: minute
          requests_per_unit: 500
```

Now configure Envoy to talk to the rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-rate-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: my-api-ratelimit
          failure_mode_deny: false
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: outbound|8081||ratelimit.default.svc.cluster.local
            transport_api_version: V3
  - applyTo: CLUSTER
    match:
      cluster:
        service: ratelimit.default.svc.cluster.local
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 10s
        lb_policy: ROUND_ROBIN
        http2_protocol_options: {}
        load_assignment:
          cluster_name: rate_limit_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.default.svc.cluster.local
                    port_value: 8081
```

The `failure_mode_deny: false` setting means that if the rate limit service is down, requests are allowed through. Set it to `true` if you want to block requests when the rate limiter is unavailable.

## Rate Limiting by Client Identity

You often want different rate limits for different clients. You can use request headers to identify clients:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-actions
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          name: "inbound|http|8080"
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: "x-api-key"
              descriptor_key: "api_key"
          - request_headers:
              header_name: ":path"
              descriptor_key: "PATH"
```

Then update your rate limit service config to handle these descriptors:

```yaml
domain: my-api-ratelimit
descriptors:
- key: api_key
  descriptors:
  - key: PATH
    rate_limit:
      unit: minute
      requests_per_unit: 100
- key: api_key
  value: "premium-key-123"
  descriptors:
  - key: PATH
    rate_limit:
      unit: minute
      requests_per_unit: 1000
```

Premium clients get 1000 requests per minute while everyone else gets 100.

## Adding Rate Limit Headers to Responses

Good APIs tell clients about their rate limit status. You can configure Envoy to include rate limit headers:

```yaml
response_headers_to_add:
- append_action: OVERWRITE_IF_EXISTS_OR_ADD
  header:
    key: x-ratelimit-limit
    value: "100"
- append_action: OVERWRITE_IF_EXISTS_OR_ADD
  header:
    key: x-ratelimit-remaining
    value: "%DYNAMIC_METADATA(envoy.filters.http.ratelimit:remaining)%"
```

## Monitoring Rate Limits

Check your rate limiting stats through Envoy's stats endpoint:

```bash
# Check local rate limit stats
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep rate_limit

# Look for these metrics
# http_local_rate_limiter.http_local_rate_limiter.rate_limited: 42
# http_local_rate_limiter.http_local_rate_limiter.ok: 1580
```

You can also expose these as Prometheus metrics and build dashboards to track how often rate limits are being hit.

## Choosing Between Local and Global

Use local rate limiting when you want simple per-pod protection and do not need precise distributed limits. Use global rate limiting when you need exact limits across all pods and want per-client rate limiting. Many teams use both: local limits as a safety net and global limits for business logic.

Throttling is one of those things that is easy to get wrong. Start with generous limits and tighten them based on actual traffic patterns. Monitor your 429 responses to make sure you are not accidentally throttling legitimate traffic.
