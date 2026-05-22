# How to Configure CORS Headers with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CORS, Security, VirtualService, Web Security

Description: How to configure Cross-Origin Resource Sharing (CORS) headers in Istio VirtualService to control browser-based cross-origin API access.

---

Cross-Origin Resource Sharing (CORS) is one of those things that looks simple on the surface but causes headaches in practice. When your frontend at `app.example.com` needs to call an API at `api.example.com`, the browser enforces CORS rules. If the API does not respond with the right headers, the browser blocks the request. Istio lets you handle CORS at the mesh level instead of configuring it in every backend service.

## How CORS Works

When a browser makes some cross-origin requests, it first sends a preflight OPTIONS request to check if the server allows the actual request. Simple requests do not use a preflight, but the actual response still needs the right CORS headers. The server responds with CORS headers indicating what is permitted. If the headers match the request, the browser proceeds or exposes the response to JavaScript. If not, it blocks access and throws an error in the console.

The key headers involved:

- `Access-Control-Allow-Origin` - which origins can access the resource
- `Access-Control-Allow-Methods` - which HTTP methods are allowed
- `Access-Control-Allow-Headers` - which request headers are allowed
- `Access-Control-Expose-Headers` - which response headers the browser can access
- `Access-Control-Max-Age` - how long the browser caches the preflight result
- `Access-Control-Allow-Credentials` - whether cookies/auth headers are sent

## CORS in VirtualService

Istio has built-in CORS support through the `corsPolicy` field in VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-cors
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - corsPolicy:
        allowOrigins:
          - exact: "https://app.example.com"
          - exact: "https://admin.example.com"
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        allowHeaders:
          - authorization
          - content-type
          - x-requested-with
          - x-custom-header
        exposeHeaders:
          - x-request-id
          - x-correlation-id
        maxAge: "24h"
        allowCredentials: true
      route:
        - destination:
            host: api-service
            port:
              number: 8080
```

This tells the Envoy proxy to handle CORS preflight requests automatically and add the appropriate response headers to actual requests.

## Wildcard Origins

For development environments or public APIs, you might want to allow any origin:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: public-api-cors
spec:
  hosts:
    - public-api.example.com
  gateways:
    - main-gateway
  http:
    - corsPolicy:
        allowOrigins:
          - regex: ".*"
        allowMethods:
          - GET
          - POST
          - OPTIONS
        allowHeaders:
          - content-type
          - authorization
        maxAge: "1h"
        allowCredentials: false
      route:
        - destination:
            host: public-api
            port:
              number: 8080
```

Note that credentials and a literal wildcard CORS response do not work together. The CORS spec forbids `Access-Control-Allow-Origin: *` when credentials are included. Istio's `regex: ".*"` matches any origin and reflects the request origin in `Access-Control-Allow-Origin`; do not combine that broad match with credentials unless you intentionally trust every possible origin. For credentialed browser requests, list specific origins instead.

## Regex Origin Matching

For more flexible origin matching, use regex patterns:

```yaml
corsPolicy:
  allowOrigins:
    - regex: "https://.*\\.example\\.com"
    - regex: "https://.*\\.staging\\.example\\.com"
  allowMethods:
    - GET
    - POST
    - PUT
    - DELETE
    - OPTIONS
  allowHeaders:
    - authorization
    - content-type
  maxAge: "12h"
```

This allows any subdomain of `example.com` and `staging.example.com`.

## Different CORS Policies per Route

You can apply different CORS configurations to different routes:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    # Public endpoints - permissive CORS
    - match:
        - uri:
            prefix: /api/public
      corsPolicy:
        allowOrigins:
          - regex: ".*"
        allowMethods:
          - GET
          - OPTIONS
        allowHeaders:
          - content-type
        maxAge: "24h"
        allowCredentials: false
      route:
        - destination:
            host: api-service
            port:
              number: 8080
    # Authenticated endpoints - strict CORS
    - match:
        - uri:
            prefix: /api/private
      corsPolicy:
        allowOrigins:
          - exact: "https://app.example.com"
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        allowHeaders:
          - authorization
          - content-type
          - x-csrf-token
        exposeHeaders:
          - x-request-id
        maxAge: "1h"
        allowCredentials: true
      route:
        - destination:
            host: api-service
            port:
              number: 8080
```

## Handling Preflight Requests

When Istio's CORS policy is configured, the Envoy proxy automatically handles matching OPTIONS preflight requests. The preflight response is generated by the proxy itself and never reaches your backend service. This is efficient because your service does not need to handle allowed OPTIONS preflight requests at all.

You can verify this by checking the access logs:

```bash
kubectl logs deploy/istio-ingressgateway -n istio-system -c istio-proxy | grep "OPTIONS"
```

For a VirtualService attached to a gateway, you should see the preflight requests being handled by the gateway proxy instead of your application container.

## CORS with EnvoyFilter

For scenarios where VirtualService CORS is not flexible enough, use EnvoyFilter for custom CORS handling:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-cors
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
            default_source_code:
              inline_string: |
                function envoy_on_request(request_handle)
                  local origin = request_handle:headers():get("origin")
                  if origin and (origin:find("%.example%.com$") or origin:find("localhost")) then
                    request_handle:streamInfo():dynamicMetadata():set(
                      "envoy.filters.http.lua",
                      "cors_origin",
                      origin
                    )
                  end
                  if request_handle:headers():get(":method") == "OPTIONS" then
                    -- Custom origin validation logic
                    local allowed = false
                    if origin and (origin:find("%.example%.com$") or origin:find("localhost")) then
                      allowed = true
                    end
                    if allowed then
                      request_handle:respond(
                        {[":status"] = "204",
                         ["access-control-allow-origin"] = origin,
                         ["access-control-allow-methods"] = "GET, POST, PUT, DELETE, OPTIONS",
                         ["access-control-allow-headers"] = "authorization, content-type",
                         ["access-control-max-age"] = "86400",
                         ["access-control-allow-credentials"] = "true"},
                        ""
                      )
                    end
                  end
                end
                function envoy_on_response(response_handle)
                  local metadata = response_handle:streamInfo():dynamicMetadata():get("envoy.filters.http.lua") or {}
                  local origin = metadata["cors_origin"]
                  if origin then
                    response_handle:headers():add("access-control-allow-origin", origin)
                    response_handle:headers():add("access-control-allow-credentials", "true")
                  end
                end
```

## Common CORS Issues and Fixes

**Problem: Preflight succeeds but actual request fails**

This usually means the actual response is missing CORS headers. Make sure your VirtualService CORS policy is on the correct route:

```yaml
http:
  - corsPolicy:
      allowOrigins:
        - exact: "https://app.example.com"
    route:
      - destination:
          host: api-service
```

The `corsPolicy` must be at the same level as the `route`, not nested inside it.

**Problem: Credentials not being sent**

Check that `allowCredentials` is `true` and you are not using a wildcard origin:

```yaml
corsPolicy:
  allowOrigins:
    - exact: "https://app.example.com"
  allowCredentials: true
```

**Problem: Custom headers not accessible in JavaScript**

Use `exposeHeaders` to make response headers available to browser JavaScript:

```yaml
corsPolicy:
  exposeHeaders:
    - x-request-id
    - x-custom-response
    - x-total-count
```

Without `exposeHeaders`, the browser only lets JavaScript access a small set of "simple" response headers.

## Testing CORS Configuration

Test preflight:

```bash
curl -v -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type, authorization" \
  https://api.example.com/api/users
```

Check the response for the CORS headers. Test an actual cross-origin request:

```bash
curl -v \
  -H "Origin: https://app.example.com" \
  -H "Content-Type: application/json" \
  -X POST -d '{"name":"test"}' \
  https://api.example.com/api/users
```

The response should include `Access-Control-Allow-Origin: https://app.example.com`.

## CORS for Mesh-Internal Services

CORS is primarily a browser security mechanism. For service-to-service communication within the mesh, you generally do not need CORS. Only configure it on VirtualServices attached to gateways where browser clients connect.

That said, if you have a service that is accessed both internally and externally, the CORS headers in the response will not hurt internal callers. They will just be ignored.

Getting CORS right in Istio means your frontend developers do not have to chase backend teams to add CORS headers to every service. Configure it once at the mesh gateway level and it applies consistently.
