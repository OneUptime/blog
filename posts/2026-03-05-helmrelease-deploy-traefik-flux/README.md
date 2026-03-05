# How to Use HelmRelease for Deploying Traefik with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Traefik, Ingress Controller

Description: Learn how to deploy Traefik as a Kubernetes ingress controller using a Flux HelmRelease for GitOps-managed traffic routing.

---

Traefik is a modern reverse proxy and ingress controller that integrates natively with Kubernetes. It supports automatic TLS certificate management, middleware chains, and dynamic configuration discovery. Deploying Traefik through a Flux HelmRelease ensures your ingress layer is version-controlled, reproducible, and automatically reconciled from Git.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- Basic understanding of Kubernetes Ingress and IngressRoute concepts

## Creating the HelmRepository

Traefik publishes official Helm charts through their dedicated chart repository.

```yaml
# helmrepository-traefik.yaml - Traefik Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: traefik
  namespace: flux-system
spec:
  interval: 1h
  url: https://traefik.github.io/charts
```

Apply this to your GitOps repository so Flux can discover available Traefik chart versions.

## Deploying Traefik with HelmRelease

The following HelmRelease deploys Traefik as a Kubernetes ingress controller with production-ready defaults.

```yaml
# helmrelease-traefik.yaml - Traefik deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: traefik
  namespace: traefik
spec:
  interval: 15m
  chart:
    spec:
      chart: traefik
      version: "32.x"
      sourceRef:
        kind: HelmRepository
        name: traefik
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 10m
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # Deployment configuration
    deployment:
      replicas: 2

    # Resource limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi

    # Entrypoints configuration
    ports:
      web:
        port: 8000
        exposedPort: 80
        protocol: TCP
      websecure:
        port: 8443
        exposedPort: 443
        protocol: TCP
        tls:
          enabled: true

    # Service configuration
    service:
      type: LoadBalancer
      annotations: {}

    # Enable the Traefik dashboard (secured)
    ingressRoute:
      dashboard:
        enabled: true
        matchRule: Host(`traefik.example.com`)
        entryPoints:
          - websecure

    # Logging configuration
    logs:
      general:
        level: INFO
      access:
        enabled: true
        format: json

    # Prometheus metrics
    metrics:
      prometheus:
        entryPoint: metrics
        service:
          enabled: true
        serviceMonitor:
          enabled: true

    # Pod disruption budget for high availability
    podDisruptionBudget:
      enabled: true
      minAvailable: 1

    # Node affinity for spreading across nodes
    topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app.kubernetes.io/name: traefik
```

## Configuring TLS with Let's Encrypt

Traefik can automatically obtain and renew TLS certificates using Let's Encrypt. Add the following to your values section.

```yaml
# Snippet: Let's Encrypt TLS configuration in Traefik values
additionalArguments:
  - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
  - "--certificatesresolvers.letsencrypt.acme.storage=/data/acme.json"
  - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"

persistence:
  enabled: true
  size: 128Mi
  path: /data
```

## Defining IngressRoute Resources

With Traefik deployed, you can create IngressRoute custom resources to route traffic to your services.

```yaml
# ingressroute.yaml - Example IngressRoute for a web application
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: my-web-app
  namespace: apps
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: my-web-app
          port: 80
      middlewares:
        - name: rate-limit
  tls:
    certResolver: letsencrypt
```

## Adding Middleware

Traefik middleware allows you to modify requests before they reach your services.

```yaml
# middleware.yaml - Rate limiting middleware
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: apps
spec:
  rateLimit:
    average: 100
    burst: 50
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmrelease traefik -n traefik

# Verify Traefik pods are running
kubectl get pods -n traefik

# Check the LoadBalancer service for external IP
kubectl get svc -n traefik

# Verify Traefik CRDs are installed
kubectl get crds | grep traefik

# Check Traefik dashboard
kubectl port-forward svc/traefik -n traefik 9000:9000
```

## Summary

Deploying Traefik through a Flux HelmRelease from `https://traefik.github.io/charts` provides a GitOps-managed ingress controller with automatic TLS, middleware support, and dynamic service discovery. The combination of Flux reconciliation and Traefik's native Kubernetes integration gives you a reliable, version-controlled traffic routing layer that automatically stays in sync with your Git repository.
