# How to Implement NGINX Ingress Controller Sticky Sessions with Cookie Affinity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NGINX, Session Management

Description: Learn how to configure sticky sessions and cookie-based session affinity in NGINX Ingress Controller to ensure users are routed to the same backend pod for stateful applications in Kubernetes.

---

Sticky sessions, also known as session affinity, ensure that requests from the same client are consistently routed to the same backend pod. This is essential for stateful applications that store session data in memory. NGINX Ingress Controller provides robust sticky session support using cookie-based affinity. This guide explores how to configure and optimize sticky sessions for production use.

## Understanding Session Affinity

Session affinity solves the problem of state management in distributed systems. When you scale your application across multiple pods, user session data may only exist in the pod that initially handled the request. Without sticky sessions:

- Users might lose their session state when routed to different pods
- Shopping carts could be emptied unexpectedly
- Authentication might fail intermittently
- User experience becomes inconsistent

NGINX Ingress Controller supports two types of session affinity:
- **Cookie-based affinity**: Uses a cookie to track which pod served the client
- **IP-based affinity**: Routes based on client IP address (less reliable with proxies)

## Installing NGINX Ingress Controller

Install NGINX Ingress Controller if not already present:

```bash
# Using Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

Verify installation:

```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

## Basic Cookie Affinity Configuration

Enable sticky sessions using annotations on your Ingress resource.

### Simple Cookie Affinity

Configure basic cookie-based sticky sessions:

```yaml
# sticky-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sticky-app
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "route"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "3600"
    nginx.ingress.kubernetes.io/session-cookie-expires: "3600"
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
            name: stateful-app
            port:
              number: 80
```

This configuration:
- Enables cookie-based affinity
- Creates a cookie named "route"
- Sets cookie max-age to 1 hour (3600 seconds)
- Ensures the cookie expires after 1 hour

### Cookie Configuration Options

Customize cookie behavior:

```yaml
# advanced-cookie-config.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: advanced-sticky
  namespace: default
  annotations:
    # Enable cookie affinity
    nginx.ingress.kubernetes.io/affinity: "cookie"

    # Cookie name
    nginx.ingress.kubernetes.io/session-cookie-name: "SESSIONID"

    # Cookie path (default: /)
    nginx.ingress.kubernetes.io/session-cookie-path: "/app"

    # Cookie max-age in seconds
    nginx.ingress.kubernetes.io/session-cookie-max-age: "7200"

    # Cookie expires time
    nginx.ingress.kubernetes.io/session-cookie-expires: "7200"

    # Cookie SameSite attribute
    nginx.ingress.kubernetes.io/session-cookie-samesite: "Lax"

    # Make cookie secure (HTTPS only)
    nginx.ingress.kubernetes.io/session-cookie-secure: "true"

    # Make cookie HttpOnly
    nginx.ingress.kubernetes.io/session-cookie-httponly: "true"

    # Cookie domain
    nginx.ingress.kubernetes.io/session-cookie-domain: ".example.com"

    # Cookie change on failure
    nginx.ingress.kubernetes.io/session-cookie-change-on-failure: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /app
        pathType: Prefix
        backend:
          service:
            name: stateful-app
            port:
              number: 80
```

## Session Affinity for Multiple Services

Configure sticky sessions for different paths or services.

### Per-Path Sticky Sessions

Different sticky session configs for different paths:

```yaml
# multi-path-sticky.yaml
# Main application with sticky sessions
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-sticky
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "app_session"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "3600"
spec:
  ingressClassName: nginx
  rules:
  - host: example.com
    http:
      paths:
      - path: /app
        pathType: Prefix
        backend:
          service:
            name: stateful-app
            port:
              number: 80
---
# API without sticky sessions (stateless)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-no-sticky
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
---
# Admin with different sticky config
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: admin-sticky
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "admin_session"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "1800"
spec:
  ingressClassName: nginx
  rules:
  - host: example.com
    http:
      paths:
      - path: /admin
        pathType: Prefix
        backend:
          service:
            name: admin-app
            port:
              number: 80
```

## Combining with Other NGINX Features

Integrate sticky sessions with other NGINX capabilities.

### Sticky Sessions with SSL/TLS

Secure sticky sessions with HTTPS:

```yaml
# ssl-sticky-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-sticky-app
  namespace: default
  annotations:
    # Sticky session configuration
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "secure_session"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "7200"
    nginx.ingress.kubernetes.io/session-cookie-secure: "true"
    nginx.ingress.kubernetes.io/session-cookie-httponly: "true"
    nginx.ingress.kubernetes.io/session-cookie-samesite: "Strict"

    # Force HTTPS redirect
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"

    # SSL configuration
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "HIGH:!aNULL:!MD5"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls-cert
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: stateful-app
            port:
              number: 80
```

### Sticky Sessions with Rate Limiting

Combine session affinity with rate limiting:

```yaml
# sticky-with-rate-limit.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: limited-sticky-app
  namespace: default
  annotations:
    # Sticky sessions
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "session"

    # Rate limiting (per IP)
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"

    # Connection limiting
    nginx.ingress.kubernetes.io/limit-connections: "50"
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
            name: stateful-app
            port:
              number: 80
```

### Sticky Sessions with Custom Headers

Add custom headers to sticky session responses:

```yaml
# sticky-with-headers.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sticky-custom-headers
  namespace: default
  annotations:
    # Sticky sessions
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "app_route"

    # Custom response headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Sticky-Session "enabled" always;
      add_header X-Backend-Server $upstream_addr always;
      add_header X-Response-Time $request_time always;
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
            name: stateful-app
            port:
              number: 80
```

## Handling Pod Failures and Scaling

Configure behavior when backend pods change.

### Graceful Pod Termination

Ensure graceful handling of pod termination:

```yaml
# graceful-sticky.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: graceful-sticky
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "session"

    # Change cookie on failure (reassign to new pod)
    nginx.ingress.kubernetes.io/session-cookie-change-on-failure: "true"

    # Upstream configuration
    nginx.ingress.kubernetes.io/upstream-fail-timeout: "10"
    nginx.ingress.kubernetes.io/upstream-max-fails: "3"
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
            name: stateful-app
            port:
              number: 80
---
# Configure deployment for graceful shutdown
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stateful-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: stateful-app
  template:
    metadata:
      labels:
        app: stateful-app
    spec:
      # Graceful termination period
      terminationGracePeriodSeconds: 60
      containers:
      - name: app
        image: your-app:latest
        ports:
        - containerPort: 80
        # Lifecycle hooks for graceful shutdown
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

## Testing Sticky Sessions

Verify sticky session configuration:

```bash
# Test cookie creation
curl -v https://app.example.com/ 2>&1 | grep -i set-cookie

# Follow redirects and show cookies
curl -vL -c cookies.txt https://app.example.com/

# Test with cookie
curl -v -b cookies.txt https://app.example.com/

# Verify same backend is used
for i in {1..10}; do
  curl -s -b cookies.txt https://app.example.com/ | grep "Backend:"
done
```

Test cookie attributes:

```bash
# Check cookie details
curl -v https://app.example.com/ 2>&1 | grep -i "set-cookie"
# Should show: Set-Cookie: session=xxx; Path=/; Max-Age=3600; HttpOnly; Secure
```

Test pod failure handling:

```bash
# Get current backend pod
COOKIE=$(curl -s -c - https://app.example.com/ | grep session | awk '{print $7}')

# Make requests with cookie
for i in {1..5}; do
  curl -s -b "session=$COOKIE" https://app.example.com/
  sleep 1
done

# Delete a pod to simulate failure
kubectl delete pod <pod-name>

# Continue making requests (should reassign to new pod)
for i in {1..5}; do
  curl -s -b "session=$COOKIE" https://app.example.com/
  sleep 1
done
```

## Monitoring Sticky Sessions

Monitor session distribution across pods:

```bash
# Check NGINX logs for backend assignments
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx | grep upstream

# View NGINX statistics
kubectl exec -n ingress-nginx <nginx-pod> -- cat /var/log/nginx/access.log | \
  awk '{print $7}' | sort | uniq -c
```

Create a ConfigMap for enhanced logging:

```yaml
# nginx-logging-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  log-format-upstream: |
    $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" $request_length $request_time [$proxy_upstream_name] [$proxy_alternative_upstream_name] $upstream_addr $upstream_response_length $upstream_response_time $upstream_status $req_id $http_cookie
```

## Troubleshooting

Common issues and solutions:

**Cookies not being set**: Check secure flag matches protocol:
```yaml
# For HTTP (development)
nginx.ingress.kubernetes.io/session-cookie-secure: "false"

# For HTTPS (production)
nginx.ingress.kubernetes.io/session-cookie-secure: "true"
```

**Sessions not sticky**: Verify cookie is being sent:
```bash
curl -v -b "session=value" https://app.example.com/
```

**Cookie domain mismatch**: Ensure domain setting is correct:
```yaml
# Use parent domain for subdomains
nginx.ingress.kubernetes.io/session-cookie-domain: ".example.com"
```

**Pods receiving uneven traffic**: Check that all pods are healthy:
```bash
kubectl get pods -l app=stateful-app
kubectl logs <pod-name>
```

## Conclusion

Sticky sessions are essential for stateful applications running in Kubernetes. NGINX Ingress Controller provides robust cookie-based session affinity with extensive configuration options for security, expiration, and failure handling. By properly configuring sticky sessions with secure cookies, graceful pod termination, and failure handling, you can ensure a consistent user experience even as your application scales across multiple pods. Remember to use secure cookies in production, implement graceful shutdown procedures, and monitor session distribution to maintain optimal performance.
