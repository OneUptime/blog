# How to Configure Flux with Namespace-Scoped Permissions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, RBAC, Namespace, Multi-Tenancy

Description: Learn how to configure Flux CD controllers with namespace-scoped permissions instead of cluster-wide access for stronger isolation in multi-tenant environments.

---

By default, Flux CD controllers use ClusterRoles that grant permissions across all namespaces. In multi-tenant environments, you may want to restrict controllers to specific namespaces using namespace-scoped Roles and RoleBindings. This guide shows you how to configure Flux with namespace-scoped permissions.

## When to Use Namespace-Scoped Permissions

Namespace-scoped permissions are appropriate when:

- You run a multi-tenant cluster where teams should not affect each other.
- You want to limit the blast radius of a compromised controller.
- Compliance requirements mandate namespace-level isolation.
- You deploy multiple Flux instances, each managing a subset of namespaces.

## Step 1: Create Namespace-Scoped Roles

Create Roles (not ClusterRoles) in each namespace that Flux manages:

```yaml
# role-flux-deployer-per-namespace.yaml
# Namespace-scoped Role for Flux to manage resources in the "webapp" namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-deployer
  namespace: webapp
rules:
  # Manage Deployments
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Manage core resources
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Manage networking
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Manage autoscaling
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Create events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-deployer
  namespace: webapp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: flux-deployer
subjects:
  - kind: ServiceAccount
    name: webapp-deployer
    namespace: webapp
```

## Step 2: Create Per-Namespace Service Accounts

Create a dedicated service account in each managed namespace:

```yaml
# service-accounts-per-namespace.yaml
# Service accounts for each namespace Flux manages
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webapp-deployer
  namespace: webapp
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-deployer
  namespace: api
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: worker-deployer
  namespace: worker
```

## Step 3: Configure Kustomizations with Service Account Impersonation

Use `spec.serviceAccountName` to bind each Kustomization to its namespace-scoped service account:

```yaml
# kustomizations-per-namespace.yaml
# Each Kustomization uses a namespace-scoped service account
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/webapp
  prune: true
  targetNamespace: webapp
  serviceAccountName: webapp-deployer
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/api
  prune: true
  targetNamespace: api
  serviceAccountName: api-deployer
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: worker
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/worker
  prune: true
  targetNamespace: worker
  serviceAccountName: worker-deployer
```

## Step 4: Create Roles for All Managed Namespaces

Automate the creation of Roles and RoleBindings across multiple namespaces using a template:

```yaml
# base-role-template/role.yaml
# Base Role template for Flux-managed namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-deployer
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses", "networkpolicies"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
```

Use Kustomize overlays to apply the template to each namespace:

```yaml
# overlays/webapp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: webapp
resources:
  - ../../base-role-template
  - service-account.yaml
  - role-binding.yaml
```

## Step 5: Restrict the Kustomize Controller Itself

Reduce the kustomize-controller's own ClusterRole to only allow impersonation:

```yaml
# clusterrole-kustomize-minimal.yaml
# Minimal ClusterRole for kustomize-controller (impersonation only)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-kustomize-minimal
rules:
  # Allow impersonating service accounts in any namespace
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["impersonate"]
  # Allow reading namespaces (needed for targetNamespace)
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  # Allow managing Flux CRDs
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations", "kustomizations/status", "kustomizations/finalizers"]
    verbs: ["get", "list", "watch", "update", "patch"]
  # Allow reading sources
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories", "ocirepositories", "buckets"]
    verbs: ["get", "list", "watch"]
  # Allow creating events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-kustomize-minimal
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-kustomize-minimal
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
```

## Step 6: Verify Namespace Isolation

Test that each service account can only manage resources in its own namespace:

```bash
# webapp-deployer should be able to create deployments in webapp
kubectl auth can-i create deployments \
  --as=system:serviceaccount:webapp:webapp-deployer \
  -n webapp
# Expected: yes

# webapp-deployer should NOT be able to create deployments in api
kubectl auth can-i create deployments \
  --as=system:serviceaccount:webapp:webapp-deployer \
  -n api
# Expected: no

# webapp-deployer should NOT have cluster-scoped permissions
kubectl auth can-i create clusterroles \
  --as=system:serviceaccount:webapp:webapp-deployer
# Expected: no

# Verify Flux reconciliation works for each namespace
flux get kustomizations -A
```

## Best Practices

1. **Use service account impersonation**: Always pair namespace-scoped Roles with `spec.serviceAccountName` in Kustomizations.
2. **Standardize Role templates**: Create a base Role template and use Kustomize overlays for each namespace.
3. **Minimize controller permissions**: Reduce the kustomize-controller's own ClusterRole to impersonation and CRD management only.
4. **Enable cross-namespace restrictions**: Use `--no-cross-namespace-refs` alongside namespace-scoped permissions.
5. **Audit namespace access**: Regularly review RoleBindings to ensure no unauthorized access has been granted.

Namespace-scoped permissions provide the strongest isolation model for Flux CD in multi-tenant clusters. By combining namespace-scoped Roles with service account impersonation, you ensure that each tenant can only manage resources within their own boundary.
