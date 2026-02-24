# How to Remove Sensitive Headers with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Headers, VirtualService, EnvoyFilter

Description: How to strip sensitive HTTP headers from requests and responses using Istio to prevent information leakage and improve security posture.

---

HTTP headers can leak a surprising amount of information about your infrastructure. Server names, framework versions, internal routing details, debug tokens, and more can all be exposed through response headers that your backend services emit without much thought. Istio gives you the ability to strip these headers at the proxy level, so even if your application sends them, they never make it to the client.

## Why Header Removal Matters

Every time your server responds with `Server: nginx/1.24.0` or `X-Powered-By: Express`, you are handing an attacker a starting point. They now know exactly which software you run and can look up known vulnerabilities for that specific version. Removing these headers is a basic security hygiene practice that takes minutes to implement in Istio but would otherwise require changes to every individual service.

## Removing Response Headers with VirtualService

The simplest approach is to remove headers in the VirtualService route configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            response:
              remove:
                - server
                - x-powered-by
                - x-aspnet-version
                - x-aspnetmvc-version
                - x-runtime
                - x-version
                - x-generator
                - x-drupal-cache
                - x-request-id
```

This strips the listed headers from every response that goes through this route.

## Removing Request Headers Before They Reach Backends

Sometimes you also want to strip headers from incoming requests before they reach your backend services. This prevents clients from injecting headers that could confuse your application logic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: secure-api
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            request:
              remove:
                - x-forwarded-for
                - x-real-ip
                - x-internal-token
                - x-debug
                - x-admin-override
            response:
              remove:
                - server
                - x-powered-by
```

Removing `x-internal-token` and `x-admin-override` prevents external clients from spoofing internal service-to-service headers.

## Global Header Removal with EnvoyFilter

If you want to remove sensitive headers across all services in the mesh, not just specific routes, use an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: remove-sensitive-headers
  namespace: istio-system
spec:
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
            inlineCode: |
              function envoy_on_response(response_handle)
                local headers_to_remove = {
                  "server",
                  "x-powered-by",
                  "x-aspnet-version",
                  "x-aspnetmvc-version",
                  "x-runtime",
                  "x-version",
                  "x-generator",
                  "x-drupal-cache",
                  "x-request-id"
                }
                for _, header in ipairs(headers_to_remove) do
                  response_handle:headers():remove(header)
                end
              end
```

This runs on the ingress gateway and catches all responses going to external clients.

## Protecting Internal Headers in Service-to-Service Communication

Within the mesh, services communicate through sidecars. You might have internal headers that should flow between services but never leave the mesh:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: strip-internal-at-gateway
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
            inlineCode: |
              function envoy_on_request(request_handle)
                -- Remove internal headers from incoming external requests
                request_handle:headers():remove("x-internal-service-id")
                request_handle:headers():remove("x-internal-trace")
                request_handle:headers():remove("x-internal-auth")
              end
              function envoy_on_response(response_handle)
                -- Remove internal headers from outgoing responses
                response_handle:headers():remove("x-internal-service-id")
                response_handle:headers():remove("x-internal-trace")
                response_handle:headers():remove("x-internal-processing-time")
              end
```

## Removing Headers Based on Conditions

With Lua filters, you can conditionally remove headers. For example, only strip debug headers in production:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: conditional-header-removal
  namespace: production
spec:
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
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
            inlineCode: |
              function envoy_on_response(response_handle)
                -- Always remove server fingerprinting
                response_handle:headers():remove("server")
                response_handle:headers():remove("x-powered-by")

                -- Remove debug headers in production
                response_handle:headers():remove("x-debug-info")
                response_handle:headers():remove("x-trace-id")
                response_handle:headers():remove("x-request-duration")
              end
```

## Common Headers to Remove

Here is a list of headers you should consider removing at the gateway:

**Server fingerprinting headers:**
- `server` - web server name and version
- `x-powered-by` - framework/language info
- `x-aspnet-version` - ASP.NET version
- `x-aspnetmvc-version` - ASP.NET MVC version
- `x-runtime` - Ruby on Rails runtime
- `x-generator` - CMS generator info

**Debug and internal headers:**
- `x-debug` - debug mode indicators
- `x-request-id` - internal request tracking (remove if not needed externally)
- `x-b3-traceid` - Zipkin trace ID (remove if not exposing to clients)
- `x-b3-spanid` - Zipkin span ID

**Infrastructure headers:**
- `x-envoy-upstream-service-time` - reveals Envoy is in use
- `x-envoy-decorator-operation` - reveals route configuration

## Removing Envoy-Specific Headers

Istio/Envoy itself adds headers that reveal the use of a service mesh. To remove these:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: clean-responses
spec:
  hosts:
    - "app.example.com"
  gateways:
    - main-gateway
  http:
    - route:
        - destination:
            host: app-service
            port:
              number: 8080
          headers:
            response:
              remove:
                - x-envoy-upstream-service-time
                - x-envoy-decorator-operation
```

## Verifying Header Removal

Use curl to check that headers are actually being stripped:

```bash
# Before applying the configuration
curl -sI http://app.example.com/ | grep -i "server\|x-powered-by\|x-envoy"

# After applying
curl -sI http://app.example.com/ | grep -i "server\|x-powered-by\|x-envoy"
```

The second command should return nothing for the stripped headers.

For a more thorough check:

```bash
curl -sI http://app.example.com/ 2>&1 | sort
```

Review every header in the response and ask yourself whether each one needs to be there.

## Combining Removal with Replacement

Sometimes instead of removing a header, you want to replace it with a generic value:

```yaml
headers:
  response:
    set:
      server: "web"
    remove:
      - x-powered-by
      - x-runtime
```

This sets `server` to a generic "web" string instead of removing it entirely. Some security scanners expect a server header to be present.

## Testing with Security Scanners

After configuring header removal, run a security scanner to verify:

```bash
# Using curl with detailed headers
curl -v https://app.example.com/ 2>&1 | grep "< "

# Using nmap for HTTP header enumeration
nmap --script http-headers -p 443 app.example.com
```

Removing sensitive headers is a quick security win. It takes a few minutes to configure in Istio and eliminates an entire category of information disclosure vulnerabilities. The VirtualService approach handles most use cases, and EnvoyFilter covers the edge cases where you need global or conditional removal logic.
