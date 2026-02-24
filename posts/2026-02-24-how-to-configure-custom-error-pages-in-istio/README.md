# How to Configure Custom Error Pages in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Error Pages, EnvoyFilter, Traffic Management, Kubernetes

Description: How to set up custom error pages in Istio for 404, 503, and other HTTP error codes using EnvoyFilter, Lua scripts, and external error page services.

---

When something goes wrong in your mesh, users see raw Envoy error responses like "no healthy upstream" or a plain "503 Service Unavailable". These default error pages are not helpful for end users and look unprofessional. Setting up custom error pages in Istio takes some effort because there is no built-in feature for it, but there are several working approaches.

## Understanding Envoy Error Responses

Envoy generates error responses in several situations:

- **503** - no healthy upstream, circuit breaker triggered, connection failure
- **404** - no route found for the request
- **502** - bad gateway, upstream returned invalid response
- **504** - upstream request timeout
- **503 UC** - upstream connection termination

These are returned as plain text with minimal information. Your goal is to replace them with something user-friendly.

## Approach 1: External Error Service with Direct Response

The simplest approach uses a dedicated error page service combined with VirtualService fault handling:

First, create a simple error page service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: error-page-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: error-page-service
  template:
    metadata:
      labels:
        app: error-page-service
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: error-pages
              mountPath: /usr/share/nginx/html
      volumes:
        - name: error-pages
          configMap:
            name: error-pages
---
apiVersion: v1
kind: Service
metadata:
  name: error-page-service
  namespace: default
spec:
  selector:
    app: error-page-service
  ports:
    - port: 80
      targetPort: 80
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: error-pages
  namespace: default
data:
  404.html: |
    <!DOCTYPE html>
    <html>
    <head><title>Page Not Found</title></head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </body>
    </html>
  503.html: |
    <!DOCTYPE html>
    <html>
    <head><title>Service Unavailable</title></head>
    <body>
      <h1>503 - Service Temporarily Unavailable</h1>
      <p>We are experiencing issues. Please try again later.</p>
    </body>
    </html>
  502.html: |
    <!DOCTYPE html>
    <html>
    <head><title>Bad Gateway</title></head>
    <body>
      <h1>502 - Bad Gateway</h1>
      <p>Something went wrong. Please try again.</p>
    </body>
    </html>
```

## Approach 2: Lua Filter for Custom Error Responses

You can use an EnvoyFilter with a Lua script to intercept error responses and replace them:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-error-pages
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
            inline_code: |
              function envoy_on_response(response_handle)
                local status = response_handle:headers():get(":status")
                local content_type = response_handle:headers():get("content-type") or ""

                if status == "503" and not string.find(content_type, "text/html") then
                  response_handle:headers():replace("content-type", "text/html; charset=utf-8")
                  response_handle:body():setBytes([[
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Service Unavailable</title>
                      <style>
                        body { font-family: sans-serif; text-align: center; padding: 50px; }
                        h1 { color: #333; }
                        p { color: #666; }
                      </style>
                    </head>
                    <body>
                      <h1>Service Temporarily Unavailable</h1>
                      <p>We are working on it. Please try again in a moment.</p>
                    </body>
                    </html>
                  ]])
                end

                if status == "404" and not string.find(content_type, "text/html") then
                  response_handle:headers():replace("content-type", "text/html; charset=utf-8")
                  response_handle:body():setBytes([[
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Not Found</title>
                      <style>
                        body { font-family: sans-serif; text-align: center; padding: 50px; }
                        h1 { color: #333; }
                      </style>
                    </head>
                    <body>
                      <h1>Page Not Found</h1>
                      <p>The page you requested could not be found.</p>
                    </body>
                    </html>
                  ]])
                end
              end
```

This Lua filter intercepts responses and replaces error bodies with custom HTML. The check for `content-type` prevents overwriting error responses that your application intentionally returns as HTML.

## Approach 3: Local Reply Config via EnvoyFilter

Envoy has a built-in local reply customization feature. You can use EnvoyFilter to configure it:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-reply-config
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            local_reply_config:
              mappers:
                - filter:
                    status_code_filter:
                      comparison:
                        op: EQ
                        value:
                          default_value: 503
                          runtime_key: unused
                  headers_to_add:
                    - header:
                        key: content-type
                        value: text/html; charset=utf-8
                      append: false
                  body:
                    inline_string: |
                      <!DOCTYPE html>
                      <html>
                      <head><title>Service Unavailable</title></head>
                      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1>503 - Service Unavailable</h1>
                        <p>The service is temporarily unavailable. Please try again later.</p>
                      </body>
                      </html>
                - filter:
                    status_code_filter:
                      comparison:
                        op: EQ
                        value:
                          default_value: 404
                          runtime_key: unused
                  headers_to_add:
                    - header:
                        key: content-type
                        value: text/html; charset=utf-8
                      append: false
                  body:
                    inline_string: |
                      <!DOCTYPE html>
                      <html>
                      <head><title>Not Found</title></head>
                      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1>404 - Not Found</h1>
                        <p>The page you are looking for does not exist.</p>
                      </body>
                      </html>
```

The `local_reply_config` only affects responses generated locally by Envoy - not responses from your upstream services. This is important because it means your application's intentional 404 or 503 responses will not be overwritten.

## Approach 4: Custom Error Service with Routing Fallback

For a more dynamic approach, set up a dedicated error service and use VirtualService with fault injection to handle failures:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-with-fallback
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - route:
        - destination:
            host: main-app
            port:
              number: 8080
      retries:
        attempts: 2
        perTryTimeout: 3s
        retryOn: "5xx,reset,connect-failure"
      timeout: 10s
```

Then configure the error service as a fallback using an EnvoyFilter that modifies the retry policy to include a fallback cluster. This is more complex but gives you full control over the error experience.

## Approach 5: Wasm Plugin for Error Handling

For a production-grade solution, you can write a Wasm plugin that handles error responses:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: error-page-handler
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  url: oci://registry.example.com/error-page-plugin:v1.0
  phase: STATS
  pluginConfig:
    error_pages:
      "404": "https://cdn.example.com/errors/404.html"
      "503": "https://cdn.example.com/errors/503.html"
```

This approach requires writing the Wasm plugin, but it gives you the most flexibility and best performance.

## Testing Error Pages

Test each error scenario:

```bash
# Test 404 - request a path that does not exist
curl -v http://app.example.com/nonexistent-path

# Test 503 - scale down the backend to zero
kubectl scale deployment main-app --replicas=0
curl -v http://app.example.com/
kubectl scale deployment main-app --replicas=2

# Test 502 - send traffic to a crashing backend
curl -v http://app.example.com/crash-endpoint

# Test from the gateway
kubectl exec <gateway-pod> -n istio-system -c istio-proxy -- curl -v http://localhost:8080/nonexistent
```

## Caching Considerations

If you use a CDN in front of your Istio gateway, be careful about caching error pages. Add `Cache-Control: no-cache` headers to error responses so the CDN does not cache them:

```yaml
# In the Lua filter or local_reply_config
headers_to_add:
  - header:
      key: cache-control
      value: no-cache, no-store, must-revalidate
    append: false
```

Custom error pages improve the user experience significantly. The local_reply_config approach is the cleanest for Envoy-generated errors, while the Lua filter approach gives you more flexibility for handling errors from upstream services. Pick the approach that fits your requirements and complexity budget.
