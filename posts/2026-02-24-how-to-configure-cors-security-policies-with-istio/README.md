# How to Configure CORS Security Policies with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CORS, Security, Kubernetes, Service Mesh

Description: Learn how to configure Cross-Origin Resource Sharing (CORS) security policies using Istio VirtualService to protect your microservices from unauthorized cross-origin requests.

---

Cross-Origin Resource Sharing (CORS) is one of those things that every web developer has fought with at some point. You get that dreaded browser error saying your request was blocked because of CORS policy, and suddenly your frontend can't talk to your backend. When you're running microservices behind Istio, you actually have a pretty elegant way to handle CORS at the mesh level instead of baking it into every individual service.

## Why Handle CORS at the Mesh Level?

Traditionally, each backend service handles its own CORS headers. That means every team has to remember to configure it, and configurations often drift between services. With Istio, you can centralize CORS policies in your VirtualService definitions. This keeps your application code clean and gives your platform team a single place to manage cross-origin rules.

## Understanding CORS Basics

Before jumping into configuration, a quick refresher. When a browser makes a request to a different origin (different domain, port, or protocol), it first sends a preflight OPTIONS request. The server responds with headers telling the browser what's allowed. If the response headers don't match what the browser expects, the request gets blocked.

The key headers involved are:

- `Access-Control-Allow-Origin` - which origins can access the resource
- `Access-Control-Allow-Methods` - which HTTP methods are permitted
- `Access-Control-Allow-Headers` - which headers can be sent
- `Access-Control-Max-Age` - how long the preflight response can be cached
- `Access-Control-Allow-Credentials` - whether cookies/auth headers are allowed

## Basic CORS Configuration with Istio

Istio handles CORS through the `corsPolicy` field on a VirtualService route. Here's a straightforward example:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-frontend-api
  namespace: default
spec:
  hosts:
    - api.example.com
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: api-service
            port:
              number: 8080
      corsPolicy:
        allowOrigins:
          - exact: https://app.example.com
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE
        allowHeaders:
          - Authorization
          - Content-Type
          - X-Custom-Header
        maxAge: "24h"
```

This configuration tells Istio to respond to preflight requests with the appropriate CORS headers. Only requests originating from `https://app.example.com` will be allowed through.

## Using Regex for Multiple Origins

Sometimes you need to allow multiple subdomains or a pattern of origins. Istio supports regex matching for origins:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: multi-origin-api
  namespace: default
spec:
  hosts:
    - api.example.com
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
      corsPolicy:
        allowOrigins:
          - exact: https://app.example.com
          - exact: https://admin.example.com
          - regex: "https://.*\\.staging\\.example\\.com"
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        allowHeaders:
          - Authorization
          - Content-Type
          - Accept
        exposeHeaders:
          - X-Request-Id
          - X-Trace-Id
        maxAge: "12h"
        allowCredentials: true
```

The `regex` field gives you flexibility to match patterns. In this case, any subdomain under `staging.example.com` is allowed. The `exposeHeaders` field controls which response headers the browser can access from JavaScript.

## Allowing Credentials

When your frontend needs to send cookies or authentication headers, you need `allowCredentials: true`. There's an important catch here - when credentials are allowed, you cannot use a wildcard for `allowOrigins`. You must specify exact origins or regex patterns:

```yaml
corsPolicy:
  allowOrigins:
    - exact: https://app.example.com
  allowMethods:
    - GET
    - POST
  allowHeaders:
    - Authorization
    - Content-Type
    - Cookie
  allowCredentials: true
  maxAge: "1h"
```

This is a browser-enforced rule, not an Istio limitation. If you try to use `allowCredentials` with a wildcard origin, the browser will reject the response anyway.

## Environment-Specific CORS Policies

A common pattern is having different CORS rules per environment. You can achieve this by having separate VirtualService definitions or by using Istio's namespace isolation:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-cors-dev
  namespace: development
spec:
  hosts:
    - api.dev.example.com
  gateways:
    - dev-gateway
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
      corsPolicy:
        allowOrigins:
          - regex: "https?://localhost:\\d+"
          - exact: https://dev.example.com
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - PATCH
          - OPTIONS
        allowHeaders:
          - "*"
        maxAge: "5m"
        allowCredentials: true
```

For development, you probably want to allow localhost on any port. In production, you'd lock this down to specific origins only.

## Debugging CORS Issues

When CORS isn't working as expected, the first thing to check is what headers Envoy is actually sending back. You can use curl to simulate a preflight request:

```bash
curl -v -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  https://api.example.com/api/resource
```

Look at the response headers. You should see the `Access-Control-Allow-*` headers matching your configuration.

You can also check the Envoy sidecar logs for CORS-related issues:

```bash
kubectl logs <pod-name> -c istio-proxy | grep -i cors
```

If the headers are missing entirely, make sure your VirtualService is actually being applied. Check with:

```bash
istioctl analyze -n default
```

```bash
istioctl proxy-config routes <pod-name> -o json
```

This dumps the route configuration that Envoy has received, and you can verify the CORS policy is included.

## Combining CORS with AuthorizationPolicy

CORS protects against browser-based cross-origin attacks, but it doesn't replace proper authorization. You should combine CORS policies with Istio AuthorizationPolicy for defense in depth:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-service
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/frontend-service
      to:
        - operation:
            methods:
              - GET
              - POST
            paths:
              - /api/*
```

This ensures that even if a CORS policy is misconfigured, only traffic from the frontend service account can reach your API. The CORS policy handles browser-level enforcement, while AuthorizationPolicy handles mesh-level enforcement.

## Handling Preflight Caching

The `maxAge` field controls how long browsers cache the preflight response. Setting this too low means extra OPTIONS requests on every API call. Setting it too high means changes to your CORS policy take longer to propagate to users.

A good middle ground for production is somewhere between 1 and 24 hours:

```yaml
corsPolicy:
  allowOrigins:
    - exact: https://app.example.com
  allowMethods:
    - GET
    - POST
  maxAge: "6h"
```

During development and testing, keep `maxAge` short (like `5m`) so changes take effect quickly.

## Common Mistakes to Avoid

One frequent issue is forgetting to include `OPTIONS` in the `allowMethods` list. While Istio handles preflight OPTIONS requests through the CORS policy itself, some setups need OPTIONS explicitly listed.

Another common mistake is having CORS headers set both in the application and in Istio. This can result in duplicate headers, which browsers treat as an error. Pick one place to handle CORS and stick with it.

Finally, watch out for Istio's ordering of HTTP routes. If you have multiple route matches in a VirtualService, the CORS policy must be on the route that actually matches the request. CORS policies on non-matching routes won't have any effect.

## Wrapping Up

Handling CORS at the Istio level simplifies your application code and gives you centralized control over cross-origin policies. The key is to start strict - only allow the origins, methods, and headers you actually need - and relax policies only when necessary. Combine CORS with AuthorizationPolicy for proper security layering, and use curl and istioctl to debug when things go wrong.
