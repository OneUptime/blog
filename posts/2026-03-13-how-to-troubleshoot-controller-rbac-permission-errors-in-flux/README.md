# How to Troubleshoot Controller RBAC Permission Errors in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, RBAC, Permissions, Security, Service Accounts

Description: Learn how to diagnose and fix RBAC permission errors in Flux controllers that prevent resource creation, updates, and cross-namespace operations.

---

Flux controllers operate using Kubernetes service accounts with specific RBAC (Role-Based Access Control) permissions. When these permissions are insufficient or misconfigured, controllers cannot create, update, or delete the resources they manage, causing reconciliation failures. This guide walks you through diagnosing and fixing RBAC permission errors across Flux controllers.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Cluster admin or sufficient RBAC permissions to view and modify roles, role bindings, and cluster roles

## Step 1: Identify RBAC Errors

Check controller logs for permission-related errors:

```bash
kubectl logs -n flux-system deploy/kustomize-controller | grep -i "forbidden\|unauthorized\|cannot\|rbac\|permission"
kubectl logs -n flux-system deploy/helm-controller | grep -i "forbidden\|unauthorized\|cannot\|rbac\|permission"
kubectl logs -n flux-system deploy/source-controller | grep -i "forbidden\|unauthorized\|cannot\|rbac\|permission"
```

RBAC errors typically appear as:

- `is forbidden: User "system:serviceaccount:flux-system:kustomize-controller" cannot create resource`
- `forbidden: User cannot list resource`
- `unauthorized`

Check Flux resource conditions for error messages:

```bash
flux get kustomizations --all-namespaces
flux get helmreleases --all-namespaces
```

Resources with RBAC errors will show a `False` ready status with a permission-related message.

## Step 2: Understand Flux RBAC Architecture

Flux controllers use specific service accounts:

```bash
kubectl get serviceaccounts -n flux-system
```

Each controller has its own service account:

- `source-controller` - Fetches sources and creates artifacts
- `kustomize-controller` - Applies manifests to the cluster
- `helm-controller` - Manages Helm releases
- `notification-controller` - Dispatches events and receives webhooks
- `image-reflector-controller` - Scans container registries
- `image-automation-controller` - Updates Git repositories

Check what roles are bound to a specific service account:

```bash
kubectl get clusterrolebindings -o jsonpath='{range .items[?(@.subjects[0].name=="kustomize-controller")]}{.metadata.name}{"\t"}{.roleRef.name}{"\n"}{end}'
```

Check namespace-scoped role bindings:

```bash
kubectl get rolebindings --all-namespaces -o jsonpath='{range .items[?(@.subjects[0].name=="kustomize-controller")]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.roleRef.name}{"\n"}{end}'
```

## Step 3: Test Specific Permissions

Use `kubectl auth can-i` to test whether a service account has specific permissions:

```bash
# Test if kustomize-controller can create deployments in the default namespace
kubectl auth can-i create deployments --as=system:serviceaccount:flux-system:kustomize-controller -n default

# Test if kustomize-controller can create custom resources
kubectl auth can-i create helmreleases.helm.toolkit.fluxcd.io --as=system:serviceaccount:flux-system:kustomize-controller -n default

# Test if source-controller can get secrets
kubectl auth can-i get secrets --as=system:serviceaccount:flux-system:source-controller -n flux-system
```

For a comprehensive check, list all permissions for a service account:

```bash
kubectl auth can-i --list --as=system:serviceaccount:flux-system:kustomize-controller -n default
```

## Step 4: Common RBAC Issues and Fixes

### Kustomize Controller Cannot Create Resources in Target Namespaces

The Kustomize Controller needs permissions in every namespace where it creates resources. By default, it has cluster-admin access, but if this was restricted for security reasons, you need to grant specific permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-kustomize-controller
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-kustomize-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-kustomize-controller
subjects:
- kind: ServiceAccount
  name: kustomize-controller
  namespace: flux-system
```

For a more restrictive setup, grant permissions per namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-kustomize-controller
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-kustomize-controller
subjects:
- kind: ServiceAccount
  name: kustomize-controller
  namespace: flux-system
```

### Helm Controller Cannot Manage Releases

The Helm Controller needs permissions to create and manage Helm release secrets and the resources defined in charts:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-helm-controller
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

### Source Controller Cannot Access Secrets

The Source Controller needs to read secrets for Git authentication, Helm repository credentials, and OCI registry tokens:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-source-controller-secrets
  namespace: flux-system
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch"]
```

### Cross-Namespace Resource Access

If Kustomization or HelmRelease resources reference sources in different namespaces, the controller service account needs permissions in both namespaces:

```bash
# Check if cross-namespace references exist
kubectl get kustomizations --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.sourceRef.namespace}{"\n"}{end}'
```

### Custom Service Account for Kustomizations

Flux allows specifying a custom service account for Kustomizations to apply resources with limited permissions:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  serviceAccountName: my-app-deployer
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
```

Create the service account with only the needed permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-deployer
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: my-app-deployer
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: my-app-deployer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: my-app-deployer
subjects:
- kind: ServiceAccount
  name: my-app-deployer
  namespace: flux-system
```

## Step 5: Apply and Verify Fixes

After creating or updating RBAC resources, trigger a reconciliation:

```bash
flux reconcile kustomization my-app -n flux-system
flux reconcile helmrelease my-app -n default
```

Verify the resources are now reconciled successfully:

```bash
flux get kustomizations --all-namespaces
flux get helmreleases --all-namespaces
```

Re-test permissions:

```bash
kubectl auth can-i create deployments --as=system:serviceaccount:flux-system:kustomize-controller -n production
```

## Prevention Tips

- Document the RBAC model used for Flux in your cluster
- Use the principle of least privilege by granting only necessary permissions
- Test RBAC changes in a staging environment before applying to production
- Use `kubectl auth can-i` as part of your CI pipeline to verify required permissions
- Monitor controller logs for permission-related errors and alert on them
- When adding new namespaces, ensure Flux controllers have the required role bindings
- Review RBAC configurations after Flux upgrades as new resource types may require additional permissions
- Use Kustomization `serviceAccountName` for multi-tenant clusters to enforce namespace isolation

## Summary

RBAC permission errors in Flux controllers prevent resources from being created, updated, or deleted in target namespaces. The most common issues are missing cluster role bindings for the Kustomize and Helm controllers, inability to access secrets for the Source Controller, and missing permissions in new namespaces. Testing permissions with `kubectl auth can-i`, granting appropriate roles, and using custom service accounts for multi-tenant isolation are the key strategies for resolving and preventing RBAC errors.
