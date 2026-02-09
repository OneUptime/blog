# How to implement Envoy external authorization with ext_authz filter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Authorization, Security

Description: Learn how to implement external authorization in Envoy using the ext_authz filter to delegate authentication and authorization decisions to external services.

---

The ext_authz filter enables Envoy to delegate authorization decisions to external services. This pattern separates authorization logic from your application code and provides a centralized policy enforcement point. External authorization services can implement complex logic including OAuth2, JWT validation, role-based access control, and custom business rules.

## External Authorization Architecture

The ext_authz filter works by:
1. Intercepting requests before routing
2. Sending request metadata to an authorization service via HTTP or gRPC
3. Allowing or denying requests based on the authorization service response
4. Optionally adding headers from the authorization response

## Basic HTTP ext_authz Configuration

```yaml
http_filters:
- name: envoy.filters.http.ext_authz
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
    http_service:
      server_uri:
        uri: http://authz-service.default.svc.cluster.local:8080
        cluster: authz_cluster
        timeout: 1s
      authorization_request:
        allowed_headers:
          patterns:
          - exact: "authorization"
          - exact: "cookie"
          - prefix: "x-"
      authorization_response:
        allowed_upstream_headers:
          patterns:
          - exact: "x-user-id"
          - exact: "x-user-roles"
- name: envoy.filters.http.router
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

clusters:
- name: authz_cluster
  connect_timeout: 1s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: authz_cluster
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: authz-service.default.svc.cluster.local
              port_value: 8080
```

## gRPC ext_authz Configuration

gRPC provides better performance for high-throughput scenarios:

```yaml
http_filters:
- name: envoy.filters.http.ext_authz
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
    grpc_service:
      envoy_grpc:
        cluster_name: authz_grpc_cluster
      timeout: 0.5s
    transport_api_version: V3
    with_request_body:
      max_request_bytes: 8192
      allow_partial_message: true
- name: envoy.filters.http.router
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

clusters:
- name: authz_grpc_cluster
  connect_timeout: 1s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  http2_protocol_options: {}
  load_assignment:
    cluster_name: authz_grpc_cluster
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: authz-service.default.svc.cluster.local
              port_value: 9090
```

## Simple Authorization Service (HTTP)

Example authorization service in Go:

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "strings"
)

type AuthResponse struct {
    Allowed bool              `json:"allowed"`
    Headers map[string]string `json:"headers,omitempty"`
}

func authzHandler(w http.ResponseWriter, r *http.Request) {
    // Extract authorization header
    authHeader := r.Header.Get("Authorization")

    if authHeader == "" {
        w.WriteHeader(http.StatusForbidden)
        json.NewEncoder(w).Encode(AuthResponse{Allowed: false})
        return
    }

    // Simple bearer token validation
    token := strings.TrimPrefix(authHeader, "Bearer ")

    // Validate token (simplified)
    userID, roles := validateToken(token)
    if userID == "" {
        w.WriteHeader(http.StatusForbidden)
        json.NewEncoder(w).Encode(AuthResponse{Allowed: false})
        return
    }

    // Allow request and add user context headers
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(AuthResponse{
        Allowed: true,
        Headers: map[string]string{
            "x-user-id":    userID,
            "x-user-roles": roles,
        },
    })
}

func validateToken(token string) (string, string) {
    // Implement actual token validation
    if token == "valid-token" {
        return "user-123", "admin,user"
    }
    return "", ""
}

func main() {
    http.HandleFunc("/", authzHandler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Forwarding Request Body

Allow authorization service to inspect request body:

```yaml
with_request_body:
  max_request_bytes: 8192
  allow_partial_message: true
  pack_as_bytes: false
```

Useful for validating webhook signatures or request content.

## Failure Mode Behavior

Control what happens when authorization service is unavailable:

```yaml
failure_mode_allow: false
```

Set to true to allow requests through when authz service is down (fail open), false to deny (fail closed).

## Per-Route Configuration

Apply different authorization rules per route:

```yaml
routes:
- match:
    prefix: "/api/public"
  route:
    cluster: api_service
  typed_per_filter_config:
    envoy.filters.http.ext_authz:
      "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthzPerRoute
      disabled: true

- match:
    prefix: "/api/admin"
  route:
    cluster: admin_service
```

Public endpoints skip authorization, admin endpoints enforce it.

## Caching Authorization Decisions

Cache authorization results to reduce load:

```yaml
typed_config:
  "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
  http_service:
    server_uri:
      uri: http://authz-service:8080
      cluster: authz_cluster
      timeout: 1s
    authorization_request:
      allowed_headers:
        patterns:
        - exact: "authorization"
  filter_enabled_metadata:
    filter: envoy.filters.http.ext_authz
    path:
    - key: shadow_effective
    value:
      bool_match: false
  status_on_error:
    code: 403
```

## Monitoring ext_authz

Track authorization metrics:

```promql
# Authorization requests
envoy_http_ext_authz_total

# Authorization denials
envoy_http_ext_authz_denied

# Authorization service latency
envoy_cluster_upstream_rq_time{cluster="authz_cluster"}
```

## Best Practices

1. Keep authorization service response times under 100ms
2. Use gRPC for better performance in high-throughput scenarios
3. Implement caching in authorization service to reduce database calls
4. Use fail-closed mode (failure_mode_allow: false) for sensitive endpoints
5. Monitor authorization service availability and latency
6. Selectively forward only necessary headers to authorization service

## Conclusion

The ext_authz filter enables centralized authorization in Envoy by delegating decisions to external services. Use HTTP ext_authz for simplicity or gRPC for performance. Configure header forwarding to pass context to the authorization service and inject headers back into upstream requests. Monitor authorization latency and implement caching to maintain performance. This pattern separates authorization logic from application code and provides a single policy enforcement point for your entire mesh.
