# How to Configure NGINX Ingress Rate Limiting with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, NGINX, Ingress, Rate Limiting, Security, DDoS Protection

Description: Configure rate limiting on NGINX Ingress Controller using annotations and ConfigMaps managed by Flux CD to protect backend services from traffic spikes and abuse.

---

## Introduction

Rate limiting is essential protection for any production API. Without it, a single misbehaving client can consume all your backend capacity, causing slowdowns or outages for legitimate users. NGINX Ingress Controller provides several rate limiting mechanisms through annotations and ConfigMap settings, ranging from simple per-IP rate limits to sophisticated burst handling and connection limiting.

Managing rate limiting configuration through Flux CD means your protection policies are version controlled and consistently applied. When security requirements change - say, a DDoS incident reveals a gap in your rate limiting strategy - the fix is a pull request that goes through review and is automatically deployed across all affected services.

This guide covers NGINX Ingress rate limiting comprehensively: global limits via ConfigMap, per-route limits via annotations, burst handling, and connection limiting, all managed through Flux CD.

## Prerequisites

- NGINX Ingress Controller deployed via Flux CD
- Flux CD bootstrapped and connected to your Git repository
- kubectl with access to your cluster
- Backend services to protect
- Basic understanding of NGINX rate limiting (limit_req, limit_conn modules)

## Step 1: Global Rate Limiting via ConfigMap

Configure baseline rate limiting for all NGINX-managed routes through the global ConfigMap.

```yaml
# infrastructure/nginx-ingress/helmrelease.yaml (partial - add to values.controller.config)
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: ">=4.10.0 <5.0.0"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      config:
        # Global rate limiting zone - 10MB shared memory for rate limit state
        # Handles approximately 160,000 IP addresses per MB
        limit-req-zone-variable: "$binary_remote_addr"
        limit-req-status-code: "429"

        # Global connection limit per IP
        limit-connections: "100"
        limit-connections-status-code: "429"

        # Enable rate limit response headers so clients know their limit status
        limit-rate-after: "0"

        # Custom error page for rate limited requests
        custom-http-errors: "429,503"
```

## Step 2: Per-Route Rate Limiting with Annotations

Apply targeted rate limits to specific Ingress resources using NGINX annotations.

```yaml
# apps/auth-service/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auth-service
  namespace: auth
  annotations:
    kubernetes.io/ingress.class: nginx

    # --- Strict rate limiting for authentication endpoints ---

    # Limit to 10 requests per minute per IP
    # This prevents brute force password attacks
    nginx.ingress.kubernetes.io/limit-rps: "0.167"  # 10/min = 0.167/sec

    # Allow a burst of 5 requests beyond the rate limit
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"

    # Limit to 20 simultaneous connections per IP
    nginx.ingress.kubernetes.io/limit-connections: "20"

    # Rate limit key: use client IP
    # Options: $binary_remote_addr (IP) or $http_x_forwarded_for
    nginx.ingress.kubernetes.io/limit-req-zone-variable: "$binary_remote_addr"

    # Return 429 Too Many Requests (not 503)
    nginx.ingress.kubernetes.io/limit-req-status-code: "429"
    nginx.ingress.kubernetes.io/limit-conn-status-code: "429"

    # Whitelist internal IPs from rate limiting
    nginx.ingress.kubernetes.io/limit-whitelist: "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
spec:
  ingressClassName: nginx
  tls:
    - hosts: [auth.example.com]
      secretName: auth-example-tls
  rules:
    - host: auth.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 8080
```

## Step 3: API Route Rate Limiting

Apply tiered rate limits to API routes based on endpoint sensitivity.

```yaml
# apps/backend/api-ingress-rate-limited.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-server-rate-limited
  namespace: backend
  annotations:
    kubernetes.io/ingress.class: nginx

    # Standard API rate limit: 100 requests/second per IP
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "3"

    # Allow up to 200 simultaneous connections per IP
    nginx.ingress.kubernetes.io/limit-connections: "200"

    # Add rate limit info headers to responses
    # Clients can read X-RateLimit-* headers to see their status
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-RateLimit-Limit: 100";
      more_set_headers "Retry-After: 1";

spec:
  ingressClassName: nginx
  tls:
    - hosts: [api.example.com]
      secretName: api-example-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 8080
```

## Step 4: Custom ConfigMap for Advanced Rate Limiting

For more complex scenarios, use NGINX configuration snippets via ConfigMap.

```yaml
# infrastructure/nginx-ingress/custom-snippets-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-rate-limits
  namespace: ingress-nginx
  labels:
    app.kubernetes.io/managed-by: flux
data:
  # Global HTTP snippet for custom rate limit zones
  http-snippet: |
    # Rate limit zone for write operations (POST, PUT, DELETE)
    # 10MB zone, 10 requests/second burst
    limit_req_zone $binary_remote_addr zone=write_ops:10m rate=10r/s;

    # Rate limit zone for search operations (GET with query params)
    limit_req_zone $binary_remote_addr zone=search:10m rate=30r/s;

    # Rate limit by API key (header-based)
    map $http_x_api_key $api_key_limit {
      default "$http_x_api_key";
      "" "$binary_remote_addr";
    }
    limit_req_zone $api_key_limit zone=api_key_zone:10m rate=1000r/s;
```

## Step 5: Monitor Rate Limiting Effectiveness

Track rate limiting events through NGINX metrics and Prometheus alerting.

```yaml
# infrastructure/monitoring/rate-limit-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: nginx-rate-limit-alerts
  namespace: monitoring
spec:
  groups:
    - name: nginx-rate-limiting
      rules:
        # Alert when 429 responses exceed 1% of total traffic
        - alert: HighRateLimitingRate
          expr: |
            (
              rate(nginx_ingress_controller_requests{status="429"}[5m])
              /
              rate(nginx_ingress_controller_requests[5m])
            ) > 0.01
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High rate of 429 responses from NGINX Ingress"
            description: "More than 1% of requests are being rate limited on ingress {{ $labels.ingress }}"
```

```bash
# Check rate limit status
kubectl get ingress -A -o json | jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name): rps=\(.metadata.annotations["nginx.ingress.kubernetes.io/limit-rps"] // "none")"'

# Monitor 429 responses in NGINX logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | grep "429"

# Check Prometheus metrics for rate limiting
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller-metrics 10254:10254 &
curl http://localhost:10254/metrics | grep "status=\"429\""

# Flux reconciliation status
flux get kustomization ingress-nginx
```

## Step 6: Test Rate Limiting Configuration

Verify rate limiting is working before enabling it on production traffic.

```bash
# Install hey (HTTP load testing tool)
# Test rate limiting: expect 429 after first N requests
hey -n 200 -c 50 -q 10 https://auth.example.com/login

# Use curl to test rate limit headers
for i in {1..15}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://auth.example.com/login)
  echo "Request $i: HTTP $STATUS"
  sleep 0.1
done

# Verify whitelisted IPs are not rate limited
# From within the cluster (internal IP):
curl -s -o /dev/null -w "%{http_code}" https://auth.example.com/login
```

## Best Practices

- Start with conservative rate limits and increase them based on observed legitimate traffic patterns; it is easier to raise a limit than to explain to customers why they were blocked.
- Use IP-based rate limiting for public endpoints and API-key-based limits for authenticated API clients; this allows you to give premium clients higher limits.
- Always whitelist internal cluster IPs and health check probes from rate limiting to avoid false positive blocks.
- Set 429 response codes (not 503) for rate-limited requests and include `Retry-After` headers so well-behaved clients can back off automatically.
- Monitor 429 rates in Prometheus and alert when they spike; sudden increases in rate limiting may indicate a legitimate surge in traffic, not an attack.
- Test rate limiting configuration in staging with a load testing tool before deploying to production; annotation changes are immediate and can block traffic instantly.

## Conclusion

NGINX Ingress rate limiting configured through Flux CD gives your platform team centralized, auditable control over traffic shaping across all services. Whether protecting authentication endpoints from brute force attacks or managing API traffic from high-volume clients, the annotation-driven model makes rate limiting configuration explicit and easy to review. Combined with Prometheus alerting, you get both protection and visibility in a fully GitOps-managed package.
