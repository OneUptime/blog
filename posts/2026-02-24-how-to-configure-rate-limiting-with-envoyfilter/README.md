# How to Configure Rate Limiting with EnvoyFilter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Rate Limiting, Envoy, Kubernetes, Traffic Management

Description: A practical guide to setting up rate limiting in Istio using EnvoyFilter for both local and global rate limiting strategies.

---

Rate limiting is one of those things that seems simple in concept but gets tricky fast in a microservices environment. When you're running Istio, you have two main options: local rate limiting (per-proxy) and global rate limiting (using an external rate limit service). Both are configured through EnvoyFilter resources, since Istio doesn't expose rate limiting through its higher-level APIs.

## Local vs Global Rate Limiting

Local rate limiting happens entirely within each Envoy proxy instance. Each sidecar maintains its own counters, so if you set a limit of 100 requests per second and you have 5 replicas, your actual aggregate limit would be around 500 requests per second. This is simpler to set up but less precise.

Global rate limiting uses an external service (typically the Envoy rate limit service) that all proxies query before allowing a request through. This gives you accurate, cluster-wide rate limiting but adds latency and requires running an additional service.

## Setting Up Local Rate Limiting

Local rate limiting uses the `envoy.filters.http.local_ratelimit` filter. Here's how to add it to your mesh:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-rate-limit
  namespace: istio-system
spec:
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
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
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

This configuration limits each proxy to 100 requests per 60 seconds. When the limit is hit, Envoy returns a 429 Too Many Requests response with the custom header `x-local-rate-limit: true`.

## Scoping Rate Limits to Specific Services

You probably don't want the same rate limit on every service. Use `workloadSelector` to target specific workloads:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: api-rate-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-gateway
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
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
            stat_prefix: api_gateway_rate_limiter
            token_bucket:
              max_tokens: 50
              tokens_per_fill: 50
              fill_interval: 30s
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

## Rate Limiting Per Route

You can also apply different rate limits to different routes. First, add the filter with rate limiting disabled by default, then enable it per-route:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-route-rate-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
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
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
            stat_prefix: per_route_rate_limiter
            token_bucket:
              max_tokens: 1000
              tokens_per_fill: 1000
              fill_interval: 60s
            filter_enabled:
              runtime_key: local_rate_limit_enabled
              default_value:
                numerator: 0
                denominator: HUNDRED
            filter_enforced:
              runtime_key: local_rate_limit_enforced
              default_value:
                numerator: 0
                denominator: HUNDRED
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
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            value:
              stat_prefix: route_rate_limiter
              token_bucket:
                max_tokens: 10
                tokens_per_fill: 10
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

## Setting Up Global Rate Limiting

Global rate limiting requires deploying the Envoy rate limit service. First, deploy the rate limit service:

```bash
kubectl create namespace rate-limit
```

Create a ConfigMap for the rate limit configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: production
    descriptors:
    - key: PATH
      rate_limit:
        unit: minute
        requests_per_unit: 100
    - key: PATH
      value: "/api/expensive"
      rate_limit:
        unit: minute
        requests_per_unit: 10
```

Deploy the rate limit service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: rate-limit
spec:
  replicas: 1
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
        ports:
        - containerPort: 8081
          name: grpc
        env:
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
        - name: USE_STATSD
          value: "false"
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis.rate-limit.svc.cluster.local:6379
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
  namespace: rate-limit
spec:
  ports:
  - port: 8081
    targetPort: 8081
    name: grpc
  selector:
    app: ratelimit
```

Now configure the EnvoyFilter to use the global rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-rate-limit
  namespace: istio-system
spec:
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
          domain: production
          failure_mode_deny: false
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 1s
        lb_policy: ROUND_ROBIN
        protocol_selection: USE_CONFIGURED_PROTOCOL
        http2_protocol_options: {}
        load_assignment:
          cluster_name: rate_limit_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.rate-limit.svc.cluster.local
                    port_value: 8081
```

## Monitoring Rate Limit Metrics

Envoy exposes metrics for rate limiting that you can scrape with Prometheus:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep rate_limit
```

Look for metrics like `http_local_rate_limiter.ok`, `http_local_rate_limiter.rate_limited`, and `http_local_rate_limiter.enforced`.

## Testing Your Rate Limits

A quick way to test is with a simple loop:

```bash
for i in $(seq 1 200); do
  curl -s -o /dev/null -w "%{http_code}\n" http://my-service.default.svc.cluster.local:8080/
done | sort | uniq -c
```

You should see a mix of 200 and 429 responses once the limit is exceeded.

## Tips and Gotchas

One thing that trips people up is the `failure_mode_deny` setting on global rate limiting. When set to `false` (the default), if the rate limit service is unreachable, requests are allowed through. Set it to `true` if you'd rather deny requests when the rate limit service is down, but be careful with that in production since it makes the rate limit service a hard dependency.

Also keep in mind that local rate limits are per-pod. If your service scales up, your effective rate limit increases proportionally. For strict enforcement, global rate limiting is the way to go.

Rate limiting through EnvoyFilter is powerful but requires careful testing. Start with permissive limits in a staging environment and gradually tighten them based on your actual traffic patterns.
