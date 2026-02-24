# How to Configure Request Body Transformation with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Request Body, Transformation, Lua Filter

Description: How to transform HTTP request and response bodies using Istio EnvoyFilter with Lua scripting for payload manipulation and data enrichment.

---

Header transformation in Istio is straightforward with VirtualService. Body transformation is a different story. Istio does not have a native, first-class mechanism for modifying request or response bodies. You have to drop down to EnvoyFilter with Lua scripting or use Envoy's built-in transformation filters. It is more work, but it is doable when you need it.

## Why Body Transformation?

There are several scenarios where modifying the request or response body at the proxy level makes sense:

- Adding fields to a JSON request before it reaches the backend
- Stripping sensitive data from responses before they leave the mesh
- Converting between payload formats for legacy service compatibility
- Injecting metadata into request bodies for auditing

That said, body transformation at the proxy level is inherently more complex and resource-intensive than header manipulation. If you can solve the problem with headers or by changing the application, that is usually the better approach.

## Basic Lua Body Transformation

Envoy supports body buffering and modification through Lua filters. Here is an EnvoyFilter that adds a field to JSON request bodies:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: request-body-transform
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-service
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
              function envoy_on_request(request_handle)
                local content_type = request_handle:headers():get("content-type")
                if content_type and content_type:find("application/json") then
                  local body = request_handle:body()
                  if body then
                    local body_str = body:getBytes(0, body:length())
                    -- Simple JSON field injection (before the closing brace)
                    local modified = body_str:gsub("}$", ', "injected_by": "istio-proxy"}')
                    request_handle:body():setBytes(modified)
                  end
                end
              end
```

There is an important caveat here. For the Lua filter to access the body, the entire body must be buffered in memory. You need to configure body buffering explicitly.

## Enabling Body Buffering

To buffer the request body so Lua can access it, you need to tell Envoy to wait for the full body before invoking the filter. This is done through the `per_route` configuration or by using `request_handle:body()` with the body buffering mode:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: body-buffer-config
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-service
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
            defaultSourceCode:
              inlineString: |
                function envoy_on_request(request_handle)
                  -- This call buffers the entire request body
                  local body = request_handle:body(true)
                  if body then
                    local body_str = body:getBytes(0, body:length())
                    request_handle:logInfo("Request body size: " .. body:length())
                  end
                end
```

## Response Body Transformation

Modifying response bodies follows the same pattern:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: response-body-transform
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-service
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
                local content_type = response_handle:headers():get("content-type")
                if content_type and content_type:find("application/json") then
                  local body = response_handle:body(true)
                  if body then
                    local body_str = body:getBytes(0, body:length())
                    -- Remove sensitive fields from response
                    local modified = body_str:gsub('"ssn"%s*:%s*"[^"]*"', '"ssn":"***REDACTED***"')
                    modified = modified:gsub('"password"%s*:%s*"[^"]*"', '"password":"***REDACTED***"')
                    response_handle:body():setBytes(modified)
                    -- Update content-length header
                    response_handle:headers():replace("content-length", tostring(#modified))
                  end
                end
              end
```

This example redacts `ssn` and `password` fields from JSON responses. The content-length header is updated to reflect the modified body size.

## Gateway-Level Body Transformation

Apply body transformation at the gateway for all incoming requests:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-body-transform
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
                local method = request_handle:headers():get(":method")
                if method == "POST" or method == "PUT" then
                  local body = request_handle:body(true)
                  if body then
                    local body_str = body:getBytes(0, body:length())
                    -- Add audit metadata to the request body
                    local timestamp = os.time()
                    local modified = body_str:gsub(
                      "^{",
                      '{"_audit_timestamp":' .. timestamp .. ','
                    )
                    request_handle:body():setBytes(modified)
                    request_handle:headers():replace("content-length", tostring(#modified))
                  end
                end
              end
```

## Limitations and Considerations

**Memory usage**: Body buffering loads the entire request or response body into memory. For large payloads (file uploads, bulk data), this can consume significant memory on the Envoy proxy.

Set a body size limit to prevent memory issues:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: body-size-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-service
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
              function envoy_on_request(request_handle)
                local content_length = request_handle:headers():get("content-length")
                if content_length and tonumber(content_length) > 1048576 then
                  -- Skip body transformation for requests over 1MB
                  return
                end
                local body = request_handle:body(true)
                if body then
                  -- Transform small bodies only
                  local body_str = body:getBytes(0, body:length())
                  request_handle:logInfo("Processing body of size: " .. body:length())
                end
              end
```

**Latency**: Buffering the body adds latency because Envoy cannot start forwarding the request until the entire body is received. For streaming workloads, this is a deal-breaker.

**JSON parsing**: Lua does not have a built-in JSON parser. The string manipulation approach shown above works for simple cases, but for complex JSON transformations you would need to include a Lua JSON library or use a different approach entirely.

**Content-Length header**: If you modify the body, you must update the `content-length` header. If the header does not match the actual body length, the downstream service may fail to parse the response.

## Alternative: External Processing

For complex body transformations, consider using an external processing service instead of Lua:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ext-proc-body
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-service
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
          name: envoy.filters.http.ext_proc
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.ext_proc.v3.ExternalProcessor
            grpc_service:
              envoy_grpc:
                cluster_name: outbound|8081||body-transformer.default.svc.cluster.local
            processing_mode:
              request_body_mode: BUFFERED
              response_body_mode: BUFFERED
```

This sends the body to an external gRPC service for transformation, giving you full programmatic control in any language.

## Testing Body Transformations

Deploy httpbin and test:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/httpbin.yaml

# Send a POST request and check what the backend received
kubectl exec deploy/sleep -- curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "value": 42}' \
  http://httpbin:8000/post | python3 -m json.tool
```

Check the response body for your injected fields. The httpbin `/post` endpoint echoes back the received body, so you can see exactly what transformations were applied.

Body transformation in Istio is possible but comes with trade-offs. Use it sparingly, keep the transformations simple, and always consider whether the transformation belongs in the proxy or in the application.
