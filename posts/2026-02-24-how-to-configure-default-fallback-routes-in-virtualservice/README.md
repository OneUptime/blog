# How to Configure Default Fallback Routes in VirtualService

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Fallback Routes, Traffic Management, Kubernetes

Description: Learn how to configure default fallback routes in Istio VirtualService to handle unmatched traffic and prevent 404 errors.

---

Every VirtualService should have a default fallback route. Without one, requests that do not match any of your specific rules get dropped with a 404 or, worse, end up somewhere unexpected. A well-designed fallback route acts as a safety net, catching anything your specific rules missed and sending it to a sensible destination.

## What is a Fallback Route

A fallback route is simply an HTTP route rule with no match conditions. Because Istio evaluates rules top-to-bottom and uses the first match, a rule without conditions matches everything. Put it last, and it catches all traffic that slipped past your specific rules.

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
            prefix: "/api/v2"
      route:
        - destination:
            host: api-v2
    - match:
        - uri:
            prefix: "/api/v1"
      route:
        - destination:
            host: api-v1
    # Fallback route - no match condition
    - route:
        - destination:
            host: default-service
            port:
              number: 80
```

The last rule has no `match` field, so it matches any request that did not match `/api/v2` or `/api/v1`.

## Why Fallback Routes Matter

Without a fallback route, Istio generates a default route to the host specified in the VirtualService's `hosts` field. This usually works fine, but it gives you no control over the behavior. With an explicit fallback, you can:

- Route to a specific service or version
- Add timeouts and retries
- Return a custom error response
- Redirect to another URL
- Apply specific headers

## Basic Fallback to a Default Version

The most common pattern is routing unmatched traffic to a stable version:

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
        - headers:
            x-version:
              exact: "beta"
      route:
        - destination:
            host: my-app
            subset: beta
    - match:
        - headers:
            x-version:
              exact: "canary"
      route:
        - destination:
            host: my-app
            subset: canary
    # Fallback: everything else goes to stable
    - route:
        - destination:
            host: my-app
            subset: stable
```

Only requests with specific version headers go to beta or canary. Everything else lands safely on stable.

## Fallback with Error Handling

You can use the fallback to return a specific error for unknown paths:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: "/api/v1"
      route:
        - destination:
            host: api-v1
    - match:
        - uri:
            prefix: "/api/v2"
      route:
        - destination:
            host: api-v2
    # Fallback: direct fault for unknown endpoints
    - fault:
        abort:
          httpStatus: 404
          percentage:
            value: 100
      route:
        - destination:
            host: api-v1
```

Requests that do not match any known API path get a 404 response. The `route` is still required even with fault injection, but it never actually routes because the abort fires first.

## Fallback Redirect

Redirect unmatched traffic to a help page or documentation:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-app
  namespace: default
spec:
  hosts:
    - "www.example.com"
  gateways:
    - web-gateway
  http:
    - match:
        - uri:
            prefix: "/app"
      route:
        - destination:
            host: web-app
    - match:
        - uri:
            prefix: "/docs"
      route:
        - destination:
            host: docs-service
    # Fallback: redirect unknown paths to the main app
    - redirect:
        uri: "/app"
        redirectCode: 302
```

Any path that is not `/app` or `/docs` gets redirected to `/app`.

## Fallback with Headers

Add informational headers to fallback responses so you can tell when a request hit the fallback:

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
          headers:
            response:
              set:
                x-route-match: "api"
    - route:
        - destination:
            host: default-service
          headers:
            response:
              set:
                x-route-match: "fallback"
```

When debugging, check the `x-route-match` response header to see which route the request hit.

## Fallback for Gateway Traffic

For ingress gateways, the fallback route handles requests for unknown paths or unexpected traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ingress-routes
  namespace: default
spec:
  hosts:
    - "*.example.com"
  gateways:
    - main-gateway
  http:
    - match:
        - authority:
            exact: "api.example.com"
      route:
        - destination:
            host: api-service
            port:
              number: 80
    - match:
        - authority:
            exact: "app.example.com"
      route:
        - destination:
            host: web-app
            port:
              number: 80
    # Fallback for unknown subdomains
    - redirect:
        authority: "www.example.com"
        redirectCode: 301
```

Unknown subdomains get redirected to the main website.

## Weighted Fallback Routes

Even the fallback can use weighted routing:

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
        - headers:
            x-premium:
              exact: "true"
      route:
        - destination:
            host: my-app
            subset: premium
    # Fallback with canary split
    - route:
        - destination:
            host: my-app
            subset: stable
          weight: 95
        - destination:
            host: my-app
            subset: canary
          weight: 5
```

Premium users get the premium backend. Everyone else gets a 95/5 split between stable and canary.

## Multiple VirtualServices and Fallback

When you have multiple VirtualServices for the same host, the fallback behavior can get confusing. If VirtualService A has specific rules and VirtualService B has a catch-all, the merge order is unpredictable.

The safe approach is to keep everything in one VirtualService:

```yaml
# Good: single VirtualService with clear fallback
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
    - match:
        - uri:
            prefix: "/web"
      route:
        - destination:
            host: web-service
    - route:
        - destination:
            host: default-service
```

## TCP Fallback Routes

TCP VirtualService routes also support fallback patterns:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tcp-services
  namespace: default
spec:
  hosts:
    - my-tcp-service
  tcp:
    - match:
        - port: 5432
      route:
        - destination:
            host: postgres
            port:
              number: 5432
    - match:
        - port: 6379
      route:
        - destination:
            host: redis
            port:
              number: 6379
    # TCP fallback
    - route:
        - destination:
            host: default-tcp-handler
            port:
              number: 9000
```

## Testing Fallback Routes

Make sure your fallback is working by sending requests that should not match any specific rule:

```bash
# This should hit a specific route
curl http://my-app/api/users

# This should hit the fallback
curl http://my-app/unknown-path

# Check which route matched
curl -v http://my-app/unknown-path 2>&1 | grep "x-route-match"

# Verify the proxy configuration
istioctl proxy-config routes deploy/my-app -n default -o json
```

## Common Mistakes

1. **Putting the fallback first** - A route without match conditions matches everything. If it is first, no other rules will ever trigger.

2. **Missing fallback entirely** - Without a fallback, unmatched requests either get a 404 or go to the default Kubernetes service routing, which might not be what you want.

3. **Forgetting the fallback in canary setups** - If you add header-based canary routing but forget the fallback, regular traffic without the canary header gets no route.

4. **Overly broad match before fallback** - A match with `prefix: "/"` catches everything, just like a route with no match. Make sure your last specific rule is not accidentally acting as a catch-all.

Fallback routes are the safety net of your VirtualService configuration. They ensure every request gets handled, even when it does not match your specific rules. Always end your VirtualService with a clear, intentional fallback route.
