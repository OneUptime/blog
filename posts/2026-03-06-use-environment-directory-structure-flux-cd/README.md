# How to Use an Environment Directory Structure with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, gitops, kubernetes, environment management, directory structure, devops

Description: Learn how to organize your Flux CD repository using an environment-based directory structure for clean separation of dev, staging, and production configurations.

---

## Introduction

When managing Kubernetes deployments across multiple environments, having a clear and maintainable directory structure is essential. Flux CD works naturally with Git repositories, and by organizing your repository into environment-specific directories, you can achieve clean separation of concerns while minimizing configuration duplication.

This guide walks you through setting up an environment-based directory structure with Flux CD, complete with practical examples you can adapt to your own projects.

## Why Use an Environment Directory Structure?

Managing multiple environments (development, staging, production) in a single repository can quickly become messy without a clear strategy. An environment directory structure provides:

- Clear separation between environment-specific configurations
- Easy auditing of what is deployed where
- Simplified access control using Git path-based permissions
- Reduced risk of accidental production changes

## Repository Layout

Here is the recommended directory structure for environment-based Flux CD repositories:

```
fleet-repo/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── environments/
│   ├── development/
│   │   ├── kustomization.yaml
│   │   ├── patches/
│   │   │   ├── replica-count.yaml
│   │   │   └── resource-limits.yaml
│   │   └── configs/
│   │       └── configmap.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   ├── patches/
│   │   │   ├── replica-count.yaml
│   │   │   └── resource-limits.yaml
│   │   └── configs/
│   │       └── configmap.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── patches/
│       │   ├── replica-count.yaml
│       │   └── resource-limits.yaml
│       └── configs/
│           └── configmap.yaml
└── clusters/
    ├── dev-cluster/
    │   └── flux-system/
    │       └── kustomization.yaml
    ├── staging-cluster/
    │   └── flux-system/
    │       └── kustomization.yaml
    └── prod-cluster/
        └── flux-system/
            └── kustomization.yaml
```

## Setting Up the Base Configuration

The base directory contains shared manifests that all environments inherit from. Start by defining your core application resources here.

```yaml
# base/kustomization.yaml
# This file declares all the base resources that environments will inherit
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - hpa.yaml
```

```yaml
# base/deployment.yaml
# Base deployment with placeholder values that environments will override
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

```yaml
# base/service.yaml
# Standard ClusterIP service for the application
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

## Configuring Environment Overlays

Each environment directory uses Kustomize overlays to customize the base configuration.

```yaml
# environments/development/kustomization.yaml
# Development overlay - uses base resources with dev-specific patches
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: development
resources:
  - ../../base
  - configs/configmap.yaml
patches:
  - path: patches/replica-count.yaml
  - path: patches/resource-limits.yaml
```

```yaml
# environments/development/patches/replica-count.yaml
# Development only needs 1 replica to save resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
```

```yaml
# environments/development/patches/resource-limits.yaml
# Lower resource limits for development workloads
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

```yaml
# environments/production/kustomization.yaml
# Production overlay with higher replicas and resources
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base
  - configs/configmap.yaml
patches:
  - path: patches/replica-count.yaml
  - path: patches/resource-limits.yaml
```

```yaml
# environments/production/patches/replica-count.yaml
# Production runs 5 replicas for high availability
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5
```

```yaml
# environments/production/patches/resource-limits.yaml
# Production gets generous resource allocations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
```

## Connecting Flux CD to the Environment Directories

Create a Flux Kustomization resource for each cluster that points to the correct environment directory.

```yaml
# clusters/dev-cluster/flux-system/kustomization.yaml
# Tells Flux to reconcile the development environment directory
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-development
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./environments/development
  prune: true
  targetNamespace: development
  timeout: 2m
```

```yaml
# clusters/prod-cluster/flux-system/kustomization.yaml
# Tells Flux to reconcile the production environment directory
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./environments/production
  prune: true
  targetNamespace: production
  timeout: 5m
  # Production uses a longer interval and timeout for stability
```

## Adding Environment-Specific ConfigMaps

Each environment can have its own configuration values via ConfigMaps.

```yaml
# environments/development/configs/configmap.yaml
# Development-specific configuration values
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
data:
  LOG_LEVEL: "debug"
  DATABASE_HOST: "db.dev.internal"
  FEATURE_FLAGS: "new-ui=true,beta-api=true"
```

```yaml
# environments/production/configs/configmap.yaml
# Production configuration with stricter settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
data:
  LOG_LEVEL: "warn"
  DATABASE_HOST: "db.prod.internal"
  FEATURE_FLAGS: "new-ui=false,beta-api=false"
```

## Defining the GitRepository Source

All clusters need a GitRepository source that Flux uses to pull manifests.

```yaml
# GitRepository source - deploy this in each cluster's flux-system namespace
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/fleet-repo.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
```

## Validating Your Setup

Before pushing changes, validate your Kustomize overlays locally to catch errors early.

```bash
# Validate that each environment's kustomization builds correctly
kustomize build environments/development
kustomize build environments/staging
kustomize build environments/production

# Check Flux resources with flux CLI
flux check --pre

# Verify the reconciliation status after deployment
flux get kustomizations --all-namespaces
```

## Best Practices

### Keep Base Manifests Generic

The base directory should contain only the common denominator across all environments. Any environment-specific values should live in patches or overlays.

### Use Consistent Naming

Name your patches descriptively so it is clear what they modify. For example, `replica-count.yaml` is better than `patch1.yaml`.

### Leverage Health Checks

Add health checks to your Flux Kustomization resources so Flux knows when a deployment is truly ready.

```yaml
# Add health checks to your Flux Kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./environments/production
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
```

### Use dependsOn for Ordering

When environments have dependencies (for example, CRDs must be installed before custom resources), use the `dependsOn` field.

```yaml
# Ensure infrastructure is ready before deploying applications
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  dependsOn:
    - name: infra-production
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./environments/production
  prune: true
```

## Conclusion

An environment-based directory structure gives you a clean, scalable way to manage multiple environments with Flux CD. By leveraging Kustomize overlays and Flux Kustomization resources, you can maintain a single source of truth while allowing each environment to have its own configuration. Start with this structure, and extend it as your deployment needs grow.
