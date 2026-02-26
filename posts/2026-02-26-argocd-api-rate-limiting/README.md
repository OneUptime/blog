# How to Limit ArgoCD API Rate for Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, API

Description: Learn how to configure rate limiting for the ArgoCD API to prevent brute force attacks, denial of service, and excessive resource consumption.

---

The ArgoCD API is the gateway to your entire deployment infrastructure. Without rate limiting, it is vulnerable to brute force password attacks, denial of service, and runaway automation scripts that hammer the API. This guide covers every method of implementing rate limiting for ArgoCD.

## Why Rate Limiting Matters

ArgoCD's API server handles authentication, application management, sync operations, and more. Without rate limits, an attacker can:

- Brute force login credentials by trying thousands of passwords per second
- Overwhelm the API server, causing denial of service for legitimate users
- Trigger excessive sync operations that overload your Kubernetes cluster
- Exhaust API server memory and CPU resources

Even without malicious intent, a misconfigured CI/CD pipeline or monitoring tool can accidentally generate enough requests to degrade ArgoCD performance.

## Built-In Login Rate Limiting

ArgoCD has built-in rate limiting for login attempts. Configure it through the `argocd-cmd-params-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Maximum number of failed login attempts before lockout
  server.login.attempts.max: "5"
  # Lockout duration in seconds (300 = 5 minutes)
  server.login.attempts.reset: "300"
```

This means after 5 failed login attempts from the same IP, the user is locked out for 5 minutes. This is your first line of defense against brute force attacks.

Apply the configuration and restart:

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

## Ingress-Level Rate Limiting

For broader API rate limiting, configure it at the ingress level. This catches all requests before they reach ArgoCD.

### Nginx Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    # Rate limiting annotations
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-rpm: "300"
    nginx.ingress.kubernetes.io/limit-connections: "5"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "3"
    # Return 429 when rate limited
    nginx.ingress.kubernetes.io/server-snippet: |
      limit_req_status 429;
spec:
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-server-tls
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

The settings above allow:
- 10 requests per second per client IP
- 300 requests per minute per client IP
- Maximum 5 simultaneous connections per client IP
- Burst multiplier of 3 (allows temporary spikes to 30 rps)

### Different Rates for Different Endpoints

You may want stricter rate limiting on the login endpoint and more relaxed limits for the API:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-login
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "2"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "1"
spec:
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /api/v1/session
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-api
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "20"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
spec:
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

### Traefik Rate Limiting

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: argocd-rate-limit
  namespace: argocd
spec:
  rateLimit:
    average: 10
    burst: 30
    period: 1s
    sourceCriterion:
      ipStrategy:
        depth: 1
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: argocd-server
  namespace: argocd
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`argocd.example.com`)
      kind: Rule
      middlewares:
        - name: argocd-rate-limit
      services:
        - name: argocd-server
          port: 443
```

## API Gateway Rate Limiting

If you use an API gateway like Kong, Ambassador, or AWS API Gateway, you can implement more sophisticated rate limiting.

### Kong Rate Limiting

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: argocd-rate-limiting
  namespace: argocd
plugin: rate-limiting
config:
  minute: 300
  hour: 5000
  policy: local
  fault_tolerant: true
  hide_client_headers: false
  redis_host: redis.argocd.svc
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    konghq.com/plugins: argocd-rate-limiting
spec:
  ingressClassName: kong
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

## Application-Level Rate Limiting with Envoy

For more granular control, deploy Envoy as a sidecar to the ArgoCD server:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-config
  namespace: argocd
data:
  envoy.yaml: |
    static_resources:
      listeners:
        - name: listener_0
          address:
            socket_address:
              address: 0.0.0.0
              port_value: 8443
          filter_chains:
            - filters:
                - name: envoy.filters.network.http_connection_manager
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                    stat_prefix: argocd
                    route_config:
                      virtual_hosts:
                        - name: argocd
                          domains: ["*"]
                          routes:
                            - match:
                                prefix: "/"
                              route:
                                cluster: argocd_server
                          rate_limits:
                            - actions:
                                - remote_address: {}
                    http_filters:
                      - name: envoy.filters.http.local_ratelimit
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
                          stat_prefix: http_local_rate_limiter
                          token_bucket:
                            max_tokens: 100
                            tokens_per_fill: 10
                            fill_interval: 1s
                      - name: envoy.filters.http.router
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
      clusters:
        - name: argocd_server
          connect_timeout: 5s
          type: STRICT_DNS
          lb_policy: ROUND_ROBIN
          load_assignment:
            cluster_name: argocd_server
            endpoints:
              - lb_endpoints:
                  - endpoint:
                      address:
                        socket_address:
                          address: 127.0.0.1
                          port_value: 8080
```

## Monitoring Rate Limit Events

Track when rate limits are hit to understand traffic patterns:

```bash
# Check Nginx ingress controller logs for rate limiting events
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | \
  grep "limiting requests"

# Check ArgoCD server logs for login lockouts
kubectl logs -n argocd deployment/argocd-server | \
  grep -i "too many login attempts"
```

Set up Prometheus alerts for rate limit events:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-rate-limit-alerts
  namespace: argocd
spec:
  groups:
    - name: argocd-rate-limits
      rules:
        - alert: ArgoCDHighRateLimitHits
          expr: rate(nginx_ingress_controller_requests{status="429",namespace="argocd"}[5m]) > 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD API rate limit being hit frequently"
```

## Best Practices

1. Start with generous limits and tighten gradually based on observed traffic
2. Exempt known CI/CD service accounts from strict limits if needed
3. Use different rate limits for different endpoints (login vs. API vs. webhooks)
4. Monitor rate limit events and adjust thresholds accordingly
5. Consider using IP whitelisting for trusted automation systems alongside rate limits

## Conclusion

Rate limiting is a fundamental security control for any API-based system, and ArgoCD is no exception. Start with the built-in login rate limiting, then layer on ingress-level rate limiting for broader protection. For complex environments, use an API gateway or Envoy sidecar for fine-grained control. Monitor your rate limit events to catch both attacks and misconfigured automation early.

For more security hardening, see our guide on [hardening ArgoCD server for production](https://oneuptime.com/blog/post/2026-02-26-argocd-harden-server-production/view).
