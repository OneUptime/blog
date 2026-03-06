# How to Fix 'forbidden' RBAC Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, RBAC, Kubernetes, Security, Multi-Tenancy, GitOps, Troubleshooting

Description: A detailed guide to diagnosing and resolving RBAC forbidden errors in Flux CD, covering service account permissions, ClusterRoles, and multi-tenancy configurations.

---

## Introduction

RBAC (Role-Based Access Control) errors in Flux CD occur when the Flux controllers or their associated service accounts lack the necessary permissions to create, update, or delete resources in the cluster. These errors manifest as "forbidden" messages and can affect Kustomizations, HelmReleases, and other Flux resources. This guide covers how to diagnose and fix these permission issues.

## Identifying the Error

Check the Kustomization or HelmRelease status:

```bash
# Check all Kustomizations for errors
kubectl get kustomizations -A

# Get the detailed error
kubectl describe kustomization <name> -n flux-system
```

Typical error messages:

```yaml
Status:
  Conditions:
    - Type: Ready
      Status: "False"
      Reason: ReconciliationFailed
      Message: 'deployments.apps "my-app" is forbidden: User "system:serviceaccount:flux-system:kustomize-controller"
        cannot create resource "deployments" in API group "apps" in the namespace "production"'
```

Or for cluster-scoped resources:

```yaml
Message: 'clusterroles.rbac.authorization.k8s.io is forbidden: User "system:serviceaccount:flux-system:kustomize-controller"
  cannot create resource "clusterroles" in API group "rbac.authorization.k8s.io" at the cluster scope'
```

## Cause 1: Default Service Account Missing Permissions

By default, Flux controllers run with broad permissions in the flux-system namespace. However, if RBAC policies have been tightened or if you are deploying to namespaces with restricted access, the default permissions may be insufficient.

### Diagnosing Permission Issues

```bash
# Check what the kustomize-controller service account can do
kubectl auth can-i --list \
  --as=system:serviceaccount:flux-system:kustomize-controller

# Check specific permission
kubectl auth can-i create deployments \
  --as=system:serviceaccount:flux-system:kustomize-controller \
  -n production

# Check the ClusterRoleBindings for Flux
kubectl get clusterrolebindings | grep flux

# View the ClusterRole bound to the controller
kubectl describe clusterrole crd-controller-flux-system
```

### Fix: Grant Cluster-Admin Permissions (Development Only)

For development or single-team clusters, you can grant broad permissions:

```yaml
# flux-cluster-admin.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-system-cluster-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  # cluster-admin has full access to all resources
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
  - kind: ServiceAccount
    name: helm-controller
    namespace: flux-system
```

Apply it:

```bash
kubectl apply -f flux-cluster-admin.yaml
```

## Cause 2: Multi-Tenancy with Restricted Service Accounts

In multi-tenant setups, each tenant typically has their own service account with limited permissions. Flux Kustomizations can impersonate these service accounts, but the accounts need the right roles.

### Fix: Set Up Tenant Service Accounts with Proper RBAC

#### Step 1: Create the Tenant Namespace and Service Account

```yaml
# tenant-rbac.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    toolkit.fluxcd.io/tenant: team-alpha

---
# Service account for the tenant
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-alpha
  namespace: team-alpha
  labels:
    toolkit.fluxcd.io/tenant: team-alpha
```

#### Step 2: Create a Role with Required Permissions

```yaml
# tenant-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
rules:
  # Core resources
  - apiGroups: [""]
    resources:
      - configmaps
      - secrets
      - services
      - serviceaccounts
      - persistentvolumeclaims
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Workload resources
  - apiGroups: ["apps"]
    resources:
      - deployments
      - statefulsets
      - daemonsets
      - replicasets
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Networking
  - apiGroups: ["networking.k8s.io"]
    resources:
      - ingresses
      - networkpolicies
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Autoscaling
  - apiGroups: ["autoscaling"]
    resources:
      - horizontalpodautoscalers
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Batch
  - apiGroups: ["batch"]
    resources:
      - jobs
      - cronjobs
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

#### Step 3: Bind the Role to the Service Account

```yaml
# tenant-rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: team-alpha-reconciler
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

#### Step 4: Configure Flux Kustomization to Use the Tenant Service Account

```yaml
# tenant-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./tenants/team-alpha
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: team-alpha
  # Impersonate the tenant service account
  serviceAccountName: team-alpha
```

#### Step 5: Allow the Kustomize Controller to Impersonate

The kustomize-controller needs permission to impersonate the tenant service account:

```yaml
# impersonation-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-impersonate-team-alpha
rules:
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    resourceNames: ["team-alpha"]
    verbs: ["impersonate"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-impersonate-team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-impersonate-team-alpha
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
```

## Cause 3: CRD Permissions Missing

If your application uses Custom Resource Definitions, the Flux service account needs permission to manage them.

### Fix: Add CRD Permissions

```yaml
# crd-permissions.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-crd-manager
rules:
  # Permission to manage CRDs themselves (cluster-scoped)
  - apiGroups: ["apiextensions.k8s.io"]
    resources: ["customresourcedefinitions"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Permission to manage cert-manager resources
  - apiGroups: ["cert-manager.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Permission to manage monitoring resources
  - apiGroups: ["monitoring.coreos.com"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-crd-manager
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-crd-manager
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
  - kind: ServiceAccount
    name: helm-controller
    namespace: flux-system
```

## Cause 4: Cross-Namespace Permissions

When a Kustomization in the flux-system namespace needs to create resources in other namespaces, it needs cross-namespace permissions.

### Fix: Create ClusterRole for Cross-Namespace Access

```yaml
# cross-namespace-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-cross-namespace
rules:
  # Allow managing resources across all namespaces
  - apiGroups: [""]
    resources:
      - namespaces
      - configmaps
      - secrets
      - services
      - serviceaccounts
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["apps"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-cross-namespace
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-cross-namespace
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
```

## Cause 5: Helm Controller Specific Permissions

HelmReleases sometimes require additional permissions that are not needed for Kustomizations, especially for Helm hooks and pre/post-install jobs.

### Fix: Add Helm-Specific RBAC

```yaml
# helm-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-helm-permissions
rules:
  # Helm hooks often create Jobs
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Helm may manage RBAC resources
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Some charts create PodSecurityPolicies
  - apiGroups: ["policy"]
    resources: ["poddisruptionbudgets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-helm-permissions
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-helm-permissions
subjects:
  - kind: ServiceAccount
    name: helm-controller
    namespace: flux-system
```

## Quick Troubleshooting Commands

```bash
# 1. Check what a service account can do
kubectl auth can-i --list --as=system:serviceaccount:flux-system:kustomize-controller

# 2. Test a specific permission
kubectl auth can-i create deployments.apps -n production \
  --as=system:serviceaccount:flux-system:kustomize-controller

# 3. List all role bindings for a service account
kubectl get rolebindings,clusterrolebindings -A -o json | \
  jq '.items[] | select(.subjects[]? | select(.name=="kustomize-controller")) | {name: .metadata.name, namespace: .metadata.namespace, role: .roleRef.name}'

# 4. Check the Kustomization's service account configuration
kubectl get kustomization <name> -n flux-system -o jsonpath='{.spec.serviceAccountName}'

# 5. View RBAC audit events (if audit logging is enabled)
kubectl logs -n kube-system kube-apiserver-<node> | grep "RBAC DENY"

# 6. Force reconciliation after fixing RBAC
flux reconcile kustomization <name> --with-source
```

## Summary

RBAC "forbidden" errors in Flux CD indicate that the controller service accounts lack the necessary permissions to manage cluster resources. For single-team clusters, granting cluster-admin to Flux controllers is the simplest solution. For multi-tenant environments, create dedicated service accounts per tenant with scoped Roles, and configure Flux Kustomizations to impersonate those accounts. Always follow the principle of least privilege, granting only the permissions each tenant needs. When adding CRDs or new resource types, remember to update the RBAC rules to include the new API groups and resources.
