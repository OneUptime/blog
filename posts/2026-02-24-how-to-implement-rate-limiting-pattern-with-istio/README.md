# How to Implement Rate Limiting Pattern with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Envoy, Traffic Management, Kubernetes

Description: How to implement rate limiting in Istio using local rate limiting with EnvoyFilter and global rate limiting with an external rate limit service.

---

Rate limiting protects your services from being overwhelmed by too many requests. Whether it is a misbehaving client, a traffic spike, or a denial-of-service attempt, having rate limits in place means your service stays up and responsive for legitimate traffic. Istio supports both local rate limiting (per-proxy) and global rate limiting (across all proxies using an external service).

## Local Rate Limiting

Local rate limiting is enforced independently at each Envoy sidecar. Each proxy maintains its own rate limit counter, so the actual aggregate rate across all proxies is the per-proxy rate times the number of proxies. It is simpler to set up because it does not require an external service.

You configure local rate limiting using an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-ratelimit
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

This configuration:
- Applies to inbound traffic on pods labeled `app: my-service`
- Allows 100 requests per 60 seconds per proxy instance
- Returns a 429 (Too Many Requests) when the limit is exceeded
- Adds a response header so clients know they were rate limited

## Path-Based Local Rate Limiting

You can apply different rate limits to different paths by using route-level configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: route-ratelimit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
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
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            value:
              stat_prefix: http_local_rate_limiter
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

## Global Rate Limiting

Global rate limiting uses an external rate limit service that all Envoy proxies consult before allowing a request. This gives you a shared counter across all proxies, so the rate limit is truly global regardless of how many instances of your service are running.

### Step 1: Deploy the Rate Limit Service

The standard implementation is Envoy's reference rate limit service:

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
        image: envoyproxy/ratelimit:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: grpc
        - containerPort: 6070
          name: debug
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
  selector:
    app: ratelimit
  ports:
  - name: http
    port: 8080
  - name: grpc
    port: 8081
```

### Step 2: Deploy Redis

The rate limit service needs Redis for shared state:

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
  selector:
    app: redis
  ports:
  - port: 6379
```

### Step 3: Configure Rate Limit Rules

Create a ConfigMap with the rate limit rules:

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
    - key: PATH
      value: "/api/search"
      rate_limit:
        unit: minute
        requests_per_unit: 100
    - key: PATH
      rate_limit:
        unit: minute
        requests_per_unit: 1000
```

This limits `/api/search` to 100 requests per minute and all other paths to 1000 requests per minute.

### Step 4: Configure Envoy to Use the Rate Limit Service

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
          domain: production-ratelimit
          failure_mode_deny: false
          timeout: 1s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: outbound|8081||ratelimit.istio-system.svc.cluster.local
                authority: ratelimit.istio-system.svc.cluster.local
            transport_api_version: V3
  - applyTo: VIRTUAL_HOST
    match:
      context: GATEWAY
      routeConfiguration:
        vhost:
          name: ""
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: ":path"
              descriptor_key: PATH
```

**failure_mode_deny: false** means if the rate limit service is unavailable, requests are allowed through. Set to `true` if you want to deny requests when the rate limiter is down.

## Monitoring Rate Limiting

Track rate limiting activity:

```promql
# Local rate limit hits
rate(envoy_http_local_rate_limiter_http_local_rate_limit_rate_limited[5m])

# Global rate limit hits
rate(envoy_http_ratelimit_over_limit[5m])

# Rate limit service latency
histogram_quantile(0.99, rate(envoy_http_ratelimit_ratelimit_duration_seconds_bucket[5m]))
```

Check from the proxy:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep rate_limit
```

## Rate Limiting by Client Identity

For API platforms, you might want to rate limit per API key or per client:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: istio-system
data:
  config.yaml: |
    domain: api-ratelimit
    descriptors:
    - key: API_KEY
      rate_limit:
        unit: minute
        requests_per_unit: 60
    - key: API_KEY
      value: "premium-key-123"
      rate_limit:
        unit: minute
        requests_per_unit: 600
```

And configure the EnvoyFilter to extract the API key from a header:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: "x-api-key"
      descriptor_key: API_KEY
```

Premium API keys get a higher rate limit (600/min) while default keys get 60/min.

## Choosing Local vs Global

**Use local rate limiting when:**
- You want simple per-instance protection
- Exact global counts are not critical
- You do not want to deploy and maintain a rate limit service
- The rate limit can be approximated (per-pod limit * number of pods)

**Use global rate limiting when:**
- You need precise global rate limits (e.g., API quotas)
- You need per-client rate limiting
- The exact limit matters for billing or compliance
- You have the operational capacity to run the rate limit service and Redis

Rate limiting is a fundamental protection mechanism for any production service. Local rate limiting is quick to set up and covers most use cases. Global rate limiting gives you precision when you need it. Start with local limits, and move to global only when you have a specific requirement for shared counters across all proxy instances.
