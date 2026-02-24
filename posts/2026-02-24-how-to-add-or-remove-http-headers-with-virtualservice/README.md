# How to Add or Remove HTTP Headers with VirtualService

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, HTTP Headers, Request Headers, Response Headers

Description: A practical guide to adding, modifying, and removing HTTP request and response headers using Istio VirtualService header manipulation.

---

Manipulating HTTP headers at the proxy level is one of those things that saves you from having to write the same boilerplate in every service. Need to add a correlation ID? Strip sensitive headers before they reach the backend? Add security headers to every response? Istio VirtualService handles all of this through its header manipulation features.

## How Header Manipulation Works

Istio lets you modify headers in two places:

1. **Request headers** - Modified before the request reaches the destination service
2. **Response headers** - Modified before the response goes back to the caller

You can set (add/overwrite), add (append), or remove headers in both directions.

## Adding Request Headers

To add headers to requests before they hit your backend:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80
          headers:
            request:
              set:
                x-custom-header: "some-value"
                x-forwarded-service: "my-app"
```

The `set` operation creates the header if it does not exist or overwrites it if it does. Every request to my-app will now have these headers, regardless of what the caller sent.

## Adding Response Headers

To add headers to responses before they go back to the client:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80
          headers:
            response:
              set:
                x-powered-by: "my-platform"
                strict-transport-security: "max-age=31536000; includeSubDomains"
                x-content-type-options: "nosniff"
                x-frame-options: "DENY"
```

This is great for adding security headers consistently across all services without requiring each service to handle it.

## Removing Headers

To strip headers from requests or responses:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80
          headers:
            request:
              remove:
                - x-internal-token
                - x-debug-info
            response:
              remove:
                - server
                - x-powered-by
```

Removing the `server` and `x-powered-by` response headers is a common security practice. It prevents leaking information about your backend stack.

## Combining Set, Add, and Remove

You can do all three operations in the same rule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80
          headers:
            request:
              set:
                x-request-id: "%REQ(x-request-id)%"
                x-source: "istio-gateway"
              add:
                x-custom-metadata: "additional-info"
              remove:
                - x-legacy-header
            response:
              set:
                cache-control: "no-store"
              remove:
                - x-internal-debug
```

The difference between `set` and `add`:
- `set` overwrites the header value if it already exists
- `add` appends a new value, creating a multi-valued header

## Route-Level vs Match-Level Headers

Headers can be set at the route destination level. This means different destinations can have different headers:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            subset: v1
          weight: 90
          headers:
            request:
              set:
                x-version: "v1"
        - destination:
            host: my-app
            subset: v2
          weight: 10
          headers:
            request:
              set:
                x-version: "v2"
```

Each destination gets its own header value. The v1 backend receives `x-version: v1` and the v2 backend receives `x-version: v2`.

## Using Envoy Variables in Headers

Istio supports Envoy header variables that get replaced at runtime:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 80
          headers:
            request:
              set:
                x-envoy-upstream-rq-timeout-ms: "5000"
            response:
              set:
                x-envoy-upstream-service-time: "%RESP(x-envoy-upstream-service-time)%"
```

## Security Headers Pattern

Here is a practical pattern for adding security headers to all responses:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: secure-app
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: web-app
            port:
              number: 80
          headers:
            response:
              set:
                strict-transport-security: "max-age=63072000; includeSubDomains; preload"
                x-content-type-options: "nosniff"
                x-frame-options: "SAMEORIGIN"
                referrer-policy: "strict-origin-when-cross-origin"
                permissions-policy: "camera=(), microphone=(), geolocation=()"
              remove:
                - server
                - x-powered-by
                - x-aspnet-version
```

This applies a standard set of security headers to every response, regardless of what the backend returns.

## Conditional Header Manipulation

You can combine header manipulation with match conditions to apply headers only to specific requests:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    - match:
        - uri:
            prefix: "/api"
      route:
        - destination:
            host: api-service
            port:
              number: 80
          headers:
            request:
              set:
                x-api-gateway: "true"
            response:
              set:
                access-control-allow-origin: "*"
    - route:
        - destination:
            host: web-service
            port:
              number: 80
          headers:
            response:
              set:
                cache-control: "public, max-age=3600"
```

API requests get CORS headers, while web requests get caching headers.

## Verifying Header Manipulation

Test that headers are being added and removed correctly:

```bash
# Check response headers
curl -v http://my-app.default.svc.cluster.local/api/test 2>&1 | grep "< "

# Check what the backend receives (if your app can echo headers)
curl http://my-app.default.svc.cluster.local/api/echo-headers

# Check the Envoy configuration
istioctl proxy-config routes deploy/my-app -o json | grep -A 5 "requestHeadersToAdd"
```

## Limitations

A few things to know:

1. **No conditional logic within headers** - You cannot say "add this header only if another header has a certain value" within the headers block. Use separate match rules for that.

2. **Header names are case-insensitive** for matching but will be set as you specify them.

3. **You cannot modify the body** - Header manipulation only affects headers, not request or response bodies.

4. **Order of operations** - Envoy processes request header modifications before routing, and response header modifications after receiving the response from the upstream.

Header manipulation in Istio VirtualService is a clean way to standardize security headers, add tracking information, and strip sensitive data without touching your application code. It keeps these cross-cutting concerns at the infrastructure level where they belong.
