# How to Deploy HAProxy Ingress with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, haproxy, ingress, kubernetes, gitops, networking, load balancing

Description: Learn how to deploy HAProxy Ingress Controller with Flux CD for high-performance load balancing and ingress management in Kubernetes.

---

## Introduction

HAProxy is a battle-tested, high-performance TCP/HTTP load balancer that has been used in production for decades. The HAProxy Ingress Controller brings HAProxy's reliability and performance to Kubernetes, supporting features like connection draining, circuit breaking, blue-green deployments, and advanced load balancing algorithms. Deploying it with Flux CD ensures your ingress configuration is managed through GitOps.

This guide covers deploying the HAProxy Ingress Controller using Flux CD, configuring ingress rules, and leveraging HAProxy's advanced features.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- kubectl configured for your cluster
- A domain name for ingress configuration

## Repository Structure

```
clusters/
  production/
    infrastructure/
      sources/
        haproxy.yaml            # HelmRepository
      haproxy-ingress/
        namespace.yaml
        release.yaml            # HelmRelease
        configmap.yaml          # Global HAProxy configuration
    apps/
      ingress/
        webapp-ingress.yaml
        api-ingress.yaml
```

## Adding the HAProxy Helm Repository

```yaml
# clusters/production/infrastructure/sources/haproxy.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: haproxy-ingress
  namespace: flux-system
spec:
  interval: 1h
  # Official HAProxy Ingress Helm chart repository
  url: https://haproxy-ingress.github.io/charts
```

## Creating the Namespace

```yaml
# clusters/production/infrastructure/haproxy-ingress/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: haproxy-ingress
  labels:
    app.kubernetes.io/name: haproxy-ingress
```

## Deploying HAProxy Ingress with HelmRelease

```yaml
# clusters/production/infrastructure/haproxy-ingress/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: haproxy-ingress
  namespace: haproxy-ingress
spec:
  interval: 1h
  chart:
    spec:
      chart: haproxy-ingress
      version: "0.14.x"
      sourceRef:
        kind: HelmRepository
        name: haproxy-ingress
        namespace: flux-system
      interval: 1h
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    controller:
      # Number of replicas for high availability
      replicaCount: 3

      # Resource allocation
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: 2000m
          memory: 1Gi

      # Service configuration
      service:
        type: LoadBalancer
        annotations:
          # AWS NLB annotations
          service.beta.kubernetes.io/aws-load-balancer-type: nlb
          service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
          service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"

      # Ingress class configuration
      ingressClassResource:
        name: haproxy
        enabled: true
        default: false
        controllerValue: "haproxy-ingress.github.io/controller"

      # HAProxy configuration defaults
      config:
        # Logging format
        syslog-endpoint: "stdout"
        syslog-format: "raw"
        syslog-length: "2048"
        # Connection settings
        max-connections: "10000"
        # Timeout configuration
        timeout-client: "60s"
        timeout-connect: "10s"
        timeout-server: "60s"
        timeout-http-request: "10s"
        timeout-keep-alive: "60s"
        timeout-queue: "30s"
        # Backend health checks
        health-check-interval: "5s"
        health-check-fall: "3"
        health-check-rise: "2"
        # SSL configuration
        ssl-redirect: "true"
        ssl-options: "no-sslv3 no-tlsv10 no-tlsv11"
        ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
        # Enable HTTP/2
        http2: "true"
        # Enable stats page
        stats-port: "1936"
        stats-auth: "admin:haproxy-stats"

      # Metrics for Prometheus
      metrics:
        enabled: true
        service:
          annotations:
            prometheus.io/scrape: "true"
            prometheus.io/port: "9101"

      # Pod disruption budget
      minAvailable: 2

      # Anti-affinity for spreading pods
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app.kubernetes.io/name
                      operator: In
                      values:
                        - haproxy-ingress
                topologyKey: kubernetes.io/hostname

      # Topology spread constraints
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: haproxy-ingress

    # Default backend
    defaultBackend:
      enabled: true
      replicaCount: 2
      resources:
        requests:
          cpu: 10m
          memory: 20Mi
        limits:
          cpu: 50m
          memory: 64Mi
```

## Flux Kustomization for HAProxy Ingress

```yaml
# clusters/production/infrastructure/haproxy-ingress/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: haproxy-ingress
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/infrastructure/haproxy-ingress
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: haproxy-ingress
      namespace: haproxy-ingress
```

## Creating Ingress Resources

### Basic Web Application Ingress

```yaml
# clusters/production/apps/ingress/webapp-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  namespace: production
  annotations:
    # Use HAProxy ingress class
    kubernetes.io/ingress.class: "haproxy"
    # SSL redirect
    haproxy-ingress.github.io/ssl-redirect: "true"
    # Custom timeouts for this ingress
    haproxy-ingress.github.io/timeout-server: "120s"
    # Rate limiting
    haproxy-ingress.github.io/limit-rps: "50"
    # CORS
    haproxy-ingress.github.io/cors-enable: "true"
    haproxy-ingress.github.io/cors-allow-origin: "https://example.com"
    haproxy-ingress.github.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    haproxy-ingress.github.io/cors-allow-headers: "Content-Type, Authorization"
    # Security headers
    haproxy-ingress.github.io/headers: |
      Strict-Transport-Security: max-age=31536000; includeSubDomains
      X-Content-Type-Options: nosniff
      X-Frame-Options: DENY
      X-XSS-Protection: 1; mode=block
spec:
  ingressClassName: haproxy
  tls:
    - hosts:
        - app.example.com
      secretName: webapp-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8080
```

### API Ingress with Advanced Load Balancing

```yaml
# clusters/production/apps/ingress/api-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "haproxy"
    # Load balancing algorithm
    haproxy-ingress.github.io/balance-algorithm: "leastconn"
    # Connection draining on pod shutdown
    haproxy-ingress.github.io/drain-support: "true"
    haproxy-ingress.github.io/drain-support-redispatch: "true"
    # Health check configuration
    haproxy-ingress.github.io/health-check-uri: "/healthz"
    haproxy-ingress.github.io/health-check-interval: "5s"
    haproxy-ingress.github.io/health-check-fall: "3"
    haproxy-ingress.github.io/health-check-rise: "2"
    # Request body size limit
    haproxy-ingress.github.io/proxy-body-size: "10m"
    # Backend protocol
    haproxy-ingress.github.io/backend-protocol: "h2"
    # Custom timeout
    haproxy-ingress.github.io/timeout-server: "60s"
    haproxy-ingress.github.io/timeout-connect: "5s"
spec:
  ingressClassName: haproxy
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
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

## Blue-Green Deployments with HAProxy

HAProxy Ingress supports blue-green deployments natively:

```yaml
# clusters/production/apps/ingress/blue-green.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: blue-green-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "haproxy"
    # Blue-green configuration
    # Weight of blue deployment (0-256)
    haproxy-ingress.github.io/blue-green-deploy: |
      v1=blue:100,v2=green:0
    haproxy-ingress.github.io/blue-green-mode: "deploy"
    # Header-based routing for testing green deployment
    haproxy-ingress.github.io/blue-green-header: "X-Server:green"
spec:
  ingressClassName: haproxy
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-blue
                port:
                  number: 80
```

To gradually shift traffic during deployment:

```bash
# Start with 100% blue, 0% green
kubectl annotate ingress blue-green-ingress -n production \
  haproxy-ingress.github.io/blue-green-deploy="v1=blue:100,v2=green:0" --overwrite

# Shift 10% to green
kubectl annotate ingress blue-green-ingress -n production \
  haproxy-ingress.github.io/blue-green-deploy="v1=blue:90,v2=green:10" --overwrite

# Shift 50% to green
kubectl annotate ingress blue-green-ingress -n production \
  haproxy-ingress.github.io/blue-green-deploy="v1=blue:50,v2=green:50" --overwrite

# Complete migration to green
kubectl annotate ingress blue-green-ingress -n production \
  haproxy-ingress.github.io/blue-green-deploy="v1=blue:0,v2=green:100" --overwrite
```

## WAF Integration with ModSecurity

HAProxy Ingress supports ModSecurity for web application firewall:

```yaml
# clusters/production/apps/ingress/waf-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: waf-protected-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "haproxy"
    # Enable ModSecurity WAF
    haproxy-ingress.github.io/waf: "modsecurity"
    haproxy-ingress.github.io/waf-mode: "deny"
    # Use OWASP Core Rule Set
    haproxy-ingress.github.io/ssl-redirect: "true"
spec:
  ingressClassName: haproxy
  tls:
    - hosts:
        - secure.example.com
      secretName: secure-tls
  rules:
    - host: secure.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: secure-app
                port:
                  number: 80
```

## TCP Ingress for Non-HTTP Services

HAProxy supports TCP load balancing for databases and other services:

```yaml
# clusters/production/infrastructure/haproxy-ingress/tcp-services.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-ingress-tcp
  namespace: haproxy-ingress
data:
  # Map external port to internal service
  # Format: port: "namespace/service:port"
  "5432": "production/postgres-primary:5432"
  "6379": "production/redis-master:6379"
  "3306": "production/mysql-primary:3306"
```

Update the HelmRelease to reference the TCP ConfigMap:

```yaml
# Add to the HelmRelease values
controller:
  extraArgs:
    # Reference the TCP services ConfigMap
    tcp-services-configmap: haproxy-ingress/haproxy-ingress-tcp
```

## Global HAProxy Configuration

```yaml
# clusters/production/infrastructure/haproxy-ingress/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-ingress
  namespace: haproxy-ingress
data:
  # Global HAProxy settings
  # Connection limits
  maxconn-server: "2048"
  nbthread: "4"

  # Logging
  syslog-endpoint: "stdout"
  syslog-format: "raw"

  # Default load balancing
  balance-algorithm: "roundrobin"

  # Connection management
  drain-support: "true"
  drain-support-redispatch: "true"

  # HTTP settings
  forwardfor: "add"
  http2: "true"

  # Security
  ssl-redirect: "true"
  ssl-options: "no-sslv3 no-tlsv10 no-tlsv11"

  # Rate limiting defaults
  limit-rps: "100"
  limit-connections: "50"

  # Custom HAProxy global section
  config-global: |
    # Increase the DH key size for better security
    tune.ssl.default-dh-param 2048
    # Enable multi-threading
    nbthread 4

  # Custom HAProxy defaults section
  config-defaults: |
    # Default options
    option httplog
    option dontlognull
    option http-server-close
    option forwardfor except 127.0.0.0/8
```

## Monitoring HAProxy Ingress

### Prometheus ServiceMonitor

```yaml
# clusters/production/monitoring/haproxy-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: haproxy-ingress
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: haproxy-ingress
  namespaceSelector:
    matchNames:
      - haproxy-ingress
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Flux Notifications

```yaml
# clusters/production/monitoring/haproxy-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: haproxy-ingress-alerts
  namespace: flux-system
spec:
  severity: warning
  providerRef:
    name: slack-notifications
  eventSources:
    - kind: HelmRelease
      name: haproxy-ingress
      namespace: haproxy-ingress
```

## Accessing the HAProxy Stats Page

```bash
# Port-forward to the stats page
kubectl port-forward -n haproxy-ingress svc/haproxy-ingress-stats 1936:1936

# Access the stats page at http://localhost:1936/stats
# Default credentials: admin / haproxy-stats
```

## Troubleshooting

### HAProxy Controller Not Starting

```bash
# Check HelmRelease status
flux get helmreleases -n haproxy-ingress

# View controller logs
kubectl logs -n haproxy-ingress -l app.kubernetes.io/name=haproxy-ingress

# Check events
kubectl get events -n haproxy-ingress --sort-by='.lastTimestamp'
```

### Ingress Not Routing Traffic

```bash
# Verify ingress resources
kubectl get ingress -n production

# Check HAProxy configuration
kubectl exec -n haproxy-ingress deployment/haproxy-ingress -- \
  cat /etc/haproxy/haproxy.cfg | head -100

# Test backend connectivity
kubectl exec -n haproxy-ingress deployment/haproxy-ingress -- \
  wget -qO- http://frontend.production.svc:80/healthz
```

### Performance Tuning

```bash
# Monitor HAProxy stats via metrics
kubectl exec -n haproxy-ingress deployment/haproxy-ingress -- \
  wget -qO- http://localhost:9101/metrics | grep haproxy_frontend

# Check current connection counts
kubectl exec -n haproxy-ingress deployment/haproxy-ingress -- \
  wget -qO- http://localhost:1936/stats\;csv
```

## Best Practices

1. **Use connection draining** - Enable drain support to gracefully handle pod shutdowns during rolling updates without dropping connections.
2. **Configure health checks** - Set appropriate health check intervals and thresholds to detect backend failures quickly.
3. **Leverage blue-green deployments** - Use HAProxy's native blue-green support for zero-downtime deployments with traffic shifting.
4. **Set resource limits** - Configure appropriate CPU and memory limits based on your expected traffic load and connection count.
5. **Monitor with stats page** - Use the HAProxy stats page and Prometheus metrics to monitor backend health, connection rates, and error rates.

## Conclusion

HAProxy Ingress Controller with Flux CD delivers enterprise-grade load balancing managed through GitOps. HAProxy's decades of production reliability combined with Kubernetes-native features like blue-green deployments, connection draining, and ModSecurity WAF integration make it an excellent choice for demanding workloads. Flux CD ensures the entire configuration, from the HelmRelease to individual Ingress resources, is version-controlled, auditable, and continuously reconciled, giving you a production-ready ingress solution that manages itself.
