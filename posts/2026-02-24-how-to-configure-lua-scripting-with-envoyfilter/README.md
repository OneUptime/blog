# How to Configure Lua Scripting with EnvoyFilter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Lua, Envoy, Kubernetes, Scripting

Description: A hands-on guide to using Lua scripts in Envoy filters through Istio for custom request and response processing logic.

---

Lua scripting in Envoy is one of those features that unlocks a whole new level of flexibility in Istio. While Istio's built-in resources cover most traffic management scenarios, there are times when you need custom logic that goes beyond what VirtualService or DestinationRule can express. That's where the Lua HTTP filter shines.

## How Lua Scripting Works in Envoy

Envoy embeds a LuaJIT runtime that can execute Lua scripts as part of the HTTP filter chain. You write Lua functions that get called at specific points during request and response processing. The two main entry points are:

- `envoy_on_request(request_handle)` - called when a request is received
- `envoy_on_response(response_handle)` - called when a response is received

Envoy creates a new Lua coroutine for each request, so your scripts are isolated from each other. But keep in mind that the Lua runtime is shared across all requests on a given worker thread, so global variables persist.

## Basic Lua Filter Setup

Here's a minimal EnvoyFilter that adds a Lua script:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-filter-example
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
              request_handle:logInfo("Processing request to: " .. request_handle:headers():get(":path"))
            end

            function envoy_on_response(response_handle)
              response_handle:logInfo("Response status: " .. response_handle:headers():get(":status"))
            end
```

This simple filter logs the request path and response status. You can see the logs by checking the istio-proxy container logs:

```bash
kubectl logs deploy/my-service -c istio-proxy | grep "lua"
```

## Working with Headers

Headers are the most commonly manipulated thing in Lua filters. The handle object gives you full access:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-header-manipulation
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
              -- Read a header
              local auth = request_handle:headers():get("authorization")

              -- Add a new header
              request_handle:headers():add("x-request-timestamp", os.time())

              -- Replace a header value
              request_handle:headers():replace("user-agent", "custom-agent/1.0")

              -- Remove a header
              request_handle:headers():remove("x-unwanted-header")

              -- Iterate all headers
              for key, value in pairs(request_handle:headers()) do
                request_handle:logInfo(key .. ": " .. value)
              end
            end
```

## Making HTTP Calls from Lua

One of the more powerful features is the ability to make HTTP calls to other services from within your Lua script. This is useful for things like calling an external auth service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-http-call
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
              local headers, body = request_handle:httpCall(
                "outbound|8080||auth-service.default.svc.cluster.local",
                {
                  [":method"] = "GET",
                  [":path"] = "/verify",
                  [":authority"] = "auth-service",
                  ["x-token"] = request_handle:headers():get("authorization") or ""
                },
                "",
                5000
              )

              if headers[":status"] ~= "200" then
                request_handle:respond(
                  {[":status"] = "403"},
                  "Forbidden"
                )
              end
            end
```

The `httpCall` function takes four arguments: the cluster name, request headers, request body, and timeout in milliseconds. The cluster name follows Istio's naming convention: `outbound|PORT||FQDN`.

## Modifying the Request Body

You can read and even modify request and response bodies, though this comes with performance implications since the body needs to be buffered:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-body-access
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
              local body = request_handle:body()
              if body then
                local body_str = body:getBytes(0, body:length())
                request_handle:logInfo("Request body length: " .. body:length())
              end
            end

            function envoy_on_response(response_handle)
              local body = response_handle:body()
              if body then
                local body_str = body:getBytes(0, body:length())
                response_handle:logInfo("Response body length: " .. body:length())
              end
            end
```

## Returning Custom Responses

You can short-circuit request processing and return a custom response directly from Lua:

```yaml
inline_code: |
  function envoy_on_request(request_handle)
    local path = request_handle:headers():get(":path")

    if path == "/health" then
      request_handle:respond(
        {
          [":status"] = "200",
          ["content-type"] = "application/json"
        },
        '{"status": "healthy"}'
      )
    end

    -- Block requests with no User-Agent
    local ua = request_handle:headers():get("user-agent")
    if ua == nil then
      request_handle:respond(
        {[":status"] = "400"},
        "User-Agent header required"
      )
    end
  end
```

## Using Shared State with Metadata

You can pass data between the request and response phases using dynamic metadata:

```lua
function envoy_on_request(request_handle)
  local start_time = os.clock()
  request_handle:streamInfo():dynamicMetadata():set("my_filter", "start_time", start_time)
end

function envoy_on_response(response_handle)
  local start_time = response_handle:streamInfo():dynamicMetadata():get("my_filter")["start_time"]
  local elapsed = os.clock() - start_time
  response_handle:headers():add("x-processing-time-ms", tostring(elapsed * 1000))
end
```

## Performance Considerations

Lua scripts run synchronously in the Envoy worker thread, so keep them fast. Here are some guidelines:

- Avoid complex string operations or loops over large datasets
- If you need to make HTTP calls, set reasonable timeouts
- Body access forces buffering, which increases memory usage
- Logging is useful for debugging but adds overhead in production

## Debugging Lua Scripts

When your Lua script has errors, Envoy logs them. Check the sidecar logs:

```bash
kubectl logs deploy/my-service -c istio-proxy --tail=50
```

You can also check if the filter was applied correctly:

```bash
kubectl exec -it deploy/my-service -c istio-proxy -- pilot-agent request GET config_dump | python3 -m json.tool | grep -B2 -A10 "lua"
```

Common errors include syntax errors in the Lua code (which prevent the filter from loading entirely) and runtime errors (which show up as 500 responses or log entries).

Lua scripting is a powerful escape hatch when Istio's built-in resources don't cover your use case. Just remember that with great power comes the responsibility to keep your scripts simple and well-tested.
