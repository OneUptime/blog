# How to Use Envoy Header Manipulation for Request Transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, HTTP Headers, API Gateway, Request Transformation, Routing

Description: Learn how to manipulate HTTP headers in Envoy for request routing, transformation, authentication, and observability using built-in filters and dynamic variables.

---

Header manipulation is one of Envoy's most versatile features, enabling you to add, modify, or remove HTTP headers as requests and responses flow through the proxy. This capability powers use cases ranging from simple header injection to complex request transformation, routing decisions based on header values, authentication token forwarding, and enriching requests with observability metadata.

Envoy provides granular control over header manipulation at multiple layers: global listener configuration, virtual host level, route level, and weighted cluster level. You can use static values, dynamic variables extracted from request metadata, and even conditional logic to determine which headers to manipulate. This flexibility makes Envoy an excellent API gateway and service mesh sidecar.

## Basic Header Manipulation

Let's start with simple header addition and removal:

```yaml
# envoy-header-manipulation.yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          codec_type: AUTO
          route_config:
            name: local_route
            # Global request headers (applied to all routes)
            request_headers_to_add:
            - header:
                key: "X-Request-Start"
                value: "%START_TIME%"
            - header:
                key: "X-Forwarded-Proto"
                value: "%PROTOCOL%"
            # Remove sensitive headers
            request_headers_to_remove:
            - "X-Internal-Secret"
            - "X-Debug-Mode"
            # Global response headers
            response_headers_to_add:
            - header:
                key: "X-Served-By"
                value: "envoy-proxy"
            - header:
                key: "X-Response-Time"
                value: "%DURATION%"
            response_headers_to_remove:
            - "X-Powered-By"
            - "Server"
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/api"
                route:
                  cluster: backend_service
                  # Route-specific header manipulation
                  request_headers_to_add:
                  - header:
                      key: "X-API-Version"
                      value: "v2"
                    append: false  # Don't append if header exists
                  - header:
                      key: "X-Request-ID"
                      value: "%REQ(X-REQUEST-ID)%"
                  request_headers_to_remove:
                  - "Cookie"  # Remove cookies for this API
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: backend_service
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend
                port_value: 8000
    connect_timeout: 1s

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

This configuration adds request timing metadata, removes sensitive headers, and appends custom headers to identify the proxy.

## Dynamic Header Values with Variables

Envoy supports numerous dynamic variables for header values:

```yaml
routes:
- match:
    prefix: "/api/v1"
  route:
    cluster: backend_v1
    request_headers_to_add:
    # Request timing
    - header:
        key: "X-Request-Start-Time"
        value: "%START_TIME(%s.%3f)%"  # Unix timestamp with milliseconds
    # Connection info
    - header:
        key: "X-Downstream-Remote-Address"
        value: "%DOWNSTREAM_REMOTE_ADDRESS%"
    - header:
        key: "X-Downstream-Local-Address"
        value: "%DOWNSTREAM_LOCAL_ADDRESS%"
    # Request metadata
    - header:
        key: "X-Request-Method"
        value: "%REQ(:METHOD)%"
    - header:
        key: "X-Request-Path"
        value: "%REQ(:PATH)%"
    - header:
        key: "X-Request-Protocol"
        value: "%PROTOCOL%"
    # Upstream info
    - header:
        key: "X-Upstream-Host"
        value: "%UPSTREAM_HOST%"
    - header:
        key: "X-Upstream-Cluster"
        value: "%UPSTREAM_CLUSTER%"
    # Extract existing header
    - header:
        key: "X-Original-User-Agent"
        value: "%REQ(USER-AGENT)%"
    # Request ID (generated by Envoy)
    - header:
        key: "X-Envoy-Request-ID"
        value: "%REQ(X-REQUEST-ID)%"
    response_headers_to_add:
    # Response timing
    - header:
        key: "X-Response-Duration-Ms"
        value: "%DURATION%"
    - header:
        key: "X-Response-Time"
        value: "%START_TIME(%Y-%m-%dT%H:%M:%S)%Z"
    # Upstream response info
    - header:
        key: "X-Upstream-Service-Time"
        value: "%RESP(X-SERVICE-TIME)%"
    # Response flags for debugging
    - header:
        key: "X-Envoy-Response-Flags"
        value: "%RESPONSE_FLAGS%"
```

## Conditional Header Manipulation

Use route matching to conditionally manipulate headers:

```yaml
routes:
# Add auth header for authenticated requests
- match:
    prefix: "/api/secure"
    headers:
    - name: "Authorization"
      present_match: true
  route:
    cluster: secure_backend
    request_headers_to_add:
    - header:
        key: "X-Auth-Present"
        value: "true"
    - header:
        key: "X-User-ID"
        value: "%REQ(X-USER-ID)%"

# Different headers for mobile clients
- match:
    prefix: "/api"
    headers:
    - name: "User-Agent"
      string_match:
        contains: "Mobile"
  route:
    cluster: mobile_optimized_backend
    request_headers_to_add:
    - header:
        key: "X-Client-Type"
        value: "mobile"
    - header:
        key: "X-Response-Format"
        value: "compact"

# Default route without special headers
- match:
    prefix: "/api"
  route:
    cluster: default_backend
    request_headers_to_add:
    - header:
        key: "X-Client-Type"
        value: "web"
```

## Header-Based Routing

Route requests based on header values:

```yaml
routes:
# Route beta traffic to beta cluster
- match:
    prefix: "/api"
    headers:
    - name: "X-Beta-User"
      exact_match: "true"
  route:
    cluster: backend_beta
    request_headers_to_add:
    - header:
        key: "X-Traffic-Type"
        value: "beta"

# Route canary traffic (5% based on header hash)
- match:
    prefix: "/api"
    headers:
    - name: "X-Canary"
      present_match: true
  route:
    weighted_clusters:
      clusters:
      - name: backend_canary
        weight: 5
        request_headers_to_add:
        - header:
            key: "X-Backend-Version"
            value: "canary"
      - name: backend_stable
        weight: 95
        request_headers_to_add:
        - header:
            key: "X-Backend-Version"
            value: "stable"

# Route by API version header
- match:
    prefix: "/api"
    headers:
    - name: "X-API-Version"
      exact_match: "v2"
  route:
    cluster: backend_v2
- match:
    prefix: "/api"
  route:
    cluster: backend_v1
```

## Authentication Header Forwarding

Handle authentication tokens and credentials:

```yaml
routes:
- match:
    prefix: "/api/protected"
  route:
    cluster: protected_backend
    # Forward JWT token to backend
    request_headers_to_add:
    - header:
        key: "X-JWT-Token"
        value: "%REQ(Authorization)%"
    # Extract user info from JWT (requires JWT authn filter)
    - header:
        key: "X-User-Email"
        value: "%DYNAMIC_METADATA(envoy.filters.http.jwt_authn:email)%"
    - header:
        key: "X-User-Roles"
        value: "%DYNAMIC_METADATA(envoy.filters.http.jwt_authn:roles)%"
    # Remove the original Authorization header
    request_headers_to_remove:
    - "Authorization"
```

## Header Normalization and Sanitization

Clean and normalize headers for security:

```yaml
http_connection_manager:
  stat_prefix: ingress_http
  # Header normalization
  common_http_protocol_options:
    # Reject requests with headers containing underscores
    headers_with_underscores_action: REJECT_REQUEST
    # Maximum number of headers
    max_headers_count: 100
  # Normalize paths
  normalize_path: true
  merge_slashes: true
  # Strip trailing host dot
  strip_trailing_host_dot: true
  # Request ID extension
  request_id_extension:
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.request_id.uuid.v3.UuidRequestIdConfig
  # Preserve external request ID
  use_remote_address: true
  xff_num_trusted_hops: 1

  route_config:
    name: local_route
    virtual_hosts:
    - name: backend
      domains: ["*"]
      # Virtual host level header manipulation
      request_headers_to_add:
      # Ensure request ID exists
      - header:
          key: "X-Request-ID"
          value: "%REQ(X-REQUEST-ID)%"
        append: false
      # Sanitize user input headers
      request_headers_to_remove:
      - "X-Original-URL"  # Prevent header spoofing
      - "X-Rewrite-URL"
      - "X-Forwarded-Host"
      routes:
      - match:
          prefix: "/"
        route:
          cluster: backend_service
```

## CORS Header Management

Handle Cross-Origin Resource Sharing headers:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: api_backend
    cors:
      allow_origin_string_match:
      - exact: "https://example.com"
      - exact: "https://app.example.com"
      - prefix: "https://*.example.com"
      allow_methods: "GET, POST, PUT, DELETE, OPTIONS"
      allow_headers: "Content-Type, Authorization, X-Requested-With"
      expose_headers: "X-Request-ID, X-Response-Time"
      max_age: "86400"
      allow_credentials: true
    # Add custom CORS headers
    response_headers_to_add:
    - header:
        key: "X-CORS-Enabled"
        value: "true"
```

## Rate Limiting Headers

Add rate limit information to responses:

```yaml
# Requires rate limit filter configuration
http_filters:
- name: envoy.filters.http.ratelimit
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
    domain: "api_ratelimit"
    failure_mode_deny: false
    rate_limit_service:
      grpc_service:
        envoy_grpc:
          cluster_name: ratelimit_service
      transport_api_version: V3
    # Add rate limit headers to responses
    enable_x_ratelimit_headers: DRAFT_VERSION_03

routes:
- match:
    prefix: "/api"
  route:
    cluster: backend_service
    rate_limits:
    - actions:
      - request_headers:
          header_name: "X-API-Key"
          descriptor_key: "api_key"
    # Add custom rate limit info headers
    response_headers_to_add:
    - header:
        key: "X-RateLimit-Info"
        value: "Contact support to increase limits"
```

## Header Size Limits

Configure header size constraints:

```yaml
http_connection_manager:
  stat_prefix: ingress_http
  common_http_protocol_options:
    max_headers_count: 100
    max_request_headers_kb: 60
  # HTTP/1.1 specific limits
  http_protocol_options:
    accept_http_10: false
    header_key_format:
      proper_case_words: {}
  # HTTP/2 specific limits
  http2_protocol_options:
    max_concurrent_streams: 100
    initial_stream_window_size: 65536
    initial_connection_window_size: 1048576
```

## Testing Header Manipulation

Verify header manipulation with curl:

```bash
# Test request headers
curl -v -H "X-Test-Header: value" http://localhost:8080/api/test

# Check response headers
curl -I http://localhost:8080/api/test

# Test header-based routing
curl -H "X-Beta-User: true" http://localhost:8080/api/test

# Test authentication header forwarding
curl -H "Authorization: Bearer token123" http://localhost:8080/api/protected

# Inspect headers in Envoy logs
curl http://localhost:9901/logging?level=debug
```

View header manipulation stats:

```bash
# Header manipulation metrics
curl -s http://localhost:9901/stats | grep -E 'headers_added|headers_removed'
```

## Best Practices

1. **Remove sensitive headers**: Always strip internal headers before sending to clients
2. **Use append wisely**: Set `append: false` to prevent header duplication
3. **Normalize early**: Apply header normalization at listener level
4. **Limit header size**: Configure max_headers_count to prevent DoS
5. **Document transformations**: Keep track of which headers are added/removed where
6. **Test thoroughly**: Verify header manipulation doesn't break clients
7. **Monitor overhead**: Excessive header manipulation impacts performance

Header manipulation in Envoy provides powerful request/response transformation capabilities that enable sophisticated routing, security policies, and observability without modifying application code.
