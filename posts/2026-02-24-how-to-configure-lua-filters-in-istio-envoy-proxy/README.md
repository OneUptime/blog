# How to Configure Lua Filters in Istio Envoy Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Lua, Envoy, Filters, EnvoyFilter

Description: How to write and deploy Lua filters in Istio Envoy proxies for custom request and response processing.

---

Lua filters are the quick and dirty way to add custom logic to your Envoy proxies. Unlike Wasm plugins which need to be compiled and distributed, Lua filters are just inline scripts that get embedded directly in the proxy configuration. They are perfect for lightweight transformations like adding headers, modifying request paths, or implementing simple routing logic.

Here is how to set up and use Lua filters in Istio.

## When to Use Lua Filters

Lua filters are a good fit when:

- You need to add or modify HTTP headers
- You need simple request/response transformations
- You want something faster to iterate on than Wasm plugins
- The logic is simple enough to express in a few dozen lines of Lua

They are NOT a good fit when:

- You need complex business logic (use Wasm instead)
- You need to make external HTTP calls (Lua has limited async support in Envoy)
- Performance is absolutely critical (Wasm is faster for compute-heavy tasks)
- You need to share state across requests

## Basic Lua Filter Setup

Lua filters are deployed through EnvoyFilter resources. Here is the simplest example - adding a response header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-add-header
  namespace: production
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
              function envoy_on_response(response_handle)
                response_handle:headers():add("x-powered-by", "istio-mesh")
              end
```

The `INSERT_BEFORE` operation puts the Lua filter before the router filter, which is where it needs to be.

## Lua Filter API

Envoy provides two callback functions for Lua filters:

- `envoy_on_request(request_handle)` - Called when a request is received
- `envoy_on_response(response_handle)` - Called when a response is received

The handle objects give you access to headers, body, metadata, and more.

### Working with Request Headers

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-request-transform
  namespace: production
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
                -- Read a header
                local api_key = request_handle:headers():get("x-api-key")

                -- Add a header
                request_handle:headers():add("x-request-received", os.date("!%Y-%m-%dT%H:%M:%SZ"))

                -- Remove a header
                request_handle:headers():remove("x-internal-debug")

                -- Replace a header
                request_handle:headers():replace("user-agent", "custom-agent/1.0")

                -- Log something
                request_handle:logInfo("Processing request with API key present: " .. tostring(api_key ~= nil))
              end
```

### Working with Response Headers

```yaml
inline_code: |
  function envoy_on_response(response_handle)
    -- Get the status code
    local status = response_handle:headers():get(":status")

    -- Add security headers
    response_handle:headers():add("x-content-type-options", "nosniff")
    response_handle:headers():add("x-frame-options", "DENY")
    response_handle:headers():add("strict-transport-security", "max-age=31536000; includeSubDomains")

    -- Add cache control based on status
    if status == "200" then
      response_handle:headers():add("cache-control", "public, max-age=300")
    else
      response_handle:headers():add("cache-control", "no-store")
    end
  end
```

### Working with the Request Body

```yaml
inline_code: |
  function envoy_on_request(request_handle)
    -- Get the body (this buffers the entire body)
    local body = request_handle:body()
    if body then
      local body_str = body:getBytes(0, body:length())
      request_handle:logInfo("Request body length: " .. tostring(body:length()))
    end
  end
```

Be careful with body access. Calling `body()` buffers the entire request body in memory, which can be expensive for large payloads.

## Practical Use Cases

### Request ID Injection

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-request-id
  namespace: production
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
                local existing_id = request_handle:headers():get("x-request-id")
                if existing_id then
                  request_handle:headers():add("x-original-request-id", existing_id)
                end
              end

              function envoy_on_response(response_handle)
                local request_id = response_handle:headers():get("x-request-id")
                if request_id then
                  response_handle:headers():add("x-correlation-id", request_id)
                end
              end
```

### Path-Based Rate Limit Headers

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-rate-limit-info
  namespace: production
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
            inline_code: |
              function envoy_on_request(request_handle)
                local path = request_handle:headers():get(":path")

                -- Tag requests by API category
                if string.find(path, "^/api/v1/") then
                  request_handle:headers():add("x-rate-group", "api-v1")
                elseif string.find(path, "^/api/v2/") then
                  request_handle:headers():add("x-rate-group", "api-v2")
                else
                  request_handle:headers():add("x-rate-group", "default")
                end
              end
```

### Conditional Response Modification

```yaml
inline_code: |
  function envoy_on_response(response_handle)
    local status = response_handle:headers():get(":status")
    local content_type = response_handle:headers():get("content-type")

    -- Add CORS headers only for JSON responses
    if content_type and string.find(content_type, "application/json") then
      response_handle:headers():add("access-control-allow-origin", "*")
      response_handle:headers():add("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS")
      response_handle:headers():add("access-control-allow-headers", "Content-Type, Authorization")
    end

    -- Add error tracking header for server errors
    if tonumber(status) >= 500 then
      response_handle:headers():add("x-error-tracking", "enabled")
    end
  end
```

## Applying to Gateway vs Sidecar

For gateway-level Lua filters, change the context:

```yaml
match:
  context: GATEWAY
  listener:
    portNumber: 443
    filterChain:
      filter:
        name: envoy.filters.network.http_connection_manager
        subFilter:
          name: envoy.filters.http.router
```

## Debugging Lua Filters

Lua filter issues can be tricky to debug. Here are some techniques:

```bash
# Check proxy logs for Lua log output
kubectl logs deploy/my-service -c istio-proxy | grep "lua\|script"

# Verify the filter was injected
istioctl proxy-config listener deploy/my-service -o json | grep -A 5 "envoy.filters.http.lua"

# Check for configuration errors
istioctl analyze -n production

# Test with curl and inspect response headers
kubectl exec deploy/sleep -- curl -sv http://my-service:8080/test 2>&1 | grep "< "
```

Use `request_handle:logInfo()` and `request_handle:logWarn()` for debugging. These write to the proxy's standard error, which shows up in the container logs.

## Performance Considerations

Lua filters run in the main Envoy thread. If your Lua code is slow, it blocks request processing for all connections on that thread.

Keep your Lua code simple and fast:

- Avoid complex string operations on large bodies
- Do not use `body()` unless you absolutely need the body content
- Keep the logic short, ideally under 50 lines
- Use Wasm for anything compute-intensive

For most header manipulation tasks, Lua filters add negligible latency - well under 1 millisecond per request. But buffering and processing large request bodies can add significant latency.

Lua filters are the pragmatic choice for simple proxy customization. They are easy to write, easy to deploy, and easy to understand. Just keep them small and focused.
