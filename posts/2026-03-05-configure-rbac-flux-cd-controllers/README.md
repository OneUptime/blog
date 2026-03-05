# How to Configure RBAC for Flux CD Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, RBAC, Access Control

Description: Learn how to configure Role-Based Access Control (RBAC) for Flux CD controllers to secure your GitOps pipeline with granular permissions.

---

Flux CD deploys several controllers into your Kubernetes cluster, each responsible for different reconciliation tasks. By default, these controllers run with broad permissions. In production environments, you should configure RBAC to limit what each controller can do, following the principle of least privilege.

This guide walks you through configuring RBAC for Flux CD controllers, including creating custom ClusterRoles, ClusterRoleBindings, and scoping permissions per controller.

## Understanding Flux CD Controllers

Flux CD installs the following controllers, each with its own service account:

- **source-controller**: Manages GitRepository, HelmRepository, OCIRepository, and Bucket sources.
- **kustomize-controller**: Reconciles Kustomization resources and applies manifests.
- **helm-controller**: Reconciles HelmRelease resources.
- **notification-controller**: Handles alerts and webhook receivers.
- **image-reflector-controller**: Scans container registries for new image tags.
- **image-automation-controller**: Commits image updates back to Git.

Each controller has a corresponding service account in the `flux-system` namespace.

## Viewing Default RBAC

Before customizing RBAC, inspect the existing roles and bindings that Flux installs.

```bash
# List all ClusterRoles related to Flux
kubectl get clusterroles | grep flux

# List all ClusterRoleBindings related to Flux
kubectl get clusterrolebindings | grep flux

# Inspect a specific ClusterRole
kubectl describe clusterrole kustomize-controller
```

## Creating a Custom ClusterRole for Kustomize Controller

The kustomize-controller is the most powerful controller because it applies arbitrary Kubernetes manifests. You should restrict what resource types it can manage.

The following ClusterRole limits the kustomize-controller to managing only Deployments, Services, ConfigMaps, and Secrets:

```yaml
# clusterrole-kustomize-restricted.yaml
# Restricts kustomize-controller to only manage common workload resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-kustomize-restricted
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
  # Allow reading namespaces (required for reconciliation)
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  # Allow managing Flux Kustomization status
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations", "kustomizations/status"]
    verbs: ["get", "list", "watch", "update", "patch"]
```

## Binding the ClusterRole to the Controller Service Account

Create a ClusterRoleBinding that associates the restricted ClusterRole with the kustomize-controller service account:

```yaml
# clusterrolebinding-kustomize-restricted.yaml
# Binds the restricted ClusterRole to the kustomize-controller service account
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-kustomize-restricted
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-kustomize-restricted
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
```

## Creating a ClusterRole for Helm Controller

The helm-controller needs permissions to manage Helm releases and the resources they create:

```yaml
# clusterrole-helm-restricted.yaml
# Restricts helm-controller to manage Helm-related resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-helm-restricted
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
  # Allow managing HelmRelease status
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases", "helmreleases/status"]
    verbs: ["get", "list", "watch", "update", "patch"]
  # Allow reading HelmCharts from source-controller
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["helmcharts", "helmcharts/status"]
    verbs: ["get", "list", "watch"]
```

## Creating a ClusterRole for Source Controller

The source-controller needs minimal cluster-level permissions since it primarily manages its own CRDs:

```yaml
# clusterrole-source-restricted.yaml
# Restricts source-controller to managing source CRDs only
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-source-restricted
rules:
  # Allow managing all source CRDs
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow reading secrets for authentication
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch"]
  # Allow reading namespaces
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  # Allow creating events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
```

## Applying the Custom RBAC Configuration

Apply the custom RBAC resources and remove the default broad permissions:

```bash
# Apply the custom ClusterRoles and ClusterRoleBindings
kubectl apply -f clusterrole-kustomize-restricted.yaml
kubectl apply -f clusterrolebinding-kustomize-restricted.yaml
kubectl apply -f clusterrole-helm-restricted.yaml
kubectl apply -f clusterrole-source-restricted.yaml

# Remove the default cluster-admin binding if it exists
kubectl delete clusterrolebinding flux-kustomize-controller --ignore-not-found
kubectl delete clusterrolebinding flux-helm-controller --ignore-not-found

# Verify the new bindings
kubectl get clusterrolebindings | grep flux
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
kubectl auth can-i create deployments --as=system:serviceaccount:flux-system:kustomize-controller
kubectl auth can-i create clusterroles --as=system:serviceaccount:flux-system:kustomize-controller
```

## Best Practices

1. **Start permissive, then restrict**: Begin with Flux's default RBAC and progressively tighten permissions as you understand what each controller needs.
2. **Use namespace-scoped Roles where possible**: If Flux only manages resources in specific namespaces, use Role and RoleBinding instead of ClusterRole and ClusterRoleBinding.
3. **Audit regularly**: Periodically review RBAC configurations and controller logs to identify unnecessary permissions.
4. **Use service account impersonation**: Pair RBAC restrictions with service account impersonation in Kustomization and HelmRelease resources for fine-grained, per-tenant access control.
5. **Document your RBAC decisions**: Keep a record of why specific permissions are granted or denied to simplify future audits.

Configuring RBAC for Flux CD controllers is a critical step in securing your GitOps pipeline. By scoping permissions to only what each controller needs, you reduce the blast radius of potential security incidents and maintain a strong security posture in your Kubernetes clusters.
