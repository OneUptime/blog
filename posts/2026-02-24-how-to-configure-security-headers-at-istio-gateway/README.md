# How to Configure Security Headers at Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security Headers, Gateway, HSTS, CSP, Service Mesh

Description: How to add security headers like HSTS, CSP, and X-Frame-Options at the Istio ingress gateway to protect your web applications from common attacks.

---

Security headers are HTTP response headers that tell browsers how to behave when handling your site's content. Headers like Strict-Transport-Security, Content-Security-Policy, and X-Frame-Options protect against common web attacks such as clickjacking, XSS, and protocol downgrade attacks.

Instead of implementing these headers in every application, you can add them once at the Istio ingress gateway. Every response that flows through the gateway will include the security headers, giving you consistent protection across all your services.

## Why Add Security Headers at the Gateway

- **Consistency**: All services get the same security headers without individual configuration
- **Simplicity**: Application developers do not need to worry about security headers
- **Centralized management**: Update headers in one place, affects all services
- **No code changes**: Works with any backend application regardless of language or framework

## Essential Security Headers

Here are the headers you should add:

| Header | Purpose |
|---|---|
| Strict-Transport-Security (HSTS) | Forces HTTPS connections |
| X-Content-Type-Options | Prevents MIME type sniffing |
| X-Frame-Options | Prevents clickjacking |
| X-XSS-Protection | Legacy XSS protection |
| Content-Security-Policy | Controls resource loading |
| Referrer-Policy | Controls referrer information |
| Permissions-Policy | Controls browser features |

## Method 1: Using EnvoyFilter with Lua

The most flexible approach uses an EnvoyFilter with a Lua script to add headers to responses:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: security-headers
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
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_response(response_handle)
                response_handle:headers():add("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
                response_handle:headers():add("X-Content-Type-Options", "nosniff")
                response_handle:headers():add("X-Frame-Options", "DENY")
                response_handle:headers():add("X-XSS-Protection", "1; mode=block")
                response_handle:headers():add("Referrer-Policy", "strict-origin-when-cross-origin")
                response_handle:headers():add("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
                response_handle:headers():add("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'")
              end
```

Apply it:

```bash
kubectl apply -f security-headers.yaml
```

## Method 2: Using EnvoyFilter with Response Header Manipulation

For simpler header additions without Lua:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: security-headers-simple
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: ROUTE_CONFIGURATION
      match:
        context: GATEWAY
      patch:
        operation: MERGE
        value:
          response_headers_to_add:
            - header:
                key: Strict-Transport-Security
                value: "max-age=31536000; includeSubDomains; preload"
              append_action: OVERWRITE_IF_EXISTS_OR_ADD
            - header:
                key: X-Content-Type-Options
                value: "nosniff"
              append_action: OVERWRITE_IF_EXISTS_OR_ADD
            - header:
                key: X-Frame-Options
                value: "DENY"
              append_action: OVERWRITE_IF_EXISTS_OR_ADD
            - header:
                key: X-XSS-Protection
                value: "1; mode=block"
              append_action: OVERWRITE_IF_EXISTS_OR_ADD
            - header:
                key: Referrer-Policy
                value: "strict-origin-when-cross-origin"
              append_action: OVERWRITE_IF_EXISTS_OR_ADD
```

## Method 3: Using VirtualService Headers

For per-route header configuration, use VirtualService response headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: my-app-service
            port:
              number: 8080
      headers:
        response:
          add:
            Strict-Transport-Security: "max-age=31536000; includeSubDomains"
            X-Content-Type-Options: "nosniff"
            X-Frame-Options: "DENY"
            X-XSS-Protection: "1; mode=block"
            Referrer-Policy: "strict-origin-when-cross-origin"
```

This approach is simpler but applies only to specific routes.

## Configuring Content-Security-Policy

CSP is the most complex security header. It controls which resources (scripts, styles, images, etc.) the browser is allowed to load. A too-strict CSP breaks your app; a too-loose CSP does not protect anything.

Start with a report-only mode to see what would be blocked:

```yaml
response_handle:headers():add("Content-Security-Policy-Report-Only",
  "default-src 'self'; script-src 'self'; report-uri /csp-report")
```

After analyzing the reports and fixing violations, switch to enforcement:

```yaml
response_handle:headers():add("Content-Security-Policy",
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
```

## Per-Service CSP Configuration

Different services might need different CSP policies. Use the Lua approach with conditional logic:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: conditional-csp
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
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_response(response_handle)
                local headers = response_handle:headers()

                -- Common headers for all responses
                headers:add("X-Content-Type-Options", "nosniff")
                headers:add("X-Frame-Options", "DENY")
                headers:add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

                -- Get the request authority to determine CSP
                local authority = response_handle:headers():get(":authority")

                if authority == "app.example.com" then
                  headers:add("Content-Security-Policy", "default-src 'self'; script-src 'self' https://cdn.example.com")
                elseif authority == "admin.example.com" then
                  headers:add("Content-Security-Policy", "default-src 'self'; script-src 'self'")
                else
                  headers:add("Content-Security-Policy", "default-src 'self'")
                end
              end
```

## Removing Sensitive Headers

Besides adding security headers, remove headers that leak information:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: remove-sensitive-headers
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: ROUTE_CONFIGURATION
      match:
        context: GATEWAY
      patch:
        operation: MERGE
        value:
          response_headers_to_remove:
            - x-powered-by
            - server
            - x-aspnet-version
            - x-envoy-upstream-service-time
```

This removes headers that reveal technology stack details to potential attackers.

## Verifying Security Headers

After applying the configuration, verify headers are present:

```bash
curl -I https://app.example.com
```

Expected output:

```text
HTTP/2 200
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
content-security-policy: default-src 'self'
```

Use online tools like securityheaders.com to get a comprehensive assessment of your security headers.

## Testing with Security Scanners

Run a security header scan to verify your configuration:

```bash
# Using curl to check all security headers
curl -sI https://app.example.com | grep -iE "strict-transport|x-content-type|x-frame|x-xss|content-security|referrer-policy|permissions-policy"
```

## Troubleshooting

**Headers not appearing**: Check that the EnvoyFilter is applied to the right workload selector. The label `istio: ingressgateway` must match your gateway pod labels:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway --show-labels
```

**Duplicate headers**: If the backend also sets the same headers, you might get duplicates. Use `OVERWRITE_IF_EXISTS_OR_ADD` in the EnvoyFilter or remove the header first, then add it:

```lua
response_handle:headers():remove("X-Frame-Options")
response_handle:headers():add("X-Frame-Options", "DENY")
```

**CSP breaking the application**: Start with report-only mode, fix violations, then enforce. Common issues include inline scripts that need `'unsafe-inline'` (try to use nonces instead) and external resources that need to be whitelisted.

Adding security headers at the gateway is one of the quickest security wins you can get with Istio. It takes about 15 minutes to set up and immediately improves the security posture of every web application behind the gateway.
