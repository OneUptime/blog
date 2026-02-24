# How to Set Up Rate Limiting for APIs with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, API, Kubernetes, Envoy

Description: Learn how to configure local and global rate limiting for your APIs using Istio's EnvoyFilter and Envoy's built-in rate limiting capabilities.

---

Rate limiting is one of those things that every production API needs but nobody wants to build from scratch. Without rate limits, a single misbehaving client can overwhelm your services, eat your resources, and ruin the experience for everyone else.

Istio gives you two approaches to rate limiting: local rate limiting (per-proxy) and global rate limiting (using a centralized rate limit service). Both work at the Envoy proxy level, so your application code stays clean.

## Local Rate Limiting

Local rate limiting happens entirely within each Envoy sidecar. There's no external service involved - each proxy maintains its own token bucket and enforces limits independently.

The downside is that limits are per-pod, not global. If you set a limit of 100 requests per minute and have 5 pods, the effective limit is 500 requests per minute. But for many use cases, this is good enough and way simpler to set up.

### Configuring Local Rate Limiting with EnvoyFilter

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-ratelimit
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

This gives each pod a token bucket of 100 tokens that refills at 100 tokens per 60 seconds. When a request comes in and no tokens are available, Envoy returns a 429 Too Many Requests response.

Apply it:

```bash
kubectl apply -f local-ratelimit.yaml
```

### Testing Local Rate Limiting

Send a burst of requests to verify the rate limit works:

```bash
for i in $(seq 1 150); do
  curl -s -o /dev/null -w "%{http_code}\n" http://my-api:8080/endpoint
done
```

You should see 200 responses for the first 100 requests and 429 responses after that.

## Global Rate Limiting

Global rate limiting uses a centralized rate limit service that all Envoy proxies consult before allowing requests through. This gives you precise control over the total number of requests across all pods.

### Deploying the Rate Limit Service

Istio works with Envoy's reference rate limit service. Deploy it along with Redis (which stores the rate limit counters):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: default
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
  namespace: default
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

Next, create the rate limit configuration as a ConfigMap:

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
      value: "/api/expensive-operation"
      rate_limit:
        unit: minute
        requests_per_unit: 10
    - key: header_match
      value: "api-key"
      descriptors:
      - key: PATH
        rate_limit:
          unit: minute
          requests_per_unit: 500
```

This configuration sets different rate limits based on the request path. The `/api/expensive-operation` endpoint gets a lower limit of 10 requests per minute, while the default is 100. Requests with an API key get a higher limit of 500.

Deploy the rate limit service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: default
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
        - containerPort: 8080
        - containerPort: 8081
        - containerPort: 6070
        env:
        - name: LOG_LEVEL
          value: debug
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis:6379
        - name: USE_STATSD
          value: "false"
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
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
    targetPort: 8080
  - name: grpc
    port: 8081
    targetPort: 8081
```

### Connecting Envoy to the Rate Limit Service

Use an EnvoyFilter to configure the Envoy proxies to call the rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-ratelimit
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
          timeout: 1s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: outbound|8081||ratelimit.default.svc.cluster.local
                authority: ratelimit.default.svc.cluster.local
            transport_api_version: V3
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: ":path"
              descriptor_key: PATH
```

The `failure_mode_deny: false` setting means that if the rate limit service is unreachable, requests are allowed through. Set this to `true` if you want to be strict and deny requests when the rate limiter is down.

### Per-Client Rate Limiting

To rate limit per client (for example, by API key or IP address), add header-based descriptors:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: "x-api-key"
      descriptor_key: "api_key"
  - request_headers:
      header_name: ":path"
      descriptor_key: PATH
```

And update the rate limit config:

```yaml
domain: my-api-ratelimit
descriptors:
- key: api_key
  descriptors:
  - key: PATH
    rate_limit:
      unit: minute
      requests_per_unit: 100
```

## Adding Rate Limit Headers to Responses

It's good practice to include rate limit headers in your API responses so clients know their limits:

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

Envoy exposes rate limiting metrics that you can scrape with Prometheus:

```bash
# Check rate limit stats
istioctl proxy-config stats deploy/my-api -n default | grep ratelimit
```

Look for metrics like `ratelimit.ok`, `ratelimit.over_limit`, and `ratelimit.error` to understand how your rate limits are working.

## Choosing Between Local and Global

Use local rate limiting when you want simple per-pod protection against burst traffic. It's easy to set up and has no external dependencies.

Use global rate limiting when you need precise control over the total request rate, per-client limits, or different limits for different API endpoints. It requires deploying the rate limit service and Redis, but gives you much more flexibility.

In many production setups, teams use both: local rate limiting as a safety net against extreme bursts, and global rate limiting for fine-grained per-client and per-endpoint controls.
