# How to use Envoy routes for HTTP path-based routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Routing, HTTP

Description: Learn how to configure Envoy HTTP routes for sophisticated path-based routing including prefix matching, regex patterns, and header-based routing.

---

Envoy's routing capabilities allow you to direct traffic to different backend services based on request properties like paths, headers, query parameters, and more. Path-based routing is the most common pattern, enabling you to build API gateways and reverse proxies that route requests to appropriate microservices. This guide shows you how to configure sophisticated HTTP routing in Envoy.

## Basic Path Prefix Routing

Route requests based on URL path prefixes:

```yaml
route_config:
  name: main_route
  virtual_hosts:
  - name: services
    domains: ["*"]
    routes:
    - match:
        prefix: "/api/users"
      route:
        cluster: user_service
    - match:
        prefix: "/api/orders"
      route:
        cluster: order_service
    - match:
        prefix: "/api/products"
      route:
        cluster: product_service
    - match:
        prefix: "/"
      route:
        cluster: frontend_service
```

Routes are evaluated in order. The first matching route is used, so place more specific routes before general ones.

## Exact Path Matching

Match exact paths when you need precision:

```yaml
routes:
- match:
    path: "/health"
  direct_response:
    status: 200
    body:
      inline_string: "OK"
- match:
    path: "/api/v1/status"
  route:
    cluster: status_service
- match:
    prefix: "/api/v1"
  route:
    cluster: api_v1_service
```

Exact matches take precedence over prefix matches in routing logic.

## Regex Path Matching

Use regex for complex matching patterns:

```yaml
routes:
- match:
    safe_regex:
      google_re2: {}
      regex: "^/api/v[0-9]+/.*"
  route:
    cluster: versioned_api
- match:
    safe_regex:
      google_re2: {}
      regex: "^/files/[a-f0-9]{32}$"
  route:
    cluster: file_service
```

Regex matching is powerful but has performance implications. Use prefix or exact matching when possible.

## Path Rewriting

Rewrite paths before forwarding to upstream:

```yaml
routes:
- match:
    prefix: "/api/v2"
  route:
    cluster: backend_service
    prefix_rewrite: "/v2"
```

This strips `/api` from the path, so `/api/v2/users` becomes `/v2/users` when sent to the backend.

For regex-based rewriting:

```yaml
routes:
- match:
    safe_regex:
      google_re2: {}
      regex: "^/service/([^/]+)/(.*)"
  route:
    cluster: dynamic_service
    regex_rewrite:
      pattern:
        google_re2: {}
        regex: "^/service/([^/]+)/(.*)"
      substitution: "/\\2"
```

## Header-Based Routing

Route based on HTTP headers:

```yaml
routes:
- match:
    prefix: "/api"
    headers:
    - name: "x-api-version"
      exact_match: "v2"
  route:
    cluster: api_v2_service
- match:
    prefix: "/api"
    headers:
    - name: "x-api-version"
      exact_match: "v1"
  route:
    cluster: api_v1_service
- match:
    prefix: "/api"
  route:
    cluster: api_v1_service
```

## Query Parameter Routing

Route based on query parameters:

```yaml
routes:
- match:
    prefix: "/search"
    query_parameters:
    - name: "version"
      string_match:
        exact: "beta"
  route:
    cluster: search_beta
- match:
    prefix: "/search"
  route:
    cluster: search_stable
```

## Weighted Cluster Routing

Split traffic across multiple clusters:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    weighted_clusters:
      clusters:
      - name: api_v1
        weight: 90
      - name: api_v2
        weight: 10
    total_weight: 100
```

This sends 90% of traffic to v1 and 10% to v2, perfect for canary deployments or A/B testing.

## Request Mirroring

Mirror traffic to a secondary cluster:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: production_api
    request_mirror_policies:
    - cluster: shadow_api
      runtime_fraction:
        default_value:
          numerator: 100
          denominator: HUNDRED
```

Mirrored requests don't affect the response to the client, useful for testing new services with production traffic.

## Retry Policies

Configure retry behavior per route:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: api_service
    retry_policy:
      retry_on: "5xx,reset,connect-failure,refused-stream"
      num_retries: 3
      per_try_timeout: 2s
      retry_host_predicate:
      - name: envoy.retry_host_predicates.previous_hosts
      host_selection_retry_max_attempts: 5
```

## Timeout Configuration

Set timeouts per route:

```yaml
routes:
- match:
    prefix: "/api/fast"
  route:
    cluster: fast_service
    timeout: 5s
- match:
    prefix: "/api/slow"
  route:
    cluster: slow_service
    timeout: 60s
    idle_timeout: 300s
```

## CORS Configuration

Enable CORS for specific routes:

```yaml
virtual_hosts:
- name: api
  domains: ["api.example.com"]
  cors:
    allow_origin_string_match:
    - exact: "https://app.example.com"
    - exact: "https://mobile.example.com"
    allow_methods: "GET, POST, PUT, DELETE, OPTIONS"
    allow_headers: "content-type, authorization, x-request-id"
    expose_headers: "x-request-id, x-ratelimit-remaining"
    max_age: "86400"
    allow_credentials: true
  routes:
  - match:
      prefix: "/api"
    route:
      cluster: api_service
```

## Rate Limiting Per Route

Apply rate limiting to specific routes:

```yaml
routes:
- match:
    prefix: "/api/search"
  route:
    cluster: search_service
    rate_limits:
    - actions:
      - request_headers:
          header_name: "x-user-id"
          descriptor_key: "user_id"
    - actions:
      - generic_key:
          descriptor_value: "search_endpoint"
```

## Virtual Host-Based Routing

Route based on the Host header or SNI:

```yaml
virtual_hosts:
- name: api_host
  domains:
  - "api.example.com"
  - "api.example.net"
  routes:
  - match:
      prefix: "/"
    route:
      cluster: api_service

- name: web_host
  domains:
  - "www.example.com"
  - "example.com"
  routes:
  - match:
      prefix: "/"
    route:
      cluster: web_service

- name: admin_host
  domains:
  - "admin.example.com"
  routes:
  - match:
      prefix: "/"
    route:
      cluster: admin_service
```

## Direct Response Routes

Return responses directly without forwarding to a backend:

```yaml
routes:
- match:
    path: "/health"
  direct_response:
    status: 200
    body:
      inline_string: '{"status":"healthy"}'

- match:
    path: "/robots.txt"
  direct_response:
    status: 200
    body:
      inline_string: |
        User-agent: *
        Disallow: /admin/
```

## Redirect Routes

Redirect requests to different URLs:

```yaml
routes:
- match:
    prefix: "/old-api"
  redirect:
    path_redirect: "/api/v1"
    response_code: MOVED_PERMANENTLY

- match:
    prefix: "/"
    headers:
    - name: ":scheme"
      exact_match: "http"
  redirect:
    https_redirect: true
    response_code: MOVED_PERMANENTLY
```

## Monitoring Route Metrics

Track route-level metrics:

```promql
# Requests per route
envoy_http_downstream_rq_total{envoy_route_name="api_route"}

# Route latency
envoy_http_downstream_rq_time{envoy_route_name="api_route"}

# Route errors
envoy_http_downstream_rq_xx{envoy_route_name="api_route",envoy_response_code_class="5"}
```

## Testing Route Configuration

Test routes using curl:

```bash
# Test prefix routing
curl -v http://envoy:8080/api/users

# Test header-based routing
curl -v -H "x-api-version: v2" http://envoy:8080/api/data

# Test CORS
curl -v -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://envoy:8080/api/data
```

## Conclusion

Envoy's routing capabilities provide sophisticated traffic management for HTTP requests. Use path-based routing to direct requests to appropriate microservices, combine header and query parameter matching for complex routing logic, and leverage weighted clusters for canary deployments. Configure timeouts, retries, and CORS policies at the route level for fine-grained control. Monitor route-specific metrics to understand traffic patterns and identify issues.
