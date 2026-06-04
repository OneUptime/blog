# How to Implement NGINX Ingress Rate Limiting per Client IP and URL Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NGINX Ingress, Rate Limiting, Security, API Gateway

Description: Implement sophisticated rate limiting strategies using NGINX Ingress Controller annotations to protect APIs from abuse, including per-IP limits, per-path limits, and burst handling on Kubernetes.

---

Rate limiting protects backend services from overload and abuse by controlling request rates. NGINX Ingress Controller provides flexible rate limiting through annotations that apply limits per client IP, URL path, or custom criteria without modifying application code.

## Understanding NGINX Rate Limiting

NGINX uses the leaky bucket algorithm for rate limiting. Requests arrive at variable rates but are processed at a fixed rate. Excess requests either queue up to a burst limit or get rejected with the configured rate-limit status code.

The limit applies per key, typically the client IP address. NGINX tracks request rates for each unique key in a shared memory zone. In NGINX Ingress Controller, these limits are applied per controller replica, so the effective limit scales with the number of replicas. When a client exceeds the limit, NGINX delays or rejects subsequent requests based on burst configuration.

Burst allows temporary spikes above the rate limit. Excess requests within the burst limit may be delayed so they are processed at the configured rate; requests beyond the burst limit are rejected. This handles legitimate traffic patterns while still preventing sustained abuse.

## Implementing Basic Rate Limiting

Apply rate limiting to an Ingress resource:

```yaml
# app-ingress-with-rate-limit.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    # Rate limit: 10 requests per second per IP per controller replica
    nginx.ingress.kubernetes.io/limit-rps: "10"
    # Rejected requests return the controller's configured limit-req-status-code
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

Apply the Ingress:

```bash
kubectl apply -f app-ingress-with-rate-limit.yaml
```

## Configuring Burst Limits

Allow burst traffic while maintaining overall rate limit:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    # 10 requests per second per IP per controller replica
    nginx.ingress.kubernetes.io/limit-rps: "10"
    # Allow burst of 20 requests
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "2"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

## Implementing Per-Path Rate Limits

Different endpoints need different limits:

```yaml
# multi-path-rate-limits.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-public
  namespace: production
  annotations:
    # Lower limit for resource-intensive endpoints
    nginx.ingress.kubernetes.io/limit-rps: "5"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/search
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-fast
  namespace: production
  annotations:
    # Higher limit for lightweight endpoints
    nginx.ingress.kubernetes.io/limit-rps: "50"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/health
            pathType: Exact
            backend:
              service:
                name: api-service
                port:
                  number: 8080
          - path: /api/status
            pathType: Exact
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

## Using Connection Limits

Limit concurrent connections per IP:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    # Limit to 10 concurrent connections per IP per controller replica
    nginx.ingress.kubernetes.io/limit-connections: "10"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

## Whitelisting Trusted IPs

Exempt specific IPs from rate limiting:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"
    # Whitelist internal IPs and monitoring systems
    nginx.ingress.kubernetes.io/limit-whitelist: "10.0.0.0/8,192.168.1.100/32"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

## Custom Rate Limiting with Snippets

For advanced scenarios, define a custom zone in the controller ConfigMap and reference it from a configuration snippet:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  allow-snippet-annotations: "true"
  http-snippet: |
    limit_req_zone $http_authorization zone=apikey:10m rate=100r/s;
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: |
      limit_req zone=apikey burst=200 nodelay;
      limit_req_status 429;
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

## Testing Rate Limits

Verify rate limiting works:

```bash
# Install hey for load testing
kubectl run -it --rm load-test --image=williamyeh/hey --restart=Never -- \
  -n 100 -c 10 https://api.example.com/api/search

# Check for rejected responses, usually 503 unless limit-req-status-code is configured
for i in {1..50}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/api/search
  sleep 0.05
done
```

## Monitoring Rate Limit Metrics

Check NGINX Ingress metrics for rate limiting:

```bash
kubectl port-forward -n ingress-nginx deploy/ingress-nginx-controller 10254:10254

# Query request metrics and filter for rejected responses
curl http://localhost:10254/metrics | grep 'nginx_ingress_controller_requests.*status="503"'
```

NGINX Ingress rate limiting provides powerful protection against API abuse and overload scenarios. Proper configuration balances protecting backend services while allowing legitimate traffic patterns, all without requiring changes to application code.
