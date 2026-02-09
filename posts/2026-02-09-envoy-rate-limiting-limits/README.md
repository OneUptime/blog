# How to configure Envoy rate limiting with local and global limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Rate Limiting, API Gateway

Description: Learn how to implement rate limiting in Envoy using both local token bucket filters and global distributed rate limiting with Redis.

---

Rate limiting protects your services from excessive load, prevents abuse, and ensures fair resource allocation across clients. Envoy provides two approaches: local rate limiting using token bucket algorithms directly in the proxy, and global rate limiting using an external service that coordinates limits across multiple Envoy instances. This guide shows you how to implement both patterns effectively.

## Local Rate Limiting with Token Bucket

Local rate limiting applies limits per Envoy instance without coordination:

```yaml
http_filters:
- name: envoy.filters.http.local_ratelimit
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
    stat_prefix: http_local_rate_limiter
    token_bucket:
      max_tokens: 1000
      tokens_per_fill: 1000
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
    - append: false
      header:
        key: x-local-rate-limit
        value: 'true'
- name: envoy.filters.http.router
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

This configuration allows 1000 requests per second per Envoy instance.

## Per-Route Local Rate Limiting

Apply different limits to different routes:

```yaml
routes:
- match:
    prefix: "/api/expensive"
  route:
    cluster: backend_service
  typed_per_filter_config:
    envoy.filters.http.local_ratelimit:
      "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
      stat_prefix: expensive_endpoint
      token_bucket:
        max_tokens: 10
        tokens_per_fill: 10
        fill_interval: 1s

- match:
    prefix: "/api/cheap"
  route:
    cluster: backend_service
  typed_per_filter_config:
    envoy.filters.http.local_ratelimit:
      "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
      stat_prefix: cheap_endpoint
      token_bucket:
        max_tokens: 1000
        tokens_per_fill: 1000
        fill_interval: 1s
```

## Global Rate Limiting Architecture

Global rate limiting requires:
1. Envoy rate limit filter
2. Rate limit service (like Envoy's rate limit service)
3. Redis for shared state
4. Rate limit descriptors configuration

Deploy the rate limit service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit-service
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
        - containerPort: 6070
          name: http
        env:
        - name: REDIS_SOCKET_TYPE
          value: "tcp"
        - name: REDIS_URL
          value: "redis.default.svc.cluster.local:6379"
        - name: USE_STATSD
          value: "false"
        - name: LOG_LEVEL
          value: "debug"
        - name: RUNTIME_ROOT
          value: "/data"
        - name: RUNTIME_SUBDIRECTORY
          value: "ratelimit"
        volumeMounts:
        - name: config
          mountPath: /data/ratelimit/config
      volumes:
      - name: config
        configMap:
          name: ratelimit-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: default
data:
  config.yaml: |
    domain: apis
    descriptors:
      - key: user_id
        rate_limit:
          unit: minute
          requests_per_unit: 100
      - key: api_key
        rate_limit:
          unit: hour
          requests_per_unit: 10000
      - key: client_ip
        rate_limit:
          unit: second
          requests_per_unit: 10
---
apiVersion: v1
kind: Service
metadata:
  name: ratelimit-service
  namespace: default
spec:
  ports:
  - port: 8081
    name: grpc
  - port: 6070
    name: http
  selector:
    app: ratelimit
```

## Configuring Global Rate Limit Filter

Add the rate limit filter to Envoy:

```yaml
http_filters:
- name: envoy.filters.http.ratelimit
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
    domain: apis
    failure_mode_deny: false
    rate_limit_service:
      grpc_service:
        envoy_grpc:
          cluster_name: ratelimit_cluster
      transport_api_version: V3
- name: envoy.filters.http.router
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

clusters:
- name: ratelimit_cluster
  connect_timeout: 1s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  http2_protocol_options: {}
  load_assignment:
    cluster_name: ratelimit_cluster
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: ratelimit-service.default.svc.cluster.local
              port_value: 8081
```

## Rate Limit Descriptors

Define descriptors to extract rate limit keys from requests:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: api_service
    rate_limits:
    - actions:
      - request_headers:
          header_name: "x-user-id"
          descriptor_key: "user_id"
    - actions:
      - request_headers:
          header_name: "x-api-key"
          descriptor_key: "api_key"
    - actions:
      - remote_address: {}
        descriptor_key: "client_ip"
```

## Combining Multiple Descriptors

Apply multiple rate limits simultaneously:

```yaml
rate_limits:
- stage: 0
  actions:
  - request_headers:
      header_name: "x-user-id"
      descriptor_key: "user_id"
- stage: 0
  actions:
  - request_headers:
      header_name: "x-user-id"
      descriptor_key: "user_id"
  - request_headers:
      header_name: "x-api-endpoint"
      descriptor_key: "endpoint"
```

Rate limit configuration:

```yaml
descriptors:
- key: user_id
  rate_limit:
    unit: minute
    requests_per_unit: 1000
  descriptors:
  - key: endpoint
    value: "search"
    rate_limit:
      unit: minute
      requests_per_unit: 100
  - key: endpoint
    value: "export"
    rate_limit:
      unit: minute
      requests_per_unit: 10
```

## Generic Key Descriptors

Use static keys for endpoint-based limiting:

```yaml
routes:
- match:
    prefix: "/api/expensive"
  route:
    cluster: api_service
    rate_limits:
    - actions:
      - generic_key:
          descriptor_value: "expensive_endpoint"
```

Configuration:

```yaml
descriptors:
- key: generic_key
  value: "expensive_endpoint"
  rate_limit:
    unit: second
    requests_per_unit: 10
```

## Custom Response for Rate Limit

Configure custom responses when rate limited:

```yaml
typed_config:
  "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
  domain: apis
  failure_mode_deny: false
  rate_limited_as_resource_exhausted: true
  rate_limit_service:
    grpc_service:
      envoy_grpc:
        cluster_name: ratelimit_cluster
  response_headers_to_add:
  - append: false
    header:
      key: x-ratelimit-limit
      value: "%RATE_LIMIT_LIMIT%"
  - append: false
    header:
      key: x-ratelimit-remaining
      value: "%RATE_LIMIT_REMAINING%"
  - append: false
    header:
      key: x-ratelimit-reset
      value: "%RATE_LIMIT_RESET%"
```

## Shadow Mode

Test rate limiting without enforcement:

```yaml
typed_config:
  "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
  domain: apis
  failure_mode_deny: false
  enable_x_ratelimit_headers: DRAFT_VERSION_03
  rate_limit_service:
    grpc_service:
      envoy_grpc:
        cluster_name: ratelimit_cluster
  request_type: shadow
```

Shadow mode calls the rate limit service but doesn't enforce limits, useful for testing.

## Monitoring Rate Limiting

Track these metrics:

```promql
# Local rate limit rejections
envoy_http_local_rate_limit_rate_limited

# Global rate limit calls
envoy_cluster_ratelimit_ok
envoy_cluster_ratelimit_over_limit

# Rate limit service latency
envoy_cluster_upstream_rq_time{cluster="ratelimit_cluster"}
```

Create alerts:

```yaml
groups:
- name: rate_limiting
  rules:
  - alert: HighRateLimitRejections
    expr: rate(envoy_http_local_rate_limit_rate_limited[5m]) > 100
    annotations:
      summary: "High rate limit rejection rate"

  - alert: RateLimitServiceDown
    expr: up{job="ratelimit-service"} == 0
    annotations:
      summary: "Rate limit service is down"
```

## Best Practices

1. Start with local rate limiting for simple use cases
2. Use global rate limiting when running multiple Envoy instances
3. Set failure_mode_deny: false initially to avoid breaking traffic if the rate limit service is down
4. Monitor both local and global rate limit metrics
5. Use shadow mode before enforcing new limits
6. Configure appropriate Redis persistence for the rate limit service
7. Set realistic limits based on actual traffic patterns

## Conclusion

Envoy provides flexible rate limiting through local token bucket filters and global distributed limiting. Use local rate limiting for simple per-instance limits and global rate limiting when you need coordinated limits across multiple proxies. Configure descriptors to extract rate limit keys from requests, combine multiple limits for sophisticated policies, and monitor rate limit metrics to understand enforcement impact. Start with permissive limits and shadow mode, then gradually tighten based on observed traffic patterns.
