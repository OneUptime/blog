# How to Configure Rate Limiting per API Endpoint in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, API, Envoy, Endpoint, Kubernetes

Description: How to apply different rate limits to different API endpoints in Istio so expensive operations get tighter limits than cheap ones.

---

Not all API endpoints are created equal. A health check endpoint costs almost nothing to serve, while a complex search query might hit your database hard. Applying the same rate limit to both is wasteful - you are either limiting the cheap endpoints too aggressively or leaving the expensive ones too open. Per-endpoint rate limiting lets you tune limits based on the actual cost of each operation.

## The Approach

Per-endpoint rate limiting works by extracting the request path (or route name) from each request and using it as a descriptor for the rate limit service. The rate limit service maintains separate counters for each path, so `/api/search` and `/api/health` each have their own independent limits.

## Rate Limit Service Configuration

Start by defining endpoint-specific rules in your rate limit service config:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: endpoint-ratelimit
    descriptors:
    # Default limit for any path
    - key: PATH
      rate_limit:
        unit: minute
        requests_per_unit: 500

    # Expensive search endpoint
    - key: PATH
      value: "/api/v1/search"
      rate_limit:
        unit: minute
        requests_per_unit: 50

    # Report generation
    - key: PATH
      value: "/api/v1/reports/generate"
      rate_limit:
        unit: minute
        requests_per_unit: 10

    # Health and readiness - very permissive
    - key: PATH
      value: "/healthz"
      rate_limit:
        unit: minute
        requests_per_unit: 10000

    - key: PATH
      value: "/readyz"
      rate_limit:
        unit: minute
        requests_per_unit: 10000

    # Bulk operations
    - key: PATH
      value: "/api/v1/bulk-import"
      rate_limit:
        unit: hour
        requests_per_unit: 100

    # Authentication endpoint
    - key: PATH
      value: "/api/v1/auth/login"
      rate_limit:
        unit: minute
        requests_per_unit: 30
```

Apply and restart the rate limit service:

```bash
kubectl apply -f ratelimit-config.yaml
kubectl rollout restart deployment ratelimit -n rate-limit
```

## EnvoyFilter Configuration

Configure Envoy to extract the path and send it to the rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: endpoint-ratelimit-filter
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
          domain: endpoint-ratelimit
          failure_mode_deny: false
          timeout: 5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
          enable_x_ratelimit_headers: DRAFT_VERSION_03
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

The `:path` pseudo-header contains the request path. Envoy extracts this and sends it as the `PATH` descriptor to the rate limit service.

## Handling Path Parameters

One challenge with path-based rate limiting is dynamic path segments. The path `/api/v1/users/123` and `/api/v1/users/456` are different paths but represent the same endpoint. If you rate limit by exact path, each user ID gets its own counter, which is usually not what you want.

There are a few ways to handle this:

### Option 1: Use Route Names

Instead of the raw path, use Envoy route names which group all paths matching a pattern:

```yaml
rate_limits:
- actions:
  - header_value_match:
      descriptor_value: "users-endpoint"
      headers:
      - name: ":path"
        string_match:
          prefix: "/api/v1/users/"
```

And in the rate limit config:

```yaml
descriptors:
- key: header_match
  value: "users-endpoint"
  rate_limit:
    unit: minute
    requests_per_unit: 200
```

### Option 2: Use a Lua Filter to Normalize Paths

A Lua filter can strip dynamic segments before the path reaches the rate limit filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: path-normalizer
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
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              local path = request_handle:headers():get(":path")

              -- Normalize /api/v1/users/{id} to /api/v1/users/:id
              local normalized = string.gsub(path, "/api/v1/users/[^/]+", "/api/v1/users/:id")
              normalized = string.gsub(normalized, "/api/v1/orders/[^/]+", "/api/v1/orders/:id")

              request_handle:headers():add("x-normalized-path", normalized)
            end
```

Then use the normalized path header for rate limiting:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: "x-normalized-path"
      descriptor_key: PATH
```

## Combining Endpoint and Per-User Limits

The most effective setup combines per-endpoint and per-user limits. You can send multiple descriptors in a single rate limit check:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: ":path"
      descriptor_key: PATH
  - request_headers:
      header_name: "x-user-id"
      descriptor_key: user_id
```

And configure nested descriptors:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: combined-ratelimit
    descriptors:
    - key: PATH
      value: "/api/v1/search"
      descriptors:
      - key: user_id
        rate_limit:
          unit: minute
          requests_per_unit: 20
    - key: PATH
      value: "/api/v1/data"
      descriptors:
      - key: user_id
        rate_limit:
          unit: minute
          requests_per_unit: 100
```

This limits each user to 20 search requests per minute and 100 data requests per minute, independently tracked.

## Applying at the Gateway Level

For public-facing APIs, apply endpoint rate limiting at the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-endpoint-ratelimit
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
          domain: endpoint-ratelimit
          failure_mode_deny: false
          timeout: 5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
  - applyTo: VIRTUAL_HOST
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: ":path"
              descriptor_key: PATH
```

## Testing Endpoint-Specific Limits

Verify that different endpoints have different limits:

```bash
# Test the search endpoint (limit: 50/min)
echo "Testing /api/v1/search..."
for i in $(seq 1 55); do
  curl -s -o /dev/null -w "%{http_code} " http://my-api.default:8080/api/v1/search
done
echo ""

# Test the data endpoint (limit: 500/min)
echo "Testing /api/v1/data..."
for i in $(seq 1 55); do
  curl -s -o /dev/null -w "%{http_code} " http://my-api.default:8080/api/v1/data
done
echo ""
```

The search endpoint should start returning 429 after 50 requests, while the data endpoint should handle all 55 requests without hitting its limit.

## Monitoring Endpoint Rate Limits

Track per-endpoint metrics using the rate limit service stats:

```bash
kubectl exec my-api-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ratelimit
```

For per-endpoint breakdowns, query the rate limit service itself or check Redis:

```bash
kubectl exec -n rate-limit redis-pod -- redis-cli keys "*PATH*"
```

## Summary

Per-endpoint rate limiting in Istio lets you apply granular limits based on the actual cost and sensitivity of each API operation. Extract the request path using the `:path` pseudo-header, send it as a descriptor to the rate limit service, and configure endpoint-specific limits in the rate limit service config. Handle dynamic path parameters by normalizing paths with Lua filters or using header matching patterns. Combine with per-user limits for the most comprehensive rate limiting strategy.
