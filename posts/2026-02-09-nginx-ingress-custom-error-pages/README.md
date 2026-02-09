# How to Implement NGINX Ingress Controller Custom Error Pages and Redirects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NGINX, Error Handling

Description: Learn how to configure custom error pages and redirects in NGINX Ingress Controller to provide better user experience, brand consistency, and helpful error messages for various HTTP error codes.

---

Custom error pages improve user experience by providing helpful, branded error messages instead of generic server errors. NGINX Ingress Controller supports custom error pages for various HTTP status codes and flexible redirect configurations. This guide shows you how to implement professional error handling.

## Understanding Error Page Configuration

NGINX Ingress Controller allows you to:
- Define custom error pages for specific HTTP status codes
- Serve error pages from a dedicated backend service
- Implement custom redirects for various scenarios
- Handle errors gracefully with fallback pages
- Maintain brand consistency across error states

## Basic Custom Error Pages

Set up a simple error page service.

### Error Page Service

```yaml
# error-page-service.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: error-pages
  namespace: default
data:
  404.html: |
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page Not Found</title>
      <style>
        body { font-family: Arial; text-align: center; padding: 50px; }
        h1 { color: #e74c3c; }
      </style>
    </head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/">Return to Homepage</a>
    </body>
    </html>

  503.html: |
    <!DOCTYPE html>
    <html>
    <head>
      <title>Service Unavailable</title>
    </head>
    <body>
      <h1>503 - Service Temporarily Unavailable</h1>
      <p>We're currently experiencing technical difficulties. Please try again later.</p>
    </body>
    </html>
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
  name: error-pages
  namespace: default
spec:
  selector:
    app: error-pages
  ports:
  - port: 80
```

### Ingress with Custom Error Pages

```yaml
# app-with-errors.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-with-custom-errors
  namespace: default
  annotations:
    # Enable custom error pages
    nginx.ingress.kubernetes.io/custom-http-errors: "404,503,500,502,504"

    # Point to error page service
    nginx.ingress.kubernetes.io/default-backend: error-pages
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

## Advanced Error Page Patterns

Implement sophisticated error handling.

### Dynamic Error Pages

```yaml
# dynamic-errors.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dynamic-error-pages
  namespace: default
data:
  error.html: |
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - {{ERROR_CODE}}</title>
      <script>
        window.addEventListener('DOMContentLoaded', function() {
          const code = '{{ERROR_CODE}}';
          const messages = {
            '400': 'Bad Request - Invalid request format',
            '401': 'Unauthorized - Please log in',
            '403': 'Forbidden - Access denied',
            '404': 'Not Found - Page does not exist',
            '429': 'Too Many Requests - Rate limit exceeded',
            '500': 'Internal Server Error - Something went wrong',
            '502': 'Bad Gateway - Upstream error',
            '503': 'Service Unavailable - Temporary issue',
            '504': 'Gateway Timeout - Request took too long'
          };
          document.getElementById('error-message').textContent =
            messages[code] || 'An error occurred';
          document.getElementById('error-code').textContent = code;
        });
      </script>
    </head>
    <body>
      <h1 id="error-code"></h1>
      <p id="error-message"></p>
      <a href="javascript:history.back()">Go Back</a>
    </body>
    </html>
```

## Custom Redirects

Configure various redirect patterns.

### Permanent Redirects (301)

```yaml
# permanent-redirects.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: permanent-redirect
  namespace: default
  annotations:
    # Permanent redirect
    nginx.ingress.kubernetes.io/permanent-redirect: https://new-domain.example.com
spec:
  ingressClassName: nginx
  rules:
  - host: old-domain.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: placeholder-service
            port:
              number: 80
```

### Temporary Redirects (302)

```yaml
# temporary-redirect.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: maintenance-redirect
  namespace: default
  annotations:
    # Temporary redirect for maintenance
    nginx.ingress.kubernetes.io/temporal-redirect: https://status.example.com
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

### Conditional Redirects

```yaml
# conditional-redirects.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: conditional-redirect
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/server-snippet: |
      # Redirect mobile users
      if ($http_user_agent ~* (mobile|android|iphone)) {
        return 302 https://mobile.example.com$request_uri;
      }

      # Redirect based on path
      if ($request_uri ~* ^/old-path) {
        return 301 /new-path;
      }
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

## Complete Error Handling Solution

Comprehensive error page service with monitoring.

### Full Error Page Service

```yaml
# complete-error-service.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: complete-error-pages
  namespace: default
data:
  nginx.conf: |
    server {
      listen 80;
      location / {
        root /usr/share/nginx/html;
        try_files /$1.html /error.html;
      }
    }

  400.html: |
    <!DOCTYPE html>
    <html><head><title>400 Bad Request</title></head>
    <body><h1>400 - Bad Request</h1></body></html>

  401.html: |
    <!DOCTYPE html>
    <html><head><title>401 Unauthorized</title></head>
    <body>
      <h1>401 - Unauthorized</h1>
      <p>Please <a href="/login">log in</a> to access this resource.</p>
    </body></html>

  403.html: |
    <!DOCTYPE html>
    <html><head><title>403 Forbidden</title></head>
    <body><h1>403 - Access Forbidden</h1></body></html>

  404.html: |
    <!DOCTYPE html>
    <html><head><title>404 Not Found</title></head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p><a href="/">Return Home</a></p>
    </body></html>

  500.html: |
    <!DOCTYPE html>
    <html><head><title>500 Internal Error</title></head>
    <body><h1>500 - Internal Server Error</h1></body></html>

  502.html: |
    <!DOCTYPE html>
    <html><head><title>502 Bad Gateway</title></head>
    <body><h1>502 - Bad Gateway</h1></body></html>

  503.html: |
    <!DOCTYPE html>
    <html><head><title>503 Service Unavailable</title></head>
    <body><h1>503 - Service Unavailable</h1></body></html>

  504.html: |
    <!DOCTYPE html>
    <html><head><title>504 Gateway Timeout</title></head>
    <body><h1>504 - Gateway Timeout</h1></body></html>
```

## Testing Error Pages

Test error pages and redirects:

```bash
# Test 404 error
curl -I https://app.example.com/nonexistent

# Test 503 error (stop backend pods)
kubectl scale deployment app-service --replicas=0
curl -I https://app.example.com/

# Test redirect
curl -I https://old-domain.example.com/

# Test conditional redirect
curl -H "User-Agent: Mobile" -I https://app.example.com/
```

## Monitoring

Track error rates:

```bash
# Check NGINX logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx | grep " 404 "

# Count errors by type
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx | \
  awk '{print $9}' | sort | uniq -c
```

## Conclusion

Custom error pages and redirects in NGINX Ingress Controller improve user experience and maintain brand consistency during error states. By implementing proper error handling with helpful messages and appropriate redirects, you create a more professional and user-friendly application. Always test error pages thoroughly and monitor error rates to identify and fix issues quickly.
