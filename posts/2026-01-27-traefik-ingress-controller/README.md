# How to Set Up Traefik as Ingress Controller

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Traefik, Ingress Controller, Load Balancing, TLS, Let's Encrypt, DevOps

Description: A comprehensive guide to deploying and configuring Traefik as your Kubernetes ingress controller with automatic TLS, middleware, and observability.

---

> Traefik is not just an ingress controller - it is a modern edge router that automatically discovers your services and configures itself dynamically.

## Why Traefik?

Traefik stands out among Kubernetes ingress controllers for several reasons:

- **Automatic service discovery** - No manual configuration needed when services change
- **Native Let's Encrypt integration** - Automatic TLS certificate management
- **Rich middleware ecosystem** - Authentication, rate limiting, circuit breakers built-in
- **Excellent observability** - Built-in dashboard, metrics, and tracing support
- **IngressRoute CRD** - More powerful routing than standard Ingress resources

## Installing Traefik with Helm

The recommended way to install Traefik is using the official Helm chart.

### Add the Traefik Helm Repository

```bash
# Add the Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts

# Update your local Helm chart repository cache
helm repo update
```

### Create a Values File

Create a `traefik-values.yaml` file to customize the installation:

```yaml
# traefik-values.yaml
# Traefik Helm chart configuration

# Enable the dashboard (disabled in production by default)
ingressRoute:
  dashboard:
    enabled: true
    # Secure the dashboard with basic auth middleware
    matchRule: Host(`traefik.example.com`)
    entryPoints:
      - websecure

# Configure entry points (ports Traefik listens on)
ports:
  # HTTP entry point - redirects to HTTPS
  web:
    port: 8000
    exposedPort: 80
    protocol: TCP
    # Redirect HTTP to HTTPS
    redirectTo:
      port: websecure
  # HTTPS entry point
  websecure:
    port: 8443
    exposedPort: 443
    protocol: TCP
    tls:
      enabled: true
  # Metrics entry point for Prometheus
  metrics:
    port: 9100
    exposedPort: 9100
    protocol: TCP

# Enable Prometheus metrics
metrics:
  prometheus:
    entryPoint: metrics
    addEntryPointsLabels: true
    addRoutersLabels: true
    addServicesLabels: true

# Resource limits for the Traefik pods
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"

# Enable access logs
logs:
  access:
    enabled: true
    # Log format: json or common
    format: json
    # Fields to include in access logs
    fields:
      headers:
        defaultMode: drop
        names:
          User-Agent: keep
          Authorization: drop
          Content-Type: keep

# Number of Traefik replicas for high availability
deployment:
  replicas: 2

# Pod disruption budget for rolling updates
podDisruptionBudget:
  enabled: true
  minAvailable: 1

# Enable the IngressRoute CRD
providers:
  kubernetesIngress:
    enabled: true
    publishedService:
      enabled: true
  kubernetesCRD:
    enabled: true
    allowCrossNamespace: true
```

### Install Traefik

```bash
# Create namespace for Traefik
kubectl create namespace traefik

# Install Traefik with custom values
helm install traefik traefik/traefik \
  --namespace traefik \
  --values traefik-values.yaml

# Verify the installation
kubectl get pods -n traefik
kubectl get svc -n traefik
```

## Understanding IngressRoute CRD

Traefik's IngressRoute CRD provides more features than the standard Kubernetes Ingress resource.

### Basic IngressRoute

```yaml
# basic-ingressroute.yaml
# Route traffic to a simple web service
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: webapp-route
  namespace: default
spec:
  # Entry points this route responds to
  entryPoints:
    - websecure
  # Routing rules
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: webapp
          port: 80
          # Load balancing strategy
          strategy: RoundRobin
  # TLS configuration
  tls:
    certResolver: letsencrypt
```

### Path-Based Routing

```yaml
# path-routing.yaml
# Route different paths to different services
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api-routes
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    # Route /api/v1 to api-v1 service
    - match: Host(`api.example.com`) && PathPrefix(`/api/v1`)
      kind: Rule
      services:
        - name: api-v1
          port: 8080
    # Route /api/v2 to api-v2 service
    - match: Host(`api.example.com`) && PathPrefix(`/api/v2`)
      kind: Rule
      services:
        - name: api-v2
          port: 8080
    # Default route for other paths
    - match: Host(`api.example.com`)
      kind: Rule
      priority: 1
      services:
        - name: api-default
          port: 8080
  tls:
    certResolver: letsencrypt
```

### Weighted Round Robin (Canary Deployments)

```yaml
# canary-deployment.yaml
# Split traffic between stable and canary versions
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: canary-route
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        # 90% of traffic goes to stable version
        - name: webapp-stable
          port: 80
          weight: 90
        # 10% of traffic goes to canary version
        - name: webapp-canary
          port: 80
          weight: 10
  tls:
    certResolver: letsencrypt
```

## Configuring Middleware

Middleware allows you to modify requests and responses. Traefik provides many built-in middleware options.

### Rate Limiting Middleware

```yaml
# rate-limit-middleware.yaml
# Protect your services from abuse
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: default
spec:
  rateLimit:
    # Average number of requests per second
    average: 100
    # Maximum burst of requests
    burst: 50
    # Time period for rate calculation
    period: 1s
    # Use client IP as rate limit key
    sourceCriterion:
      ipStrategy:
        depth: 1
```

### Basic Authentication Middleware

```yaml
# basic-auth-middleware.yaml
# Protect routes with username/password
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: basic-auth
  namespace: default
spec:
  basicAuth:
    # Reference to a Kubernetes secret containing credentials
    secret: auth-secret
    # Remove Authorization header before forwarding
    removeHeader: true
---
# Create the secret with htpasswd format
# Generate with: htpasswd -nb admin password | base64
apiVersion: v1
kind: Secret
metadata:
  name: auth-secret
  namespace: default
type: kubernetes.io/basic-auth
stringData:
  # Format: username:password-hash (use htpasswd to generate)
  users: |
    admin:$apr1$xyz123$hashedpassword
```

### Headers Middleware

```yaml
# headers-middleware.yaml
# Add security headers to responses
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: security-headers
  namespace: default
spec:
  headers:
    # Prevent clickjacking
    frameDeny: true
    # Enable XSS protection
    browserXssFilter: true
    # Prevent MIME type sniffing
    contentTypeNosniff: true
    # Force HTTPS
    forceSTSHeader: true
    stsSeconds: 31536000
    stsIncludeSubdomains: true
    stsPreload: true
    # Content Security Policy
    customResponseHeaders:
      X-Content-Type-Options: "nosniff"
      X-Frame-Options: "DENY"
      Referrer-Policy: "strict-origin-when-cross-origin"
```

### Circuit Breaker Middleware

```yaml
# circuit-breaker-middleware.yaml
# Protect against cascading failures
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: circuit-breaker
  namespace: default
spec:
  circuitBreaker:
    # Open circuit when error rate exceeds threshold
    expression: NetworkErrorRatio() > 0.30 || ResponseCodeRatio(500, 600, 0, 600) > 0.25
    # Time to wait before trying again
    checkPeriod: 10s
    # Time to wait in open state
    fallbackDuration: 30s
    # Time to probe in half-open state
    recoveryDuration: 60s
```

### Applying Middleware to Routes

```yaml
# route-with-middleware.yaml
# IngressRoute using multiple middleware
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: protected-api
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`)
      kind: Rule
      # Apply middleware in order
      middlewares:
        - name: rate-limit
        - name: security-headers
        - name: circuit-breaker
      services:
        - name: api-service
          port: 8080
  tls:
    certResolver: letsencrypt
```

## TLS Termination

Traefik can terminate TLS connections and forward plain HTTP to your services.

### Using Kubernetes Secrets

```yaml
# tls-secret.yaml
# Store TLS certificate in a Kubernetes secret
apiVersion: v1
kind: Secret
metadata:
  name: example-tls
  namespace: default
type: kubernetes.io/tls
data:
  # Base64 encoded certificate and key
  tls.crt: LS0tLS1CRUdJTi... # your certificate
  tls.key: LS0tLS1CRUdJTi... # your private key
---
# ingressroute-with-tls.yaml
# Use the TLS secret in your IngressRoute
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: webapp-tls
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: webapp
          port: 80
  tls:
    # Reference the secret containing the certificate
    secretName: example-tls
```

### TLSOption for Advanced Configuration

```yaml
# tls-options.yaml
# Configure TLS versions and cipher suites
apiVersion: traefik.io/v1alpha1
kind: TLSOption
metadata:
  name: secure-tls
  namespace: default
spec:
  # Minimum TLS version
  minVersion: VersionTLS12
  # Allowed cipher suites (ordered by preference)
  cipherSuites:
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
  # Prefer server cipher suites
  preferServerCipherSuites: true
  # Enable ALPN protocols
  alpnProtocols:
    - h2
    - http/1.1
---
# Use the TLS option in your IngressRoute
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: secure-webapp
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`secure.example.com`)
      kind: Rule
      services:
        - name: webapp
          port: 80
  tls:
    # Reference the TLS options
    options:
      name: secure-tls
    certResolver: letsencrypt
```

## Let's Encrypt Integration

Traefik can automatically obtain and renew TLS certificates from Let's Encrypt.

### Configure Certificate Resolver

Update your `traefik-values.yaml` to include Let's Encrypt configuration:

```yaml
# traefik-values.yaml (additional configuration)
# Let's Encrypt certificate resolver configuration

# Certificate resolvers for automatic TLS
certificatesResolvers:
  letsencrypt:
    acme:
      # Email for Let's Encrypt registration
      email: admin@example.com
      # Storage location for certificates
      storage: /data/acme.json
      # Use HTTP-01 challenge (requires port 80)
      httpChallenge:
        entryPoint: web
      # Or use TLS-ALPN-01 challenge (requires port 443)
      # tlsChallenge: {}
      # Use staging server for testing (remove for production)
      # caServer: https://acme-staging-v02.api.letsencrypt.org/directory

# Persistent storage for certificates
persistence:
  enabled: true
  name: data
  accessMode: ReadWriteOnce
  size: 128Mi
  # Use your storage class
  storageClass: ""
  path: /data
```

### Using Let's Encrypt in IngressRoute

```yaml
# letsencrypt-ingressroute.yaml
# Automatic TLS with Let's Encrypt
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: webapp-letsencrypt
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: webapp
          port: 80
  tls:
    # Use the Let's Encrypt certificate resolver
    certResolver: letsencrypt
    # Optional: specify domains explicitly
    domains:
      - main: app.example.com
        sans:
          - www.app.example.com
```

### Wildcard Certificates with DNS Challenge

```yaml
# traefik-values.yaml (DNS challenge configuration)
# For wildcard certificates, use DNS-01 challenge

certificatesResolvers:
  letsencrypt-dns:
    acme:
      email: admin@example.com
      storage: /data/acme.json
      # DNS-01 challenge for wildcard certs
      dnsChallenge:
        provider: cloudflare
        # Wait for DNS propagation
        delayBeforeCheck: 30s
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"

# Environment variables for DNS provider credentials
env:
  - name: CF_API_EMAIL
    valueFrom:
      secretKeyRef:
        name: cloudflare-credentials
        key: email
  - name: CF_API_KEY
    valueFrom:
      secretKeyRef:
        name: cloudflare-credentials
        key: api-key
```

## Traefik Dashboard

The Traefik dashboard provides visibility into your routing configuration and traffic.

### Secure Dashboard Access

```yaml
# dashboard-ingressroute.yaml
# Secure access to Traefik dashboard
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: dashboard-auth
  namespace: traefik
spec:
  basicAuth:
    secret: dashboard-auth-secret
---
apiVersion: v1
kind: Secret
metadata:
  name: dashboard-auth-secret
  namespace: traefik
type: kubernetes.io/basic-auth
stringData:
  users: |
    admin:$apr1$H6uskkkW$IgXLP6ewTrSuBkTrqE8wj/
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: traefik-dashboard
  namespace: traefik
spec:
  entryPoints:
    - websecure
  routes:
    # Dashboard UI
    - match: Host(`traefik.example.com`) && (PathPrefix(`/dashboard`) || PathPrefix(`/api`))
      kind: Rule
      middlewares:
        - name: dashboard-auth
      services:
        - name: api@internal
          kind: TraefikService
  tls:
    certResolver: letsencrypt
```

### Dashboard via Port Forward (Development)

```bash
# Quick access to dashboard without exposing it
kubectl port-forward -n traefik deployment/traefik 9000:9000

# Access dashboard at http://localhost:9000/dashboard/
```

## Metrics and Observability

Traefik provides built-in metrics that integrate with Prometheus and Grafana.

### Enable Prometheus Metrics

```yaml
# traefik-values.yaml (metrics configuration)
# Prometheus metrics configuration

metrics:
  prometheus:
    # Entry point for metrics endpoint
    entryPoint: metrics
    # Add labels for entry points
    addEntryPointsLabels: true
    # Add labels for routers
    addRoutersLabels: true
    # Add labels for services
    addServicesLabels: true
    # Bucket definitions for histograms
    buckets:
      - 0.1
      - 0.3
      - 1.2
      - 5.0
```

### ServiceMonitor for Prometheus Operator

```yaml
# servicemonitor.yaml
# Prometheus Operator ServiceMonitor for Traefik
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: traefik
  namespace: traefik
  labels:
    app: traefik
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: traefik
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
  namespaceSelector:
    matchNames:
      - traefik
```

### Key Metrics to Monitor

```yaml
# Example Prometheus alerts for Traefik
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: traefik-alerts
  namespace: traefik
spec:
  groups:
    - name: traefik
      rules:
        # Alert on high error rate
        - alert: TraefikHighErrorRate
          expr: |
            sum(rate(traefik_service_requests_total{code=~"5.."}[5m]))
            /
            sum(rate(traefik_service_requests_total[5m])) > 0.05
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High error rate on Traefik"
            description: "Error rate is above 5%"
        # Alert on high latency
        - alert: TraefikHighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(traefik_service_request_duration_seconds_bucket[5m])) by (le, service)
            ) > 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High latency on Traefik service"
            description: "99th percentile latency is above 2 seconds"
        # Alert when Traefik is down
        - alert: TraefikDown
          expr: up{job="traefik"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Traefik is down"
            description: "Traefik ingress controller is not responding"
```

### Enable Tracing

```yaml
# traefik-values.yaml (tracing configuration)
# Distributed tracing with Jaeger or OpenTelemetry

tracing:
  # Enable tracing
  enabled: true
  # Use OpenTelemetry
  otlp:
    # Send traces to OpenTelemetry collector
    http:
      endpoint: http://otel-collector.observability:4318/v1/traces
    # Or use gRPC
    # grpc:
    #   endpoint: otel-collector.observability:4317
```

## Best Practices Summary

When deploying Traefik as your Kubernetes ingress controller, follow these best practices:

**Installation and Configuration**
- Use Helm for installation to simplify upgrades and configuration management
- Always deploy at least two replicas for high availability
- Set appropriate resource limits to prevent resource starvation
- Use Pod Disruption Budgets to ensure availability during updates

**Security**
- Always redirect HTTP to HTTPS at the entry point level
- Use TLS 1.2 as the minimum version
- Apply security headers middleware to all routes
- Protect the dashboard with authentication and restrict access
- Store TLS certificates and credentials in Kubernetes Secrets

**Certificates**
- Use Let's Encrypt for automatic certificate management
- Enable persistent storage for certificate data
- Use DNS challenge for wildcard certificates
- Test with staging Let's Encrypt before production

**Routing**
- Use IngressRoute CRD for advanced routing features
- Apply rate limiting to protect against abuse
- Configure circuit breakers to prevent cascading failures
- Use weighted routing for canary deployments

**Observability**
- Enable Prometheus metrics and create alerts
- Enable access logging in JSON format
- Configure distributed tracing for debugging
- Monitor the dashboard for configuration issues

**Maintenance**
- Keep Traefik updated to get security patches
- Review and audit middleware configurations regularly
- Test routing changes in staging before production
- Document all custom configurations

---

Traefik provides a powerful yet flexible solution for managing ingress traffic in Kubernetes. Its automatic service discovery, native Let's Encrypt support, and rich middleware ecosystem make it an excellent choice for both simple and complex routing requirements. Start with the basics and gradually add middleware and observability as your needs grow.

Monitor your Traefik ingress controller and backend services with [OneUptime](https://oneuptime.com) for comprehensive observability, alerting, and incident management.
