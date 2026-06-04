# How to Use HAProxy Ingress Controller with Custom Backend Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HAProxy, Configuration

Description: Learn how to configure custom backend settings in HAProxy Ingress Controller including health checks, connection limits, timeouts, and advanced load balancing for production Kubernetes deployments.

---

HAProxy Ingress Controller provides extensive backend configuration options through annotations and ConfigMaps. Custom backend configuration allows you to fine-tune connection handling, health checking, timeouts, and load balancing for optimal performance and reliability.

## Backend Configuration Methods

HAProxy Ingress supports backend configuration through:
- Ingress annotations for per-service settings
- ConfigMap snippets for advanced HAProxy directives
- Global defaults in the controller ConfigMap

## Health Check Configuration

Configure active and passive health checks.

### Basic Health Checks

```yaml
# health-check-ingress.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: health-checked-app
  namespace: default
  annotations:
    # Enable health checks
    haproxy.org/check: "true"
    haproxy.org/check-http: "/health"
    haproxy.org/check-interval: "5s"
spec:
  ingressClassName: haproxy
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

### Advanced Health Checks

```yaml
# advanced-health-check.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: advanced-health
  namespace: default
  annotations:
    haproxy.org/check: "true"
    haproxy.org/backend-config-snippet: |
      http-check send meth GET uri /health ver HTTP/1.1 hdr Host app.example.com
      http-check expect status 200
spec:
  ingressClassName: haproxy
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

## Connection and Timeout Configuration

Optimize connection handling and timeouts.

### Connection Limits

```yaml
# connection-limits.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: limited-connections
  namespace: default
  annotations:
    haproxy.org/pod-maxconn: "500"
    haproxy.org/backend-config-snippet: |
      fullconn 400
spec:
  ingressClassName: haproxy
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

### Timeout Configuration

```yaml
# timeout-config.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: custom-timeouts
  namespace: default
  annotations:
    haproxy.org/timeout-server: "30s"
    haproxy.org/timeout-check: "5s"
spec:
  ingressClassName: haproxy
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

## Load Balancing Algorithms

Configure different load balancing strategies.

### Round Robin

```yaml
# round-robin.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: round-robin-lb
  namespace: default
  annotations:
    haproxy.org/load-balance: "roundrobin"
spec:
  ingressClassName: haproxy
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

### Least Connections

```yaml
# least-conn.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: least-conn-lb
  namespace: default
  annotations:
    haproxy.org/load-balance: "leastconn"
spec:
  ingressClassName: haproxy
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

### Source IP Hash

```yaml
# source-hash.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: source-hash-lb
  namespace: default
  annotations:
    haproxy.org/load-balance: "source"
spec:
  ingressClassName: haproxy
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

## SSL/TLS Backend Configuration

Configure TLS for backend connections.

### TLS to Backend

```yaml
# backend-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-backend
  namespace: default
  annotations:
    haproxy.org/server-ssl: "true"
spec:
  ingressClassName: haproxy
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
              number: 443
```

## Cookie-Based Session Affinity

Implement sticky sessions.

### Cookie Persistence

```yaml
# cookie-affinity.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sticky-sessions
  namespace: default
  annotations:
    haproxy.org/cookie-persistence: "SERVERID"
spec:
  ingressClassName: haproxy
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

## Complete Backend Configuration Example

```yaml
# production-backend.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: production-app
  namespace: default
  annotations:
    # Load balancing
    haproxy.org/load-balance: "leastconn"

    # Health checks
    haproxy.org/check: "true"
    haproxy.org/check-http: "/health"
    haproxy.org/check-interval: "10s"

    # Timeouts
    haproxy.org/timeout-server: "30s"
    haproxy.org/timeout-check: "5s"

    # Cookie persistence
    haproxy.org/cookie-persistence: "SERVERID"

    # Connection limits
    haproxy.org/pod-maxconn: "1000"

    # Connection limits
    haproxy.org/backend-config-snippet: |
      # Connection limits
      fullconn 800

      # Advanced health check
      http-check send meth GET uri /health ver HTTP/1.1 hdr Host app.example.com
      http-check expect status 200

      # Connection reuse
      option http-server-close

      # Retry configuration
      retries 3
      option redispatch

      # Server weights and health tracking
      default-server inter 10s fastinter 2s downinter 30s rise 2 fall 3 weight 100
spec:
  ingressClassName: haproxy
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

## Conclusion

HAProxy's extensive backend configuration options enable fine-tuned control over connection handling, health checking, and load balancing. Properly configured backends ensure optimal performance, reliability, and resource utilization in production environments.
