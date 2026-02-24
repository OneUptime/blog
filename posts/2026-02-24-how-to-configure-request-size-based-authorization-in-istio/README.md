# How to Configure Request Size-Based Authorization in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Request Size, Security, Kubernetes

Description: How to implement request size limits and body-size-based authorization policies in Istio to protect services from oversized requests.

---

Controlling request sizes is an important part of protecting your services. Without limits, a single client can send massive payloads that exhaust memory, overload processing, or fill up disk space. While many web frameworks handle this at the application level, implementing it at the mesh layer gives you a uniform enforcement point that protects every service regardless of the framework or language it uses.

Istio doesn't have a dedicated "request size" field in AuthorizationPolicy, but you can achieve request size control through several mechanisms: Envoy's connection and buffer limits, EnvoyFilter for custom size checks, and external authorization for more complex logic.

## Approach 1: Connection Buffer Limits via DestinationRule

The simplest way to limit request sizes is through Envoy's connection pool settings. You can set buffer limits that effectively cap request sizes:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: size-limits
  namespace: backend
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 100
        h2UpgradePolicy: DEFAULT
```

However, this doesn't give you fine-grained body size control. For that, you need EnvoyFilters or external authorization.

## Approach 2: EnvoyFilter for Request Body Size Limits

Use an EnvoyFilter to add Envoy's buffer filter, which can limit the maximum request body size:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: request-size-limit
  namespace: backend
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
          maxRequestBytes: 1048576  # 1MB max request body
```

This rejects any request with a body larger than 1MB with a 413 (Payload Too Large) response.

For different limits per route, apply the filter at the route level:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: route-size-limits
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: api-server
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          route:
            name: default
    patch:
      operation: MERGE
      value:
        perFilterConfig:
          envoy.filters.http.buffer:
            "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.BufferPerRoute
            buffer:
              maxRequestBytes: 5242880  # 5MB for this route
```

## Approach 3: Content-Length Header Matching

If clients include the Content-Length header (which most HTTP clients do), you can use a Lua filter to check it before the request body is transmitted:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: content-length-check
  namespace: backend
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
          inlineCode: |
            function envoy_on_request(request_handle)
              local content_length = request_handle:headers():get("content-length")
              if content_length then
                local size = tonumber(content_length)
                local max_size = 10485760  -- 10MB

                local path = request_handle:headers():get(":path")

                -- Different limits for different paths
                if path and string.find(path, "/api/upload") then
                  max_size = 52428800  -- 50MB for uploads
                elseif path and string.find(path, "/api/") then
                  max_size = 1048576  -- 1MB for API calls
                end

                if size > max_size then
                  request_handle:respond(
                    {[":status"] = "413"},
                    "Request body too large. Maximum size: " .. max_size .. " bytes"
                  )
                end
              end
            end
```

This approach is fast because it checks the header before the body is even read. But it relies on the client sending an accurate Content-Length header. Chunked transfer encoding won't have this header.

## Approach 4: External Authorization with Size Validation

For the most flexibility, use an external authorization service. This lets you implement complex rules like different size limits per user, per endpoint, or per content type:

Deploy the size authorization service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: size-authz
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: size-authz
  template:
    metadata:
      labels:
        app: size-authz
    spec:
      containers:
      - name: size-authz
        image: my-registry/size-authz:v1
        ports:
        - containerPort: 8080
        env:
        - name: DEFAULT_MAX_SIZE
          value: "1048576"
---
apiVersion: v1
kind: Service
metadata:
  name: size-authz
  namespace: istio-system
spec:
  selector:
    app: size-authz
  ports:
  - port: 8080
```

Here's a simple size authorization server in Python:

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os

DEFAULT_MAX = int(os.environ.get("DEFAULT_MAX_SIZE", "1048576"))

# Path-specific limits
SIZE_LIMITS = {
    "/api/upload": 50 * 1024 * 1024,     # 50MB
    "/api/import": 100 * 1024 * 1024,    # 100MB
    "/api/": 1 * 1024 * 1024,             # 1MB
}

class AuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        content_length = self.headers.get("x-original-content-length", "0")
        path = self.headers.get("x-original-path", "/")
        content_type = self.headers.get("x-original-content-type", "")

        size = int(content_length)

        # Find the matching limit
        max_size = DEFAULT_MAX
        for prefix, limit in sorted(SIZE_LIMITS.items(), key=lambda x: len(x[0]), reverse=True):
            if path.startswith(prefix):
                max_size = limit
                break

        if size > max_size:
            self.send_response(413)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Request too large",
                "max_bytes": max_size,
                "received_bytes": size,
                "path": path
            }).encode())
        else:
            self.send_response(200)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress logs for performance

HTTPServer(("", 8080), AuthHandler).serve_forever()
```

Register in Istio mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: size-authz
      envoyExtAuthzHttp:
        service: size-authz.istio-system.svc.cluster.local
        port: 8080
        includeRequestHeadersInCheck:
        - content-length
        - content-type
        headersToUpstreamOnAllow:
        - x-size-checked
```

Apply the CUSTOM authorization policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: size-check
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: CUSTOM
  provider:
    name: size-authz
  rules:
  - to:
    - operation:
        methods: ["POST", "PUT", "PATCH"]
```

Notice the policy only applies to methods that have request bodies. GET and DELETE requests skip the size check.

## Applying Size Limits at the Ingress Gateway

To protect the entire mesh, apply size limits at the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-size-limit
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
          maxRequestBytes: 10485760  # 10MB global limit
```

This creates a baseline limit for all incoming traffic. Individual services can then have tighter limits applied closer to the workload.

## Monitoring Oversized Requests

Track rejected requests to understand if your limits are appropriate:

```bash
# Check for 413 responses in Istio metrics
# Prometheus query:
# sum(rate(istio_requests_total{response_code="413"}[5m])) by (destination_workload)
```

If you see a high volume of 413 responses, your limits might be too low, or you might have a client sending unexpectedly large payloads that need investigation.

```yaml
groups:
- name: size-alerts
  rules:
  - alert: HighPayloadTooLargeRate
    expr: |
      sum(rate(istio_requests_total{response_code="413"}[5m])) by (destination_workload) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High rate of 413 responses for {{ $labels.destination_workload }}"
```

Request size authorization at the mesh layer gives you defense in depth. Even if an application has a bug that doesn't validate input sizes, the mesh catches oversized requests before they hit the service. Start with generous limits at the gateway and tighten them per-service as you understand your traffic patterns.
