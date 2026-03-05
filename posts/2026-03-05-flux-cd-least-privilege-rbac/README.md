# How to Configure Flux CD with Least Privilege RBAC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, RBAC, Least Privilege

Description: Learn how to implement the principle of least privilege for Flux CD by creating tightly scoped RBAC policies for each controller.

---

The principle of least privilege dictates that every component should have only the minimum permissions required to perform its function. By default, Flux CD controllers have broad permissions. This guide shows you how to strip those down to the absolute minimum needed for your specific use case.

## Why Least Privilege Matters for Flux CD

Flux controllers are powerful components that can create, modify, and delete Kubernetes resources. If a controller is compromised, its RBAC permissions define the blast radius. With cluster-admin, an attacker gains full control. With least privilege RBAC, the impact is limited to the specific resources the controller manages.

## Step 1: Audit Current Permissions

Start by understanding what permissions your Flux controllers currently have:

```bash
# List all ClusterRoleBindings for Flux controllers
kubectl get clusterrolebindings -o json | jq -r '.items[] | select(.subjects[]?.namespace=="flux-system") | .metadata.name + " -> " + .roleRef.name'

# Check the permissions of the kustomize-controller
kubectl describe clusterrole $(kubectl get clusterrolebinding -o json | jq -r '.items[] | select(.subjects[]?.name=="kustomize-controller") | .roleRef.name')

# List all resource types your Flux Kustomizations actually create
kubectl get kustomizations -A -o json | jq -r '.items[].status.inventory.entries[]?.id' | cut -d_ -f3 | sort -u
```

## Step 2: Create Minimal ClusterRole for Kustomize Controller

Based on the audit, create a ClusterRole with only the required permissions:

```yaml
# clusterrole-kustomize-least-privilege.yaml
# Minimal ClusterRole for kustomize-controller based on actual resource usage
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-kustomize-least-privilege
rules:
  # Core resources managed by kustomizations
  - apiGroups: [""]
    resources: ["configmaps", "secrets", "services", "serviceaccounts"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Workload resources
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Namespace reading (required for target namespace lookup)
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  # Events (required to record reconciliation events)
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
  # Flux CRD status updates
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations", "kustomizations/status", "kustomizations/finalizers"]
    verbs: ["get", "list", "watch", "update", "patch"]
  # Read sources from source-controller
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories", "ocirepositories", "buckets"]
    verbs: ["get", "list", "watch"]
  # Impersonation support (required for serviceAccountName)
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["impersonate"]
```

## Step 3: Create Minimal ClusterRole for Helm Controller

```yaml
# clusterrole-helm-least-privilege.yaml
# Minimal ClusterRole for helm-controller
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-helm-least-privilege
rules:
  # Core resources typically created by Helm charts
  - apiGroups: [""]
    resources: ["configmaps", "secrets", "services", "serviceaccounts", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Workload resources from Helm charts
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Namespace-scoped RBAC resources
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Namespace reading
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  # Events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
  # Flux CRDs
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases", "helmreleases/status", "helmreleases/finalizers"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["helmcharts", "helmcharts/status", "helmrepositories"]
    verbs: ["get", "list", "watch"]
  # Impersonation support
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["impersonate"]
```

## Step 4: Create Minimal ClusterRole for Source Controller

```yaml
# clusterrole-source-least-privilege.yaml
# Minimal ClusterRole for source-controller
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-source-least-privilege
rules:
  # Source CRD management
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Read secrets for source authentication
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch"]
  # Events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
```

## Step 5: Apply and Bind the ClusterRoles

```yaml
# clusterrolebindings-least-privilege.yaml
# Bind minimal ClusterRoles to Flux controller service accounts
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-kustomize-least-privilege
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-kustomize-least-privilege
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-helm-least-privilege
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-helm-least-privilege
subjects:
  - kind: ServiceAccount
    name: helm-controller
    namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-source-least-privilege
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-source-least-privilege
subjects:
  - kind: ServiceAccount
    name: source-controller
    namespace: flux-system
```

Apply and remove old bindings:

```bash
# Apply the least privilege RBAC
kubectl apply -f clusterrole-kustomize-least-privilege.yaml
kubectl apply -f clusterrole-helm-least-privilege.yaml
kubectl apply -f clusterrole-source-least-privilege.yaml
kubectl apply -f clusterrolebindings-least-privilege.yaml

# Remove the default broad ClusterRoleBindings
kubectl delete clusterrolebinding crd-controller-flux-system --ignore-not-found

# Verify the new bindings are active
kubectl get clusterrolebindings | grep flux

# Test reconciliation
flux reconcile kustomization flux-system
```

## Step 6: Validate Permissions

Use `kubectl auth can-i` to verify the controllers have only the expected permissions:

```bash
# Should return "yes" - controller needs this
kubectl auth can-i create deployments \
  --as=system:serviceaccount:flux-system:kustomize-controller

# Should return "no" - controller should not have this
kubectl auth can-i create clusterroles \
  --as=system:serviceaccount:flux-system:kustomize-controller

# Should return "no" - controller should not manage nodes
kubectl auth can-i get nodes \
  --as=system:serviceaccount:flux-system:kustomize-controller

# Should return "no" - controller should not delete namespaces
kubectl auth can-i delete namespaces \
  --as=system:serviceaccount:flux-system:kustomize-controller
```

## Iterative Approach

If you are unsure which permissions are needed, use an iterative approach:

1. Start with the minimal set above.
2. Trigger a full reconciliation.
3. Check controller logs for `Forbidden` errors.
4. Add the specific missing permission.
5. Repeat until reconciliation succeeds cleanly.

```bash
# Monitor for forbidden errors during reconciliation
kubectl logs -n flux-system deployment/kustomize-controller -f | grep -i forbidden
```

## Best Practices

1. **Audit before restricting**: Document what resources Flux currently manages before removing permissions.
2. **Use service account impersonation**: Combine least privilege controller RBAC with per-tenant service account impersonation for layered security.
3. **Avoid wildcards**: Never use `*` for verbs or resources in production RBAC rules.
4. **Separate cluster-scoped resources**: If Flux needs to manage cluster-scoped resources like Namespaces or ClusterRoles, create a separate, more carefully guarded ClusterRole.
5. **Review regularly**: As your workloads change, periodically audit and adjust RBAC rules.

Implementing least privilege RBAC for Flux CD significantly reduces the risk of unauthorized access and limits the blast radius of potential security incidents. It requires more upfront configuration but pays dividends in security posture.
