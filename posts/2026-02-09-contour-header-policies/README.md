# How to Configure Contour HTTPProxy with Request and Response Header Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Contour, Headers

Description: Learn how to use Contour's HTTPProxy to manipulate request and response headers for security hardening, debugging, routing, and implementing cross-cutting concerns in Kubernetes applications.

---

Header manipulation is essential for implementing security policies, debugging, custom routing, and adding metadata to requests. Contour's HTTPProxy CRD provides comprehensive header manipulation capabilities for both requests and responses. This guide shows you how to leverage these features effectively.

## Understanding Header Policies

Contour allows you to:
- Add headers to requests and responses
- Remove sensitive headers before forwarding
- Replace existing header values
- Set headers conditionally
- Implement security headers automatically

These capabilities enable you to implement cross-cutting concerns without modifying application code.

## Request Header Manipulation

Modify headers on incoming requests.

### Adding Request Headers

```yaml
# add-request-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: add-headers-proxy
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - conditions:
    - prefix: /
    services:
    - name: backend-service
      port: 80
    requestHeadersPolicy:
      set:
      - name: X-Request-ID
        value: "%REQ(X-REQUEST-ID)%"
      - name: X-Forwarded-Proto
        value: https
      - name: X-Custom-Header
        value: custom-value
      - name: X-Client-IP
        value: "%DOWNSTREAM_REMOTE_ADDRESS%"
```

### Removing Request Headers

```yaml
# remove-request-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: remove-headers-proxy
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: backend-service
      port: 80
    requestHeadersPolicy:
      remove:
      - X-Internal-Auth
      - X-Debug-Mode
      - Authorization
```

## Response Header Manipulation

Control headers on outgoing responses.

### Adding Security Headers

```yaml
# security-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: security-headers
  namespace: default
spec:
  virtualhost:
    fqdn: app.example.com
  routes:
  - services:
    - name: frontend-service
      port: 80
    responseHeadersPolicy:
      set:
      # HSTS
      - name: Strict-Transport-Security
        value: max-age=31536000; includeSubDomains; preload
      # XSS Protection
      - name: X-Content-Type-Options
        value: nosniff
      - name: X-Frame-Options
        value: DENY
      - name: X-XSS-Protection
        value: 1; mode=block
      # CSP
      - name: Content-Security-Policy
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'"
      # Referrer Policy
      - name: Referrer-Policy
        value: strict-origin-when-cross-origin
      # Permissions Policy
      - name: Permissions-Policy
        value: "geolocation=(), microphone=(), camera=()"
```

### Removing Response Headers

```yaml
# remove-response-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: clean-responses
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: backend-service
      port: 80
    responseHeadersPolicy:
      remove:
      - Server
      - X-Powered-By
      - X-AspNet-Version
      - X-Internal-Version
```

## Advanced Header Policies

Implement sophisticated header manipulation patterns.

### Conditional Header Addition

```yaml
# conditional-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: conditional-routing
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  # Beta users route
  - conditions:
    - header:
        name: X-Beta-User
        present: true
    services:
    - name: beta-backend
      port: 80
    requestHeadersPolicy:
      set:
      - name: X-Environment
        value: beta
    responseHeadersPolicy:
      set:
      - name: X-Version
        value: beta-2.0

  # Production users route
  - conditions:
    - prefix: /
    services:
    - name: prod-backend
      port: 80
    requestHeadersPolicy:
      set:
      - name: X-Environment
        value: production
    responseHeadersPolicy:
      set:
      - name: X-Version
        value: stable-1.0
```

### CORS Headers

```yaml
# cors-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: cors-proxy
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
    corsPolicy:
      allowCredentials: true
      allowOrigin:
      - https://app.example.com
      - https://admin.example.com
      allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - PATCH
      allowHeaders:
      - Authorization
      - Content-Type
      - X-Requested-With
      exposeHeaders:
      - X-Request-ID
      - X-RateLimit-Remaining
      maxAge: 86400
  routes:
  - services:
    - name: api-backend
      port: 80
```

## Debugging and Tracing Headers

Add headers for debugging and distributed tracing.

### Tracing Headers

```yaml
# tracing-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: tracing-proxy
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: backend-service
      port: 80
    requestHeadersPolicy:
      set:
      # Add trace ID if not present
      - name: X-B3-TraceId
        value: "%REQ(X-B3-TRACEID)%"
      - name: X-B3-SpanId
        value: "%REQ(X-B3-SPANID)%"
      # Add timestamp
      - name: X-Request-Start
        value: "%START_TIME%"
    responseHeadersPolicy:
      set:
      # Add response time
      - name: X-Response-Time
        value: "%DURATION%"
      # Add backend server
      - name: X-Upstream-Server
        value: "%UPSTREAM_REMOTE_ADDRESS%"
```

### Debug Headers

```yaml
# debug-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: debug-proxy
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: backend-service
      port: 80
    responseHeadersPolicy:
      set:
      # Add routing information
      - name: X-Envoy-Upstream-Service-Time
        value: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
      - name: X-Envoy-Decorator-Operation
        value: "%ROUTE_NAME%"
      # Add request path
      - name: X-Original-Path
        value: "%REQ(:PATH)%"
```

## Per-Service Header Policies

Different headers for different services.

### Multi-Service Headers

```yaml
# multi-service-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: multi-service-headers
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  # User service
  - conditions:
    - prefix: /users
    services:
    - name: user-service
      port: 80
    requestHeadersPolicy:
      set:
      - name: X-Service-Name
        value: users
      - name: X-Service-Version
        value: v1
    responseHeadersPolicy:
      set:
      - name: X-API-Version
        value: users-v1

  # Order service
  - conditions:
    - prefix: /orders
    services:
    - name: order-service
      port: 80
    requestHeadersPolicy:
      set:
      - name: X-Service-Name
        value: orders
      - name: X-Service-Version
        value: v2
    responseHeadersPolicy:
      set:
      - name: X-API-Version
        value: orders-v2
```

## Authentication and Authorization Headers

Manage auth headers effectively.

### JWT Header Extraction

```yaml
# jwt-headers.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: jwt-proxy
  namespace: default
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - services:
    - name: protected-backend
      port: 80
    requestHeadersPolicy:
      set:
      # Extract user from JWT (requires external auth)
      - name: X-User-Email
        value: "%REQ(X-AUTH-REQUEST-EMAIL)%"
      - name: X-User-ID
        value: "%REQ(X-AUTH-REQUEST-USER)%"
      remove:
      # Remove bearer token before forwarding
      - Authorization
```

## Testing Header Policies

Verify header manipulation:

```bash
# Test request headers
curl -v https://api.example.com/ 2>&1 | grep ">"

# Test response headers
curl -v https://api.example.com/ 2>&1 | grep "<"

# Check specific header
curl -I https://api.example.com/ | grep "X-Custom-Header"

# Test with custom request header
curl -H "X-Beta-User: true" https://api.example.com/

# Verify security headers
curl -I https://app.example.com/ | grep -E "X-Frame-Options|Strict-Transport-Security"

# Test CORS
curl -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://api.example.com/
```

## Monitoring Header Policies

Check Contour logs for header processing:

```bash
kubectl logs -n projectcontour -l app=contour --follow
```

Verify HTTPProxy status:

```bash
kubectl describe httpproxy add-headers-proxy
```

## Conclusion

Contour's header manipulation capabilities provide powerful tools for implementing security policies, debugging, and routing logic without modifying application code. By adding security headers, removing sensitive information, and injecting debugging metadata, you can build more secure and observable applications. Always test header policies thoroughly, especially security headers, to ensure they don't break application functionality while providing the intended protection.
