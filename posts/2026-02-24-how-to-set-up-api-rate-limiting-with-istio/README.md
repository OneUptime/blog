# How to Set Up API Rate Limiting with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, API Gateway, Kubernetes, EnvoyFilter

Description: Implement API rate limiting in Istio using local rate limiting, global rate limiting services, and per-client rate controls.

---

Rate limiting protects your services from abuse, prevents resource exhaustion, and ensures fair usage across clients. Without rate limits, a single misbehaving client can overwhelm your backend and degrade the experience for everyone. Istio supports both local rate limiting (per-proxy) and global rate limiting (using an external rate limiting service). Here's how to set up both.

## Local vs Global Rate Limiting

**Local rate limiting** applies per Envoy proxy instance. If you set a limit of 100 requests per minute and you have 3 replicas of the ingress gateway, the effective limit is 300 requests per minute across the cluster. Local rate limiting is simpler to set up and has no external dependencies.

**Global rate limiting** uses a central rate limiting service that all proxies consult. The limit is applied globally across all instances. This gives you accurate rate limiting regardless of how many replicas you run. It requires deploying an external service (like Envoy's reference rate limit service).

## Setting Up Local Rate Limiting

Local rate limiting uses Envoy's built-in rate limiter. You configure it through an EnvoyFilter.

### Global Rate Limit on the Gateway

Apply a blanket rate limit to all traffic hitting the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-local-ratelimit
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
              max_tokens: 1000
              tokens_per_fill: 1000
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
                key: x-rate-limit
                value: "1000"
```

This limits each gateway instance to 1000 requests per minute. The `response_headers_to_add` section adds rate limit information to the response, which helps clients understand the limits.

### Rate Limiting per Service

Apply rate limits to a specific backend service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: user-service-ratelimit
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: user-service
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
            stat_prefix: user_service_rate_limiter
            token_bucket:
              max_tokens: 200
              tokens_per_fill: 200
              fill_interval: 60s
```

## Setting Up Global Rate Limiting

For accurate per-client rate limiting, you need a global rate limit service. Deploy the Envoy rate limit service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: istio-system
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
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: grpc
        env:
        - name: LOG_LEVEL
          value: debug
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis.istio-system.svc.cluster.local:6379
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
        - name: USE_STATSD
          value: "false"
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
  namespace: istio-system
spec:
  ports:
  - port: 8080
    name: http
  - port: 8081
    name: grpc
  selector:
    app: ratelimit
```

Deploy Redis for the rate limit backend:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: istio-system
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
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: istio-system
spec:
  ports:
  - port: 6379
  selector:
    app: redis
```

## Configuring Rate Limit Rules

Define the rate limit rules in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: istio-system
data:
  config.yaml: |
    domain: production-ratelimit
    descriptors:
    # Per-client rate limit based on API key header
    - key: header_match
      value: api-key
      rate_limit:
        unit: minute
        requests_per_unit: 100

    # Per-path rate limits
    - key: header_match
      value: path-users
      rate_limit:
        unit: minute
        requests_per_unit: 500

    - key: header_match
      value: path-orders
      rate_limit:
        unit: minute
        requests_per_unit: 200

    # Default rate limit for unmatched requests
    - key: header_match
      value: default
      rate_limit:
        unit: minute
        requests_per_unit: 50
```

## Connecting the Gateway to the Rate Limit Service

Configure the ingress gateway to consult the rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-ratelimit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  # Add the rate limit cluster
  - applyTo: CLUSTER
    match:
      cluster:
        service: ratelimit.istio-system.svc.cluster.local
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 0.25s
        lb_policy: ROUND_ROBIN
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options: {}
        load_assignment:
          cluster_name: rate_limit_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.istio-system.svc.cluster.local
                    port_value: 8081

  # Add the rate limit filter
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
          timeout: 0.5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3

  # Add rate limit actions
  - applyTo: VIRTUAL_HOST
    match:
      context: GATEWAY
      routeConfiguration:
        vhost:
          name: "api.example.com:443"
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - header_value_match:
              descriptor_key: header_match
              descriptor_value: api-key
              headers:
              - name: x-api-key
                present_match: true
        - actions:
          - header_value_match:
              descriptor_key: header_match
              descriptor_value: default
```

## Per-Client Rate Limiting

To rate limit per API key, configure the descriptors to use the API key header value:

```yaml
data:
  config.yaml: |
    domain: production-ratelimit
    descriptors:
    - key: x-api-key
      rate_limit:
        unit: minute
        requests_per_unit: 100
```

And update the EnvoyFilter to pass the API key header as a descriptor:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: x-api-key
      descriptor_key: x-api-key
```

Each unique API key gets its own rate limit bucket.

## Monitoring Rate Limiting

Check rate limit metrics in Prometheus:

```text
# Local rate limit
envoy_http_local_rate_limit_enabled
envoy_http_local_rate_limit_enforced
envoy_http_local_rate_limit_ok
envoy_http_local_rate_limit_rate_limited

# Global rate limit
envoy_ratelimit_ok
envoy_ratelimit_over_limit
envoy_ratelimit_error
envoy_ratelimit_failure_mode_allowed
```

Monitor the rate limit service itself:

```bash
kubectl logs -l app=ratelimit -n istio-system -f
```

Set up alerts for high rejection rates:

```yaml
- alert: HighRateLimitRejections
  expr: sum(rate(envoy_ratelimit_over_limit[5m])) > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High rate of rate-limited requests"
```

## Testing Rate Limits

Use a simple load test to verify your limits:

```bash
# Send 200 requests quickly
for i in $(seq 1 200); do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/v1/users
done | sort | uniq -c
```

You should see a mix of 200 responses (successful) and 429 responses (rate limited).

Rate limiting is a critical part of any API strategy. Start with local rate limiting for simplicity, and move to global rate limiting when you need per-client accuracy. The extra complexity of the global setup pays off when you need precise control over how each client uses your API.
