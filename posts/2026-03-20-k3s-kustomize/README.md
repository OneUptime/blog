# How to Use K3s with Kustomize

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Kustomize, GitOps, Configuration Management, DevOps

Description: Learn how to use Kustomize with K3s to manage environment-specific configurations without duplicating YAML manifests.

## Introduction

Kustomize is a Kubernetes-native configuration management tool that allows you to customize YAML manifests without modifying the original files. It's built into kubectl (no separate installation needed) and works perfectly with K3s. Kustomize uses overlays to manage differences between environments (dev, staging, production) while maintaining a single base configuration. This guide covers practical Kustomize patterns for K3s deployments.

## Prerequisites

- K3s cluster with kubectl configured
- kubectl version 1.21+ (this guide uses modern Kustomize features built into kubectl)
- Basic knowledge of Kubernetes YAML

## Understanding Kustomize Structure

```text
k3s-apps/
├── base/                     # Shared base configuration
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/                 # Environment-specific overrides
    ├── dev/
    │   └── kustomization.yaml
    ├── staging/
    │   ├── kustomization.yaml
    │   └── replica-patch.yaml
    └── production/
        ├── kustomization.yaml
        ├── replica-patch.yaml
        └── resource-limits-patch.yaml
```

## Step 1: Create the Base Configuration

```bash
mkdir -p k3s-apps/base
```

```yaml
# k3s-apps/base/deployment.yaml

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
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
```

```yaml
# k3s-apps/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

```yaml
# k3s-apps/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Reference all base resources
resources:
  - deployment.yaml
  - service.yaml

# Common labels applied to all resources
labels:
  - pairs:
      managed-by: kustomize
      app.kubernetes.io/name: my-app
    includeTemplates: true
```

## Step 2: Create Development Overlay

```bash
mkdir -p k3s-apps/overlays/dev
```

```yaml
# k3s-apps/overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Extend the base
resources:
  - ../../base

# Set the namespace for namespaced resources
namespace: development

# Name prefix for dev resources
namePrefix: dev-

# Override the image tag for dev
images:
  - name: nginx
    newTag: "1.25-alpine"

# Add dev-specific labels
labels:
  - pairs:
      environment: development
    includeTemplates: true

# ConfigMap generator for dev config
configMapGenerator:
  - name: app-config
    literals:
      - LOG_LEVEL=debug
      - ENV=development
      - REPLICAS=1
```

## Step 3: Create Production Overlay

```bash
mkdir -p k3s-apps/overlays/production
```

```yaml
# k3s-apps/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namespace: production

images:
  - name: nginx
    # Pin to a specific image digest in production
    digest: "sha256:69fcc4e1cdddc63735fdd0ff4aea1d467120238a2e8d0767c596517664eac19e"

labels:
  - pairs:
      environment: production
    includeTemplates: true

# Apply patches to increase replicas and resources
patches:
  - path: replica-patch.yaml
  - path: resource-limits-patch.yaml
```

```yaml
# k3s-apps/overlays/production/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3  # Scale to 3 replicas in production
```

```yaml
# k3s-apps/overlays/production/resource-limits-patch.yaml
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
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
```

## Step 4: Apply Kustomize Configurations

```bash
# Preview the rendered manifests
kubectl kustomize k3s-apps/overlays/dev

# Create the target namespaces
kubectl create namespace development --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -

# Apply development overlay
kubectl apply -k k3s-apps/overlays/dev

# Apply production overlay
kubectl apply -k k3s-apps/overlays/production

# Preview production configuration
kubectl kustomize k3s-apps/overlays/production | less

# Delete resources from an overlay
kubectl delete -k k3s-apps/overlays/dev
```

## Step 5: Using Kustomize with K3s Auto-Deploy

Combine Kustomize with K3s's manifest auto-deploy on a server node. K3s will automatically apply updates when the file changes, but removing the file later will not delete the deployed resources.

```bash
#!/bin/bash
# /usr/local/bin/kustomize-deploy.sh
# Apply Kustomize overlay to K3s auto-deploy directory

KUSTOMIZE_DIR="/home/admin/k3s-apps/overlays/production"
TARGET_FILE="/var/lib/rancher/k3s/server/manifests/production-kustomize.yaml"

# Generate and write the manifests
kubectl kustomize "$KUSTOMIZE_DIR" > "$TARGET_FILE"

echo "Kustomize output written to $TARGET_FILE"
```

## Step 6: Managing Secrets with Kustomize

```yaml
# k3s-apps/overlays/production/kustomization.yaml
secretGenerator:
  - name: app-secrets
    literals:
      - DATABASE_PASSWORD=prod-secure-password
      - API_KEY=prod-api-key-value
    # The secret name will have a hash suffix to force rolling updates
    # when the secret changes
    options:
      disableNameSuffixHash: false  # Keep hash for auto-rotation
```

## Step 7: Strategic Merge Patches vs JSON Patches

Kustomize supports two patching strategies:

```yaml
# Strategic Merge Patch (simpler, works well for most cases)
# k3s-apps/overlays/production/add-env-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          env:
            - name: NEW_ENV_VAR
              value: "production-value"
```

```yaml
# JSON 6902 Patch (more precise control)
# k3s-apps/overlays/production/json-patch.yaml
- op: replace
  path: /spec/replicas
  value: 5

- op: add
  path: /spec/template/spec/containers/0/env
  value:
    - name: FEATURE_FLAG
      value: "enabled"
```

```yaml
# Reference JSON patch in kustomization.yaml
patches:
  # Strategic merge patch
  - path: add-env-patch.yaml
  # JSON patch
  - path: json-patch.yaml
    target:
      kind: Deployment
      name: my-app
```

## Step 8: Component Pattern for Reusable Configs

```yaml
# components/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

# Add Prometheus annotations to all deployments
patches:
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: not-used  # Will be applied to any deployment
      spec:
        template:
          metadata:
            annotations:
              prometheus.io/scrape: "true"
              prometheus.io/port: "9090"
    target:
      kind: Deployment
```

Use the component in an overlay:

```yaml
# overlays/production/kustomization.yaml
resources:
  - ../../base

components:
  - ../../components/monitoring  # Reusable monitoring config
```

## Conclusion

Kustomize provides a clean, template-free way to manage K3s configurations across multiple environments. The base + overlay pattern eliminates YAML duplication while allowing environment-specific customizations. Combined with K3s's auto-deploy manifests directory, Kustomize output can be automatically reapplied when files change as part of a GitOps-style workflow - making it easy to manage complex multi-environment K3s deployments from a single set of base manifests.
