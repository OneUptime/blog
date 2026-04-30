# How to Configure Fleet Kustomize Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Kustomize

Description: Learn how to configure Fleet to deploy applications using Kustomize overlays, enabling environment-specific customizations without modifying base manifests.

## Introduction

Fleet has built-in support for Kustomize, allowing you to manage environment-specific Kubernetes configurations using the base-overlay pattern. When Fleet detects a `kustomization.yaml` file in a directory, it automatically uses Kustomize to render the final manifests before applying them to your clusters.

This guide covers structuring your repository for Kustomize, configuring Fleet to use Kustomize overlays, and applying per-cluster patches.

## Prerequisites

- Fleet installed in Rancher
- `kubectl` access to the Fleet manager cluster
- Basic knowledge of Kustomize
- A Git repository with Kubernetes manifests

## Understanding Fleet's Kustomize Support

Fleet automatically detects Kustomize directories by looking for a `kustomization.yaml` file. When found, Fleet renders the directory with Kustomize before applying the resulting manifests. No additional configuration is needed - it just works.

## Setting Up a Kustomize Repository Structure

The standard base-overlay pattern works directly with Fleet:

```text
my-app/
├── base/
│   ├── kustomization.yaml   # Base kustomization file
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── overlays/
│   ├── dev/
│   │   ├── fleet.yaml           # Fleet config for dev
│   │   ├── kustomization.yaml   # Dev overlay
│   │   └── patches/
│   │       └── deployment-patch.yaml
│   ├── staging/
│   │   ├── fleet.yaml
│   │   ├── kustomization.yaml
│   │   └── patches/
│   │       └── deployment-patch.yaml
│   └── production/
│       ├── fleet.yaml
│       ├── kustomization.yaml
│       └── patches/
│           └── deployment-patch.yaml
```

## Creating the Base Manifests

```yaml
# base/kustomization.yaml

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Resources included in the base
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

# Common labels added to all resources
commonLabels:
  app: my-app
  managed-by: fleet
```

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
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
          image: my-registry/my-app:latest
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
```

## Creating Environment Overlays

### Development Overlay

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Reference the base
resources:
  - ../../base

# Development-specific namespace
namespace: my-app-dev

# Image tag override for development
images:
  - name: my-registry/my-app
    newTag: "dev-latest"

# Patches for development resources
patches:
  - path: patches/deployment-patch.yaml
```

```yaml
# overlays/dev/patches/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1  # Single replica for dev
  template:
    spec:
      containers:
        - name: my-app
          env:
            - name: LOG_LEVEL
              value: debug
            - name: ENVIRONMENT
              value: development
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
```

### Production Overlay

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base
  - hpa.yaml
  - poddisruptionbudget.yaml

namespace: my-app-prod

images:
  - name: my-registry/my-app
    newTag: "v1.2.0"  # Pinned release version

patches:
  - path: patches/deployment-patch.yaml
```

```yaml
# overlays/production/patches/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3  # HA configuration for production
  template:
    spec:
      containers:
        - name: my-app
          env:
            - name: LOG_LEVEL
              value: error
            - name: ENVIRONMENT
              value: production
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "1Gi"
```

## Configuring Fleet for Kustomize

### Using fleet.yaml with Kustomize

```yaml
# overlays/production/fleet.yaml
namespace: my-app-prod

# No special kustomize config needed - Fleet detects it automatically
# But you can override targets here
overrideTargets:
  - name: production-clusters
    clusterSelector:
      matchLabels:
        env: production
```

### GitRepo Pointing to Kustomize Paths

```yaml
# gitrepo-kustomize.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-kustomize
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-app
  branch: main

  # Point to specific overlay paths
  paths:
    - overlays/dev
    - overlays/staging
    - overlays/production
```

## Using JSON Patches in Kustomize

For more precise patches, use JSON patches:

```yaml
# overlays/production/kustomization.yaml - with JSON patches
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  # Patch the deployment replica count
  - target:
      group: apps
      version: v1
      kind: Deployment
      name: my-app
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 3
      - op: add
        path: /spec/template/spec/containers/0/env
        value:
          - name: ENVIRONMENT
            value: production
```

## Verifying Kustomize Deployments

```bash
# Test the Kustomize build locally before committing
kustomize build overlays/production

# After Fleet deploys, verify the resources
kubectl get deployments -n my-app-prod
kubectl get pods -n my-app-prod

# Check that the correct image tag is deployed
kubectl get deployment my-app -n my-app-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Conclusion

Fleet's native Kustomize support makes it easy to adopt the base-overlay pattern for managing environment-specific configurations. By organizing your manifests with a clean base and targeted overlays, you eliminate duplication while maintaining the flexibility to customize deployments for each environment. Combined with Fleet's cluster targeting, Kustomize enables you to manage complex multi-cluster, multi-environment deployments from a single Git repository with minimal configuration overhead.
