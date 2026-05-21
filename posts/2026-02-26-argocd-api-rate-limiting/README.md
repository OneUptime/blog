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

ArgoCD has built-in rate limiting for login attempts. Configure it with environment variables on the `argocd-server` Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          env:
            # Maximum number of failed login attempts before Argo CD rejects more attempts
            - name: ARGOCD_SESSION_FAILURE_MAX_FAIL_COUNT
              value: "5"
            # Failure window in seconds (300 = 5 minutes)
            - name: ARGOCD_SESSION_FAILURE_WINDOW_SECONDS
              value: "300"
            # Maximum number of concurrent login requests
            - name: ARGOCD_MAX_CONCURRENT_LOGIN_REQUESTS_COUNT
              value: "50"
```

This means ArgoCD starts rejecting login attempts after 5 failed attempts during the 5-minute failure window. This is your first line of defense against brute force attacks.

Apply the configuration:

```bash
kubectl apply -f argocd-server.yaml
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
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    # Rate limiting annotations
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-rpm: "300"
    nginx.ingress.kubernetes.io/limit-connections: "5"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "3"
spec:
  ingressClassName: nginx
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

Do not use `nginx.ingress.kubernetes.io/ssl-passthrough` with these HTTP rate limiting annotations. SSL passthrough is layer 4 routing and invalidates the other Ingress annotations. To return 429 instead of the default 503 for rejected requests, set `limit-req-status-code: "429"` in the ingress-nginx controller ConfigMap.

The settings above allow:
- 10 requests per second per client IP per ingress-nginx controller replica
- 300 requests per minute per client IP per ingress-nginx controller replica
- Maximum 5 simultaneous connections per client IP per ingress-nginx controller replica
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
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/limit-rps: "2"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "1"
spec:
  ingressClassName: nginx
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
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/limit-rps: "20"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
spec:
  ingressClassName: nginx
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
          scheme: https
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
  policy: redis
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

If Kong connects to ArgoCD on the service's TLS port, annotate the `argocd-server` Service with `konghq.com/protocol: https` so Kong uses HTTPS for upstream traffic.

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
                    http_filters:
                      - name: envoy.filters.http.local_ratelimit
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
                          stat_prefix: http_local_rate_limiter
                          token_bucket:
                            max_tokens: 100
                            tokens_per_fill: 10
                            fill_interval: 1s
                          filter_enabled:
                            default_value:
                              numerator: 100
                              denominator: HUNDRED
                          filter_enforced:
                            default_value:
                              numerator: 100
                              denominator: HUNDRED
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
