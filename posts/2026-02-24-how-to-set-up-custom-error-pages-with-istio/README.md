# How to Set Up Custom Error Pages with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Error Pages, Envoy, Kubernetes, Gateway

Description: How to configure custom error pages in Istio using EnvoyFilter and Lua scripting to replace default error responses with branded, user-friendly pages.

---

When a user hits a 404 or 503 error in your application, the default Envoy error page is not great. It shows a plain text message like "upstream connect error or disconnect/reset before headers" which is confusing and looks unprofessional. Replacing these with custom, branded error pages makes your application look polished even when things go wrong.

Istio does not have a built-in feature for custom error pages, but there are several approaches to get this done. We will cover the most practical ones.

## Approach 1: Custom Error Service with VirtualService

The simplest approach is to deploy a dedicated error page service and route errors to it. First, create a simple NGINX deployment that serves your custom error pages:

```yaml
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
      <p>Sorry, the page you are looking for does not exist.</p>
      <a href="/">Go back to homepage</a>
    </body>
    </html>
  503.html: |
    <!DOCTYPE html>
    <html>
    <head><title>Service Unavailable</title></head>
    <body>
      <h1>503 - Service Temporarily Unavailable</h1>
      <p>We are experiencing issues. Please try again in a few minutes.</p>
    </body>
    </html>
  502.html: |
    <!DOCTYPE html>
    <html>
    <head><title>Bad Gateway</title></head>
    <body>
      <h1>502 - Bad Gateway</h1>
      <p>Something went wrong on our end. We are working on it.</p>
    </body>
    </html>
  default.conf: |
    server {
      listen 8080;
      location /404.html { root /usr/share/nginx/html; internal; }
      location /503.html { root /usr/share/nginx/html; internal; }
      location /502.html { root /usr/share/nginx/html; internal; }
      location /healthz { return 200 'ok'; }
      location / {
        return 404;
        error_page 404 /404.html;
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: error-page-server
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: error-page-server
  template:
    metadata:
      labels:
        app: error-page-server
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: error-pages
              mountPath: /usr/share/nginx/html/404.html
              subPath: 404.html
            - name: error-pages
              mountPath: /usr/share/nginx/html/503.html
              subPath: 503.html
            - name: error-pages
              mountPath: /usr/share/nginx/html/502.html
              subPath: 502.html
            - name: error-pages
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: default.conf
      volumes:
        - name: error-pages
          configMap:
            name: error-pages
---
apiVersion: v1
kind: Service
metadata:
  name: error-page-server
  namespace: default
spec:
  selector:
    app: error-page-server
  ports:
    - port: 80
      targetPort: 8080
```

## Approach 2: EnvoyFilter with Lua Script

For more dynamic error page handling, you can use an EnvoyFilter with a Lua script that intercepts error responses and replaces the body:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-error-pages
  namespace: istio-system
spec:
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_response(response_handle)
                local status = response_handle:headers():get(":status")
                if status == "404" then
                  response_handle:headers():replace("content-type", "text/html")
                  response_handle:body():setBytes("<html><body><h1>404 - Page Not Found</h1><p>The page you requested does not exist.</p></body></html>")
                elseif status == "503" then
                  response_handle:headers():replace("content-type", "text/html")
                  response_handle:body():setBytes("<html><body><h1>503 - Service Unavailable</h1><p>Please try again later.</p></body></html>")
                elseif status == "502" then
                  response_handle:headers():replace("content-type", "text/html")
                  response_handle:body():setBytes("<html><body><h1>502 - Bad Gateway</h1><p>Something went wrong.</p></body></html>")
                end
              end
```

This filter runs on the gateway and intercepts responses. When it sees a 404, 503, or 502 status code, it replaces the response body with custom HTML.

The downside of inline Lua is that the error pages are embedded in the YAML, which makes them hard to maintain. For complex pages with CSS and images, use the service-based approach instead.

## Approach 3: EnvoyFilter with External Error Service

You can combine both approaches by using an EnvoyFilter that redirects error responses to your error page service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: error-redirect
  namespace: istio-system
spec:
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_response(response_handle)
                local status = response_handle:headers():get(":status")
                local error_codes = {["404"]=true, ["502"]=true, ["503"]=true, ["504"]=true}
                if error_codes[status] then
                  local headers, body = response_handle:httpCall(
                    "outbound|80||error-page-server.default.svc.cluster.local",
                    {
                      [":method"] = "GET",
                      [":path"] = "/" .. status .. ".html",
                      [":authority"] = "error-page-server.default.svc.cluster.local"
                    },
                    "",
                    5000
                  )
                  if headers and headers[":status"] == "200" then
                    response_handle:headers():replace("content-type", "text/html")
                    response_handle:body():setBytes(body)
                  end
                end
              end
```

This Lua script catches error responses at the gateway, makes an internal HTTP call to the error page server to fetch the appropriate error page, and replaces the response body with it. The `httpCall` function takes a cluster name (the Envoy cluster format for the error page service), headers, body, and timeout in milliseconds.

## Styling Your Error Pages

Your error pages should match your brand. Here is a more complete 404 page template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 6rem;
            margin: 0;
            color: #e74c3c;
        }
        p {
            font-size: 1.2rem;
            margin: 1rem 0;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <p>The page you are looking for does not exist.</p>
        <a href="/">Return to homepage</a>
    </div>
</body>
</html>
```

Put this in your ConfigMap or serve it from a static file server.

## Handling Error Pages for Specific Services

If different services need different error pages (maybe your API returns JSON errors while your frontend returns HTML), you can scope the EnvoyFilter to specific workloads:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: api-error-handler
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
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_response(response_handle)
                local status = response_handle:headers():get(":status")
                if status == "404" then
                  response_handle:headers():replace("content-type", "application/json")
                  response_handle:body():setBytes('{"error": "Not Found", "code": 404}')
                elseif status == "503" then
                  response_handle:headers():replace("content-type", "application/json")
                  response_handle:body():setBytes('{"error": "Service Unavailable", "code": 503}')
                end
              end
```

## Testing Your Error Pages

After deploying, test each error scenario:

```bash
# Test 404
curl -v http://<gateway-ip>/nonexistent-page

# Test 503 by scaling down a service
kubectl scale deployment my-service --replicas=0
curl -v http://<gateway-ip>/my-service-path

# Test with fault injection
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: test-errors
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - fault:
        abort:
          httpStatus: 502
          percentage:
            value: 100
      route:
        - destination:
            host: my-service.default.svc.cluster.local
EOF
```

Remember to remove the fault injection VirtualService after testing.

## Summary

Custom error pages in Istio require a bit of work since there is no built-in feature for it. The most maintainable approach is deploying a dedicated error page service and using an EnvoyFilter Lua script at the gateway to redirect error responses to it. For simple cases, inline Lua with embedded HTML works fine. The key is to handle at least 404, 502, 503, and 504 errors, and make sure API services return JSON errors while frontend services return HTML.
