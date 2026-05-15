# How to Configure RBAC for Flux CD Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, RBAC, Access Control

Description: Learn how to configure Role-Based Access Control (RBAC) for Flux CD controllers to secure your GitOps pipeline with granular permissions.

---

Flux CD deploys several controllers into your Kubernetes cluster, each responsible for different reconciliation tasks. By default, Kustomization and HelmRelease reconciliation runs with broad permissions through the controller service accounts. In production environments, you should configure RBAC to limit what each reconciliation can do, following the principle of least privilege.

This guide walks you through configuring RBAC for Flux CD controllers, including creating custom Roles, RoleBindings, and scoping permissions with service account impersonation.

## Understanding Flux CD Controllers

Flux CD installs the following controllers, each with its own service account:

- **source-controller**: Manages GitRepository, HelmRepository, HelmChart, OCIRepository, Bucket, and ExternalArtifact sources.
- **source-watcher**: Reconciles ArtifactGenerator resources for source composition and decomposition.
- **kustomize-controller**: Reconciles Kustomization resources and applies manifests.
- **helm-controller**: Reconciles HelmRelease resources.
- **notification-controller**: Handles alerts and webhook receivers.
- **image-reflector-controller**: Scans container registries for new image tags.
- **image-automation-controller**: Commits image updates back to Git.

Each controller has a corresponding service account in the `flux-system` namespace.

## Viewing Default RBAC

Before customizing RBAC, inspect the existing roles and bindings that Flux installs.

```bash
# List all ClusterRoles installed by Flux
kubectl get clusterroles -l app.kubernetes.io/part-of=flux

# List all ClusterRoleBindings installed by Flux
kubectl get clusterrolebindings -l app.kubernetes.io/part-of=flux

# Inspect the ClusterRoles and ClusterRoleBindings used by Flux
kubectl describe clusterrole crd-controller
kubectl describe clusterrolebinding cluster-reconciler
kubectl describe clusterrolebinding crd-controller
```

## Creating a Custom Role for Kustomize Controller

The kustomize-controller is powerful because it applies arbitrary Kubernetes manifests. You should restrict what resource types each Kustomization can manage by reconciling it under a dedicated service account.

The following Role limits a Kustomization in the `apps` namespace to managing only Deployments, Services, ConfigMaps, and Secrets:

```yaml
# role-kustomize-restricted.yaml
# Restricts Kustomization reconciliation to only manage common workload resources
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-kustomize-reconciler
  namespace: apps
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-kustomize-restricted
  namespace: apps
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
  # Allow managing Secrets
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Binding the Role to the Reconciliation Service Account

Create a RoleBinding that associates the restricted Role with the service account that the Kustomization will impersonate:

```yaml
# rolebinding-kustomize-restricted.yaml
# Binds the restricted Role to the Kustomization impersonation service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-kustomize-restricted
  namespace: apps
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: flux-kustomize-restricted
subjects:
  - kind: ServiceAccount
    name: flux-kustomize-reconciler
    namespace: apps
```

Then set `.spec.serviceAccountName` on the Kustomization that should run with these permissions:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: apps
spec:
  serviceAccountName: flux-kustomize-reconciler
  # other fields omitted
```

## Creating a Role for Helm Controller

The helm-controller can also impersonate a service account for each HelmRelease. Create a Role and RoleBinding in the namespace where the Helm release is reconciled:

```yaml
# role-helm-restricted.yaml
# Restricts HelmRelease reconciliation to common namespaced resources
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-helm-reconciler
  namespace: apps
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-helm-restricted
  namespace: apps
rules:
  # Allow managing Deployments, StatefulSets, DaemonSets
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing core resources commonly created by Helm charts
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing RBAC resources created by Helm charts
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-helm-restricted
  namespace: apps
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: flux-helm-restricted
subjects:
  - kind: ServiceAccount
    name: flux-helm-reconciler
    namespace: apps
```

Set `.spec.serviceAccountName` on the HelmRelease that should run with these permissions:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: app
  namespace: apps
spec:
  serviceAccountName: flux-helm-reconciler
  # other fields omitted
```

## Creating a Role for Source Controller

The source-controller primarily reconciles Flux source objects and stores artifacts. Avoid replacing the default `crd-controller` binding unless you have audited all source-controller requirements for your Flux version. To limit who can create or update sources in an application namespace, grant access to the source CRDs with namespace-scoped RBAC:

```yaml
# role-source-writer.yaml
# Allows managing Flux source objects in the apps namespace
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-source-writer
  namespace: apps
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-source-writer
  namespace: apps
rules:
  # Allow managing source CRDs in this namespace
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing source extension CRDs in this namespace
  - apiGroups: ["source.extensions.fluxcd.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow reading secrets for authentication
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-source-writer
  namespace: apps
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: flux-source-writer
subjects:
  - kind: ServiceAccount
    name: flux-source-writer
    namespace: apps
```

## Applying the Custom RBAC Configuration

Apply the custom RBAC resources and configure Flux workloads to impersonate the restricted service accounts:

```bash
# Apply the custom Roles and RoleBindings
kubectl apply -f role-kustomize-restricted.yaml
kubectl apply -f rolebinding-kustomize-restricted.yaml
kubectl apply -f role-helm-restricted.yaml
kubectl apply -f role-source-writer.yaml

# In multi-tenant clusters, enforce impersonation on kustomize-controller and helm-controller
# with the --default-service-account flag during Flux bootstrap or controller customization.
# Do not delete the cluster-reconciler binding unless your platform-admin Kustomizations
# and HelmReleases have been moved to explicit service accounts with the required permissions.

# Verify the new namespace-scoped bindings
kubectl get rolebindings -n apps
```

## Verifying RBAC is Working

After applying the custom RBAC, verify that Flux controllers can still reconcile resources and that unauthorized actions are denied:

```bash
# Check kustomize-controller logs for permission errors
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "forbidden\|unauthorized"

# Check helm-controller logs for permission errors
kubectl logs -n flux-system deployment/helm-controller | grep -i "forbidden\|unauthorized"

# Verify reconciliation still works
flux reconcile kustomization flux-system

# Use kubectl auth to verify what the service account can do
kubectl auth can-i create deployments -n apps --as=system:serviceaccount:apps:flux-kustomize-reconciler
kubectl auth can-i create clusterroles --as=system:serviceaccount:apps:flux-kustomize-reconciler
```

## Best Practices

1. **Start permissive, then restrict**: Begin with Flux's default RBAC and progressively tighten permissions as you understand what each controller needs.
2. **Use namespace-scoped Roles where possible**: If Flux only manages resources in specific namespaces, use Role and RoleBinding instead of ClusterRole and ClusterRoleBinding.
3. **Audit regularly**: Periodically review RBAC configurations and controller logs to identify unnecessary permissions.
4. **Use service account impersonation**: Pair RBAC restrictions with service account impersonation in Kustomization and HelmRelease resources for fine-grained, per-tenant access control.
5. **Document your RBAC decisions**: Keep a record of why specific permissions are granted or denied to simplify future audits.

Configuring RBAC for Flux CD controllers is a critical step in securing your GitOps pipeline. By scoping permissions to only what each controller needs, you reduce the blast radius of potential security incidents and maintain a strong security posture in your Kubernetes clusters.
