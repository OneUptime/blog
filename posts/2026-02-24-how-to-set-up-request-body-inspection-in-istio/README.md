# How to Set Up Request Body Inspection in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Kubernetes, Service Mesh, Envoy

Description: A practical guide to setting up request body inspection in Istio using Envoy filters and Wasm plugins to enforce payload validation and security policies.

---

Inspecting the body of HTTP requests before they reach your services is something you might need for security enforcement, payload validation, or compliance requirements. Istio does not provide built-in request body inspection out of the box, but you can achieve it using EnvoyFilter resources and WebAssembly (Wasm) plugins. This guide covers the practical approaches to implementing request body inspection in your Istio mesh.

## Understanding the Limitations

Before jumping into configuration, it is important to understand that Istio's native traffic management features (VirtualService, AuthorizationPolicy) primarily work with headers, paths, and metadata. They do not natively inspect request bodies. This is by design, since body inspection requires buffering the entire request, which has performance implications.

To inspect request bodies, you need to go a level deeper and work with Envoy's filter chain directly through EnvoyFilter resources or Wasm extensions.

## Approach 1: Using EnvoyFilter with Lua

The simplest way to inspect request bodies is using an EnvoyFilter with a Lua script. Lua filters run directly in Envoy and can access the request body.

First, here is an EnvoyFilter that reads the request body and checks for specific content:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: body-inspection-filter
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
          name: envoy.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                local body = request_handle:body()
                if body then
                  local body_str = body:getBytes(0, body:length())
                  -- Check for SQL injection patterns
                  if string.find(body_str, "DROP TABLE") or
                     string.find(body_str, "DELETE FROM") or
                     string.find(body_str, "'; --") then
                    request_handle:respond(
                      {[":status"] = "403"},
                      "Request blocked: suspicious content detected"
                    )
                    return
                  end
                  -- Check payload size
                  if body:length() > 1048576 then
                    request_handle:respond(
                      {[":status"] = "413"},
                      "Request body too large"
                    )
                    return
                  end
                end
              end
```

This filter intercepts inbound requests to pods labeled `app: my-service`, reads the body, and checks for basic SQL injection patterns. If suspicious content is found, it returns a 403 response without forwarding the request to the application.

## Enabling Request Buffering

For the body inspection to work, Envoy needs to buffer the request body. By default, Envoy streams the body without buffering it entirely. You need to add a buffer filter before your inspection filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: request-buffer-filter
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
          name: envoy.filters.http.buffer
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.Buffer
            max_request_bytes: 5242880
```

This configures Envoy to buffer up to 5 MB of request body before passing it to subsequent filters. Adjust `max_request_bytes` based on the maximum payload size you expect.

## Approach 2: Using Wasm Plugins

For more sophisticated body inspection, Wasm plugins give you the flexibility of a real programming language while running inside Envoy. Istio supports Wasm plugins through the WasmPlugin resource.

Here is an example WasmPlugin configuration that references a Wasm module for body inspection:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: body-inspector
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  url: oci://your-registry.io/body-inspector:v1
  phase: AUTHN
  pluginConfig:
    max_body_size: 1048576
    block_patterns:
      - "DROP TABLE"
      - "script>"
    required_fields:
      - "user_id"
      - "action"
```

The Wasm module itself would be written in a language like Rust or Go using the proxy-wasm SDK. Here is a simplified Go example of what the Wasm module might look like:

```go
package main

import (
    "github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
    "github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
    "strings"
)

type bodyInspector struct {
    proxywasm.DefaultHttpContext
    totalBody []byte
}

func (ctx *bodyInspector) OnHttpRequestBody(bodySize int, endOfStream bool) types.Action {
    body, err := proxywasm.GetHttpRequestBody(0, bodySize)
    if err != nil {
        proxywasm.LogErrorf("failed to get request body: %v", err)
        return types.ActionContinue
    }

    ctx.totalBody = append(ctx.totalBody, body...)

    if endOfStream {
        bodyStr := string(ctx.totalBody)
        // Check for blocked patterns
        if strings.Contains(bodyStr, "DROP TABLE") ||
           strings.Contains(bodyStr, "<script>") {
            proxywasm.SendHttpResponse(403, nil,
                []byte("Blocked: suspicious content"), -1)
            return types.ActionPause
        }
    }

    return types.ActionContinue
}
```

## JSON Schema Validation

A common use case is validating that JSON request bodies match an expected schema. Here is an EnvoyFilter that performs basic JSON structure validation:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: json-body-validator
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
          name: envoy.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                local content_type = request_handle:headers():get("content-type")
                if content_type and string.find(content_type, "application/json") then
                  local body = request_handle:body()
                  if body then
                    local body_str = body:getBytes(0, body:length())
                    -- Basic JSON validation
                    if not (string.sub(body_str, 1, 1) == "{" or
                            string.sub(body_str, 1, 1) == "[") then
                      request_handle:respond(
                        {[":status"] = "400"},
                        "Invalid JSON body"
                      )
                      return
                    end
                  end
                end
              end
```

## Logging Request Bodies for Auditing

Sometimes you do not need to block requests but just log the body for auditing purposes. You can do this by adding custom headers with body hashes or by logging through the Lua filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: body-audit-logger
  namespace: default
spec:
  workloadSelector:
    labels:
      app: sensitive-service
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
          name: envoy.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                local body = request_handle:body()
                if body then
                  local size = body:length()
                  request_handle:headers():add("x-body-size", tostring(size))
                  request_handle:logInfo("Request body size: " .. tostring(size) ..
                    " path: " .. request_handle:headers():get(":path"))
                end
              end
```

## Performance Considerations

Body inspection adds latency because Envoy has to buffer the entire request before processing it. Here are some tips to minimize the impact:

1. **Scope your filters narrowly**: Use `workloadSelector` to only apply body inspection to services that need it, not the entire mesh.

2. **Set reasonable buffer limits**: Do not buffer more than necessary. If you only need to inspect JSON payloads, cap the buffer at a few megabytes.

3. **Skip inspection for known-safe paths**: In your Lua script or Wasm module, check the request path first and skip body inspection for health checks, metrics endpoints, and other non-sensitive routes.

4. **Monitor the overhead**: Watch for increases in p99 latency after enabling body inspection. You can check Envoy stats:

```bash
kubectl exec -it deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep -E "buffer|lua"
```

## Troubleshooting

If your body inspection filter is not working, check a few things. First, verify the EnvoyFilter was applied:

```bash
istioctl proxy-config listener deploy/my-service --port 80 -o json | grep -A 5 "lua\|buffer"
```

Second, check the Envoy logs for errors:

```bash
kubectl logs deploy/my-service -c istio-proxy | grep -i "lua\|wasm\|body"
```

Third, make sure the buffer filter is ordered before your inspection filter in the filter chain. The order of `INSERT_BEFORE` patches matters.

## Summary

Request body inspection in Istio requires going beyond the standard traffic management APIs and working directly with Envoy filters. For simple pattern matching and size checks, Lua-based EnvoyFilters work well. For more sophisticated validation logic, Wasm plugins give you the power of a full programming language. Just be mindful of the performance cost of buffering and scanning request bodies, and scope your inspection filters as narrowly as possible.
