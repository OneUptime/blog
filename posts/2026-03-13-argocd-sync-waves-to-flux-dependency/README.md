# How to Map ArgoCD Sync Waves to Flux Dependency Ordering

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Sync Waves, Migration, dependsOn, GitOps, Kubernetes, Ordering

Description: Learn how to convert ArgoCD sync wave annotations to Flux CD Kustomization dependsOn for ordered, dependency-aware GitOps deployments.

---

## Introduction

ArgoCD sync waves allow you to control the order in which resources are applied during a sync operation using the `argocd.argoproj.io/sync-wave` annotation. Resources with lower wave numbers are applied first, and ArgoCD waits for them to become healthy before proceeding to higher wave numbers.

Flux CD achieves ordered deployment through the `dependsOn` field in Kustomization resources. Instead of annotating individual resources, you express dependencies between entire Kustomizations. This guide shows how to map ArgoCD sync wave patterns to Flux dependsOn configurations.

## Prerequisites

- ArgoCD Application with sync wave annotations to migrate
- Flux CD bootstrapped on the cluster
- Understanding of Flux Kustomization dependsOn

## Step 1: Understand ArgoCD Sync Waves

A typical ArgoCD sync wave setup:

```yaml
# Wave -10: Namespace (must exist first)
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "-10"
---
# Wave -5: Custom Resource Definitions
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
---
# Wave 0: Operator deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-operator
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
# Wave 5: Database instance (requires operator)
apiVersion: example.com/v1
kind: Database
metadata:
  name: production-db
  annotations:
    argocd.argoproj.io/sync-wave: "5"
---
# Wave 10: Application (requires database)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "10"
```

## Step 2: Map to Flux Kustomization dependsOn

In Flux, you split the single application into multiple Kustomizations with explicit dependencies:

```yaml
# clusters/production/infra/crds.yaml
# Wave -10 and -5 equivalent
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 1h
  path: ./infrastructure/crds
  prune: false  # Never delete CRDs
  wait: true    # Wait for CRDs to be established
  sourceRef:
    kind: GitRepository
    name: fleet-repo
---
# Wave 0 equivalent: Operator depends on CRDs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database-operator
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/database-operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: crds  # Must be Ready before this starts
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: database-operator
      namespace: database-system
  timeout: 5m
---
# Wave 5 equivalent: Database instance depends on operator
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-database
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/database-instance
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: database-operator  # Operator must be healthy
  healthChecks:
    - apiVersion: example.com/v1
      kind: Database
      name: production-db
      namespace: myapp
  timeout: 10m
---
# Wave 10 equivalent: Application depends on database
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: production-database  # Database must be Ready
  targetNamespace: myapp
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp
```

## Step 3: Directory Structure for Ordered Deployment

```
fleet-repo/
  infrastructure/
    crds/              # Wave -10 to -5
      kustomization.yaml
      database-crd.yaml
    database-operator/ # Wave 0
      kustomization.yaml
      deployment.yaml
    database-instance/ # Wave 5
      kustomization.yaml
      database.yaml
  apps/
    myapp/             # Wave 10
      kustomization.yaml
      deployment.yaml
      service.yaml
```

## Step 4: Wait Conditions for CRDs

```yaml
# Ensure CRDs are established before dependent resources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 1h
  path: ./infrastructure/crds
  prune: false
  wait: true  # Flux waits for all resources to be ready
  timeout: 2m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
```

## Step 5: Complex Dependency Graphs

Flux supports multiple dependencies per Kustomization:

```yaml
# App that depends on both a database and a cache
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: production-database     # First dependency
    - name: production-redis-cache  # Second dependency
    - name: cert-manager            # Third dependency
```

Both dependencies must be Ready before `myapp` reconciliation starts.

## Best Practices

- Map each distinct sync wave to a separate Flux Kustomization; do not try to maintain wave annotations within Flux.
- Use `wait: true` on CRD Kustomizations to ensure custom resource types are established before their instances are deployed.
- Set realistic `timeout` values on health checks; CRD operators may take longer to become ready than regular Deployments.
- Use health checks (`healthChecks`) to define readiness criteria rather than relying on pod running status alone.
- Keep the dependency graph as shallow as possible; deep chains (A → B → C → D) increase total reconciliation time.
- Document the dependency rationale in comments in the Kustomization YAML for future maintainers.

## Conclusion

The mapping from ArgoCD sync waves to Flux dependsOn requires splitting a monolithic application into discrete Kustomizations at each dependency boundary. While this feels like more work initially, the result is a clearer, more modular dependency graph where each layer's purpose and dependencies are explicit. The `dependsOn` model is also more correct: it waits for health, not just application order, preventing the "applied but not ready" failures that can occur with fixed sync wave ordering.
