# How to Configure Custom 404 Pages at Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, 404 Pages, Gateway, Envoy, Kubernetes

Description: How to serve custom 404 Not Found pages at the Istio ingress gateway when no route matches a request, replacing the default Envoy error response.

---

When someone hits a URL that does not match any of your VirtualService routes, Istio returns a plain "404 Not Found" response from Envoy. It looks terrible. The response body is either empty or contains a short Envoy local-reply message, which means nothing to your users. Replacing this with a branded 404 page makes your application look professional even when people end up on wrong URLs.

There are several places a 404 can originate in Istio, and each requires a slightly different approach to customize.

## Where 404s Come From

In Istio, a 404 can come from three different places:

1. **The gateway itself** - No Gateway or VirtualService route matches the requested host or path
2. **An Envoy proxy** - A request reaches a proxy but no route matches
3. **The application** - Your app returns a 404 because the resource does not exist

This guide focuses on cases 1 and 2, which are infrastructure-level 404s that Envoy generates.

## Approach 1: Default Route Catch-All

The cleanest approach for unknown hosts is to create a catch-all VirtualService that routes them to a custom 404 page server.

First, deploy a simple service that serves your 404 page:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-404-page
  namespace: default
data:
  index.html: |
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Page Not Found</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex; justify-content: center; align-items: center;
          min-height: 100vh; background: #f8f9fa; color: #343a40;
        }
        .container { text-align: center; padding: 2rem; }
        .error-code { font-size: 8rem; font-weight: 700; color: #dee2e6; line-height: 1; }
        h1 { font-size: 1.5rem; margin: 1rem 0; }
        p { color: #6c757d; margin-bottom: 2rem; }
        a { color: #0d6efd; text-decoration: none; padding: 0.5rem 1.5rem;
            border: 1px solid #0d6efd; border-radius: 4px; }
        a:hover { background: #0d6efd; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you are looking for does not exist or has been moved.</p>
        <a href="/">Back to Home</a>
      </div>
    </body>
    </html>
  nginx.conf: |
    server {
      listen 8080;
      error_page 404 /index.html;
      location / {
        return 404;
      }
      location = /index.html {
        root /usr/share/nginx/html;
        internal;
      }
      location /healthz {
        return 200 'ok';
        add_header Content-Type text/plain;
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: error-pages
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: error-pages
  template:
    metadata:
      labels:
        app: error-pages
    spec:
      containers:
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: pages
              mountPath: /usr/share/nginx/html/index.html
              subPath: index.html
            - name: pages
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: nginx.conf
      volumes:
        - name: pages
          configMap:
            name: custom-404-page
---
apiVersion: v1
kind: Service
metadata:
  name: error-pages
  namespace: default
spec:
  selector:
    app: error-pages
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

Now create a catch-all VirtualService. The key is to use a wildcard host that matches everything:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: catch-all-404
  namespace: default
spec:
  hosts:
    - "*"
  gateways:
    - my-gateway
  http:
    - route:
        - destination:
            host: error-pages.default.svc.cluster.local
            port:
              number: 80
```

This VirtualService uses a wildcard host, so it is useful for requests whose host does not match a more specific VirtualService. If a host already has a VirtualService and you want to catch unmatched paths for that same host, add a final catch-all route for that host or use the EnvoyFilter approach below.

## Approach 2: EnvoyFilter for Response Rewrites

If you do not want to deploy a separate service just for 404 pages, you can use an EnvoyFilter to rewrite 404 response bodies:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-404-response
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
                  local content_type = response_handle:headers():get("content-type")
                  -- Only replace if it's not already an HTML response from the app
                  if content_type == nil or not string.find(content_type, "text/html") then
                    response_handle:headers():replace("content-type", "text/html; charset=utf-8")
                    local html = [[
                    <!DOCTYPE html>
                    <html>
                    <head><title>404 - Not Found</title>
                    <style>
                    body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}
                    .c{text-align:center}
                    h1{font-size:6em;color:#ddd;margin:0}
                    p{color:#666;font-size:1.2em}
                    a{color:#0066cc}
                    </style></head>
                    <body><div class="c"><h1>404</h1><p>Page not found.</p><p><a href="/">Go home</a></p></div></body>
                    </html>]]
                    response_handle:body(true):setBytes(html)
                  end
                end
              end
```

This Lua script intercepts all 404 responses at the gateway level and replaces the body with custom HTML. It checks the content-type first, so if your application is already returning an HTML 404 page, it will not overwrite it.

## Approach 3: Per-Host 404 Pages

If different domains need different 404 pages, extend the Lua script:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-host-404
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
              local pages = {
                ["api.example.com"] = '{"error":"Not Found","status":404}',
                ["app.example.com"] = '<html><body><h1>404</h1><p>Page not found</p></body></html>',
              }
              local content_types = {
                ["api.example.com"] = "application/json",
                ["app.example.com"] = "text/html",
              }

              function envoy_on_request(request_handle)
                local host = request_handle:headers():get(":authority")
                if host then
                  request_handle:streamInfo():dynamicMetadata():set("envoy.filters.http.lua", "host", host)
                end
              end

              function envoy_on_response(response_handle)
                if response_handle:headers():get(":status") == "404" then
                  local metadata = response_handle:streamInfo():dynamicMetadata():get("envoy.filters.http.lua")
                  local host = metadata and metadata["host"]
                  -- Strip port from host
                  if host then
                    host = string.gsub(host, ":%d+$", "")
                  end
                  if host and pages[host] then
                    response_handle:headers():replace("content-type", content_types[host])
                    response_handle:body(true):setBytes(pages[host])
                  end
                end
              end
```

This returns JSON 404 responses for the API domain and HTML for the web app domain.

## Setting the Correct Status Code

Sometimes the gateway returns a 404 but with the default Envoy response body. Make sure the status code is preserved:

```yaml
inline_code: |
  function envoy_on_response(response_handle)
    local status = response_handle:headers():get(":status")
    if status == "404" then
      response_handle:headers():replace(":status", "404")
      response_handle:headers():replace("content-type", "text/html; charset=utf-8")
      response_handle:body(true):setBytes("<html><body><h1>Not Found</h1></body></html>")
    end
  end
```

## Handling Unknown Hosts

When a request comes in with a Host header that does not match any gateway server, the gateway itself returns a 404 before any VirtualService routing happens. To handle this case, you need to add a wildcard server to the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http-app
        protocol: HTTP
      hosts:
        - "app.example.com"
    - port:
        number: 80
        name: http-catchall
        protocol: HTTP
      hosts:
        - "*"
```

Then the catch-all VirtualService from Approach 1 will handle requests for unknown hosts.

## Testing Your Custom 404

```bash
export GATEWAY_HOST=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}{.status.loadBalancer.ingress[0].hostname}')

# Test with a known host but unknown path

curl -v -H "Host: app.example.com" http://$GATEWAY_HOST/this-does-not-exist

# Test with an unknown host
curl -v -H "Host: unknown.example.com" http://$GATEWAY_HOST/

# Test the error pages service directly
kubectl port-forward svc/error-pages 8080:80 &
curl -v http://localhost:8080/
```

## Monitoring 404 Rates

Track 404 rates to identify broken links or misconfigurations:

```promql
sum(rate(istio_requests_total{response_code="404", reporter="source", source_workload="istio-ingressgateway"}[5m])) by (destination_service_name, source_workload)
```

A spike in 404 rates after a deployment might indicate broken routes or removed endpoints.

## Summary

Custom 404 pages at the Istio gateway can be implemented with a catch-all VirtualService that routes unmatched hosts to an error page service, or with an EnvoyFilter Lua script that intercepts 404 responses and replaces the body. The catch-all VirtualService approach is more maintainable for complex pages with CSS and images, while the EnvoyFilter approach avoids deploying an extra service and can cover 404 responses generated after host matching. Make sure to add a wildcard server to your Gateway configuration to handle requests for completely unknown hosts.
