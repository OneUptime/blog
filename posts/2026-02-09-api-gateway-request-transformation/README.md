# How to Configure API Gateway Request and Response Transformation Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, Transformation, REST API

Description: Master API gateway request and response transformation policies including header manipulation, payload restructuring, protocol conversion, and data mapping strategies for microservices.

---

API gateways sit at the boundary between clients and backend services, making them the ideal place to transform requests and responses. Transformation policies help you maintain backward compatibility, adapt legacy APIs, normalize data formats, and shield internal implementation details from external consumers.

## Why Transform at the Gateway

Transformation at the gateway layer provides several advantages. First, it centralizes logic that would otherwise be duplicated across multiple services. Second, it allows you to evolve your internal APIs without breaking external contracts. Third, it enables you to integrate heterogeneous systems that use different data formats or conventions.

When you transform at the gateway, your backend services receive requests in the format they expect, and clients get responses in the format they understand. This decoupling is essential for maintaining API stability in dynamic microservices environments.

## Kong Gateway Request Transformation

Kong provides a powerful request-transformer plugin that modifies requests before they reach your backend services. You can add, rename, replace, or remove headers, query parameters, and body fields.

```bash
# Add the request-transformer plugin to a service
curl -X POST http://kong-admin:8001/services/user-service/plugins \
  --data "name=request-transformer" \
  --data "config.add.headers=X-Internal-Request:true" \
  --data "config.add.headers=X-Request-ID:$(uuidgen)" \
  --data "config.rename.headers=Authorization:X-Auth-Token" \
  --data "config.remove.querystring=debug,trace"
```

This configuration adds internal headers, renames the authorization header to match your backend's expectations, and strips debugging parameters that shouldn't reach production services.

For body transformations, Kong supports modifying JSON payloads:

```yaml
# Kong declarative configuration
plugins:
- name: request-transformer
  service: order-service
  config:
    add:
      body:
        - "timestamp:$(date +%s)"
        - "gateway_version:1.2.0"
    remove:
      body:
        - "client_secret"
        - "internal_metadata"
    rename:
      body:
        - "user_id:customerId"
        - "product_id:itemId"
```

This removes sensitive fields that clients might accidentally include, adds metadata fields your backend expects, and renames fields to match your internal naming conventions.

## Response Transformation with Kong

Response transformation works similarly but operates on data flowing from backend to client. This is useful for filtering sensitive data, reformatting structures, or adding client-specific metadata.

```yaml
plugins:
- name: response-transformer
  service: user-service
  config:
    remove:
      headers:
        - "X-Internal-Auth"
        - "X-Database-Query-Time"
      json:
        - "password_hash"
        - "internal_id"
        - "audit_log"
    add:
      headers:
        - "X-API-Version:v2"
        - "Cache-Control:public, max-age=300"
      json:
        - "api_version:2.0"
    rename:
      json:
        - "created_at:createdDate"
        - "updated_at:modifiedDate"
```

This configuration strips internal headers and sensitive fields from responses, adds client-facing headers for API versioning and caching, and normalizes timestamp field names.

## Advanced Transformations with Lua

For complex transformation logic that goes beyond simple field mapping, Kong allows custom Lua scripts. This gives you complete control over request and response processing.

```lua
-- custom-transformer.lua
local cjson = require "cjson"

function transform_request(conf)
  -- Read the request body
  local body = kong.request.get_body()

  if body and body.user then
    -- Transform nested user object to flat structure
    local user = body.user
    body.user_id = user.id
    body.user_name = user.name
    body.user_email = user.email
    body.user = nil  -- Remove original nested object

    -- Set the transformed body
    kong.service.request.set_body(cjson.encode(body))
  end
end

function transform_response(conf)
  -- Read the response body
  local body = kong.service.response.get_body()

  if body and body.items then
    -- Add computed fields to each item
    for _, item in ipairs(body.items) do
      item.full_price = item.price + item.tax
      item.display_name = item.name:upper()
    end

    -- Set the transformed body
    kong.service.response.set_body(cjson.encode(body))
  end
end

return {
  transform_request = transform_request,
  transform_response = transform_response
}
```

Deploy this custom plugin to Kong and configure it for your service:

```bash
# Package and deploy the custom plugin
kubectl create configmap kong-plugin-custom-transformer \
  --from-file=custom-transformer.lua \
  -n kong

# Enable the plugin via Kong Admin API
curl -X POST http://kong-admin:8001/services/product-service/plugins \
  --data "name=custom-transformer"
```

## NGINX Gateway Fabric Transformations

NGINX uses snippets and configuration blocks to transform requests. You can leverage NGINX variables and modules for powerful transformations.

```nginx
# HTTPRoute with transformation
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: user-api
spec:
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1/users
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: X-Forwarded-Proto
          value: https
        - name: X-Request-Source
          value: gateway
        remove:
        - Authorization
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /internal/users
```

For more complex transformations, use NGINX configuration snippets:

```yaml
apiVersion: k8s.nginx.org/v1
kind: VirtualServer
metadata:
  name: api-transformer
spec:
  host: api.example.com
  upstreams:
  - name: backend
    service: backend-service
    port: 8080
  routes:
  - path: /api
    action:
      pass: backend
    snippets:
      - |
        # Transform query parameters to headers
        if ($arg_user_id) {
          set $user_header $arg_user_id;
        }
        proxy_set_header X-User-ID $user_header;

        # Remove sensitive query parameters
        set $args '';

        # Add correlation ID if not present
        set $correlation_id $http_x_correlation_id;
        if ($correlation_id = '') {
          set $correlation_id $request_id;
        }
        proxy_set_header X-Correlation-ID $correlation_id;
```

## Envoy Proxy Transformations

Envoy uses filters for request and response transformations. The Lua filter provides scripting capabilities similar to Kong.

```yaml
# Envoy configuration with Lua filter
static_resources:
  listeners:
  - name: main_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          http_filters:
          - name: envoy.filters.http.lua
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
              inline_code: |
                function envoy_on_request(request_handle)
                  -- Add timestamp to request
                  request_handle:headers():add("x-request-timestamp", os.time())

                  -- Transform path
                  local path = request_handle:headers():get(":path")
                  if path:match("^/v1/") then
                    local new_path = path:gsub("^/v1/", "/api/v2/")
                    request_handle:headers():replace(":path", new_path)
                  end
                end

                function envoy_on_response(response_handle)
                  -- Add custom response headers
                  response_handle:headers():add("x-gateway", "envoy")
                  response_handle:headers():add("x-cache-control", "no-store")

                  -- Remove internal headers
                  response_handle:headers():remove("x-internal-trace")
                end
```

For structured data transformation, Envoy's external processing filter can delegate to a sidecar that performs complex transformations:

```yaml
- name: envoy.filters.http.ext_proc
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ext_proc.v3.ExternalProcessor
    grpc_service:
      envoy_grpc:
        cluster_name: transformation_service
    processing_mode:
      request_header_mode: SEND
      response_header_mode: SEND
      request_body_mode: STREAMED
      response_body_mode: STREAMED
```

## Protocol Transformation

Sometimes you need to transform between protocols, such as REST to gRPC or SOAP to REST. Kong Enterprise and Envoy both support protocol transformations.

```yaml
# Envoy gRPC-JSON transcoder
- name: envoy.filters.http.grpc_json_transcoder
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_json_transcoder.v3.GrpcJsonTranscoder
    proto_descriptor: "/etc/envoy/proto.pb"
    services:
    - "user.v1.UserService"
    - "order.v1.OrderService"
    print_options:
      add_whitespace: true
      always_print_primitive_fields: true
    auto_mapping: true
```

This configuration allows clients to call gRPC services using REST/JSON while Envoy handles the protocol conversion automatically.

## Testing Transformations

Always test your transformation policies thoroughly. Use curl to verify the transformations work as expected:

```bash
# Test request transformation
curl -X POST http://gateway:8080/api/users \
  -H "Content-Type: application/json" \
  -H "X-Debug: true" \
  -d '{
    "user": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "client_secret": "should-be-removed"
  }' -v

# Check backend logs to verify transformation
kubectl logs -l app=user-service -n backend --tail=50

# Test response transformation
curl http://gateway:8080/api/users/123 -v | jq '.'
```

## Performance Considerations

Transformations add processing overhead. Simple header manipulations have minimal impact, but complex body transformations can increase latency significantly. Profile your transformations under load to understand their impact:

- Header transformations: ~1ms overhead
- Simple JSON field mapping: ~5-10ms overhead
- Complex Lua/script transformations: ~50-100ms overhead
- Protocol conversions: ~20-50ms overhead

For high-throughput APIs, consider whether transformations are necessary or if you can handle them in backend services where you have more control over optimization.

## Conclusion

API gateway transformation policies provide flexibility and control over how data flows between clients and services. By centralizing transformation logic at the gateway, you create a clean separation between external contracts and internal implementations. Whether you need simple header manipulation or complex protocol conversion, modern API gateways provide the tools to handle your transformation requirements efficiently.
