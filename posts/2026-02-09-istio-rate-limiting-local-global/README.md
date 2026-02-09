# How to Implement Rate Limiting with Istio Using Local and Global Rate Limit Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Rate Limiting, API Gateway, Traffic Management, Envoy

Description: Learn how to implement both local and global rate limiting in Istio using Envoy rate limit filters to protect services from overload, enforce API quotas, and prevent abuse.

---

Rate limiting is essential for protecting services from overload and abuse. Istio provides two approaches: local rate limiting applies limits directly at each Envoy proxy, while global rate limiting coordinates across all proxies using a centralized service. Understanding when to use each approach saves you from performance issues and incorrect limit enforcement.

This guide shows you how to implement both patterns and combine them for comprehensive rate limiting across your mesh.

## Understanding Local vs Global Rate Limiting

Local rate limiting applies limits independently at each proxy. If you set a limit of 100 requests per minute and have 3 replicas, the effective limit is 300 requests per minute. Local limiting adds minimal latency since decisions happen in-process.

Global rate limiting uses a centralized Redis-backed service that tracks requests across all proxies. A limit of 100 requests per minute is enforced cluster-wide regardless of replica count. Global limiting adds network latency but provides precise control.

Use local limiting for protecting individual instances from overload. Use global limiting for enforcing API quotas and tenant limits.

## Implementing Local Rate Limiting

Create an EnvoyFilter for local rate limiting:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-rate-limit
  namespace: istio-system
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
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.router"
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
            - append: false
              header:
                key: x-local-rate-limit
                value: 'true'
```

This configuration allows 100 requests per minute per proxy instance.

## Per-Route Local Rate Limiting

Apply different limits to different endpoints:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-route-rate-limit
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-service
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          route:
            name: "default"
    patch:
      operation: MERGE
      value:
        typed_per_filter_config:
          envoy.filters.http.local_ratelimit:
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 10
              tokens_per_fill: 10
              fill_interval: 1s

  - applyTo: HTTP_ROUTE
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          route:
            action: ROUTE
    patch:
      operation: MERGE
      value:
        route:
          rate_limits:
          - actions:
            - header_value_match:
                descriptor_value: "high-priority"
                expect_match: true
                headers:
                - name: "x-priority"
                  exact_match: "high"
```

## Deploying Global Rate Limit Service

Deploy Redis for storing rate limit counters:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: rate-limit
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: rate-limit
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

Deploy the Envoy rate limit service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: production-ratelimit
    descriptors:
      - key: header_match
        value: api_user
        rate_limit:
          unit: minute
          requests_per_unit: 100

      - key: header_match
        value: premium_user
        rate_limit:
          unit: minute
          requests_per_unit: 1000

      - key: generic_key
        value: global
        rate_limit:
          unit: second
          requests_per_unit: 50
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: rate-limit
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
        - containerPort: 8080
        - containerPort: 8081
        env:
        - name: LOG_LEVEL
          value: "info"
        - name: REDIS_SOCKET_TYPE
          value: "tcp"
        - name: REDIS_URL
          value: "redis.rate-limit:6379"
        - name: USE_STATSD
          value: "false"
        - name: RUNTIME_ROOT
          value: "/data"
        - name: RUNTIME_SUBDIRECTORY
          value: "ratelimit"
        - name: RUNTIME_IGNOREDOTFILES
          value: "true"
        volumeMounts:
        - name: config-volume
          mountPath: /data/ratelimit/config
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
      volumes:
      - name: config-volume
        configMap:
          name: ratelimit-config
---
apiVersion: v1
kind: Service
metadata:
  name: ratelimit
  namespace: rate-limit
spec:
  selector:
    app: ratelimit
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: grpc
    port: 8081
    targetPort: 8081
```

## Configuring Global Rate Limiting in Istio

Create EnvoyFilter to enable global rate limiting:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-rate-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.router"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: production-ratelimit
          failure_mode_deny: false
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3

  - applyTo: CLUSTER
    match:
      context: ANY
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 1s
        lb_policy: ROUND_ROBIN
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

## Defining Rate Limit Actions

Configure descriptors for request matching:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: EnvoyFilter
metadata:
  name: rate-limit-actions
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: "x-user-type"
              descriptor_key: "header_match"

        - actions:
          - generic_key:
              descriptor_value: "global"

        - actions:
          - header_value_match:
              descriptor_value: "path_match"
              expect_match: true
              headers:
              - name: ":path"
                prefix_match: "/api/v1/"
```

## User-Based Rate Limiting

Implement per-user quotas:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: production-ratelimit
    descriptors:
      # Per-user rate limit
      - key: user_id
        rate_limit:
          unit: hour
          requests_per_unit: 1000

      # Fallback for unauthenticated users
      - key: generic_key
        value: anonymous
        rate_limit:
          unit: minute
          requests_per_unit: 10
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: user-rate-limiting
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: "x-user-id"
              descriptor_key: "user_id"
```

## Combining Local and Global Rate Limiting

Use both for defense in depth:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: layered-rate-limiting
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
  # Local rate limit (fast path)
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
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
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 1000
              tokens_per_fill: 1000
              fill_interval: 1s

  # Global rate limit (precise enforcement)
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: production-ratelimit
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
```

## Monitoring Rate Limit Behavior

Query rate limit metrics:

```promql
# Local rate limit rejections
rate(envoy_http_local_rate_limit_rate_limited[5m])

# Global rate limit calls
rate(envoy_cluster_ratelimit_ok[5m])

# Rate limit service latency
histogram_quantile(0.99,
  rate(envoy_cluster_upstream_rq_time_bucket{cluster_name="rate_limit_cluster"}[5m])
)
```

Create alerts for rate limiting:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rate-limit-alerts
  namespace: istio-system
spec:
  groups:
  - name: rate_limiting
    rules:
    - alert: HighRateLimitRejection
      expr: |
        rate(envoy_http_local_rate_limit_rate_limited[5m]) > 10
      for: 2m
      annotations:
        summary: "High rate limit rejection rate"
```

Implementing both local and global rate limiting provides robust protection against overload while maintaining low latency for legitimate traffic.
