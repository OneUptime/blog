# How to Fix Flux Reconciliation Race Condition Between Kustomizations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, RaceCondition, Dependencies

Description: Diagnose and fix race conditions where multiple Flux Kustomizations reconcile simultaneously and conflict with each other, causing intermittent failures.

---

When multiple Kustomizations reconcile at the same time and depend on each other's resources, you can hit race conditions. One Kustomization tries to use a CRD, namespace, or secret that another Kustomization has not yet created. These failures are intermittent and hard to reproduce, making them particularly frustrating to debug.

## Symptoms

Reconciliation failures that appear randomly and resolve on retry:

```bash
flux get kustomizations
```

```text
NAME            REVISION              SUSPENDED   READY   MESSAGE
infra           main@sha1:abc123      False       True    Applied revision: ...
apps            main@sha1:abc123      False       False   CustomResourceDefinition ... not found
```

After a few minutes, the `apps` Kustomization may succeed, or it may fail again. The error references resources that should exist but are not yet available.

## Diagnostic Commands

### Check the dependency chain

```bash
kubectl get kustomizations -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.dependsOn}{"\n"}{end}'
```

### Look at timestamps for each Kustomization

```bash
kubectl get kustomizations -n flux-system -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,LAST_TRANSITION:.status.conditions[0].lastTransitionTime
```

### Check if CRDs are available when apps reconcile

```bash
kubectl get crds | grep your-custom-resource
```

### Review controller logs for ordering issues

```bash
kubectl logs -n flux-system deployment/kustomize-controller --since=30m | grep -E "(apps|infra)" | head -50
```

## Common Root Causes

### 1. Missing dependsOn declarations

Kustomizations that should wait for infrastructure components do not have `dependsOn` configured.

### 2. CRD and CR in different Kustomizations without proper ordering

If one Kustomization installs a CRD and another creates custom resources of that type, the CR Kustomization may reconcile before the CRD exists.

### 3. Namespace creation race

A Kustomization creates a namespace, and another Kustomization deploys resources into that namespace. If both reconcile at the same time, the resources fail because the namespace does not exist yet.

### 4. Shared secrets or ConfigMaps

Multiple Kustomizations reference the same secret, but the Kustomization that creates the secret has not finished yet.

### 5. Webhook dependencies

A Kustomization installs a webhook, and another creates resources that the webhook validates. If the webhook is not ready, the resources are rejected.

## Step-by-Step Fixes

### Fix 1: Add proper dependsOn declarations

Structure your Kustomizations with explicit dependencies:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-crds
  namespace: flux-system
spec:
  path: ./infrastructure/crds
  interval: 10m
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-repo
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-controllers
  namespace: flux-system
spec:
  path: ./infrastructure/controllers
  interval: 10m
  prune: true
  dependsOn:
    - name: infra-crds
  sourceRef:
    kind: GitRepository
    name: my-repo
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  path: ./apps
  interval: 5m
  prune: true
  dependsOn:
    - name: infra-controllers
  sourceRef:
    kind: GitRepository
    name: my-repo
```

### Fix 2: Separate CRDs from CRs

Always install CRDs in a dedicated Kustomization that runs before any Kustomization creating custom resources:

```text
infrastructure/
  crds/          # CRD definitions only
  controllers/   # Operator deployments
  configs/       # Custom resources
apps/            # Application workloads
```

### Fix 3: Create namespaces in infrastructure layer

Do not rely on application Kustomizations to create their own namespaces. Create them in the infrastructure layer:

```yaml
# infrastructure/namespaces/production.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
```

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-namespaces
  namespace: flux-system
spec:
  path: ./infrastructure/namespaces
  interval: 10m
```

Ensure application Kustomizations depend on this:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: infra-namespaces
    - name: infra-controllers
```

### Fix 4: Use health checks to gate dependencies

Add health checks to the dependency Kustomization so that dependents only start after resources are truly ready:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-controllers
  namespace: flux-system
spec:
  path: ./infrastructure/controllers
  interval: 10m
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
```

### Fix 5: Add retry intervals for transient races

If some races are unavoidable, configure retry behavior:

```yaml
spec:
  interval: 5m
  retryInterval: 1m
  timeout: 3m
```

This allows the Kustomization to retry quickly after a transient failure without waiting for the full interval.

## Prevention Strategies

1. **Design a clear dependency hierarchy** with layers: CRDs, controllers, configuration, namespaces, and then applications.
2. **Always use dependsOn** when one Kustomization creates resources that another uses.
3. **Enable wait on dependency Kustomizations** so dependents only run after resources are healthy, not just applied.
4. **Document the dependency graph** for your team so new Kustomizations are added at the correct layer.
5. **Test the full bootstrap** by deleting all Kustomizations and letting Flux recreate everything from scratch to verify ordering works.

Race conditions in Flux are almost always a sign of missing or incorrect dependency declarations. Taking the time to map out your resource dependencies and express them as `dependsOn` relationships eliminates this entire category of issues.
