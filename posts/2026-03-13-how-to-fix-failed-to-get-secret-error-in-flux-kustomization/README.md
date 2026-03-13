# How to Fix failed to get secret Error in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Kustomization, RBAC, Secrets

Description: Learn how to diagnose and fix the "failed to get secret" error in Flux Kustomization resources caused by missing secrets or RBAC issues.

---

When working with Flux CD Kustomizations, you may encounter this error in the kustomize-controller logs or Kustomization status:

```
failed to get secret 'my-namespace/my-secret': secrets "my-secret" not found
```

or:

```
failed to get secret 'flux-system/git-credentials': secrets "git-credentials" is forbidden: User "system:serviceaccount:flux-system:kustomize-controller" cannot get resource "secrets" in API group "" in the namespace "flux-system"
```

This error means the Flux kustomize-controller cannot retrieve a Kubernetes secret it needs, either because the secret does not exist or because the controller lacks permissions to read it.

## Root Causes

### 1. Secret Does Not Exist

The most straightforward cause is that the referenced secret has not been created in the cluster. This commonly occurs after bootstrapping a new cluster or when secrets are managed outside of Flux and have not been applied yet.

### 2. Secret Is in the Wrong Namespace

The secret exists but is in a different namespace than what the Kustomization expects. Secret references in Flux are namespace-scoped.

### 3. RBAC Permissions Are Missing

The kustomize-controller service account does not have permission to read secrets in the target namespace. This can happen when custom RBAC policies restrict cross-namespace access.

### 4. Secret Was Deleted or Replaced

Another controller or process may have deleted the secret, or it was removed during a cluster operation such as namespace recreation.

## Diagnostic Steps

### Step 1: Check the Kustomization Status

```bash
flux get kustomizations -A
```

Identify the Kustomization reporting the error and note the secret name and namespace.

### Step 2: Verify the Secret Exists

```bash
kubectl get secret my-secret -n my-namespace
```

If the secret is not found, that confirms the cause.

### Step 3: Check RBAC Permissions

```bash
kubectl auth can-i get secrets \
  --as=system:serviceaccount:flux-system:kustomize-controller \
  -n my-namespace
```

If the response is `no`, RBAC is the issue.

### Step 4: Inspect Controller Logs

```bash
kubectl logs -n flux-system deploy/kustomize-controller | grep "failed to get secret"
```

## How to Fix

### Fix 1: Create the Missing Secret

If the secret does not exist, create it:

```bash
kubectl create secret generic my-secret \
  --namespace=my-namespace \
  --from-literal=username=admin \
  --from-literal=password=changeme
```

For Git repository credentials:

```bash
kubectl create secret generic git-credentials \
  --namespace=flux-system \
  --from-literal=username=git \
  --from-literal=password=ghp_xxxxxxxxxxxxxxxxxxxx
```

### Fix 2: Move the Secret to the Correct Namespace

If the secret is in the wrong namespace, recreate it in the correct one:

```bash
kubectl get secret my-secret -n wrong-namespace -o yaml | \
  sed 's/namespace: wrong-namespace/namespace: correct-namespace/' | \
  kubectl apply -f -
```

### Fix 3: Grant RBAC Permissions

Create a Role and RoleBinding to allow the kustomize-controller to read secrets in the target namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-secret-reader
  namespace: my-namespace
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-secret-reader-binding
  namespace: my-namespace
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
roleRef:
  kind: Role
  name: flux-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

Apply the RBAC resources:

```bash
kubectl apply -f flux-rbac.yaml
```

### Fix 4: Reconcile the Kustomization

After fixing the root cause, force reconciliation:

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

Manage secrets as part of your Flux repository using SOPS or Sealed Secrets so that they are always applied before other resources that depend on them. Use health checks in your Kustomizations to catch missing dependencies early. Consider using `dependsOn` in your Kustomization specs to ensure secrets are created before the resources that reference them.
