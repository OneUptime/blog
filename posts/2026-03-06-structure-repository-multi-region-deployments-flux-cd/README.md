# How to Structure a Repository for Multi-Region Deployments with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Region, Deployment Strategy, High Availability

Description: Learn how to organize your Flux CD Git repository for deploying applications across multiple geographic regions with region-specific configurations.

---

## Introduction

Deploying applications across multiple geographic regions is a common requirement for high availability and low latency. Each region may have different resource requirements, cloud provider configurations, and compliance needs. Flux CD allows you to manage all of this from a single Git repository with a well-planned directory structure.

This guide covers how to structure your repository to handle multi-region deployments effectively while keeping configuration DRY.

## Challenges of Multi-Region Deployments

Multi-region setups introduce complexity around:

- Region-specific endpoint configurations (databases, caches, storage)
- Different scaling requirements per region based on traffic patterns
- Cloud provider differences (availability zones, instance types)
- Compliance requirements that vary by geography (GDPR, data residency)
- Staggered rollout strategies to limit blast radius

## Recommended Repository Structure

```text
fleet-repo/
├── base/
│   ├── apps/
│   │   ├── kustomization.yaml
│   │   ├── api-server/
│   │   ├── web-frontend/
│   │   └── worker/
│   └── infrastructure/
│       ├── kustomization.yaml
│       ├── ingress/
│       ├── monitoring/
│       └── cert-manager/
├── regions/
│   ├── us-east-1/
│   │   ├── kustomization.yaml
│   │   ├── apps/
│   │   │   ├── kustomization.yaml
│   │   │   └── patches/
│   │   └── infrastructure/
│   │       ├── kustomization.yaml
│   │       └── patches/
│   ├── eu-west-1/
│   │   ├── kustomization.yaml
│   │   ├── apps/
│   │   │   ├── kustomization.yaml
│   │   │   └── patches/
│   │   └── infrastructure/
│   │       ├── kustomization.yaml
│   │       └── patches/
│   └── ap-southeast-1/
│       ├── kustomization.yaml
│       ├── apps/
│       │   ├── kustomization.yaml
│       │   └── patches/
│       └── infrastructure/
│           ├── kustomization.yaml
│           └── patches/
└── clusters/
    ├── us-east-1-prod/
    │   └── flux-config.yaml
    ├── eu-west-1-prod/
    │   └── flux-config.yaml
    └── ap-southeast-1-prod/
        └── flux-config.yaml
```

## Setting Up Base Application Manifests

Define your application resources in the base directory with sensible defaults.

```yaml
# base/apps/kustomization.yaml
# Declares all application components
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - api-server/
  - web-frontend/
  - worker/
```

```yaml
# base/apps/api-server/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

```yaml
# base/apps/api-server/deployment.yaml
# Base API server deployment - regions will override replicas and resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  labels:
    app: api-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api-server
          image: myorg/api-server:v1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: REGION
              valueFrom:
                configMapKeyRef:
                  name: region-config
                  key: REGION_NAME
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

## Creating Region-Specific Overlays

Each region directory customizes the base manifests for its specific needs.

```yaml
# regions/us-east-1/kustomization.yaml
# US East region overlay - primary region with highest traffic
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - apps/
  - infrastructure/
```

```yaml
# regions/us-east-1/apps/kustomization.yaml
# US East app overlay - higher replicas for primary region
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/apps
  - region-config.yaml
patches:
  - path: patches/api-server-scale.yaml
  - path: patches/api-server-endpoints.yaml
```

```yaml
# regions/us-east-1/apps/region-config.yaml
# Region-specific configuration for US East
apiVersion: v1
kind: ConfigMap
metadata:
  name: region-config
data:
  REGION_NAME: "us-east-1"
  DATABASE_HOST: "db.us-east-1.internal"
  CACHE_HOST: "redis.us-east-1.internal"
  CDN_ENDPOINT: "https://cdn-us-east.example.com"
```

```yaml
# regions/us-east-1/apps/patches/api-server-scale.yaml
# US East is the primary region - scale up for higher traffic
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 10
  template:
    spec:
      containers:
        - name: api-server
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
```

```yaml
# regions/us-east-1/apps/patches/api-server-endpoints.yaml
# US East specific environment variables for service endpoints
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
        - name: api-server
          env:
            - name: STORAGE_BUCKET
              value: "myapp-us-east-1-data"
            - name: ANALYTICS_ENDPOINT
              value: "https://analytics.us-east-1.internal"
```

```yaml
# regions/eu-west-1/apps/kustomization.yaml
# EU West app overlay - GDPR-compliant configuration
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/apps
  - region-config.yaml
patches:
  - path: patches/api-server-scale.yaml
  - path: patches/api-server-gdpr.yaml
```

```yaml
# regions/eu-west-1/apps/patches/api-server-gdpr.yaml
# EU region requires GDPR compliance settings
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
        - name: api-server
          env:
            - name: GDPR_MODE
              value: "strict"
            - name: DATA_RESIDENCY
              value: "eu"
            - name: PII_ENCRYPTION
              value: "enabled"
```

## Configuring Flux for Each Region

Each cluster directory contains the Flux configuration that points to its region.

```yaml
# clusters/us-east-1-prod/flux-config.yaml
# Flux configuration for the US East production cluster
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/fleet-repo.git
  ref:
    branch: main
---
# Deploy infrastructure first
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./regions/us-east-1/infrastructure
  prune: true
  timeout: 5m
---
# Deploy apps after infrastructure is ready
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./regions/us-east-1/apps
  prune: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: api-server
      namespace: default
```

## Staggered Rollouts Across Regions

Use different Git references or suspend/resume to control rollout order.

```yaml
# clusters/us-east-1-prod/flux-config.yaml (canary region - uses latest)
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/fleet-repo.git
  ref:
    branch: main
```

```yaml
# clusters/eu-west-1-prod/flux-config.yaml (follows behind with a tag)
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/fleet-repo.git
  ref:
    # EU follows behind, only deploying tagged releases
    tag: production-eu-v1.2.0
```

## Region-Specific Infrastructure

Some infrastructure components need region-specific configuration, like cloud load balancers.

```yaml
# regions/us-east-1/infrastructure/patches/ingress-annotations.yaml
# AWS-specific annotations for US East load balancer
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  values:
    controller:
      service:
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
          service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
          service.beta.kubernetes.io/aws-load-balancer-subnets: "subnet-us-east-1a,subnet-us-east-1b"
```

## Verification Commands

```bash
# Check reconciliation status for all regions
flux get kustomizations

# View region-specific app status
flux get kustomization apps

# Build and verify a region overlay locally
kustomize build regions/us-east-1/apps

# Compare configurations between regions
diff <(kustomize build regions/us-east-1/apps) <(kustomize build regions/eu-west-1/apps)
```

## Best Practices

### Minimize Region Differences

Keep region-specific patches as small as possible. The more differences between regions, the harder it is to debug issues.

### Use ConfigMaps for Region Metadata

Rather than hardcoding region-specific values in patches, use a region ConfigMap that applications can read from. This keeps patches focused on scaling and resources.

### Test in a Canary Region First

Always designate one region as the canary. Deploy changes there first and monitor before rolling out to other regions.

### Document Region-Specific Requirements

Add a brief comment or README in each region directory explaining why certain patches exist, especially for compliance-related changes.

## Conclusion

Multi-region deployments with Flux CD are manageable when you structure your repository with clear separation between base manifests and region-specific overlays. The key is keeping base configurations generic, using Kustomize patches for regional differences, and leveraging Flux's dependency management for controlled rollouts across regions.
