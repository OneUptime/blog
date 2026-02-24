# How to Configure Custom Headers at Istio Ingress Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ingress Gateway, HTTP Headers, VirtualService, EnvoyFilter

Description: Practical guide to adding, removing, and modifying HTTP request and response headers at the Istio Ingress Gateway using VirtualService and EnvoyFilter.

---

Custom HTTP headers at the ingress gateway come up in almost every production deployment. You might need to add security headers like `X-Frame-Options`, inject correlation IDs, strip internal headers before they reach clients, or set `X-Forwarded-*` headers for backend services. Istio gives you multiple ways to manipulate headers at the ingress gateway.

This guide covers the main approaches: VirtualService header manipulation, EnvoyFilter for advanced cases, and some common patterns you will run into.

## Header Manipulation with VirtualService

The simplest way to add or modify headers is through the VirtualService resource. You can manipulate both request headers (going to your backend) and response headers (going back to the client).

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
  - istio-system/my-gateway
  http:
  - route:
    - destination:
        host: my-app-service
        port:
          number: 80
      headers:
        request:
          set:
            x-custom-header: "my-value"
            x-envoy-retry-on: "5xx"
          add:
            x-request-source: "ingress-gateway"
          remove:
          - x-internal-debug
        response:
          set:
            strict-transport-security: "max-age=31536000; includeSubDomains"
            x-content-type-options: "nosniff"
            x-frame-options: "DENY"
          remove:
          - x-powered-by
          - server
```

The difference between `set` and `add` is important:

- `set` overwrites the header if it already exists, or creates it if it does not
- `add` appends a new value even if the header already exists (creating duplicate headers)
- `remove` deletes the header entirely

## Adding Security Headers

A common requirement is adding security headers to all responses. Here is a comprehensive set:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: secure-app
  namespace: default
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - route:
    - destination:
        host: my-app-service
        port:
          number: 80
      headers:
        response:
          set:
            strict-transport-security: "max-age=31536000; includeSubDomains; preload"
            x-content-type-options: "nosniff"
            x-frame-options: "SAMEORIGIN"
            referrer-policy: "strict-origin-when-cross-origin"
            permissions-policy: "camera=(), microphone=(), geolocation=()"
            content-security-policy: "default-src 'self'; script-src 'self'"
          remove:
          - x-powered-by
          - server
          - x-aspnet-version
```

This strips headers that leak server information and adds headers that browsers use for security enforcement.

## Using EnvoyFilter for Advanced Header Logic

VirtualService covers most cases, but sometimes you need more control. EnvoyFilter lets you tap into Envoy's filter chain directly. For example, adding a header based on another header's value or applying headers globally to all routes:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-response-headers
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        response_headers_to_add:
        - header:
            key: x-served-by
            value: "istio-ingress"
          append: false
        response_headers_to_remove:
        - x-envoy-upstream-service-time
```

## Adding Request ID Headers

For distributed tracing, you often want to make sure every request has a unique ID. Envoy generates `x-request-id` automatically, but you might want to expose it with a different name:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: request-id-header
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        response_headers_to_add:
        - header:
            key: x-correlation-id
            value: "%REQ(x-request-id)%"
          append: false
```

The `%REQ(x-request-id)%` syntax is an Envoy command operator that references the value of the `x-request-id` header from the original request.

## CORS Headers at the Gateway

Cross-Origin Resource Sharing (CORS) headers can be configured directly in the VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-with-cors
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - corsPolicy:
      allowOrigins:
      - exact: "https://app.example.com"
      - regex: "https://.*\\.example\\.com"
      allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
      allowHeaders:
      - authorization
      - content-type
      - x-custom-header
      exposeHeaders:
      - x-correlation-id
      maxAge: "24h"
      allowCredentials: true
    route:
    - destination:
        host: api-service
        port:
          number: 8080
```

This is cleaner than manually setting CORS headers because Istio handles the preflight OPTIONS requests automatically.

## Forwarded Headers for Backend Services

When a load balancer sits in front of Istio, you need to pass along client information to backend services. Istio and Envoy handle some of this automatically, but you might need to customize it:

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
  - istio-system/my-gateway
  http:
  - route:
    - destination:
        host: my-app-service
        port:
          number: 80
      headers:
        request:
          set:
            x-forwarded-proto: "https"
            x-real-ip: "%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%"
```

Note that Envoy already sets `x-forwarded-for` and `x-forwarded-proto` in most cases. Check your backend's requirements before adding redundant headers.

## Conditional Header Manipulation

Sometimes you want different headers based on the request path. Use multiple match rules in your VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: conditional-headers
  namespace: default
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-service
        port:
          number: 8080
      headers:
        response:
          set:
            cache-control: "no-store"
  - match:
    - uri:
        prefix: /static
    route:
    - destination:
        host: static-service
        port:
          number: 80
      headers:
        response:
          set:
            cache-control: "public, max-age=86400"
```

API responses get `no-store` (no caching), while static assets get cached for 24 hours.

## Verifying Header Configuration

After applying your configuration, test it with curl:

```bash
# Check response headers
curl -I https://app.example.com/

# Check that request headers are reaching the backend
kubectl logs deploy/my-app-service -c istio-proxy | grep headers

# Check the Envoy configuration directly
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json
```

You can also use the `istioctl analyze` command to check for configuration issues:

```bash
istioctl analyze --namespace default
```

## Common Pitfalls

**Header names are case-insensitive in HTTP/2.** Envoy normalizes all header names to lowercase when using HTTP/2. If your backend expects mixed-case headers, it will still receive them in lowercase.

**Order of operations.** Request headers are modified before the request is sent to the backend. Response headers are modified before the response is sent to the client. EnvoyFilter patches run at the Envoy level, which may be before or after VirtualService modifications depending on the filter chain position.

**Duplicate headers.** Using `add` instead of `set` can create duplicate headers. Some backends don't handle this well. Prefer `set` unless you specifically need multiple values for the same header name.

**EnvoyFilter compatibility.** EnvoyFilter patches are tied to Envoy's internal API. They can break when you upgrade Istio. VirtualService header manipulation is more stable across versions.

## Summary

Istio provides solid header manipulation capabilities at the ingress gateway. Use VirtualService for straightforward add/set/remove operations and CORS configuration. Reach for EnvoyFilter when you need dynamic values, Envoy command operators, or global header policies across all routes. Always verify your configuration with curl and proxy-config commands to make sure headers are flowing correctly.
