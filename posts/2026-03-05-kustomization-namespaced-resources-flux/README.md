# How to Use Kustomization with Namespaced Resources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Namespaces, Multi-Tenancy, Resource Management

Description: Learn how to configure Flux Kustomizations to deploy and manage namespaced resources across multiple Kubernetes namespaces.

---

Most Kubernetes resources are namespaced -- they exist within a specific namespace and must be managed with that context in mind. Flux CD provides several mechanisms for controlling which namespace resources are deployed to, including the `spec.targetNamespace` field, inline namespace overrides, and the Kustomize `namespace` transformer. This guide covers all the approaches and when to use each one.

## How Flux Handles Namespaces

When Flux applies resources from a Kustomization, it determines the target namespace through a priority chain:

1. `spec.targetNamespace` on the Kustomization (overrides everything)
2. The `namespace` field in the Kustomize overlay (`kustomization.yaml`)
3. The `metadata.namespace` set on individual resources in the manifests
4. The default namespace of the Flux controller (typically `flux-system`)

Understanding this priority chain is essential for managing namespaced resources correctly.

## Using spec.targetNamespace

The `spec.targetNamespace` field on a Kustomization forces all namespaced resources to be deployed to a specific namespace, regardless of what is set in the manifests.

```yaml
# Kustomization that deploys all resources to the "production" namespace
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  # All namespaced resources will be deployed to "production"
  targetNamespace: production
```

With this configuration, even if a Deployment in `./apps/my-app` has `namespace: staging` in its manifest, Flux will deploy it to the `production` namespace instead.

This is particularly useful for deploying the same application to multiple environments from a single source path.

```yaml
# Same app deployed to staging
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-staging
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  targetNamespace: staging
---
# Same app deployed to production
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  targetNamespace: production
```

## Creating Namespaces Automatically

Flux does not automatically create the target namespace. You need to ensure it exists before resources are applied. There are several approaches.

Include the Namespace resource in a prerequisite Kustomization.

```yaml
# prerequisites/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
```

```yaml
# Kustomization for namespace creation
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: namespaces
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./prerequisites/namespaces
  prune: true
  wait: true
---
# App Kustomization depends on namespaces being created
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  targetNamespace: production
  dependsOn:
    - name: namespaces
```

## Using Kustomize Namespace Transformer

Instead of `spec.targetNamespace`, you can use the Kustomize `namespace` transformer in your overlay. This is handled at the Kustomize build level before Flux applies resources.

```yaml
# apps/my-app/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production    # Sets namespace on all resources during build
resources:
  - ../base
patches:
  - path: production-values.yaml
```

```yaml
# apps/my-app/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

Then your Flux Kustomization points to the environment-specific overlay.

```yaml
# Flux Kustomization pointing to the production overlay
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app/production
  prune: true
```

## Multi-Namespace Deployments

Some applications span multiple namespaces. In this case, do not use `targetNamespace` -- instead, set namespaces explicitly on each resource in your manifests.

```yaml
# apps/multi-namespace-app/deployment-frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: app-frontend    # Explicit namespace
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: myapp/frontend:latest
---
# apps/multi-namespace-app/deployment-backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: app-backend     # Different namespace
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: myapp/backend:latest
```

```yaml
# Kustomization without targetNamespace -- uses namespaces from manifests
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: multi-namespace-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/multi-namespace-app
  prune: true
  # No targetNamespace -- each resource keeps its own namespace
```

## Service Account Impersonation

For multi-tenant clusters, you may want Kustomizations to apply resources using a specific ServiceAccount, limiting what namespaces and resources they can access.

```yaml
# Kustomization that uses a scoped ServiceAccount
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenant-a-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./tenants/tenant-a
  prune: true
  targetNamespace: tenant-a
  # Use a ServiceAccount with limited RBAC permissions
  serviceAccountName: tenant-a-reconciler
```

The referenced ServiceAccount must have the appropriate RBAC permissions to create resources in the target namespace.

```yaml
# RBAC for tenant-scoped ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tenant-a-reconciler
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-a-reconciler
  namespace: tenant-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admin
subjects:
  - kind: ServiceAccount
    name: tenant-a-reconciler
    namespace: flux-system
```

## Verifying Namespace Deployment

Use the Flux CLI and kubectl to verify resources are deployed to the correct namespaces.

```bash
# View the resource tree to see which namespaces resources are deployed to
flux tree ks app-production --namespace flux-system

# Check resources in the target namespace
kubectl get all -n production

# Verify the Kustomization inventory includes the correct namespaces
kubectl get kustomization app-production -n flux-system \
  -o jsonpath='{.status.inventory.entries[*].id}' | tr ' ' '\n'
```

## Common Pitfalls

**targetNamespace and cluster-scoped resources**: The `targetNamespace` field only affects namespaced resources. Cluster-scoped resources (like ClusterRoles or Namespaces) are not affected. If your Kustomization contains a mix, the namespaced resources will be redirected and the cluster-scoped resources will be applied as-is.

**Missing namespaces**: If the target namespace does not exist, Flux will fail to apply resources. Always ensure namespaces are created by a prerequisite Kustomization with `dependsOn`.

**Namespace in manifests vs targetNamespace**: If you set both `targetNamespace` and explicit namespaces in your manifests, `targetNamespace` wins. This can be confusing -- document which approach you are using and be consistent.

## Summary

Flux provides flexible options for deploying namespaced resources: `spec.targetNamespace` for simple namespace overrides, Kustomize `namespace` transformers for overlay-based approaches, and explicit namespace fields in manifests for multi-namespace deployments. For multi-tenant clusters, combine `targetNamespace` with `serviceAccountName` and RBAC to isolate tenants. Always ensure target namespaces exist before deploying resources by using a prerequisite Kustomization with `dependsOn` and `wait: true`.
