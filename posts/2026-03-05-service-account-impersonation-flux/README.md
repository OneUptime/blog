# How to Configure Service Account Impersonation in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, RBAC, Service Account, Impersonation

Description: Learn how to use service account impersonation in Flux CD to apply resources with scoped permissions using spec.serviceAccountName in Kustomization and HelmRelease.

---

Service account impersonation is a powerful Flux CD feature that lets you control exactly which permissions are used when applying resources to your cluster. Instead of using the controller's own (often broad) permissions, each Kustomization or HelmRelease can impersonate a specific service account with only the permissions it needs.

This guide explains how to configure service account impersonation for both Kustomization and HelmRelease resources, enabling multi-tenant and least-privilege GitOps workflows.

## Why Use Service Account Impersonation

By default, the kustomize-controller and helm-controller use their own service accounts to apply resources. These service accounts typically have cluster-admin or similarly broad permissions. Service account impersonation lets you:

- Enforce per-tenant resource boundaries in multi-tenant clusters.
- Restrict what resources a specific Kustomization or HelmRelease can create.
- Prevent privilege escalation through Git commits.
- Meet compliance requirements for least-privilege access.

## Step 1: Create a Dedicated Service Account

First, create a service account in the target namespace where resources will be applied:

```yaml
# service-account-app-deployer.yaml
# Service account for deploying application workloads in the "webapp" namespace
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-deployer
  namespace: webapp
```

## Step 2: Create a Role with Scoped Permissions

Define a Role that grants only the permissions needed by the application:

```yaml
# role-app-deployer.yaml
# Role granting permissions to manage typical application resources
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-deployer
  namespace: webapp
rules:
  # Allow managing Deployments
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing Services
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing ConfigMaps
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing HorizontalPodAutoscalers
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Step 3: Bind the Role to the Service Account

Create a RoleBinding to associate the Role with the service account:

```yaml
# rolebinding-app-deployer.yaml
# Binds the app-deployer Role to the app-deployer ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-deployer
  namespace: webapp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: app-deployer
subjects:
  - kind: ServiceAccount
    name: app-deployer
    namespace: webapp
```

## Step 4: Configure Kustomization with Service Account Impersonation

Use `spec.serviceAccountName` in your Kustomization to impersonate the dedicated service account:

```yaml
# kustomization-webapp.yaml
# Flux Kustomization that impersonates the app-deployer service account
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/webapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: webapp
  # Impersonate this service account when applying resources
  serviceAccountName: app-deployer
```

When `serviceAccountName` is set, the kustomize-controller impersonates the specified service account instead of using its own permissions. If the service account lacks the required permissions, the reconciliation will fail with a Forbidden error, preventing unauthorized resource creation.

## Step 5: Configure HelmRelease with Service Account Impersonation

The same pattern works for HelmRelease resources:

```yaml
# helmrelease-redis.yaml
# HelmRelease that impersonates a dedicated service account
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  targetNamespace: cache
  # Impersonate this service account when installing the Helm chart
  serviceAccountName: cache-deployer
  values:
    architecture: standalone
    auth:
      enabled: true
```

## Multi-Tenant Example

In a multi-tenant cluster, each team gets its own namespace, service account, and Kustomization:

```yaml
# team-alpha-rbac.yaml
# Complete RBAC setup for Team Alpha
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-alpha-deployer
  namespace: team-alpha
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-alpha-deployer
  namespace: team-alpha
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["*"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets"]
    verbs: ["*"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-deployer
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: team-alpha-deployer
subjects:
  - kind: ServiceAccount
    name: team-alpha-deployer
    namespace: team-alpha
---
# Flux Kustomization for Team Alpha with impersonation
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha
  namespace: flux-system
spec:
  interval: 5m
  path: ./tenants/team-alpha
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: team-alpha
  serviceAccountName: team-alpha-deployer
```

## Granting Impersonation Permissions to the Controller

The kustomize-controller and helm-controller need explicit permission to impersonate service accounts. Flux sets this up by default, but if you have customized RBAC, ensure the controllers have the impersonate verb:

```yaml
# clusterrole-impersonate.yaml
# Grants the kustomize-controller permission to impersonate service accounts
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-impersonate
rules:
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["impersonate"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-kustomize-impersonate
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-impersonate
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
  - kind: ServiceAccount
    name: helm-controller
    namespace: flux-system
```

## Verifying Impersonation

Confirm that impersonation is working as expected:

```bash
# Check the Kustomization status for RBAC errors
flux get kustomizations

# Check what the impersonated service account can do
kubectl auth can-i create deployments \
  --as=system:serviceaccount:webapp:app-deployer \
  -n webapp

# Verify it cannot create resources outside its scope
kubectl auth can-i create clusterroles \
  --as=system:serviceaccount:webapp:app-deployer
```

## Best Practices

1. **Always use impersonation in multi-tenant clusters**: Without it, any tenant can escalate privileges through their Git repository.
2. **Use namespace-scoped Roles**: Avoid ClusterRoles for tenant service accounts unless truly needed.
3. **Deny dangerous resources**: Never grant tenant service accounts permission to create ClusterRoles, ClusterRoleBindings, or other cluster-scoped resources.
4. **Combine with cross-namespace restrictions**: Use `--no-cross-namespace-refs` to prevent tenants from referencing resources in other namespaces.

Service account impersonation is one of the most effective security mechanisms in Flux CD. By mapping each Kustomization and HelmRelease to a scoped service account, you ensure that Git commits can only affect the resources each team is authorized to manage.
