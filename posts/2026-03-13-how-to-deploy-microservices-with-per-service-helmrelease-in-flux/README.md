# How to Deploy Microservices with Per-Service HelmRelease in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, HelmRelease, Microservices, Helm, Independent Deployment

Description: Learn how to create individual HelmRelease resources for each microservice in Flux CD with independent configurations and deployment lifecycles.

---

## Introduction

Deploying microservices with individual HelmRelease resources in Flux CD gives each service its own Helm release lifecycle. This means each microservice can use a different chart version, have its own upgrade strategy, roll back independently, and be managed with different sync intervals without affecting other services.

This per-service HelmRelease pattern is the standard approach for teams running heterogeneous microservices where each service may use a different Helm chart, a different chart repository, or require unique upgrade strategies such as canary deployments or blue-green rollouts. It also aligns ownership clearly: the team responsible for a service owns the HelmRelease YAML for that service.

In this guide you will learn how to create independent HelmRelease resources for each microservice, configure service-specific Helm values and chart versions, and manage the full lifecycle of each release independently through the `flux` CLI.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- One or more Helm repositories with charts for your services
- Basic knowledge of Helm and Flux CD HelmRelease

## Step 1: Set Up HelmRepository Sources

Create HelmRepository resources for the chart repositories your services use.

```yaml
# clusters/production/sources/internal-charts.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.myorg.com/internal
  secretRef:
    name: chart-repo-credentials
---
# Public charts (e.g., for third-party dependencies)
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
```

## Step 2: Create a HelmRelease for the Frontend Service

```yaml
# clusters/production/apps/frontend-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: frontend
  createNamespace: true
  chart:
    spec:
      chart: frontend
      # Pin to a specific version for stability
      version: "3.1.2"
      sourceRef:
        kind: HelmRepository
        name: internal-charts
      # Check for new chart versions on this interval
      interval: 10m
  # Frontend-specific upgrade strategy
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
  rollback:
    cleanupOnFail: true
  values:
    replicaCount: 2
    image:
      repository: myregistry/frontend
      tag: "v4.2.0"
      pullPolicy: IfNotPresent
    service:
      type: ClusterIP
      port: 3000
    ingress:
      enabled: true
      className: nginx
      annotations:
        cert-manager.io/cluster-issuer: letsencrypt-prod
      hosts:
        - host: app.myorg.com
          paths:
            - path: /
              pathType: Prefix
      tls:
        - secretName: frontend-tls
          hosts:
            - app.myorg.com
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

## Step 3: Create a HelmRelease for the Backend API Service

```yaml
# clusters/production/apps/backend-api-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: backend-api
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: backend
  createNamespace: true
  chart:
    spec:
      chart: backend-service
      version: ">=2.0.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: internal-charts
  upgrade:
    remediation:
      retries: 5
  test:
    # Run Helm tests after each upgrade
    enable: true
  values:
    replicaCount: 3
    image:
      repository: myregistry/backend-api
      tag: "v2.8.1"
    service:
      port: 8080
    autoscaling:
      enabled: true
      minReplicas: 3
      maxReplicas: 10
      targetCPUUtilizationPercentage: 70
    env:
      DATABASE_URL:
        valueFrom:
          secretKeyRef:
            name: backend-secrets
            key: database-url
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi
```

## Step 4: Create a HelmRelease for the Auth Service

```yaml
# clusters/production/apps/auth-service-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: auth-service
  namespace: flux-system
spec:
  interval: 15m       # Auth service syncs less frequently
  targetNamespace: auth
  createNamespace: true
  chart:
    spec:
      chart: auth-service
      version: "1.5.0"  # Pinned - auth changes rarely
      sourceRef:
        kind: HelmRepository
        name: internal-charts
  # More conservative upgrade strategy for auth
  upgrade:
    remediation:
      retries: 2
      remediateLastFailure: false  # Do not auto-rollback; alert instead
  values:
    replicaCount: 2
    image:
      repository: myregistry/auth-service
      tag: "v1.5.0"
    service:
      port: 9090
    config:
      tokenExpiry: "24h"
      algorithm: "RS256"
    valuesFrom:
      - kind: Secret
        name: auth-jwt-keys
        valuesKey: jwt-values.yaml
```

## Step 5: Manage Individual HelmRelease Lifecycles

```bash
# Check status of each service independently
flux get helmrelease frontend
flux get helmrelease backend-api
flux get helmrelease auth-service

# Reconcile only the backend (other services unaffected)
flux reconcile helmrelease backend-api --with-source

# Suspend the frontend for maintenance
flux suspend helmrelease frontend

# Resume the frontend
flux resume helmrelease frontend

# View Helm history for a specific release
helm history frontend -n frontend

# Roll back the backend-api to the previous revision
helm rollback backend-api -n backend
```

## Step 6: Update Chart Versions Per Service

Each HelmRelease can independently track different chart version constraints.

```bash
# Update only the frontend chart version
# Edit the HelmRelease in Git and push
# Flux will detect the change and upgrade only the frontend

# Check which chart version is currently deployed
helm list -n frontend
helm list -n backend
helm list -n auth

# Get the values used for a specific release
helm get values backend-api -n backend
```

## Step 7: Monitor and Troubleshoot

```bash
# View all HelmRelease events
flux events --for HelmRelease/backend-api

# View Helm release history
helm history backend-api -n backend

# Describe a failing HelmRelease
kubectl describe helmrelease auth-service -n flux-system

# Check Helm controller logs
kubectl logs -n flux-system deploy/helm-controller -f
```

## Best Practices

- Pin chart versions for critical services (auth, payments) and use semver ranges for less critical ones
- Enable `test.enable: true` to run Helm tests post-upgrade for important services
- Configure `upgrade.remediation` with appropriate retry counts per service criticality
- Use separate namespaces per service for strong isolation and RBAC boundaries
- Store service-specific secrets in dedicated Kubernetes Secrets and reference them via `valuesFrom`
- Use labels on HelmRelease resources to group services by team or domain

## Conclusion

Per-service HelmRelease resources in Flux CD provide complete independence for each microservice's deployment lifecycle. Teams can control chart versions, upgrade strategies, and sync intervals per service without affecting the rest of the system. This pattern is the most flexible approach for large microservice architectures and is well-suited for organizations where multiple teams independently own and operate their services in the same cluster.
