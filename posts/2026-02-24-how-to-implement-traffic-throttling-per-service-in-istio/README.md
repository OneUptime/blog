# How to Implement Traffic Throttling per Service in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Traffic Management, Service Mesh, Envoy

Description: Step-by-step guide to implementing per-service traffic throttling in Istio using local rate limiting, connection pool settings, and EnvoyFilter configuration.

---

Traffic throttling is about protecting your services from being overwhelmed. Whether it is a misbehaving client sending too many requests, a sudden traffic spike from a marketing campaign, or a retry storm caused by a temporary failure downstream, throttling helps you keep things stable by putting a cap on how much traffic each service accepts.

Istio gives you two main approaches to throttling: connection pool limits through DestinationRules and rate limiting through EnvoyFilter. Each works differently and is suited for different use cases. Connection pool limits control how many concurrent connections and pending requests are allowed. Rate limiting controls how many requests per second get through.

## Connection Pool Throttling with DestinationRule

The simplest form of throttling is setting connection pool limits. When the limits are hit, additional requests get a 503 response:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
  namespace: production
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
        maxRetries: 3
```

Here is what each setting does:

- `maxConnections`: Maximum TCP connections to the service. Once hit, new connections queue up.
- `http1MaxPendingRequests`: Maximum requests waiting for a connection from the pool. Overflow gets 503.
- `http2MaxRequests`: Maximum concurrent requests for HTTP/2 connections.
- `maxRequestsPerConnection`: After this many requests on a single connection, the connection gets closed and a new one opens. Helps with load balancing.
- `maxRetries`: Maximum number of retries that can be in progress at the same time across all requests to this service.

## Per-Service Connection Limits

You can set different limits for different services by applying separate DestinationRules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 50
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: notification-service
  namespace: production
spec:
  host: notification-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
```

Payment service gets tighter limits because you want to protect the payment processor from overload. Notification service gets higher limits because it handles more throughput and can queue internally.

## Local Rate Limiting with EnvoyFilter

For requests-per-second throttling, use Envoy's local rate limiter. This operates at the individual pod level, so each pod has its own rate limit counter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-order-service
  namespace: production
spec:
  workloadSelector:
    labels:
      app: order-service
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
            status:
              code: TooManyRequests
            response_headers_to_add:
            - append_action: OVERWRITE_IF_EXISTS_OR_ADD
              header:
                key: x-local-rate-limit
                value: "true"
```

This configuration allows 100 requests per 60 seconds per pod. The token bucket refills every 60 seconds with 100 tokens. When tokens run out, additional requests get a 429 (Too Many Requests) response.

## Rate Limiting Specific Routes

You might want different rate limits for different endpoints on the same service. A read endpoint can handle more traffic than a write endpoint. Use route-level rate limiting:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: route-rate-limits
  namespace: production
spec:
  workloadSelector:
    labels:
      app: order-service
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
              stat_prefix: route_rate_limiter
              token_bucket:
                max_tokens: 50
                tokens_per_fill: 50
                fill_interval: 60s
              filter_enabled:
                runtime_key: route_rate_limit_enabled
                default_value:
                  numerator: 100
                  denominator: HUNDRED
              filter_enforced:
                runtime_key: route_rate_limit_enforced
                default_value:
                  numerator: 100
                  denominator: HUNDRED
```

## Adding Rate Limit Headers to Responses

To help clients understand their rate limit status, add response headers that indicate the limit and remaining capacity. You can use the `response_headers_to_add` field in the rate limit filter:

```yaml
response_headers_to_add:
- append_action: OVERWRITE_IF_EXISTS_OR_ADD
  header:
    key: x-ratelimit-limit
    value: "100"
- append_action: OVERWRITE_IF_EXISTS_OR_ADD
  header:
    key: x-ratelimit-remaining
    value: "%DYNAMIC_METADATA(envoy.filters.http.local_ratelimit:remaining)%"
```

## Circuit Breaking as a Throttling Mechanism

Circuit breaking through DestinationRule outlier detection is another throttling mechanism. If a service starts returning errors, Envoy ejects it from the load balancing pool temporarily:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
  namespace: production
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

After 5 consecutive 5xx errors from a pod (checked every 10 seconds), that pod gets ejected from the pool for 30 seconds. No more than 50% of pods can be ejected at the same time, preventing a total outage.

## Monitoring Throttled Traffic

Check how much traffic is being throttled using Envoy stats:

```bash
# Check rate limit stats for a specific pod
kubectl exec deploy/order-service -c istio-proxy -- \
  pilot-agent request GET stats | grep rate_limit

# Check circuit breaker overflow
kubectl exec deploy/order-service -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_rq_pending_overflow
```

The `upstream_rq_pending_overflow` counter tells you how many requests were rejected because the pending request queue was full. If this number is climbing fast, either increase the limit or your service needs more capacity.

For Prometheus-based monitoring:

```bash
# Requests rejected by rate limiting (429s)
sum(rate(istio_requests_total{destination_service="order-service.production.svc.cluster.local",response_code="429"}[5m]))

# Requests rejected by circuit breaking (503s)
sum(rate(istio_requests_total{destination_service="order-service.production.svc.cluster.local",response_code="503"}[5m]))
```

## Choosing Between Local and Global Rate Limiting

Local rate limiting (what we have covered so far) runs independently on each pod. If you have 5 pods with a limit of 100 req/min each, the effective total limit is 500 req/min. This is simple and fast because no external coordination is needed.

Global rate limiting requires an external rate limit service (like Envoy's rate limit service) that maintains counters across all pods. This gives you an exact total limit regardless of how many pods are running. It adds latency and complexity but gives more precise control.

For most services, local rate limiting is sufficient. Use global rate limiting when you have strict contractual limits (like API quotas for third-party clients) that cannot be exceeded regardless of pod count.

## Summary

Traffic throttling in Istio operates at multiple layers. Connection pool limits in DestinationRules control concurrent connections and pending requests. Local rate limiting through EnvoyFilter controls requests per second per pod. Circuit breaking through outlier detection ejects unhealthy pods. Apply these per service with different thresholds based on each service's capacity and criticality. Monitor your overflow and rejection metrics to tune the limits over time.
