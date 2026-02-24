# How to Add Custom Headers at Gateway Level in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, Headers, Ingress, Traffic Management

Description: How to inject custom HTTP headers at the Istio ingress gateway for security, routing, and operational purposes across all backend services.

---

Adding custom headers at the gateway level is one of the most common operations in any Istio setup. Instead of modifying every backend service to add security headers, tracking headers, or routing context, you handle it once at the gateway and every request flowing through picks up those headers automatically. This keeps your services clean and your header management centralized.

## Gateway and VirtualService Basics

In Istio, the Gateway resource defines the ports and protocols the ingress gateway listens on, while VirtualService handles routing and header manipulation. To add custom headers, you work with the VirtualService attached to your gateway.

Here is the basic setup:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: example-com-cert
      hosts:
        - "*.example.com"
```

Now the VirtualService that adds headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-routing
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: app-service
            port:
              number: 8080
          headers:
            request:
              add:
                x-gateway-name: "main-gateway"
                x-forwarded-by: "istio-ingress"
              set:
                x-request-id: "%REQ(x-request-id)%"
            response:
              set:
                strict-transport-security: "max-age=31536000"
                x-content-type-options: "nosniff"
              remove:
                - server
                - x-powered-by
```

## Adding Headers for All Routes

If you have multiple VirtualServices attached to the same gateway and you want the same headers on all of them, you have two options.

**Option 1: EnvoyFilter on the gateway workload**

This is the cleanest approach for gateway-wide headers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-custom-headers
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
                request_handle:headers():add("x-gateway-timestamp", os.time())
                request_handle:headers():add("x-processed-by", "istio-gateway")
              end
              function envoy_on_response(response_handle)
                response_handle:headers():add("x-served-through", "istio-gateway")
                response_handle:headers():remove("server")
              end
```

**Option 2: Repeat headers in every VirtualService**

This is more verbose but does not require EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: service-a
spec:
  hosts:
    - "a.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: service-a
            port:
              number: 8080
          headers:
            request:
              add:
                x-gateway-name: "main"
            response:
              set:
                strict-transport-security: "max-age=31536000"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: service-b
spec:
  hosts:
    - "b.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: service-b
            port:
              number: 8080
          headers:
            request:
              add:
                x-gateway-name: "main"
            response:
              set:
                strict-transport-security: "max-age=31536000"
```

Obviously the EnvoyFilter approach scales better.

## Host-Specific Headers

You might want different custom headers depending on which hostname the request comes in on:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-headers
spec:
  hosts:
    - "api.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: api-backend
            port:
              number: 8080
          headers:
            request:
              set:
                x-service-type: "api"
                x-rate-limit-tier: "standard"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: admin-headers
spec:
  hosts:
    - "admin.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: admin-backend
            port:
              number: 8080
          headers:
            request:
              set:
                x-service-type: "admin"
                x-rate-limit-tier: "elevated"
```

## Adding Correlation Headers

A practical use case is injecting correlation or trace headers at the gateway so they propagate through the entire request chain:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: correlation-headers
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
                local existing = request_handle:headers():get("x-correlation-id")
                if existing == nil then
                  local id = string.format("%x-%x", os.time(), math.random(0, 0xFFFFFF))
                  request_handle:headers():add("x-correlation-id", id)
                end
              end
```

This checks if a correlation ID already exists (from the client) and only generates one if missing.

## Environment and Deployment Context Headers

You can tag requests with deployment context information:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-routes
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: app-service
            port:
              number: 8080
          headers:
            request:
              add:
                x-environment: "production"
                x-region: "us-east-1"
                x-cluster: "prod-cluster-01"
```

Backend services can use these headers to adjust their behavior based on the deployment context without needing to read environment variables or configuration files.

## Testing Gateway Headers

From outside the cluster, test with curl:

```bash
export GATEWAY_IP=$(kubectl -n istio-system get svc istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Check request headers (use httpbin deployed inside the mesh)
curl -s -H "Host: httpbin.example.com" http://$GATEWAY_IP/headers | python3 -m json.tool

# Check response headers
curl -sI -H "Host: app.example.com" http://$GATEWAY_IP/
```

To verify the Envoy configuration on the gateway:

```bash
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json
```

Look for `requestHeadersToAdd` and `responseHeadersToRemove` in the output.

## Performance Considerations

Header operations at the gateway are cheap. Envoy is extremely efficient at manipulating headers. However, be mindful of a few things:

- Each header adds bytes to every request/response, which adds up at high traffic volumes
- Lua scripts in EnvoyFilter have a small overhead compared to native VirtualService header operations
- If you are adding the same headers via both EnvoyFilter and VirtualService, you might end up with duplicate headers

Keep your gateway header configuration organized and documented. It is easy to lose track of what headers are being added where, especially when you have multiple VirtualServices and EnvoyFilters all modifying headers on the same gateway.

## Common Patterns

Here is a summary of typical gateway-level headers:

| Header | Purpose |
|--------|---------|
| `x-request-id` | Distributed tracing |
| `strict-transport-security` | Force HTTPS |
| `x-content-type-options` | Prevent MIME sniffing |
| `x-frame-options` | Clickjacking protection |
| `x-gateway-name` | Identify which gateway handled the request |
| `x-environment` | Deployment environment context |

Getting headers right at the gateway means your backend services do not need to worry about these cross-cutting concerns.
