# How to Set Up Content-Type Based Routing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Content-Type, Routing, VirtualService, Traffic Management

Description: How to route HTTP traffic based on Content-Type headers in Istio for handling different payload formats across separate backend services.

---

Sometimes different backend services handle different content types. Your JSON API might be served by one service while XML or multipart form data goes to another. Or maybe you are migrating from an XML-based API to a JSON one and need to route based on what the client sends. Istio makes content-type based routing straightforward through header matching in VirtualService.

## Basic Content-Type Routing

The `Content-Type` header is just an HTTP header, and Istio can match on it like any other header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-content-routing
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - headers:
            content-type:
              exact: "application/json"
      route:
        - destination:
            host: json-api-service
            port:
              number: 8080
    - match:
        - headers:
            content-type:
              exact: "application/xml"
      route:
        - destination:
            host: xml-api-service
            port:
              number: 8080
    - route:
        - destination:
            host: default-api-service
            port:
              number: 8080
```

Requests with `Content-Type: application/json` go to the JSON service. XML requests go to the XML service. Everything else hits the default.

## Handling Content-Type Variations

In practice, Content-Type headers are not always clean. Clients might send `application/json; charset=utf-8` or `Application/JSON`. Use prefix or regex matching to handle these variations:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-content-routing
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - headers:
            content-type:
              prefix: "application/json"
      route:
        - destination:
            host: json-api-service
            port:
              number: 8080
    - match:
        - headers:
            content-type:
              regex: "application/xml.*"
      route:
        - destination:
            host: xml-api-service
            port:
              number: 8080
    - match:
        - headers:
            content-type:
              prefix: "multipart/form-data"
      route:
        - destination:
            host: upload-service
            port:
              number: 8080
    - route:
        - destination:
            host: default-api-service
            port:
              number: 8080
```

The `prefix` matcher handles `application/json; charset=utf-8` correctly because it just checks that the header starts with `application/json`.

## Routing File Uploads

Multipart form data (file uploads) often needs special handling. You can route these to a dedicated upload service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: upload-routing
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - headers:
            content-type:
              prefix: "multipart/form-data"
        - uri:
            prefix: /api/upload
      route:
        - destination:
            host: upload-service
            port:
              number: 8080
          headers:
            request:
              set:
                x-upload-handler: "dedicated"
```

## Accept Header Routing

You can also route based on the `Accept` header, which tells the server what content types the client wants to receive:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: content-negotiation
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - headers:
            accept:
              regex: ".*application/json.*"
      route:
        - destination:
            host: json-api-service
            port:
              number: 8080
          headers:
            request:
              set:
                x-response-format: "json"
    - match:
        - headers:
            accept:
              regex: ".*application/xml.*"
      route:
        - destination:
            host: xml-api-service
            port:
              number: 8080
          headers:
            request:
              set:
                x-response-format: "xml"
    - match:
        - headers:
            accept:
              regex: ".*text/html.*"
      route:
        - destination:
            host: web-service
            port:
              number: 8080
    - route:
        - destination:
            host: json-api-service
            port:
              number: 8080
```

Using regex for Accept headers is important because clients often send multiple acceptable types like `application/json, text/plain, */*`.

## Combining Content-Type with Path Routing

For more precise routing, combine Content-Type matching with URI matching:

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
    # JSON POST requests to /api/data
    - match:
        - uri:
            prefix: /api/data
          headers:
            content-type:
              prefix: "application/json"
          method:
            exact: POST
      route:
        - destination:
            host: json-ingest-service
            port:
              number: 8080
    # CSV uploads to /api/data
    - match:
        - uri:
            prefix: /api/data
          headers:
            content-type:
              exact: "text/csv"
          method:
            exact: POST
      route:
        - destination:
            host: csv-ingest-service
            port:
              number: 8080
    # All GET requests to /api/data
    - match:
        - uri:
            prefix: /api/data
          method:
            exact: GET
      route:
        - destination:
            host: data-query-service
            port:
              number: 8080
```

## Content-Type Normalization with EnvoyFilter

Sometimes clients send inconsistent Content-Type headers. You can normalize them at the gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: normalize-content-type
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
                local ct = request_handle:headers():get("content-type")
                if ct then
                  -- Normalize to lowercase
                  ct = ct:lower()
                  -- Strip charset and other parameters for routing
                  local base_type = ct:match("^([^;]+)")
                  if base_type then
                    base_type = base_type:gsub("%s+$", "")
                    request_handle:headers():add("x-normalized-content-type", base_type)
                  end
                end
              end
```

Then route based on the normalized header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: normalized-routing
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - headers:
            x-normalized-content-type:
              exact: "application/json"
      route:
        - destination:
            host: json-service
            port:
              number: 8080
```

## Handling GraphQL Requests

GraphQL requests typically come in as `application/json` POSTs, but you might want to route them to a dedicated GraphQL service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routing
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            exact: /graphql
          headers:
            content-type:
              prefix: "application/json"
      route:
        - destination:
            host: graphql-service
            port:
              number: 4000
    - match:
        - uri:
            prefix: /api
          headers:
            content-type:
              prefix: "application/json"
      route:
        - destination:
            host: rest-api-service
            port:
              number: 8080
```

## gRPC Content-Type Routing

gRPC uses `application/grpc` as its content type. You can route gRPC traffic separately:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: mixed-protocol-routing
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - headers:
            content-type:
              prefix: "application/grpc"
      route:
        - destination:
            host: grpc-service
            port:
              number: 50051
    - route:
        - destination:
            host: rest-service
            port:
              number: 8080
```

## Testing Content-Type Routing

Verify your routing with different content types:

```bash
# JSON request
curl -X POST -H "Content-Type: application/json" \
  -d '{"key": "value"}' \
  http://api.example.com/api/data

# XML request
curl -X POST -H "Content-Type: application/xml" \
  -d '<data><key>value</key></data>' \
  http://api.example.com/api/data

# File upload
curl -X POST -H "Content-Type: multipart/form-data" \
  -F "file=@test.csv" \
  http://api.example.com/api/upload

# Check which service handled the request
kubectl logs deploy/json-api-service | tail -5
kubectl logs deploy/xml-api-service | tail -5
```

## Important Considerations

GET requests typically do not have a Content-Type header. Make sure your routing rules have a default route for requests without this header.

The Content-Type header is set by the client and can be spoofed. Do not rely on it for security decisions. Use it for routing convenience, but always validate the actual content in your backend service.

Content-type based routing works well for API gateways that need to fan out requests to different backend processors based on the payload format. It keeps each backend focused on one format while presenting a unified API to clients.
