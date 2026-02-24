# How to Configure Local Rate Limiting with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Local Rate Limit, Envoy, Kubernetes

Description: How to configure Envoy local rate limiting in Istio for per-proxy request throttling without external dependencies.

---

Local rate limiting is the quickest way to protect your services in Istio. It runs entirely within each Envoy proxy instance with no external dependencies - no Redis, no separate rate limit service. Each proxy maintains its own token bucket and enforces limits independently. This makes it dead simple to set up and operationally lightweight, though it comes with the trade-off that limits are per-proxy rather than global.

## How Local Rate Limiting Works

Each Envoy proxy gets its own token bucket. Tokens refill at a configured rate, and each request consumes one token. When the bucket is empty, requests get rejected with a 429 status code.

If your service has 3 replicas and you configure a limit of 100 requests per minute, each proxy allows 100 requests per minute independently. That means the effective limit across all replicas is 300 requests per minute. This is the main limitation compared to global rate limiting, but for many use cases it is perfectly fine.

## Basic Local Rate Limit Configuration

Here is the simplest local rate limit setup. This applies to all inbound HTTP traffic on a specific service:

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

Apply it:

```bash
kubectl apply -f local-ratelimit.yaml
```

The important parameters:

- `max_tokens: 100` - The bucket holds up to 100 tokens
- `tokens_per_fill: 100` - 100 tokens are added each fill cycle
- `fill_interval: 60s` - Tokens refill every 60 seconds
- `filter_enabled` - What percentage of requests go through the filter (100% here)
- `filter_enforced` - What percentage of filtered requests are actually enforced (100% here)

## Gradual Rollout with filter_enabled and filter_enforced

The `filter_enabled` and `filter_enforced` fields let you roll out rate limiting gradually. Want to test rate limiting without actually blocking any traffic? Set `filter_enforced` to 0:

```yaml
filter_enabled:
  runtime_key: local_rate_limit_enabled
  default_value:
    numerator: 100
    denominator: HUNDRED
filter_enforced:
  runtime_key: local_rate_limit_enforced
  default_value:
    numerator: 0
    denominator: HUNDRED
```

With this configuration, the filter runs on 100% of requests (so you get metrics and headers) but does not actually reject anything. Check the metrics to see what would be rejected, and when you are comfortable, increase the enforced percentage.

For a staged rollout, try enforcing on 10% first:

```yaml
filter_enforced:
  runtime_key: local_rate_limit_enforced
  default_value:
    numerator: 10
    denominator: HUNDRED
```

## Configuring Custom Response Codes and Bodies

By default, rate-limited requests get a 429 response with no body. You can customize this:

```yaml
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
  status:
    code: 429
  response_headers_to_add:
  - append_action: OVERWRITE_IF_EXISTS_OR_ADD
    header:
      key: x-rate-limited
      value: "true"
  - append_action: OVERWRITE_IF_EXISTS_OR_ADD
    header:
      key: retry-after
      value: "60"
```

The `retry-after` header is a good practice. It tells clients how long to wait before trying again.

## Per-Route Rate Limiting

You can also apply different rate limits to different routes. This requires setting up the rate limit filter at the listener level and then configuring per-route overrides:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-ratelimit-per-route
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  # Add the filter to the listener
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
  # Apply a tighter limit to a specific route
  - applyTo: HTTP_ROUTE
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          route:
            name: "expensive-route"
    patch:
      operation: MERGE
      value:
        typed_per_filter_config:
          envoy.filters.http.local_ratelimit:
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            stat_prefix: expensive_route_limiter
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

## Applying to Gateway Traffic

Local rate limiting works on Istio ingress gateways too. Change the context to `GATEWAY`:

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
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          stat_prefix: gateway_local_rate_limiter
          token_bucket:
            max_tokens: 5000
            tokens_per_fill: 5000
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

## Monitoring Local Rate Limits

Check the rate limit metrics directly from the proxy:

```bash
kubectl exec my-service-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep local_rate_limiter
```

You will see counters like:

```
http_local_rate_limiter.http_local_rate_limit.enabled: 1500
http_local_rate_limiter.http_local_rate_limit.enforced: 1500
http_local_rate_limiter.http_local_rate_limit.ok: 1400
http_local_rate_limiter.http_local_rate_limit.rate_limited: 100
```

These tell you how many requests were evaluated, how many passed, and how many were rejected.

## Testing Your Configuration

Send a burst of requests to verify the limits:

```bash
for i in $(seq 1 150); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://my-service.default:8080/api/test)
  if [ "$CODE" = "429" ]; then
    echo "Request $i: RATE LIMITED (429)"
  else
    echo "Request $i: OK ($CODE)"
  fi
done
```

## Summary

Local rate limiting in Istio is the simplest form of request throttling available. You configure it entirely through EnvoyFilter resources with no external dependencies, and each proxy instance enforces limits independently. It is not as precise as global rate limiting for distributed services, but the simplicity and zero-dependency nature make it a great starting point. Use the `filter_enabled` and `filter_enforced` fields to roll out gradually, and always monitor the metrics to understand how your limits are performing in practice.
