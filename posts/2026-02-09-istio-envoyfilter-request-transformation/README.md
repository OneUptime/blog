# How to Build a Custom Istio EnvoyFilter for Request Body Transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Request Transformation, Service Mesh, Lua

Description: Learn how to create custom Istio EnvoyFilter resources that transform HTTP request bodies using Lua scripts for protocol adaptation, data enrichment, and legacy system integration.

---

Sometimes you need to modify request payloads in flight. Legacy APIs expect different JSON schemas than modern clients send. Third-party services require additional authentication fields. Protocol adapters need to transform REST into GraphQL.

EnvoyFilter resources let you inject custom logic directly into the Envoy data plane. This guide shows you how to build Lua-based request transformations that modify bodies, headers, and parameters without changing application code.

## Understanding EnvoyFilter Architecture

EnvoyFilter is the most powerful but also most complex Istio resource. It directly patches Envoy's configuration, giving you access to the full capabilities of Envoy's filter chain. The trade-off is that misconfigured filters can break traffic, and filters aren't portable across Envoy versions.

Use EnvoyFilter only when VirtualService and DestinationRule can't solve your problem. For request body transformation, EnvoyFilter with Lua scripting is often your only option.

## Basic EnvoyFilter for Header Transformation

Start with a simple filter that adds headers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-request-headers
  namespace: istio-system
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
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.router"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              request_handle:headers():add("x-custom-header", "value")
              request_handle:headers():add("x-request-id", request_handle:headers():get("x-request-id"))
            end
```

This filter injects Lua code that runs on every request, adding custom headers before routing.

## Transforming JSON Request Bodies

Create a filter that modifies JSON payloads:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: transform-payment-request
  namespace: payments
spec:
  workloadSelector:
    labels:
      app: payment-processor
      version: v2
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              -- Only process POST requests
              local method = request_handle:headers():get(":method")
              if method ~= "POST" then
                return
              end

              -- Get request body
              local body = request_handle:body()
              if not body then
                return
              end

              local body_string = body:getBytes(0, body:length())

              -- Parse JSON (simplified, use JSON library in production)
              -- Transform legacy format to new format
              local json = require("json")
              local data = json.decode(body_string)

              -- Add required fields for legacy system
              if data.payment then
                data.payment.version = "2.0"
                data.payment.timestamp = os.time()
                data.payment.source = "istio-mesh"
              end

              -- Serialize back to JSON
              local new_body = json.encode(data)

              -- Replace body
              request_handle:body():setBytes(new_body)

              -- Update content-length header
              request_handle:headers():replace("content-length", tostring(#new_body))
            end
```

## Protocol Adaptation with EnvoyFilter

Transform REST requests into a different format:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rest-to-grpc-adapter
  namespace: api-gateway
spec:
  workloadSelector:
    labels:
      adapter: rest-to-grpc
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_OUTBOUND
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              local path = request_handle:headers():get(":path")

              -- Convert REST endpoint to gRPC method
              if string.match(path, "^/api/users/") then
                local user_id = string.match(path, "/api/users/(%d+)")

                -- Build gRPC request body
                local grpc_request = string.format('{"user_id": "%s"}', user_id)

                -- Update path to gRPC service
                request_handle:headers():replace(":path", "/user.UserService/GetUser")

                -- Set gRPC content type
                request_handle:headers():replace("content-type", "application/grpc")

                -- Replace body
                request_handle:body():setBytes(grpc_request)
              end
            end
```

## Conditional Transformation Based on Headers

Apply transformations selectively:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: conditional-transformation
  namespace: integrations
spec:
  workloadSelector:
    labels:
      app: api-adapter
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              -- Check for transformation flag
              local transform = request_handle:headers():get("x-transform")
              if transform ~= "legacy-format" then
                return  -- Skip transformation
              end

              local body = request_handle:body()
              if not body then
                return
              end

              local body_string = body:getBytes(0, body:length())

              -- Apply legacy transformation
              -- Convert snake_case to camelCase
              local transformed = body_string:gsub("user_id", "userId")
              transformed = transformed:gsub("created_at", "createdAt")
              transformed = transformed:gsub("updated_at", "updatedAt")

              request_handle:body():setBytes(transformed)
              request_handle:headers():replace("content-length", tostring(#transformed))

              -- Remove transformation header
              request_handle:headers():remove("x-transform")
            end
```

## Adding Authentication Fields to Requests

Inject authentication data into outbound requests:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: inject-auth-fields
  namespace: external-apis
spec:
  workloadSelector:
    labels:
      requires: external-auth
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_OUTBOUND
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              local body = request_handle:body()
              if not body then
                return
              end

              local body_string = body:getBytes(0, body:length())
              local json = require("json")
              local data = json.decode(body_string)

              -- Get credentials from dynamic metadata
              local metadata = request_handle:metadata()
              local api_key = metadata:get("auth.api_key") or "default-key"
              local api_secret = metadata:get("auth.api_secret") or "default-secret"

              -- Add authentication fields
              data.credentials = {
                api_key = api_key,
                api_secret = api_secret,
                timestamp = os.time(),
                nonce = request_handle:headers():get("x-request-id")
              }

              local new_body = json.encode(data)
              request_handle:body():setBytes(new_body)
              request_handle:headers():replace("content-length", tostring(#new_body))
            end
```

## Using External Lua Modules

Reference external Lua libraries for complex transformations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lua-scripts
  namespace: istio-system
data:
  json.lua: |
    -- Lua JSON library
    local json = {}
    -- Implementation here...
    return json

  transform.lua: |
    local transform = {}

    function transform.legacy_format(data)
      -- Complex transformation logic
      return transformed_data
    end

    return transform
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: external-lua-modules
  namespace: istio-system
spec:
  configPatches:
  - applyTo: HTTP_FILTER
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          source_codes:
            json.lua:
              inline_string: |
                -- Load from ConfigMap or inline
            transform.lua:
              inline_string: |
                -- Transformation utilities
          inline_code: |
            local json = require("json")
            local transform = require("transform")

            function envoy_on_request(request_handle)
              local body = request_handle:body()
              local data = json.decode(body:getBytes(0, body:length()))
              local transformed = transform.legacy_format(data)
              request_handle:body():setBytes(json.encode(transformed))
            end
```

## Error Handling and Logging

Add robust error handling:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: safe-transformation
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-service
  configPatches:
  - applyTo: HTTP_FILTER
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              -- Wrap in pcall for error handling
              local success, error = pcall(function()
                local body = request_handle:body()
                if not body then
                  request_handle:logInfo("No body to transform")
                  return
                end

                local body_string = body:getBytes(0, body:length())

                -- Log original body for debugging
                request_handle:logDebug("Original body: " .. body_string)

                -- Perform transformation
                local transformed = transform_body(body_string)

                request_handle:body():setBytes(transformed)
                request_handle:logInfo("Transformation successful")
              end)

              if not success then
                -- Log error and continue without transformation
                request_handle:logErr("Transformation failed: " .. tostring(error))
                request_handle:headers():add("x-transform-error", "true")
              end
            end

            function transform_body(body)
              -- Transformation logic
              return body
            end
```

## Performance Considerations

Minimize transformation overhead:

```lua
-- Cache expensive operations
local json_decoder = require("json").new()

-- Reuse buffers
local buffer = {}

function envoy_on_request(request_handle)
  -- Skip transformation for small bodies
  local body = request_handle:body()
  if not body or body:length() < 10 then
    return
  end

  -- Only transform specific content types
  local content_type = request_handle:headers():get("content-type")
  if not content_type or not string.match(content_type, "application/json") then
    return
  end

  -- Use efficient string operations
  local body_string = body:getBytes(0, body:length())
  -- Transformation...
end
```

## Testing EnvoyFilter Transformations

Deploy test infrastructure:

```bash
# Deploy test service
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-client
  namespace: production
spec:
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ["/bin/sh", "-c", "sleep 3600"]
EOF

# Send test request
kubectl exec -it test-client -n production -- \
  curl -X POST http://api-service:8080/transform \
  -H "Content-Type: application/json" \
  -d '{"user_id": "123", "action": "test"}'
```

Check Envoy logs for transformation output:

```bash
# View sidecar logs
kubectl logs -n production api-service-xxxxx -c istio-proxy | grep -i lua
```

EnvoyFilter with Lua transformations bridges the gap between modern microservices and legacy systems, enabling gradual migrations and protocol adaptation without modifying application code.
