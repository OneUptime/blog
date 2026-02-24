# How to Set Up API Request Validation with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Validation, EnvoyFilter, Service Mesh, Security

Description: Step-by-step guide to validating API requests at the Istio proxy layer using EnvoyFilter, Lua scripts, and Wasm to reject malformed requests before they reach your services.

---

Request validation is one of those things that every service needs but nobody wants to implement twenty times across twenty microservices. Istio gives you a way to push validation logic into the sidecar proxy so that bad requests get rejected before they ever touch your application code.

## The Problem with Per-Service Validation

In a typical microservices setup, each service handles its own request validation. That means every team writes their own validation logic, and they all do it slightly differently. One service returns 400 with a JSON error body, another returns 422 with a plain text message, and a third just crashes. Centralizing validation at the mesh level brings consistency and reduces duplicated effort.

## Validating Request Headers with EnvoyFilter

The simplest form of request validation is checking for required headers. Here is an EnvoyFilter that rejects requests missing an API key header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: require-api-key
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
              local api_key = request_handle:headers():get("x-api-key")
              if api_key == nil or api_key == "" then
                request_handle:respond(
                  {[":status"] = "401"},
                  '{"error": "Missing x-api-key header"}'
                )
              end
            end
```

When a request comes in without the `x-api-key` header, the Lua filter sends back a 401 response immediately. The request never reaches the upstream service.

## Content-Type Validation

Another common validation is making sure POST and PUT requests include the correct Content-Type header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: validate-content-type
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
              local method = request_handle:headers():get(":method")
              if method == "POST" or method == "PUT" or method == "PATCH" then
                local content_type = request_handle:headers():get("content-type")
                if content_type == nil then
                  request_handle:respond(
                    {[":status"] = "415"},
                    '{"error": "Content-Type header is required for this method"}'
                  )
                  return
                end
                if not string.find(content_type, "application/json") then
                  request_handle:respond(
                    {[":status"] = "415"},
                    '{"error": "Only application/json content type is supported"}'
                  )
                end
              end
            end
```

## Request Size Limiting

Large request bodies can be used for denial-of-service attacks. You can limit request body size at the connection manager level:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: limit-request-size
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          max_request_headers_kb: 60
```

For body size limits, you can use the buffer filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: limit-body-size
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
          max_request_bytes: 1048576
```

This limits request bodies to 1 MB. Requests exceeding this size get a 413 response automatically.

## Using Istio AuthorizationPolicy for Request Validation

Istio's AuthorizationPolicy is not just for authentication. You can use it to validate request properties:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: validate-requests
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
  - when:
    - key: request.headers[x-request-id]
      notValues: ["*"]
  - to:
    - operation:
        methods: ["POST", "PUT"]
        notPaths: ["/api/*"]
```

The first rule denies requests without an `x-request-id` header. The second rule denies POST and PUT requests to paths outside `/api/*`.

You can also validate based on JWT claims:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: validate-jwt-claims
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
  - when:
    - key: request.auth.claims[iss]
      notValues: ["https://auth.example.com"]
  - when:
    - key: request.auth.claims[aud]
      notValues: ["my-api"]
```

## Path and Method Validation

You can restrict which HTTP methods are allowed on specific paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: method-restrictions
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - to:
    - operation:
        methods: ["GET"]
        paths: ["/api/v1/users", "/api/v1/users/*"]
  - to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/v1/orders", "/api/v1/orders/*"]
  - to:
    - operation:
        methods: ["GET"]
        paths: ["/health", "/ready"]
```

This only allows GET on user endpoints, GET and POST on order endpoints, and GET on health check paths. Everything else gets denied.

## JSON Body Validation with Lua

For more involved validation, you can check the JSON body structure:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: validate-json-body
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
              local method = request_handle:headers():get(":method")
              local path = request_handle:headers():get(":path")
              if method == "POST" and string.find(path, "^/api/v1/users") then
                local body = request_handle:body():getBytes(0, request_handle:body():length())
                if body == nil or body == "" then
                  request_handle:respond(
                    {[":status"] = "400"},
                    '{"error": "Request body is required"}'
                  )
                  return
                end
                if not string.find(body, '"email"') then
                  request_handle:respond(
                    {[":status"] = "400"},
                    '{"error": "email field is required"}'
                  )
                  return
                end
              end
            end
```

This is a basic check. Lua does not have a built-in JSON parser, so the string matching approach only works for simple field presence checks. For proper JSON schema validation, you would want to use a Wasm filter.

## Testing Your Validation Rules

After applying your validation rules, test them:

```bash
# Test missing API key
curl -v http://my-api.default.svc.cluster.local:8080/api/v1/users

# Test with API key
curl -v -H "x-api-key: test123" http://my-api.default.svc.cluster.local:8080/api/v1/users

# Test wrong content type
curl -v -X POST -H "Content-Type: text/plain" \
  http://my-api.default.svc.cluster.local:8080/api/v1/users

# Test oversized body
dd if=/dev/zero bs=2M count=1 | curl -X POST -H "Content-Type: application/json" \
  --data-binary @- http://my-api.default.svc.cluster.local:8080/api/v1/users
```

## Ordering Matters

When you have multiple EnvoyFilter resources, the order they are applied matters. Filters are applied in alphabetical order by name within a namespace, and `istio-system` filters are applied before namespace-specific ones. Use the `priority` field to control ordering explicitly:

```yaml
spec:
  priority: 10
```

Lower numbers get applied first. If you need authentication to happen before body validation, give your auth filter a lower priority number.

Request validation at the mesh layer is a solid pattern for enforcing baseline rules across all your services. Start with AuthorizationPolicy for path and method restrictions, use EnvoyFilter with Lua for header and simple body checks, and consider Wasm for anything that requires actual JSON parsing or complex logic.
