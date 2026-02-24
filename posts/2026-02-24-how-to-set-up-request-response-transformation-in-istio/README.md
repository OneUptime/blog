# How to Set Up Request/Response Transformation in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Request Transformation, Headers, EnvoyFilter, Lua, Kubernetes

Description: How to transform HTTP requests and responses in Istio using VirtualService headers, EnvoyFilter with Lua scripts, and Wasm plugins for advanced use cases.

---

Request and response transformation is about modifying HTTP messages as they pass through the proxy. This includes adding, removing, or changing headers, rewriting the body, modifying query parameters, or transforming JSON payloads. Istio gives you several tools for this, ranging from simple header manipulation in VirtualService to full body transformation with Lua or Wasm.

## Header Transformation with VirtualService

The simplest form of transformation is header manipulation using VirtualService route-level headers:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: header-transform
  namespace: default
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            port:
              number: 8080
          headers:
            request:
              set:
                x-custom-header: "my-value"
                x-forwarded-host: "%REQ(:authority)%"
              add:
                x-trace-id: "%REQ(x-request-id)%"
              remove:
                - x-internal-only
            response:
              set:
                x-served-by: "my-service-v1"
                cache-control: "public, max-age=3600"
              add:
                x-response-time: "%RESP(x-envoy-upstream-service-time)%"
              remove:
                - x-powered-by
                - server
```

The three operations are:

- `set` - replaces the header value if it exists, or adds it if it does not
- `add` - appends a new value (supports multiple values for the same header)
- `remove` - strips the header entirely

You can use Envoy command operators in the values:

- `%REQ(header-name)%` - request header value
- `%RESP(header-name)%` - response header value
- `%DOWNSTREAM_REMOTE_ADDRESS%` - client IP address
- `%START_TIME%` - request start time
- `%PROTOCOL%` - HTTP protocol version

### Per-Destination Headers

Different routes can have different header transformations:

```yaml
http:
  - match:
      - headers:
          x-canary:
            exact: "true"
    route:
      - destination:
          host: my-service
          subset: v2
        headers:
          request:
            set:
              x-version: "canary"
  - route:
      - destination:
          host: my-service
          subset: v1
        headers:
          request:
            set:
              x-version: "stable"
```

## Advanced Header Transformation with EnvoyFilter

For more complex header manipulation, use EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: header-transform
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
    - applyTo: ROUTE_CONFIGURATION
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          request_headers_to_add:
            - header:
                key: x-custom-header
                value: "%REQ(x-forwarded-for)%"
              append: true
          request_headers_to_remove:
            - "x-secret-header"
          response_headers_to_add:
            - header:
                key: strict-transport-security
                value: "max-age=31536000; includeSubDomains"
              append: false
          response_headers_to_remove:
            - "x-envoy-upstream-service-time"
```

## Body Transformation with Lua

For request or response body transformation, you need a Lua filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: body-transform
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
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
            inline_code: |
              function envoy_on_request(request_handle)
                -- Add a timestamp header
                request_handle:headers():add("x-request-timestamp", tostring(os.time()))

                -- Read and modify request body
                local body = request_handle:body()
                if body then
                  local body_str = body:getBytes(0, body:length())
                  -- Add a wrapper to the JSON body
                  if request_handle:headers():get("content-type") == "application/json" then
                    local wrapped = '{"timestamp":' .. tostring(os.time()) .. ',"data":' .. body_str .. '}'
                    request_handle:body():setBytes(wrapped)
                  end
                end
              end

              function envoy_on_response(response_handle)
                -- Add response metadata
                response_handle:headers():add("x-proxy-processed", "true")

                -- Modify response body
                local body = response_handle:body()
                if body then
                  local body_str = body:getBytes(0, body:length())
                  local content_type = response_handle:headers():get("content-type") or ""
                  if string.find(content_type, "application/json") then
                    -- Wrap response in an envelope
                    local wrapped = '{"status":"ok","response":' .. body_str .. '}'
                    response_handle:body():setBytes(wrapped)
                    response_handle:headers():replace("content-length", tostring(#wrapped))
                  end
                end
              end
```

Important notes about Lua body access:

- Body access requires buffering. If the body is not buffered, `request_handle:body()` returns nil
- For body access to work, you may need the buffer filter enabled (see the request buffering post)
- Large bodies consume memory when buffered
- Always update the `content-length` header when modifying the body

## Conditional Transformations

You can apply transformations conditionally based on headers, paths, or other criteria:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: conditional-transform
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-gateway
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
            inline_code: |
              function envoy_on_request(request_handle)
                local path = request_handle:headers():get(":path")
                local method = request_handle:headers():get(":method")

                -- Add correlation ID if not present
                if not request_handle:headers():get("x-correlation-id") then
                  request_handle:headers():add("x-correlation-id",
                    request_handle:headers():get("x-request-id") or "unknown")
                end

                -- Transform based on API version
                if string.find(path, "^/api/v1/") then
                  request_handle:headers():add("x-api-version", "1")
                elseif string.find(path, "^/api/v2/") then
                  request_handle:headers():add("x-api-version", "2")
                end

                -- Add auth context
                local auth_header = request_handle:headers():get("authorization")
                if auth_header then
                  request_handle:headers():add("x-authenticated", "true")
                else
                  request_handle:headers():add("x-authenticated", "false")
                end
              end

              function envoy_on_response(response_handle)
                -- Strip internal headers from external responses
                response_handle:headers():remove("x-internal-debug")
                response_handle:headers():remove("x-backend-server")

                -- Add security headers
                response_handle:headers():add("x-content-type-options", "nosniff")
                response_handle:headers():add("x-frame-options", "DENY")
                response_handle:headers():add("x-xss-protection", "1; mode=block")
              end
```

## Query Parameter Transformation

Envoy does not have native query parameter transformation, but you can handle it in Lua:

```yaml
inline_code: |
  function envoy_on_request(request_handle)
    local path = request_handle:headers():get(":path")

    -- Add a query parameter
    if string.find(path, "?") then
      path = path .. "&source=mesh"
    else
      path = path .. "?source=mesh"
    end

    request_handle:headers():replace(":path", path)
  end
```

## Request Transformation on the Gateway

Apply transformations at the gateway level for external-facing APIs:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-transform
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
              function envoy_on_request(request_handle)
                -- Normalize Accept header
                local accept = request_handle:headers():get("accept")
                if not accept or accept == "" then
                  request_handle:headers():add("accept", "application/json")
                end

                -- Strip known problematic headers
                request_handle:headers():remove("x-forwarded-host")
              end

              function envoy_on_response(response_handle)
                -- Remove server identity headers
                response_handle:headers():remove("server")
                response_handle:headers():remove("x-powered-by")

                -- Add CORS headers if not present
                if not response_handle:headers():get("access-control-allow-origin") then
                  response_handle:headers():add("access-control-allow-origin", "*")
                end
              end
```

## Debugging Transformations

To verify your transformations are working:

```bash
# Check the filter chain
istioctl proxy-config listeners <pod> -n <namespace> -o json

# Test with verbose curl
curl -v http://my-service/api/test

# Check Envoy access logs for header values
kubectl logs <pod> -c istio-proxy
```

Request and response transformation at the proxy level keeps your application code clean and provides a centralized place to manage cross-cutting concerns like security headers, request enrichment, and response sanitization. Start with VirtualService headers for simple cases and reach for Lua or Wasm when you need body transformations or complex logic.
