# How to Configure RBAC for Cluster-Level Operations in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Cluster Management

Description: Learn how to configure ArgoCD RBAC policies for cluster management operations including adding clusters, viewing cluster details, and controlling access to cluster-scoped resources.

---

Cluster management in ArgoCD involves operations like adding new Kubernetes clusters, viewing cluster health, rotating credentials, and deploying cluster-scoped resources like namespaces, ClusterRoles, and CRDs. These are sensitive operations that should be restricted to platform teams, not given to application developers.

This guide covers how to configure RBAC for all cluster-level operations in ArgoCD.

## Understanding Cluster Operations

ArgoCD has two distinct concepts related to clusters:

1. **The `clusters` resource** - ArgoCD's registry of Kubernetes clusters it can deploy to
2. **Cluster-scoped resources** - Kubernetes resources like Namespaces, ClusterRoles, and CRDs that exist outside of any namespace

Both require separate RBAC considerations.

## The Clusters Resource

The `clusters` resource in ArgoCD RBAC controls who can manage the cluster registry:

```yaml
# Cluster management actions
p, role:cluster-admin, clusters, get, *, allow    # View cluster details
p, role:cluster-admin, clusters, create, *, allow  # Register new clusters
p, role:cluster-admin, clusters, update, *, allow  # Update cluster config
p, role:cluster-admin, clusters, delete, *, allow  # Remove clusters
```

The object field for clusters is the cluster server URL or name:

```yaml
# Access to a specific cluster
p, role:viewer, clusters, get, https://staging.k8s.local, allow

# Access to all clusters
p, role:viewer, clusters, get, *, allow
```

## Restricting Cluster Registration

Only platform administrators should be able to add or remove clusters from ArgoCD:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Platform team can manage clusters
    p, role:platform-admin, clusters, get, *, allow
    p, role:platform-admin, clusters, create, *, allow
    p, role:platform-admin, clusters, update, *, allow
    p, role:platform-admin, clusters, delete, *, allow

    # Developers can view clusters but not modify them
    p, role:developer, clusters, get, *, allow

    g, platform-engineering, role:platform-admin
    g, all-developers, role:developer

  policy.default: ""
```

This prevents developers from:
- Adding unauthorized clusters to ArgoCD
- Modifying cluster connection settings
- Removing clusters (which could break deployments)

## Cluster-Scoped Resource Permissions

When an ArgoCD application deploys cluster-scoped resources (Namespaces, ClusterRoles, ClusterRoleBindings, CRDs, etc.), you need to configure the AppProject to allow it:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: infrastructure
  namespace: argocd
spec:
  description: Infrastructure project for cluster-level resources
  sourceRepos:
    - 'https://github.com/myorg/infra-*'
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc
  # Allow deploying cluster-scoped resources
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
    - group: 'rbac.authorization.k8s.io'
      kind: ClusterRole
    - group: 'rbac.authorization.k8s.io'
      kind: ClusterRoleBinding
    - group: 'apiextensions.k8s.io'
      kind: CustomResourceDefinition
```

Then use RBAC to control who can deploy to this project:

```yaml
policy.csv: |
  # Only platform team can deploy cluster-scoped resources
  p, role:infra-deployer, applications, get, infrastructure/*, allow
  p, role:infra-deployer, applications, sync, infrastructure/*, allow
  p, role:infra-deployer, applications, create, infrastructure/*, allow
  p, role:infra-deployer, applications, update, infrastructure/*, allow

  g, platform-engineering, role:infra-deployer
```

## Separating Cluster Viewing from Cluster Management

A common pattern is to let everyone see cluster status but restrict management:

```yaml
policy.csv: |
  # Everyone can see cluster health and details
  p, role:cluster-viewer, clusters, get, *, allow

  # Only platform team can modify clusters
  p, role:cluster-manager, clusters, get, *, allow
  p, role:cluster-manager, clusters, create, *, allow
  p, role:cluster-manager, clusters, update, *, allow
  p, role:cluster-manager, clusters, delete, *, allow

  # Application deployments are separate from cluster management
  p, role:app-deployer, applications, get, */*, allow
  p, role:app-deployer, applications, sync, */*, allow

  g, all-employees, role:cluster-viewer
  g, platform-engineering, role:cluster-manager
  g, developers, role:app-deployer
```

## Multi-Cluster RBAC Strategy

When ArgoCD manages multiple clusters, you might want to restrict which teams can deploy to which clusters:

```yaml
# Project for staging cluster
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: staging
  namespace: argocd
spec:
  destinations:
    - namespace: '*'
      server: https://staging.k8s.local
---
# Project for production cluster
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  destinations:
    - namespace: '*'
      server: https://production.k8s.local
```

Then RBAC controls who deploys to each cluster via project scope:

```yaml
policy.csv: |
  # Developers deploy to staging cluster
  p, role:staging-deployer, applications, get, staging/*, allow
  p, role:staging-deployer, applications, sync, staging/*, allow
  p, role:staging-deployer, applications, create, staging/*, allow

  # Only release managers deploy to production cluster
  p, role:prod-deployer, applications, get, production/*, allow
  p, role:prod-deployer, applications, sync, production/*, allow

  g, developers, role:staging-deployer
  g, release-managers, role:prod-deployer
```

## Controlling CRD Deployments

Custom Resource Definitions (CRDs) are cluster-scoped and can affect all namespaces. Lock down CRD deployment:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: app-team
  namespace: argocd
spec:
  # Application team CANNOT deploy cluster-scoped resources
  clusterResourceWhitelist: []
  # They can only deploy to their namespace
  destinations:
    - namespace: app-team
      server: https://kubernetes.default.svc
---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: platform
  namespace: argocd
spec:
  # Platform team CAN deploy CRDs and other cluster resources
  clusterResourceWhitelist:
    - group: 'apiextensions.k8s.io'
      kind: CustomResourceDefinition
    - group: ''
      kind: Namespace
  destinations:
    - namespace: '*'
      server: '*'
```

## Cluster Credential Rotation

Updating cluster credentials is an `update` operation on the clusters resource. Only authorized users should rotate credentials:

```bash
# Rotate cluster credentials (requires clusters update permission)
argocd cluster set https://production.k8s.local \
  --kubeconfig /path/to/new-kubeconfig
```

RBAC policy:

```yaml
policy.csv: |
  # Credential rotation requires update permission
  p, role:cluster-credential-manager, clusters, get, *, allow
  p, role:cluster-credential-manager, clusters, update, *, allow

  g, security-team, role:cluster-credential-manager
```

## Viewing Cluster Health

ArgoCD tracks cluster health including connectivity status, Kubernetes version, and resource usage. Viewing this requires `get` permission on the clusters resource:

```yaml
policy.csv: |
  # SRE team can view cluster health without managing clusters
  p, role:sre-viewer, clusters, get, *, allow
  p, role:sre-viewer, applications, get, */*, allow
  p, role:sre-viewer, logs, get, */*, allow

  g, sre-team, role:sre-viewer
```

## Testing Cluster RBAC

Verify your cluster-level RBAC:

```bash
# Can platform team register a new cluster?
argocd admin settings rbac can role:platform-admin create clusters '*' \
  --policy-file policy.csv --default-role ''
# Expected: Yes

# Can developers register a new cluster?
argocd admin settings rbac can role:developer create clusters '*' \
  --policy-file policy.csv --default-role ''
# Expected: No

# Can developers view cluster info?
argocd admin settings rbac can role:developer get clusters '*' \
  --policy-file policy.csv --default-role ''
# Expected: Yes (if granted)

# Can developers delete a cluster?
argocd admin settings rbac can role:developer delete clusters '*' \
  --policy-file policy.csv --default-role ''
# Expected: No
```

## Complete Multi-Cluster Production Policy

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    # Platform admins - full access including cluster management
    g, platform-engineering, role:admin

    # Cluster viewer - can see cluster health
    p, role:cluster-viewer, clusters, get, *, allow

    # Staging deployer - can manage staging apps
    p, role:staging-deployer, applications, get, */*, allow
    p, role:staging-deployer, applications, create, staging/*, allow
    p, role:staging-deployer, applications, update, staging/*, allow
    p, role:staging-deployer, applications, sync, staging/*, allow
    p, role:staging-deployer, applications, delete, staging/*, allow
    p, role:staging-deployer, logs, get, staging/*, allow

    # Production deployer - can sync but not create/delete
    p, role:prod-deployer, applications, get, */*, allow
    p, role:prod-deployer, applications, sync, production/*, allow
    p, role:prod-deployer, logs, get, production/*, allow

    # Assign roles
    g, all-developers, role:cluster-viewer
    g, all-developers, role:staging-deployer
    g, release-managers, role:prod-deployer

  policy.default: ""
  scopes: '[groups]'
```

## Summary

Cluster-level RBAC in ArgoCD involves two things: the `clusters` resource that controls who can manage the cluster registry, and AppProject `clusterResourceWhitelist` that controls which cluster-scoped Kubernetes resources can be deployed. Keep cluster management restricted to platform teams, use projects to control which clusters each team can target, and lock down cluster-scoped resource deployment to prevent application teams from accidentally deploying CRDs or ClusterRoles. Test everything with `argocd admin settings rbac can` before deploying.
