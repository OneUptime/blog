# How to Use Platform and Tenant Separation in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Repository Structure, Multi-Tenancy, Platform Engineering

Description: Learn how to structure a Flux repository with clear separation between platform components and tenant workloads for multi-tenant Kubernetes clusters.

---

In multi-tenant Kubernetes environments, platform teams manage the shared cluster infrastructure while tenant teams manage their own applications. Flux supports this model through a repository structure that clearly separates platform concerns from tenant concerns, with each layer having its own reconciliation and access controls.

This guide explains how to implement platform and tenant separation in your Flux repository.

## When to Use This Pattern

This pattern fits when you have:

- A platform team that manages cluster-wide infrastructure and policies
- Multiple tenant teams that deploy their own applications
- A need for access control where tenants can only modify their own resources
- Shared services that all tenants consume

## Recommended Directory Structure

```
fleet-repo/
  clusters/
    production/
      flux-system/
      platform.yaml
      tenants.yaml
  platform/
    sources/
      kustomization.yaml
    controllers/
      ingress-nginx/
      cert-manager/
      external-secrets/
      kustomization.yaml
    policies/
      network-policies/
      resource-quotas/
      limit-ranges/
      kustomization.yaml
    rbac/
      kustomization.yaml
    kustomization.yaml
  tenants/
    base/
      namespace.yaml
      rbac.yaml
      network-policy.yaml
      resource-quota.yaml
      kustomization.yaml
    team-alpha/
      kustomization.yaml
      apps/
        api-service/
        web-frontend/
        kustomization.yaml
    team-beta/
      kustomization.yaml
      apps/
        data-pipeline/
        dashboard/
        kustomization.yaml
    kustomization.yaml
```

## Platform Kustomization

The platform Kustomization manages everything the platform team is responsible for:

```yaml
# clusters/production/platform.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: platform
  namespace: flux-system
spec:
  interval: 30m
  path: ./platform
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 10m
```

## Tenants Kustomization

The tenants Kustomization depends on the platform being ready:

```yaml
# clusters/production/tenants.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenants
  namespace: flux-system
spec:
  interval: 10m
  path: ./tenants
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: platform
```

## Tenant Base Template

Create a base template that every tenant gets:

```yaml
# tenants/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ${TENANT_NAME}
  labels:
    tenant: ${TENANT_NAME}
    managed-by: platform
```

```yaml
# tenants/base/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: ${TENANT_NAME}
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
    services: "10"
```

```yaml
# tenants/base/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: ${TENANT_NAME}
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              tenant: ${TENANT_NAME}
```

```yaml
# tenants/base/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-admin
  namespace: ${TENANT_NAME}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admin
subjects:
  - kind: Group
    name: ${TENANT_GROUP}
    apiGroup: rbac.authorization.k8s.io
```

## Tenant Configuration

Each tenant uses the base template with their specific values:

```yaml
# tenants/team-alpha/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
  - apps
```

The tenant Kustomization at the cluster level provides the variable values:

```yaml
# clusters/production/tenant-alpha.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenant-alpha
  namespace: flux-system
spec:
  interval: 10m
  path: ./tenants/team-alpha
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: platform
  postBuild:
    substitute:
      TENANT_NAME: team-alpha
      TENANT_GROUP: team-alpha-devs
  serviceAccountName: tenant-alpha
```

## Per-Tenant Service Accounts

For security, each tenant can use a dedicated service account with limited permissions:

```yaml
# platform/rbac/tenant-alpha-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tenant-alpha
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tenant-alpha-flux
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-tenant
subjects:
  - kind: ServiceAccount
    name: tenant-alpha
    namespace: flux-system
```

The `flux-tenant` ClusterRole limits what resources the tenant Kustomization can create:

```yaml
# platform/rbac/flux-tenant-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-tenant
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["*"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets"]
    verbs: ["*"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["*"]
```

## Per-Tenant Source Repositories

For teams that manage their own Git repositories:

```yaml
# clusters/production/tenant-alpha.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: tenant-alpha
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/team-alpha/k8s-manifests
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenant-alpha
  namespace: flux-system
spec:
  interval: 10m
  path: ./
  prune: true
  sourceRef:
    kind: GitRepository
    name: tenant-alpha
  targetNamespace: team-alpha
  serviceAccountName: tenant-alpha
  dependsOn:
    - name: platform
```

The `targetNamespace` ensures all resources from the tenant repository are created in the tenant namespace regardless of what the manifests specify.

## Platform Policies

The platform team can enforce policies across all tenants:

```yaml
# platform/policies/limit-ranges/default.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      type: Container
```

## Onboarding a New Tenant

To onboard a new tenant:

1. Create a directory under `tenants/` for the new team
2. Add a Kustomization in the cluster directory with the tenant-specific variables
3. Create the service account and RBAC bindings
4. Commit and push

The platform team controls the onboarding process, ensuring all tenants get the correct baseline configuration.

## Conclusion

Platform and tenant separation in Flux provides a structured model for multi-tenant Kubernetes clusters. The platform team manages shared infrastructure, policies, and RBAC while tenant teams manage their own applications within their allocated namespaces. This separation enforces security boundaries, prevents resource conflicts, and scales to many tenants without increasing complexity for any individual team.
