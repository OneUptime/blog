# How to Create Tenant Namespaces with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Namespaces

Description: Learn how to create and manage tenant namespaces using Flux CD with proper labeling, resource quotas, and limit ranges for multi-tenant clusters.

---

In a multi-tenant Flux CD setup, namespaces are the primary isolation boundary between tenants. Each tenant gets one or more namespaces where they can deploy their applications. This guide covers how to create and manage tenant namespaces declaratively through Flux CD, including labeling conventions, resource constraints, and lifecycle management.

## Why Namespaces Matter for Multi-Tenancy

Kubernetes namespaces provide logical isolation for resources. In a Flux CD multi-tenant setup, namespaces serve as the boundary for:

- RBAC policies that restrict what a tenant can access
- Resource quotas that limit how much CPU and memory a tenant can consume
- Network policies that control traffic between tenants
- Flux Kustomization `serviceAccountName` enforcement

## Step 1: Define a Tenant Namespace

Create a namespace manifest with labels that identify it as belonging to a specific tenant.

```yaml
# tenants/team-alpha/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    # Standard Flux CD tenant label
    toolkit.fluxcd.io/tenant: team-alpha
    # Custom labels for policy enforcement
    app.kubernetes.io/managed-by: flux
    tenant.example.com/name: team-alpha
    tenant.example.com/tier: standard
  annotations:
    tenant.example.com/owner: "alpha-team@example.com"
    tenant.example.com/cost-center: "CC-1234"
```

## Step 2: Add Resource Quotas

Resource quotas prevent any single tenant from consuming more than their fair share of cluster resources.

```yaml
# tenants/team-alpha/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-quota
  namespace: team-alpha
spec:
  hard:
    # Compute resource limits
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    # Object count limits
    pods: "40"
    services: "10"
    configmaps: "20"
    secrets: "20"
    persistentvolumeclaims: "10"
```

## Step 3: Add Limit Ranges

Limit ranges set default resource requests and limits for containers that do not specify their own.

```yaml
# tenants/team-alpha/limit-range.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: team-alpha-limits
  namespace: team-alpha
spec:
  limits:
    - type: Container
      # Default limits applied when not specified
      default:
        cpu: 500m
        memory: 512Mi
      # Default requests applied when not specified
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      # Maximum any single container can request
      max:
        cpu: "2"
        memory: 4Gi
      # Minimum any single container must request
      min:
        cpu: 50m
        memory: 64Mi
```

## Step 4: Create Multiple Namespaces per Tenant

Some tenants may need multiple namespaces, for example separate namespaces for their staging and production workloads.

```yaml
# tenants/team-alpha/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha-staging
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
    tenant.example.com/environment: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha-production
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
    tenant.example.com/environment: production
```

When a tenant has multiple namespaces, the RBAC bindings must be created in each one. The service account can live in one namespace and be referenced by RoleBindings in the others.

```yaml
# tenants/team-alpha/rbac-staging.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha-staging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
---
# tenants/team-alpha/rbac-production.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha-production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

## Step 5: Use flux create tenant for Quick Setup

The `flux create tenant` command can create a tenant with multiple namespaces at once.

```bash
# Create a tenant with multiple namespaces
flux create tenant team-alpha \
  --with-namespace=team-alpha-staging \
  --with-namespace=team-alpha-production \
  --export > team-alpha-tenant.yaml
```

This generates the namespaces, service accounts, and role bindings for all specified namespaces.

## Step 6: Assemble with Kustomization

Combine all namespace-related resources into a single Kustomization file.

```yaml
# tenants/team-alpha/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - resource-quota.yaml
  - limit-range.yaml
  - service-account.yaml
  - rbac.yaml
```

## Step 7: Register in the Platform Configuration

Add the tenant namespace configuration to the platform admin's Flux Kustomization.

```yaml
# clusters/my-cluster/tenants.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenants
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./tenants
  prune: true
```

## Step 8: Verify Namespace Configuration

After Flux reconciles, verify the namespaces and their constraints.

```bash
# List all tenant namespaces by label
kubectl get namespaces -l toolkit.fluxcd.io/tenant=team-alpha

# Check resource quotas
kubectl describe resourcequota team-alpha-quota -n team-alpha

# Check limit ranges
kubectl describe limitrange team-alpha-limits -n team-alpha

# Verify Flux can see the namespace
flux get kustomizations -n flux-system
```

## Namespace Naming Conventions

Consistent naming helps with automation and policy enforcement. Consider these patterns:

- Single namespace per tenant: `{tenant-name}` (e.g., `team-alpha`)
- Environment-based: `{tenant-name}-{environment}` (e.g., `team-alpha-production`)
- Application-based: `{tenant-name}-{app-name}` (e.g., `team-alpha-api`)

Use labels rather than naming conventions for programmatic selection, as labels are queryable while namespace names are not.

## Handling Namespace Deletion

When `prune: true` is set on the platform admin's Kustomization, removing a tenant's files from Git will cause Flux to delete the namespace and all resources within it. This is powerful but dangerous. Consider using `prune: false` for tenant namespaces or adding the `kustomize.toolkit.fluxcd.io/prune: disabled` annotation on critical namespaces.

```yaml
# Protect a namespace from accidental pruning
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
```

## Summary

Tenant namespaces in Flux CD serve as the foundational isolation boundary for multi-tenancy. By defining namespaces declaratively with proper labels, resource quotas, and limit ranges, platform administrators can ensure each tenant has a well-defined and constrained environment. The `flux create tenant` command provides a quick way to set up the basic structure, while Kustomize overlays allow for customization per tenant.
