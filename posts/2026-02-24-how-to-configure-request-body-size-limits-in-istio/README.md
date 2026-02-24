# How to Configure Request Body Size Limits in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Request Size, Envoy, Kubernetes, API Security

Description: How to set and enforce request body size limits in Istio using EnvoyFilter, including per-route limits, global limits, and error handling.

---

Controlling request body sizes is important for both security and stability. Without limits, a malicious client could send a massive request body to overwhelm your service's memory, or a buggy client could accidentally send enormous payloads. Istio lets you enforce these limits at the proxy level, before the request even reaches your application.

By default, Envoy (Istio's data plane proxy) does not enforce a request body size limit for proxied HTTP traffic. It streams the request body through to the upstream service. This means your application is responsible for enforcing its own limits. But you can add proxy-level enforcement using Envoy filters.

## How Envoy Handles Request Bodies

When Envoy receives an HTTP request with a body, it streams the data to the upstream service in chunks. It doesn't buffer the entire body in memory by default. This streaming behavior is good for performance but means Envoy doesn't know the total body size until it has received everything (unless the `Content-Length` header is present).

There are two approaches to limiting request body size:

1. Check the `Content-Length` header before forwarding (works for requests with known sizes)
2. Buffer the body and enforce a limit (works for all requests but uses more memory)

## Enforcing Limits with the Buffer Filter

The Envoy buffer filter can enforce a maximum request body size. When the body exceeds the limit, Envoy returns a 413 response:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: request-body-limit
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
          portNumber: 8080
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
            max_request_bytes: 10485760
```

This limits request bodies to 10MB (10485760 bytes). Any request with a body larger than 10MB receives a 413 Payload Too Large response.

The downside of the buffer filter is that it buffers the entire request body in memory before forwarding it. For a 10MB limit, each concurrent request could use up to 10MB of sidecar memory. Calculate your memory needs based on `max_request_bytes * expected_concurrent_requests`.

## Gateway-Level Limits

To enforce limits at the ingress gateway (before traffic enters the mesh):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-body-limit
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
          name: envoy.filters.http.buffer
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.Buffer
            max_request_bytes: 5242880
```

This applies a 5MB limit at the gateway for all traffic. Enforcing limits at the gateway is more efficient because it rejects oversized requests before they consume mesh bandwidth.

## Using Lua Filter for Content-Length Check

If you don't want to buffer the entire body but still want to reject obviously oversized requests, you can check the `Content-Length` header using a Lua filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: content-length-limit
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
          portNumber: 8080
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
            default_source_code:
              inline_string: |
                function envoy_on_request(request_handle)
                  local content_length = request_handle:headers():get("content-length")
                  if content_length then
                    local size = tonumber(content_length)
                    if size and size > 10485760 then
                      request_handle:respond(
                        {[":status"] = "413"},
                        "Request body too large"
                      )
                    end
                  end
                end
```

This approach doesn't buffer the body, so it uses no extra memory. But it only works when the `Content-Length` header is present. Chunked transfer encoding doesn't include this header, so chunked requests won't be checked.

## Per-Route Size Limits

Different API endpoints often need different size limits. A profile picture upload might allow 5MB, while a data import endpoint might need 100MB.

You can scope the EnvoyFilter using route configuration matching. But a simpler approach is to use different workload selectors for different services:

```yaml
# Small limit for regular API
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: api-body-limit
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
          portNumber: 8080
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
---
# Larger limit for upload service
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: upload-body-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: upload-service
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 8080
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
            max_request_bytes: 104857600
```

The API service gets a 1MB limit, while the upload service gets 100MB.

## Combining with Rate Limiting

Body size limits work well alongside rate limiting. Even with a reasonable size limit, a client could send many requests at the maximum size to exhaust resources:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: upload-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: upload-service
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/web-frontend
      to:
        - operation:
            methods:
              - POST
            ports:
              - "8080"
```

This at least restricts who can make upload requests. For full rate limiting, you would use Istio's rate limiting features with an external rate limit service.

## Header Size Limits

While we're talking about size limits, don't forget request headers. Excessively large headers can also cause issues:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: header-size-limit
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
          portNumber: 8080
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            max_request_headers_kb: 32
```

The default is 60KB for headers. Setting it to 32KB is more restrictive. If a request has headers exceeding this limit, Envoy returns a 431 Request Header Fields Too Large.

## Monitoring Rejected Requests

Track how many requests are being rejected due to size limits:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "413\|431"
```

Also check the buffer filter stats:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "buffer"
```

## Testing Your Limits

Verify the limits work:

```bash
# Generate a file slightly over the limit
dd if=/dev/zero of=/tmp/over-limit bs=1M count=11

# Try to upload it
kubectl exec -it <client-pod> -n default -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -X POST -d @/tmp/over-limit \
  http://my-api.default.svc.cluster.local:8080/endpoint

# Should return 413
```

```bash
# Generate a file under the limit
dd if=/dev/zero of=/tmp/under-limit bs=1M count=5

# Try to upload it
kubectl exec -it <client-pod> -n default -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -X POST -d @/tmp/under-limit \
  http://my-api.default.svc.cluster.local:8080/endpoint

# Should return 200 (or whatever your service returns)
```

Request body size limits at the proxy level provide a defense-in-depth strategy. Even if your application has its own limits, catching oversized requests at the Envoy proxy saves processing time and protects against application-level bugs that might not enforce limits correctly. Set limits at the gateway for broad protection and at individual services for fine-grained control.
