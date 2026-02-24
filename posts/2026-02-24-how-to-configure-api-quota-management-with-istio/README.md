# How to Configure API Quota Management with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Quota Management, API Gateway, EnvoyFilter

Description: How to implement API quota management with Istio using local rate limiting, global rate limiting, and per-client quota enforcement.

---

API quota management goes beyond simple rate limiting. While rate limiting caps requests per second or minute, quota management tracks usage over longer periods (daily, monthly) and enforces limits per client, per tier, or per endpoint. Istio gives you the building blocks to implement this through local rate limiting, global rate limiting with an external service, and custom EnvoyFilter logic.

## Local Rate Limiting

The simplest form of quota enforcement is Envoy's built-in local rate limiter. This runs entirely within each gateway pod without external dependencies:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-rate-limit
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
              max_tokens: 1000
              tokens_per_fill: 1000
              fill_interval: 3600s
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
                  value: "999"
```

This gives you 1000 requests per hour across all clients. The limitation is that it does not track per-client usage and the count resets on each gateway pod independently.

## Per-Route Rate Limits

Apply different limits to different API endpoints using route-level configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-route-rate-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_ROUTE
      match:
        context: GATEWAY
        routeConfiguration:
          vhost:
            name: "api.example.com:443"
            route:
              name: "api-v1-users"
      patch:
        operation: MERGE
        value:
          typed_per_filter_config:
            envoy.filters.http.local_ratelimit:
              "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
              stat_prefix: api_v1_users_rate_limit
              token_bucket:
                max_tokens: 100
                tokens_per_fill: 100
                fill_interval: 60s
```

## Global Rate Limiting with External Service

For accurate per-client quotas, you need a global rate limit service that coordinates across all gateway pods. Envoy has built-in support for this through its rate limit service protocol.

Deploy the rate limit service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  labels:
    app: ratelimit
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
          env:
            - name: REDIS_SOCKET_TYPE
              value: tcp
            - name: REDIS_URL
              value: redis:6379
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
spec:
  selector:
    app: ratelimit
  ports:
    - port: 8081
      targetPort: 8081
```

Deploy Redis for the rate limit service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  labels:
    app: redis
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
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

Configure the rate limit rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
data:
  config.yaml: |
    domain: api-gateway
    descriptors:
      # Per-client hourly quota
      - key: client_id
        rate_limit:
          unit: hour
          requests_per_unit: 1000
        descriptors:
          - key: path
            value: "/api/v1/users"
            rate_limit:
              unit: minute
              requests_per_unit: 100
          - key: path
            value: "/api/v1/orders"
            rate_limit:
              unit: minute
              requests_per_unit: 50
      # Per-tier daily quotas
      - key: client_tier
        value: "premium"
        rate_limit:
          unit: day
          requests_per_unit: 100000
      - key: client_tier
        value: "standard"
        rate_limit:
          unit: day
          requests_per_unit: 10000
      - key: client_tier
        value: "free"
        rate_limit:
          unit: day
          requests_per_unit: 1000
```

Connect Envoy to the rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-rate-limit
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
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.ratelimit
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
            domain: api-gateway
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
        operation: MERGE
        value:
          connect_timeout: 1s
```

## Setting Rate Limit Descriptors from Headers

Configure which headers map to rate limit descriptors:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-descriptors
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
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
                - request_headers:
                    header_name: x-client-id
                    descriptor_key: client_id
            - actions:
                - request_headers:
                    header_name: x-client-tier
                    descriptor_key: client_tier
            - actions:
                - request_headers:
                    header_name: x-client-id
                    descriptor_key: client_id
                - request_headers:
                    header_name: ":path"
                    descriptor_key: path
```

## Quota Response Headers

Inform clients about their quota usage through response headers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: quota-response-headers
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
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              function envoy_on_response(response_handle)
                local status = response_handle:headers():get(":status")
                if status == "429" then
                  response_handle:headers():add("retry-after", "60")
                  response_handle:headers():add("x-ratelimit-reset", tostring(os.time() + 60))
                end
              end
```

## Custom Quota Tracking

For complex quota scenarios (monthly usage, quota pools shared across services), use an external authorization service that checks quota before allowing requests:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: quota-checker
        envoyExtAuthzGrpc:
          service: quota-service.default.svc.cluster.local
          port: 9001
          timeout: 5s
```

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: quota-enforcement
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: CUSTOM
  provider:
    name: quota-checker
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
```

The external service can check quotas against any backend (database, Redis, external billing system) and return detailed quota information in response headers.

## Monitoring Quota Usage

Track rate limit metrics with Prometheus:

```bash
# Rate limit hit count
envoy_http_local_rate_limit_enabled
envoy_http_local_rate_limit_enforced
envoy_http_local_rate_limit_ok
envoy_http_local_rate_limit_rate_limited
```

Set up alerts for when clients are approaching their quotas:

```yaml
groups:
  - name: quota-alerts
    rules:
      - alert: HighQuotaUsage
        expr: rate(envoy_http_local_rate_limit_rate_limited[5m]) > 0.1
        for: 5m
        annotations:
          summary: "API rate limiting is being triggered frequently"
```

## Testing Quota Limits

```bash
# Rapid-fire requests to test rate limiting
for i in $(seq 1 200); do
  status=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: key-abc123" https://api.example.com/api/v1/users)
  echo "Request $i: $status"
done
```

Watch for 429 responses once the quota is exceeded.

Quota management with Istio takes more setup than a managed API gateway, but the combination of local rate limiting, global rate limiting with Redis, and external authorization gives you everything you need for production-grade quota enforcement.
