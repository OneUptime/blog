# How to Set Up Flux Dependency Ordering Between Kustomizations for Safe Rollouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Kustomize, Deployment Strategy

Description: Learn how to configure Flux Kustomization dependencies to ensure infrastructure components deploy in the correct order for safe and reliable cluster rollouts.

---

When deploying complex applications to Kubernetes, order matters. Your database needs to be ready before the application starts. Your CRDs must exist before custom resources are created. Your secrets need to be present before deployments reference them. Flux CD provides dependency management for Kustomizations to handle these scenarios elegantly.

This guide shows you how to orchestrate multi-component deployments using Flux dependency ordering.

## Why Dependency Ordering Matters

Consider a typical application stack:

1. Custom Resource Definitions (CRDs)
2. Operators that watch those CRDs
3. Infrastructure (databases, message queues)
4. Application deployments
5. Ingress configurations

If Flux applies these simultaneously, you'll hit race conditions. Pods crash-loop waiting for databases. Custom resources fail validation because CRDs don't exist yet. Ingress rules fail because services aren't ready.

Dependency ordering solves this by making Flux wait for prerequisites.

## Basic Dependency Syntax

Use the `dependsOn` field in Kustomization resources:

```yaml
# infrastructure/base/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/base
  prune: true
  wait: true
  timeout: 5m
```

```yaml
# apps/production/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./apps/production
  prune: true
  dependsOn:
    - name: infrastructure  # Wait for infrastructure first
```

Flux won't apply `production-apps` until `infrastructure` reaches a ready state.

## Multi-Level Dependencies

Build complex dependency chains:

```yaml
# 1. CRDs first
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/crds
  prune: false  # Never prune CRDs
  wait: true
---
# 2. Operators after CRDs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: operators
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/operators
  prune: true
  wait: true
  dependsOn:
    - name: crds
---
# 3. Infrastructure after operators
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/base
  prune: true
  wait: true
  dependsOn:
    - name: operators
---
# 4. Applications last
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./apps
  prune: true
  dependsOn:
    - name: infrastructure
```

This creates a clear deployment pipeline: CRDs → Operators → Infrastructure → Applications.

## Using Wait and Health Checks

The `wait` field is crucial for dependencies. When enabled, Flux waits for all resources to become ready:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/database
  wait: true  # Wait for resources to be ready
  timeout: 10m  # Maximum wait time
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgresql
      namespace: database
```

Flux considers the Kustomization ready only after the StatefulSet becomes healthy.

## Cross-Namespace Dependencies

Dependencies work across namespaces. This is useful when infrastructure lives in different namespaces:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 5m
  targetNamespace: production
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./apps/config
  wait: true
  dependsOn:
    - name: vault-secrets
      namespace: security-system  # Different namespace
```

## Practical Example: Multi-Tier Application

Let's deploy a realistic three-tier application with proper ordering.

Repository structure:

```
clusters/production/
├── infrastructure/
│   ├── namespace.yaml
│   ├── postgres.yaml
│   └── redis.yaml
├── config/
│   ├── configmap.yaml
│   └── secrets.yaml
├── backend/
│   └── deployment.yaml
├── frontend/
│   └── deployment.yaml
└── flux-kustomizations.yaml
```

The Flux Kustomizations with dependencies:

```yaml
# clusters/production/flux-kustomizations.yaml

# 1. Namespace first
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-namespace
  namespace: flux-system
spec:
  interval: 60m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./clusters/production/infrastructure
  prune: true
  wait: true
---
# 2. Infrastructure (database and cache)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./clusters/production/infrastructure
  prune: true
  wait: true
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: postgres
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: redis
      namespace: production
  dependsOn:
    - name: production-namespace
---
# 3. Configuration (after infrastructure)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-config
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./clusters/production/config
  prune: true
  wait: true
  dependsOn:
    - name: production-infrastructure
---
# 4. Backend (after config)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-backend
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./clusters/production/backend
  prune: true
  wait: true
  timeout: 10m
  dependsOn:
    - name: production-config
---
# 5. Frontend (after backend)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-frontend
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./clusters/production/frontend
  prune: true
  dependsOn:
    - name: production-backend
```

## Handling Circular Dependencies

Flux detects circular dependencies and will fail reconciliation. If you see this error:

```
Kustomization reconciliation failed: circular dependency detected
```

Review your dependency graph. Common causes:

- A depends on B, B depends on A
- A depends on B, B depends on C, C depends on A

Break the cycle by removing unnecessary dependencies or restructuring your Kustomizations.

## Parallel vs Sequential Deployment

Without dependencies, Flux deploys everything in parallel. This is fast but risky. With dependencies, deployment becomes sequential but safe.

For large deployments, balance parallelism and ordering:

```yaml
# Group 1: Independent infrastructure components (parallel)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring
spec:
  path: ./infrastructure/monitoring
  dependsOn:
    - name: crds
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: logging
spec:
  path: ./infrastructure/logging
  dependsOn:
    - name: crds
---
# Group 2: Applications (parallel, but after infrastructure)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-a
spec:
  path: ./apps/app-a
  dependsOn:
    - name: monitoring
    - name: logging
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-b
spec:
  path: ./apps/app-b
  dependsOn:
    - name: monitoring
    - name: logging
```

Monitoring and logging deploy in parallel. App-a and app-b also deploy in parallel, but only after both monitoring and logging are ready.

## Debugging Dependency Issues

Check Kustomization status:

```bash
flux get kustomizations
```

Look for suspended or failed Kustomizations. View detailed status:

```bash
kubectl describe kustomization production-apps -n flux-system
```

Check events:

```bash
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

Force reconciliation:

```bash
flux reconcile kustomization production-apps --with-source
```

## Timeouts and Retries

Configure appropriate timeouts for long-running deployments:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database-migration
  namespace: flux-system
spec:
  interval: 30m
  timeout: 20m  # Migration might take a while
  retryInterval: 5m  # Wait 5m before retry
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./migrations
  wait: true
```

## Best Practices

Follow these guidelines for dependency management:

1. **Keep CRDs separate**: Always deploy CRDs first in their own Kustomization with `prune: false`
2. **Use wait judiciously**: Enable `wait` for critical dependencies, but be mindful of timeouts
3. **Group related resources**: Put resources that should deploy together in the same Kustomization
4. **Document your graph**: Maintain a diagram of your dependency tree
5. **Test in staging**: Verify dependency chains work before production rollout
6. **Avoid deep chains**: Keep dependency depth manageable (3-4 levels max)
7. **Monitor reconciliation time**: Long dependency chains increase total deployment time

## Conclusion

Flux Kustomization dependencies transform chaotic parallel deployments into orchestrated, reliable rollouts. By explicitly declaring prerequisite relationships, you eliminate race conditions and ensure your infrastructure and applications deploy in the correct order every time. Start with simple chains, add health checks for critical components, and use parallel groups where possible to balance safety and speed.
