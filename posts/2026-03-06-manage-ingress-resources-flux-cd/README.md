# How to Manage Ingress Resources with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Ingresses, NGINX, GitOps, TLS, Load Balancing

Description: A practical guide to managing Kubernetes Ingress resources with Flux CD, covering NGINX Ingress Controller setup, TLS, and advanced routing patterns.

---

## Introduction

Ingress resources are the standard way to expose HTTP and HTTPS services in Kubernetes. They provide load balancing, TLS termination, and name-based virtual hosting. By managing Ingress resources through Flux CD, you ensure that all routing configurations are version-controlled, auditable, and consistently applied across environments.

This guide covers deploying an Ingress Controller with Flux, configuring Ingress resources, TLS with cert-manager, and advanced routing patterns.

## Prerequisites

- Kubernetes cluster v1.26 or later
- Flux CD v2 installed and bootstrapped
- A domain name for your services
- kubectl access to the cluster

## Installing NGINX Ingress Controller with Flux

```yaml
# infrastructure/ingress/nginx-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes.github.io/ingress-nginx
```

```yaml
# infrastructure/ingress/nginx-helmrelease.yaml
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
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  install:
    createNamespace: true
  values:
    controller:
      # Run multiple replicas for high availability
      replicaCount: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
      # Enable metrics for monitoring
      metrics:
        enabled: true
        serviceMonitor:
          enabled: true
      # Configure default TLS settings
      config:
        ssl-protocols: "TLSv1.2 TLSv1.3"
        ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"
        use-forwarded-headers: "true"
      # Pod disruption budget for availability
      podDisruptionBudget:
        enabled: true
        minAvailable: 1
```

## Basic Ingress Resource

```yaml
# apps/web-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: production
  labels:
    app.kubernetes.io/managed-by: flux
  annotations:
    # Specify the ingress controller class
    nginx.ingress.kubernetes.io/rewrite-target: /
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
                name: web-app
                port:
                  number: 80
```

## Ingress with TLS Using cert-manager

First, install cert-manager with Flux:

```yaml
# infrastructure/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    createNamespace: true
  values:
    installCRDs: true
    replicaCount: 2
```

```yaml
# infrastructure/cert-manager/cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-production-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

Now create an Ingress with automatic TLS:

```yaml
# apps/web-app/ingress-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-tls-ingress
  namespace: production
  annotations:
    # Automatically provision TLS certificates
    cert-manager.io/cluster-issuer: letsencrypt-production
    # Force HTTPS redirect
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Enable HSTS
    nginx.ingress.kubernetes.io/hsts: "true"
    nginx.ingress.kubernetes.io/hsts-max-age: "31536000"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      # cert-manager will create this secret automatically
      secretName: app-example-com-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
```

## Multi-Path Ingress

Route different paths to different services:

```yaml
# apps/platform/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: platform-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-production
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - platform.example.com
      secretName: platform-example-com-tls
  rules:
    - host: platform.example.com
      http:
        paths:
          # Frontend application
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
          # API backend
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 8080
          # WebSocket endpoint
          - path: /ws
            pathType: Prefix
            backend:
              service:
                name: websocket-server
                port:
                  number: 8443
```

## Rate Limiting and Security Annotations

```yaml
# apps/api/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-production
    # Rate limiting: 100 requests per second per IP
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
    # Request size limit (10MB)
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    # Timeouts
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    # CORS configuration
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-example-com-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 8080
```

## Canary Deployments with Ingress Annotations

```yaml
# apps/web-app/ingress-canary.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-canary-ingress
  namespace: production
  annotations:
    # Mark this as a canary ingress
    nginx.ingress.kubernetes.io/canary: "true"
    # Send 20% of traffic to the canary
    nginx.ingress.kubernetes.io/canary-weight: "20"
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
                # Canary version of the service
                name: web-app-canary
                port:
                  number: 80
```

## Environment-Specific Overlays

```yaml
# apps/ingress/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - web-app-ingress.yaml
  - api-ingress.yaml
```

```yaml
# apps/ingress/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: Ingress
      name: web-app-ingress
    patch: |
      - op: replace
        path: /spec/rules/0/host
        # Production domain
        value: app.example.com
      - op: replace
        path: /spec/tls/0/hosts/0
        value: app.example.com
```

```yaml
# apps/ingress/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: Ingress
      name: web-app-ingress
    patch: |
      - op: replace
        path: /spec/rules/0/host
        # Staging domain
        value: staging.app.example.com
      - op: replace
        path: /spec/tls/0/hosts/0
        value: staging.app.example.com
```

## Flux Kustomization for Ingress Resources

```yaml
# clusters/my-cluster/ingress.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ingress-resources
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/ingress/production
  prune: true
  wait: true
  dependsOn:
    - name: ingress-nginx
    - name: cert-manager
    - name: apps
```

## Verifying Ingress Configuration

```bash
# List all Ingress resources
kubectl get ingress --all-namespaces

# Check Ingress details and assigned addresses
kubectl describe ingress web-app-tls-ingress -n production

# Verify TLS certificate status
kubectl get certificates --all-namespaces

# Check NGINX Ingress Controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=50

# Verify Flux reconciliation
flux get kustomizations ingress-resources
```

## Best Practices

1. Always use TLS in production with cert-manager for automatic certificate management
2. Set rate limiting on public-facing endpoints to prevent abuse
3. Use canary Ingress annotations for gradual traffic shifting during deployments
4. Configure appropriate timeouts based on your application requirements
5. Use Kustomize overlays to manage domain names across environments
6. Monitor Ingress Controller metrics for traffic patterns and error rates

## Conclusion

Managing Ingress resources through Flux CD provides a consistent, GitOps-driven approach to HTTP routing in Kubernetes. By combining NGINX Ingress Controller with cert-manager and Flux, you get automated TLS certificate management, advanced routing capabilities, and full version control over your ingress configurations. This ensures reliable, secure, and auditable traffic management across all your environments.
