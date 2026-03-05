# How to Restrict Tenant Access to Specific Sources in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Source Controller, Security

Description: Learn how to restrict tenants to only approved Git repositories, Helm repositories, and OCI sources in Flux CD using cross-namespace references and RBAC.

---

In a multi-tenant Flux CD environment, controlling which sources a tenant can use is critical for security. You do not want tenants pulling container images or Helm charts from unauthorized registries, or syncing from arbitrary Git repositories. This guide explains how to restrict tenant access to only platform-approved sources.

## Why Source Restriction Matters

Without source restrictions, a tenant could create a GitRepository pointing to any public or private repository they have credentials for. This could introduce untrusted code into the cluster. By restricting sources, platform administrators ensure that only vetted repositories and registries are used for deployments.

## Step 1: Understand Source Scoping in Flux CD

By default, Flux CD resources can only reference sources within the same namespace. A Kustomization in the `team-alpha` namespace can only reference GitRepository objects also in the `team-alpha` namespace. This namespace scoping is the first layer of restriction.

However, Flux CD supports cross-namespace references, which allow a resource in one namespace to reference a source in another namespace. This feature must be explicitly enabled and can be controlled by the platform admin.

## Step 2: Disable Cross-Namespace References

To prevent tenants from referencing sources in other namespaces (including `flux-system`), ensure that cross-namespace references are not allowed. This is controlled by the `--no-cross-namespace-refs` flag on Flux controllers.

```yaml
# clusters/my-cluster/flux-system/kustomize-controller-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            # Prevent cross-namespace source references
            - --no-cross-namespace-refs=true
```

Apply this patch through your Flux system kustomization.

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: kustomize-controller-patch.yaml
    target:
      kind: Deployment
      name: kustomize-controller
```

## Step 3: Platform-Managed Sources in Tenant Namespaces

With cross-namespace references disabled, the platform admin must create the source resources directly in each tenant's namespace. This gives the admin full control over which sources are available.

```yaml
# tenants/team-alpha/approved-sources.yaml
# Only these sources will be available to team-alpha
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/org/team-alpha-apps
  ref:
    branch: main
  secretRef:
    name: team-alpha-git-auth
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: approved-charts
  namespace: team-alpha
spec:
  interval: 10m
  url: https://charts.example.com/stable
```

## Step 4: Use RBAC to Prevent Tenant Source Creation

To prevent tenants from creating their own source resources, use a custom Role that excludes Flux source types.

```yaml
# platform/cluster-roles/tenant-no-sources.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-no-source-creation
rules:
  # Allow standard workload resources
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "pods"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Explicitly NO rules for source.toolkit.fluxcd.io
  # Explicitly NO rules for kustomize.toolkit.fluxcd.io
  # Explicitly NO rules for helm.toolkit.fluxcd.io
```

Bind this role to the tenant service account.

```yaml
# tenants/team-alpha/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tenant-no-source-creation
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

With this setup, the tenant's Kustomization can deploy workloads from the platform-managed sources, but the tenant cannot create new GitRepository or HelmRepository resources.

## Step 5: Allow Cross-Namespace References Selectively

If you want to share a common source across tenants without duplicating it, you can use cross-namespace references with an access control list (ACL).

First, allow cross-namespace references on the controllers but use the `spec.accessFrom` field on source resources to control which namespaces can reference them.

```yaml
# flux-system/shared-helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: shared-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.example.com/stable
  accessFrom:
    namespaceSelectors:
      # Only namespaces with this label can reference this source
      - matchLabels:
          toolkit.fluxcd.io/tenant: team-alpha
      - matchLabels:
          toolkit.fluxcd.io/tenant: team-beta
```

Tenants with the matching label can then reference this source.

```yaml
# tenants/team-alpha/helm-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: team-alpha
spec:
  interval: 5m
  chart:
    spec:
      chart: nginx
      sourceRef:
        kind: HelmRepository
        name: shared-charts
        namespace: flux-system
```

## Step 6: Verify Source Restrictions

Test that tenants can only access approved sources.

```bash
# Verify the tenant can see their approved sources
flux get sources git -n team-alpha
flux get sources helm -n team-alpha

# Test that the tenant cannot create new sources
# This should fail if RBAC is correctly configured
kubectl create -n team-alpha -f - --as=system:serviceaccount:team-alpha:team-alpha <<EOF
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: unauthorized-repo
spec:
  interval: 1m
  url: https://github.com/malicious/repo
  ref:
    branch: main
EOF
```

## Summary

Restricting tenant access to specific sources in Flux CD involves a combination of namespace scoping, cross-namespace reference controls, RBAC policies, and platform-managed source resources. By disabling cross-namespace references and removing Flux CRD permissions from tenant roles, platform administrators ensure that tenants can only deploy from pre-approved Git repositories and Helm registries. This is a critical security measure for any multi-tenant Flux CD deployment.
