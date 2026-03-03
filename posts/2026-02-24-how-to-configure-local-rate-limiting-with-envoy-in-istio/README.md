# How to Configure Local Rate Limiting with Envoy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Envoy, Kubernetes, Traffic Control

Description: A hands-on guide to configuring local per-proxy rate limiting in Istio using Envoy native rate limit filters without external dependencies.

---

Local rate limiting in Istio works entirely within each Envoy proxy instance. There is no external service to deploy, no Redis to manage, and no gRPC calls to make. Each sidecar enforces its own rate limits independently. This makes it simpler to set up than global rate limiting, though the tradeoff is that limits are per-proxy rather than aggregate.

## When to Use Local Rate Limiting

Local rate limiting works well when:

- You want to protect individual pods from being overwhelmed
- You do not need aggregate rate tracking across all instances
- You want a quick, dependency-free rate limiting solution
- Your services have consistent load distribution across pods

If your service has 5 replicas and you set a local rate limit of 100 requests per second, each pod allows 100 rps independently. The total throughput would be 500 rps. This is different from global rate limiting where 100 rps would be the aggregate limit.

## Basic Local Rate Limiting Setup

Local rate limiting is configured through EnvoyFilter resources. Here is a basic configuration that limits incoming requests to a service:

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

## Understanding the Token Bucket

The token bucket configuration is the core of local rate limiting:

- `max_tokens`: Maximum number of tokens in the bucket (burst capacity)
- `tokens_per_fill`: How many tokens are added each fill interval
- `fill_interval`: How often tokens are replenished

In the example above, the bucket starts with 100 tokens and refills 100 tokens every 60 seconds. Each request consumes one token. If the bucket is empty, requests get a 429 response.

For a higher burst tolerance:

```yaml
token_bucket:
  max_tokens: 200
  tokens_per_fill: 100
  fill_interval: 60s
```

This allows a burst of 200 requests but only refills at a steady 100 per minute.

## Rate Limiting at the Gateway

To apply local rate limiting at the ingress gateway instead of individual sidecars:

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
```

The key difference is `context: GATEWAY` instead of `SIDECAR_INBOUND`.

## Route-Level Rate Limiting

You can apply different rate limits to different routes. First, set up the filter at the listener level without a token bucket (which disables it by default), then enable it per route:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-ratelimit-listener
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
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-ratelimit-route
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        typed_per_filter_config:
          envoy.filters.http.local_ratelimit:
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            stat_prefix: route_rate_limiter
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

## Custom Response Status Code

By default, rate-limited requests get a 429 status code. You can change this:

```yaml
typed_config:
  "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
  stat_prefix: http_local_rate_limiter
  status:
    code: 503
  token_bucket:
    max_tokens: 100
    tokens_per_fill: 100
    fill_interval: 60s
```

Using 503 Service Unavailable can be useful when you want clients to treat rate limiting as a temporary server-side issue and retry with backoff.

## Adding Rate Limit Headers

Help clients understand rate limit status by adding informational headers:

```yaml
response_headers_to_add:
- append_action: OVERWRITE_IF_EXISTS_OR_ADD
  header:
    key: x-ratelimit-limit
    value: "100"
- append_action: OVERWRITE_IF_EXISTS_OR_ADD
  header:
    key: x-ratelimit-remaining
    value: "0"
```

Note that local rate limiting does not natively provide dynamic "remaining" counts in headers. These are static values. For dynamic header values, you would need to use a global rate limit service.

## Testing Local Rate Limits

Generate traffic to test the limits:

```bash
# Send 150 requests rapidly
for i in $(seq 1 150); do
  curl -s -o /dev/null -w "%{http_code} " http://my-service.default.svc.cluster.local/api
done
echo
```

You should see 200s followed by 429s once the token bucket is exhausted.

Check the Envoy stats to confirm rate limiting is active:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep local_rate_limiter
```

Look for:

```text
http_local_rate_limiter.enabled: 150
http_local_rate_limiter.enforced: 50
http_local_rate_limiter.ok: 100
http_local_rate_limiter.rate_limited: 50
```

## Shadow Mode

You can run rate limiting in shadow mode first to see what would be limited without actually blocking requests:

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

With `filter_enabled` at 100% and `filter_enforced` at 0%, every request is evaluated but none are actually blocked. Check the stats to see how many would have been limited, then switch enforcement on when you are comfortable with the numbers.

## Summary

Local rate limiting in Istio is the quickest way to add rate protection to your services. It requires no external dependencies, works per-proxy with token bucket semantics, and can be applied at the gateway or sidecar level. The main limitation is that limits are per-proxy instance rather than global. For many use cases, especially protecting individual pods from overload, local rate limiting is the right choice. Start with shadow mode to understand your traffic patterns, then gradually enforce limits based on real data.
