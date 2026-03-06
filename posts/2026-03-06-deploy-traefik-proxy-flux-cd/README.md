# How to Deploy Traefik Proxy with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Traefik, Proxy, Kubernetes, GitOps, Ingress, Networking

Description: Learn how to deploy and configure Traefik Proxy as your Kubernetes ingress controller using Flux CD for GitOps-based management.

---

## Introduction

Traefik is a modern reverse proxy and ingress controller that integrates natively with Kubernetes. It supports automatic service discovery, dynamic configuration, middleware chains, and advanced traffic management features. Deploying Traefik with Flux CD ensures your proxy configuration is version-controlled and continuously reconciled through GitOps.

This guide walks you through deploying Traefik Proxy using Flux CD, configuring IngressRoute resources, setting up middleware, and managing TLS certificates.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- kubectl configured for your cluster
- A domain name for ingress configuration
- Optionally, cert-manager for TLS management

## Repository Structure

```text
clusters/
  production/
    infrastructure/
      sources/
        traefik.yaml            # HelmRepository
      traefik/
        namespace.yaml
        release.yaml            # HelmRelease
        middleware.yaml          # Shared middleware
      kustomization.yaml
    apps/
      routes/
        webapp-route.yaml       # IngressRoute resources
        api-route.yaml
```

## Adding the Traefik Helm Repository

```yaml
# clusters/production/infrastructure/sources/traefik.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: traefik
  namespace: flux-system
spec:
  interval: 1h
  # Official Traefik Helm chart repository
  url: https://traefik.github.io/charts
```

## Creating the Namespace

```yaml
# clusters/production/infrastructure/traefik/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: traefik
  labels:
    app.kubernetes.io/name: traefik
```

## Deploying Traefik with HelmRelease

```yaml
# clusters/production/infrastructure/traefik/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: traefik
  namespace: traefik
spec:
  interval: 1h
  chart:
    spec:
      chart: traefik
      version: "31.x"
      sourceRef:
        kind: HelmRepository
        name: traefik
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
    # Deployment configuration
    deployment:
      # Run 3 replicas for high availability
      replicas: 3

    # Resource allocation
    resources:
      requests:
        cpu: 200m
        memory: 128Mi
      limits:
        cpu: 1000m
        memory: 512Mi

    # Entrypoints configuration
    ports:
      # HTTP entrypoint
      web:
        port: 8000
        exposedPort: 80
        protocol: TCP
        # Redirect HTTP to HTTPS
        redirectTo:
          port: websecure
          priority: 10

      # HTTPS entrypoint
      websecure:
        port: 8443
        exposedPort: 443
        protocol: TCP
        tls:
          enabled: true

      # Metrics entrypoint
      metrics:
        port: 9100
        exposedPort: 9100
        protocol: TCP

    # Service configuration
    service:
      type: LoadBalancer
      annotations:
        # AWS NLB annotations
        service.beta.kubernetes.io/aws-load-balancer-type: nlb
        service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing

    # Enable Traefik dashboard
    ingressRoute:
      dashboard:
        enabled: true
        matchRule: Host(`traefik.internal.example.com`)
        entryPoints:
          - websecure

    # Providers configuration
    providers:
      # Enable Kubernetes CRD provider
      kubernetesCRD:
        enabled: true
        allowCrossNamespace: true
        allowExternalNameServices: true
      # Enable Kubernetes Ingress provider
      kubernetesIngress:
        enabled: true
        allowExternalNameServices: true

    # Logging configuration
    logs:
      general:
        level: INFO
      access:
        enabled: true
        format: json
        fields:
          general:
            defaultmode: keep
          headers:
            defaultmode: drop
            names:
              User-Agent: keep
              Content-Type: keep

    # Metrics configuration
    metrics:
      prometheus:
        entryPoint: metrics
        addEntryPointsLabels: true
        addRoutersLabels: true
        addServicesLabels: true
        service:
          enabled: true
        serviceMonitor:
          enabled: true
          namespace: monitoring

    # Pod disruption budget
    podDisruptionBudget:
      enabled: true
      minAvailable: 2

    # Affinity and topology
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
                      - traefik
              topologyKey: kubernetes.io/hostname

    topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app.kubernetes.io/name: traefik

    # Additional arguments
    additionalArguments:
      # Enable access log buffering
      - "--accesslog.bufferingsize=100"
      # Set graceful timeout
      - "--entrypoints.web.transport.lifecycle.gracetimeout=30s"
      - "--entrypoints.websecure.transport.lifecycle.gracetimeout=30s"
```

## Flux Kustomization for Traefik

```yaml
# clusters/production/infrastructure/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: traefik
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/infrastructure/traefik
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: traefik
      namespace: traefik
```

## Configuring Traefik Middleware

Create reusable middleware components:

```yaml
# clusters/production/infrastructure/traefik/middleware.yaml

# Rate limiting middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: traefik
spec:
  rateLimit:
    # Average requests per second
    average: 100
    # Maximum burst size
    burst: 200
    period: 1s
---
# Security headers middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: security-headers
  namespace: traefik
spec:
  headers:
    # Strict Transport Security
    stsSeconds: 31536000
    stsIncludeSubdomains: true
    stsPreload: true
    # Content Security Policy
    contentSecurityPolicy: "default-src 'self'"
    # Other security headers
    frameDeny: true
    contentTypeNosniff: true
    browserXssFilter: true
    referrerPolicy: "strict-origin-when-cross-origin"
    # Remove server header
    customResponseHeaders:
      X-Powered-By: ""
      Server: ""
---
# Compression middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: compress
  namespace: traefik
spec:
  compress:
    excludedContentTypes:
      - text/event-stream
---
# IP whitelist middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: internal-only
  namespace: traefik
spec:
  ipAllowList:
    sourceRange:
      - 10.0.0.0/8
      - 172.16.0.0/12
      - 192.168.0.0/16
---
# Strip path prefix middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-api-prefix
  namespace: traefik
spec:
  stripPrefix:
    prefixes:
      - /api
---
# Authentication middleware using BasicAuth
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: basic-auth
  namespace: traefik
spec:
  basicAuth:
    secret: basic-auth-credentials
```

## Creating IngressRoute Resources

### Web Application Route

```yaml
# clusters/production/apps/routes/webapp-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: webapp-route
  namespace: production
spec:
  entryPoints:
    - websecure
  routes:
    # Frontend route
    - match: Host(`app.example.com`)
      kind: Rule
      middlewares:
        - name: security-headers
          namespace: traefik
        - name: compress
          namespace: traefik
        - name: rate-limit
          namespace: traefik
      services:
        - name: frontend
          port: 80
          weight: 100
      # Priority for route matching
      priority: 10

    # API route with path prefix stripping
    - match: Host(`app.example.com`) && PathPrefix(`/api`)
      kind: Rule
      middlewares:
        - name: security-headers
          namespace: traefik
        - name: strip-api-prefix
          namespace: traefik
        - name: rate-limit
          namespace: traefik
      services:
        - name: backend
          port: 8080
      priority: 20

  # TLS configuration
  tls:
    secretName: webapp-tls
    options:
      name: modern-tls
      namespace: traefik
```

### API Route with Canary Deployment

```yaml
# clusters/production/apps/routes/api-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api-route
  namespace: production
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`)
      kind: Rule
      middlewares:
        - name: security-headers
          namespace: traefik
        - name: rate-limit
          namespace: traefik
      services:
        # Weighted traffic splitting for canary deployments
        - name: api-v1
          port: 8080
          weight: 90
        - name: api-v2
          port: 8080
          weight: 10
  tls:
    secretName: api-tls
```

## TLS Configuration

### TLS Options

```yaml
# clusters/production/infrastructure/traefik/tls-options.yaml
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: modern-tls
  namespace: traefik
spec:
  # Minimum TLS version
  minVersion: VersionTLS12
  # Allowed cipher suites
  cipherSuites:
    - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
    - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
  # Curve preferences
  curvePreferences:
    - CurveP521
    - CurveP384
  # ALPN protocols
  alpnProtocols:
    - h2
    - http/1.1
```

### Using cert-manager with Traefik

```yaml
# clusters/production/apps/routes/cert-webapp.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webapp-tls
  namespace: production
spec:
  secretName: webapp-tls
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
    - www.example.com
  duration: 2160h    # 90 days
  renewBefore: 360h  # 15 days before expiry
```

## TCP and UDP Routes

Traefik supports non-HTTP protocols:

```yaml
# clusters/production/apps/routes/tcp-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRouteTCP
metadata:
  name: postgres-route
  namespace: production
spec:
  entryPoints:
    - postgres
  routes:
    - match: HostSNI(`db.example.com`)
      services:
        - name: postgres
          port: 5432
  tls:
    secretName: postgres-tls
    passthrough: false
```

## Monitoring Traefik with Prometheus

```yaml
# clusters/production/monitoring/traefik-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: traefik
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: traefik
  namespaceSelector:
    matchNames:
      - traefik
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

## Flux Notifications for Traefik

```yaml
# clusters/production/monitoring/traefik-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: traefik-alerts
  namespace: flux-system
spec:
  severity: warning
  providerRef:
    name: slack-notifications
  eventSources:
    - kind: HelmRelease
      name: traefik
      namespace: traefik
```

## Troubleshooting

### Traefik Not Starting

```bash
# Check HelmRelease status
flux get helmreleases -n traefik

# View pod logs
kubectl logs -n traefik -l app.kubernetes.io/name=traefik

# Check events
kubectl get events -n traefik --sort-by='.lastTimestamp'
```

### Routes Not Working

```bash
# Verify IngressRoute resources
kubectl get ingressroutes -A

# Check Traefik dashboard for loaded routers
kubectl port-forward -n traefik svc/traefik 9000:9000
# Visit http://localhost:9000/dashboard/

# View Traefik access logs
kubectl logs -n traefik -l app.kubernetes.io/name=traefik --tail=50
```

### Middleware Not Applied

```bash
# Verify middleware exists in the correct namespace
kubectl get middleware -A

# Check that the middleware reference matches
kubectl describe ingressroute webapp-route -n production

# Look for middleware errors in Traefik logs
kubectl logs -n traefik deployment/traefik | grep -i "middleware"
```

## Best Practices

1. **Use IngressRoute CRDs** - Prefer Traefik's native IngressRoute CRDs over standard Kubernetes Ingress for full feature access.
2. **Centralize middleware** - Define shared middleware in the Traefik namespace and reference them from IngressRoutes across namespaces.
3. **Enable access logging** - Use JSON format access logs for easier parsing and integration with log aggregation tools.
4. **Configure TLS properly** - Use TLSOption resources to enforce modern TLS versions and secure cipher suites.
5. **Monitor with metrics** - Enable Prometheus metrics and set up dashboards for request rates, error rates, and latency.

## Conclusion

Deploying Traefik Proxy with Flux CD creates a GitOps-managed ingress layer with powerful routing capabilities. Traefik's native Kubernetes CRDs (IngressRoute, Middleware, TLSOption) provide fine-grained control over traffic routing, security, and load balancing, while Flux CD ensures all configurations are version-controlled and continuously reconciled. The combination of weighted routing for canary deployments, reusable middleware chains, and comprehensive metrics makes Traefik an excellent choice for production Kubernetes environments.
