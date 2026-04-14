# How to Version Dapr Components in Git

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GitOps, Version Control, Component, Infrastructure as Code

Description: Structure and version Dapr component manifests in Git with environment-specific overlays, secrets management, and GitOps deployment patterns.

---

## Overview

Dapr component manifests (state stores, pub/sub, bindings, secrets) are Kubernetes YAML resources that should be version-controlled like any other infrastructure code. Versioning them in Git enables change tracking, rollback, environment promotion, and GitOps-based deployment. This guide covers how to structure, manage secrets, and deploy Dapr components from Git.

## Repository Structure

Organize components using a Kustomize overlay pattern:

```text
dapr-components/
├── base/
│   ├── kustomization.yaml
│   ├── statestore.yaml
│   ├── pubsub.yaml
│   ├── secretstore.yaml
│   └── resiliency.yaml
├── overlays/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   └── statestore-patch.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── statestore-patch.yaml
│   └── production/
│       ├── kustomization.yaml
│       └── statestore-patch.yaml
└── README.md
```

## Base Components

Define base components with placeholder values:

```yaml
# base/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: keyPrefix
    value: "none"
```

```yaml
# base/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- statestore.yaml
- pubsub.yaml
- secretstore.yaml
- resiliency.yaml
```

## Environment-Specific Overlays

Override values per environment using patches:

```yaml
# overlays/production/statestore-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master.redis-cluster.svc.cluster.local:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "true"
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
namespace: production
patches:
- path: statestore-patch.yaml
  target:
    kind: Component
    name: statestore
```

## Secrets Management

Never store secrets in Git. Use External Secrets Operator or sealed secrets:

### With External Secrets Operator

```yaml
# overlays/production/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: redis-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: redis-secret
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: dapr/production/redis
      property: password
```

### With Sealed Secrets

```bash
# Seal the secret
kubectl create secret generic redis-secret \
  --from-literal=password=my-redis-password \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > overlays/production/redis-sealed-secret.yaml

# Commit the sealed secret (safe to commit)
git add overlays/production/redis-sealed-secret.yaml
git commit -m "Add sealed Redis secret for production"
```

## GitOps with ArgoCD

Create an ArgoCD Application that syncs Dapr components from Git:

```yaml
# argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dapr-components-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/dapr-components.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

Apply the ArgoCD application:

```bash
kubectl apply -f argocd-app.yaml -n argocd

# Monitor sync status
argocd app get dapr-components-production
argocd app sync dapr-components-production
```

## Component Change Validation

Add a pre-commit hook or CI check to validate component YAML:

```bash
#!/bin/bash
# scripts/validate-components.sh

echo "Validating Dapr component manifests..."

for file in $(find . -name "*.yaml"); do
  # Check required fields
  if ! grep -q "kind: Component" "$file" 2>/dev/null; then
    continue
  fi

  echo "Checking: $file"

  # Validate with kubectl dry-run
  kubectl apply --dry-run=client -f "$file" 2>&1
  if [ $? -ne 0 ]; then
    echo "ERROR: Invalid manifest: $file"
    exit 1
  fi
done

echo "All components valid."
```

Add to `.github/workflows/validate.yml`:

```yaml
name: Validate Dapr Components
on:
  pull_request:
    paths:
    - 'dapr-components/**'
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
    - name: Validate manifests
      run: bash scripts/validate-components.sh
    - name: Preview kustomize output
      run: |
        kubectl kustomize overlays/production
```

## Tracking Component Versions

Use Git tags to mark stable component configurations:

```bash
# Tag a known good state
git tag -a "dapr-components-v1.2.0" -m "Stable config after Redis upgrade"
git push origin "dapr-components-v1.2.0"

# Reference a tag in ArgoCD
# In the Application spec, change targetRevision to:
# targetRevision: "dapr-components-v1.2.0"
```

## Summary

Versioning Dapr components in Git using Kustomize overlays enables environment-specific configuration management, change tracking, and GitOps-based deployment via ArgoCD or Flux. The key principle is to keep base definitions generic and use overlays for environment-specific values, while storing secrets outside Git using External Secrets Operator or Sealed Secrets. CI/CD validation of manifests before merging prevents broken configurations from reaching production.
