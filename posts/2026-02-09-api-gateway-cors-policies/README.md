# How to Implement API Gateway CORS Policies for Cross-Origin Resource Sharing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, CORS, Security

Description: Configure comprehensive CORS policies in API gateways including origin validation, credential handling, preflight optimization, and security best practices for cross-origin requests.

---

Cross-Origin Resource Sharing (CORS) is a security mechanism that controls how web browsers allow JavaScript code from one origin to access resources from a different origin. Without proper CORS configuration, browsers block these cross-origin requests, breaking your application. API gateways provide centralized CORS policy enforcement, ensuring consistent handling across all backend services.

## Understanding CORS Mechanics

When a browser makes a cross-origin request, it first sends an OPTIONS preflight request to check if the server allows the actual request. The server responds with CORS headers indicating which origins, methods, and headers are permitted. Only if the preflight succeeds does the browser proceed with the actual request.

For simple requests (GET, HEAD, POST with certain content types), browsers skip the preflight and include an `Origin` header in the request. The server must respond with appropriate `Access-Control-Allow-Origin` headers for the browser to expose the response to JavaScript.

## NGINX CORS Configuration

Configure NGINX to handle CORS at the gateway level, eliminating the need for CORS logic in backend services.

```nginx
# nginx-cors.conf
server {
    listen 80;
    server_name api.example.com;

    location /api/ {
        # Handle OPTIONS preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '$http_origin' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Requested-With' always;
            add_header 'Access-Control-Max-Age' '86400' always;
            add_header 'Content-Length' '0';
            add_header 'Content-Type' 'text/plain';
            return 204;
        }

        # Add CORS headers to all responses
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length, X-Request-ID' always;

        proxy_pass http://backend-service:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

This configuration responds to preflight requests immediately without proxying to the backend, reducing latency. The `Access-Control-Max-Age` header tells browsers to cache preflight results for 24 hours.

## Restricted Origin Configuration

Never use `Access-Control-Allow-Origin: *` in production if your API requires authentication. This combination allows any website to make authenticated requests on behalf of users.

```nginx
# Whitelist specific origins
map $http_origin $cors_origin {
    default "";
    "https://app.example.com" "$http_origin";
    "https://admin.example.com" "$http_origin";
    "https://mobile.example.com" "$http_origin";
}

server {
    location /api/ {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '$cors_origin' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
            add_header 'Access-Control-Max-Age' '86400' always;
            return 204;
        }

        add_header 'Access-Control-Allow-Origin' '$cors_origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        # Reject requests from unauthorized origins
        if ($cors_origin = "") {
            return 403;
        }

        proxy_pass http://backend-service:8080;
    }
}
```

The map directive creates a lookup table of allowed origins. Requests from other origins get an empty `$cors_origin` variable and receive a 403 response.

## Kong CORS Plugin

Kong provides a CORS plugin with comprehensive configuration options.

```bash
# Enable CORS plugin globally
curl -X POST http://kong-admin:8001/plugins \
  --data "name=cors" \
  --data "config.origins[]=https://app.example.com" \
  --data "config.origins[]=https://admin.example.com" \
  --data "config.methods[]=GET" \
  --data "config.methods[]=POST" \
  --data "config.methods[]=PUT" \
  --data "config.methods[]=DELETE" \
  --data "config.headers[]=Authorization" \
  --data "config.headers[]=Content-Type" \
  --data "config.exposed_headers[]=X-Request-ID" \
  --data "config.credentials=true" \
  --data "config.max_age=86400"
```

Kong's declarative configuration format:

```yaml
# kong-cors-config.yaml
_format_version: "3.0"

plugins:
- name: cors
  config:
    origins:
    - https://app.example.com
    - https://admin.example.com
    methods:
    - GET
    - POST
    - PUT
    - DELETE
    - PATCH
    headers:
    - Authorization
    - Content-Type
    - X-Request-ID
    - X-Custom-Header
    exposed_headers:
    - X-Request-ID
    - X-RateLimit-Remaining
    credentials: true
    max_age: 86400
    preflight_continue: false

services:
- name: api-service
  url: http://backend-service:8080
  routes:
  - name: api-route
    paths:
    - /api
```

The `preflight_continue: false` setting tells Kong to respond directly to OPTIONS requests without forwarding them to the backend service.

## Envoy CORS Filter

Envoy's CORS filter provides flexible policy configuration at the route level.

```yaml
# envoy-cors-config.yaml
static_resources:
  listeners:
  - name: main_listener
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
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/api/"
                route:
                  cluster: backend_service
                typed_per_filter_config:
                  envoy.filters.http.cors:
                    "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.CorsPolicy
                    allow_origin_string_match:
                    - exact: "https://app.example.com"
                    - exact: "https://admin.example.com"
                    allow_methods: "GET, POST, PUT, DELETE"
                    allow_headers: "Authorization, Content-Type, X-Custom-Header"
                    expose_headers: "X-Request-ID, X-RateLimit-Remaining"
                    max_age: "86400"
                    allow_credentials: true
          http_filters:
          - name: envoy.filters.http.cors
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Istio CORS Configuration

Istio configures CORS through VirtualService resources with fine-grained control per route.

```yaml
# istio-cors-policy.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
  namespace: backend
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /api/public/
    corsPolicy:
      allowOrigins:
      - exact: https://app.example.com
      - regex: "https://.*\\.example\\.com"
      allowMethods:
      - GET
      - POST
      allowHeaders:
      - Content-Type
      - X-Requested-With
      exposeHeaders:
      - X-Request-ID
      maxAge: 24h
      allowCredentials: true
    route:
    - destination:
        host: api-service
        port:
          number: 8080

  - match:
    - uri:
        prefix: /api/internal/
    corsPolicy:
      allowOrigins:
      - exact: https://admin.example.com
      allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      allowHeaders:
      - Authorization
      - Content-Type
      exposeHeaders:
      - X-Request-ID
      maxAge: 1h
      allowCredentials: true
    route:
    - destination:
        host: api-service
        port:
          number: 8080
```

This configuration applies different CORS policies to different route prefixes, allowing public endpoints to be accessed from multiple subdomains while restricting internal APIs to specific admin origins.

## Dynamic Origin Validation

For applications with dynamic subdomains or multi-tenant architectures, validate origins using pattern matching.

```nginx
# NGINX regex-based origin matching
map $http_origin $cors_origin {
    default "";
    "~^https://[a-z0-9-]+\.example\.com$" "$http_origin";
    "https://app.example.com" "$http_origin";
}
```

Kong supports regex patterns in origin configuration:

```yaml
plugins:
- name: cors
  config:
    origins:
    - "https://*.example.com"
    - "https://app.example.com"
```

## Credentials and Security

When `Access-Control-Allow-Credentials: true` is set, browsers include cookies and authorization headers in cross-origin requests. This requires careful origin validation.

```yaml
# Secure credentials configuration
corsPolicy:
  allowOrigins:
  - exact: https://app.example.com  # Never use * with credentials
  allowMethods:
  - GET
  - POST
  allowHeaders:
  - Authorization
  - Content-Type
  allowCredentials: true  # Requires specific origin, not *
  maxAge: 3600
```

Never combine wildcards with credentials:

```yaml
# INSECURE - DO NOT USE
corsPolicy:
  allowOrigins:
  - prefix: "*"  # Dangerous with credentials
  allowCredentials: true  # This combination is a security vulnerability
```

## Preflight Optimization

Reduce latency by caching preflight responses and minimizing preflight triggers.

```nginx
# Maximize preflight cache duration
add_header 'Access-Control-Max-Age' '86400' always;

# Only require custom headers that are truly necessary
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
```

Browsers won't send preflight requests for simple requests that only use:
- Methods: GET, HEAD, POST
- Headers: Accept, Accept-Language, Content-Language, Content-Type (only application/x-www-form-urlencoded, multipart/form-data, or text/plain)

Use these constraints when possible to avoid preflight overhead.

## Testing CORS Configuration

Verify CORS policies work correctly using curl to simulate browser behavior.

```bash
# Test preflight request
curl -X OPTIONS https://api.example.com/api/users \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  -v

# Expected response headers
# Access-Control-Allow-Origin: https://app.example.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE
# Access-Control-Allow-Headers: Authorization, Content-Type
# Access-Control-Max-Age: 86400

# Test actual request
curl -X POST https://api.example.com/api/users \
  -H "Origin: https://app.example.com" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"name":"test"}' \
  -v

# Should include in response
# Access-Control-Allow-Origin: https://app.example.com
# Access-Control-Allow-Credentials: true
```

## Error Handling

Handle CORS errors gracefully with informative responses.

```nginx
# Return helpful error messages for CORS violations
location /api/ {
    if ($cors_origin = "") {
        add_header 'Content-Type' 'application/json' always;
        return 403 '{"error":"Origin not allowed","allowed_origins":["https://app.example.com","https://admin.example.com"]}';
    }

    # Normal CORS handling...
}
```

## Monitoring CORS

Track CORS-related metrics to identify configuration issues or potential attacks.

```yaml
# Prometheus metrics for CORS
# Track preflight request rates
sum(rate(http_requests_total{method="OPTIONS"}[5m])) by (origin)

# Monitor rejected CORS requests
sum(rate(http_requests_total{status="403",cors_rejected="true"}[5m])) by (origin)
```

## Conclusion

CORS is essential for modern web applications that separate frontend and backend domains. API gateways provide the ideal enforcement point for CORS policies, centralizing configuration and eliminating duplicate logic across services. Always restrict origins to specific trusted domains when handling authenticated requests, maximize preflight cache durations to reduce latency, and monitor CORS metrics to detect configuration issues. With proper CORS configuration at the gateway level, you maintain security while enabling the cross-origin communication that modern web applications require.
