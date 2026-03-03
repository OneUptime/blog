# How to Fix 'sync failed: one or more objects failed to apply' in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Sync

Description: Diagnose and resolve ArgoCD sync failures where one or more objects fail to apply, covering validation errors, immutable field changes, RBAC issues, and resource conflicts.

---

The "sync failed: one or more objects failed to apply" error in ArgoCD is a catch-all message that means the sync operation partially failed. Some resources in your application could not be applied to the cluster. The real challenge is finding out which specific resource failed and why.

The error usually appears as:

```text
one or more objects failed to apply, reason: <specific reason>
```

Or in the sync result:

```text
Sync Status:      Failed
Message:          one or more objects failed to apply
```

This guide walks through the systematic process of identifying the failing resource and fixing the underlying issue.

## Step 1: Identify the Failing Resource

The high-level error message does not tell you which resource failed. You need to dig deeper:

**Using the CLI:**

```bash
# Get detailed sync result
argocd app get my-app

# Look at the resource status for "SyncFailed" entries
argocd app resources my-app
```

The output will show each resource and its sync status:

```text
GROUP  KIND        NAMESPACE   NAME           STATUS  HEALTH   HOOK  MESSAGE
       ConfigMap   production  my-config      Synced  Healthy
apps   Deployment  production  my-app         SyncFailed
       Service     production  my-service     Synced  Healthy
```

**Using the UI:**

1. Open the application in ArgoCD UI
2. Click on the "Sync" tab
3. Expand the failed sync operation
4. Look for resources with red status icons
5. Click on the failed resource for the detailed error message

**Check the application controller logs:**

```bash
kubectl logs -n argocd deployment/argocd-application-controller | \
  grep "my-app" | grep -i "fail\|error" | tail -20
```

## Common Cause 1: Validation Errors

The Kubernetes API server rejected the resource because it violates the schema:

```text
error validating data: ValidationError(Deployment.spec.template.spec.containers[0]):
unknown field "imagepullpolicy" in io.k8s.api.core.v1.Container
```

**Fix by correcting the field name (case-sensitive):**

```yaml
# WRONG
containers:
  - name: app
    image: nginx:1.25
    imagepullpolicy: Always  # Wrong case!

# CORRECT
containers:
  - name: app
    image: nginx:1.25
    imagePullPolicy: Always  # Correct case
```

**Validate manifests before pushing:**

```bash
# Use kubectl dry-run to validate
kubectl apply --dry-run=server -f deployment.yaml

# Or use kubeconform for schema validation
kubeconform -strict deployment.yaml
```

## Common Cause 2: Immutable Field Changes

Some Kubernetes fields cannot be changed after creation:

```text
The Deployment "my-app" is invalid: spec.selector: Invalid value:
field is immutable
```

**Fields that are typically immutable:**
- `spec.selector` on Deployments and StatefulSets
- `spec.volumeClaimTemplates` on StatefulSets
- `spec.claimRef` on PersistentVolumes
- `metadata.name` and `metadata.namespace`

**Fix options:**

1. **Delete and recreate the resource:**

```bash
# Delete the resource manually
kubectl delete deployment my-app -n production

# Then sync again
argocd app sync my-app
```

2. **Use the Replace sync strategy:**

```yaml
syncPolicy:
  syncOptions:
    - Replace=true
```

**Warning:** Replace deletes and recreates the resource, causing downtime.

3. **Use a new name and gradually migrate:**

```yaml
# Rename the deployment
metadata:
  name: my-app-v2
```

## Common Cause 3: Insufficient RBAC Permissions

ArgoCD's service account might not have permission to create or update certain resources:

```text
error creating resource: deployments.apps is forbidden:
User "system:serviceaccount:argocd:argocd-application-controller"
cannot create resource "deployments" in API group "apps" in the namespace "production"
```

**Fix by granting the required permissions:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-application-controller
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
```

Or more granularly:

```yaml
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Common Cause 4: Namespace Does Not Exist

The target namespace for a resource does not exist:

```text
error creating resource: namespaces "production" not found
```

**Fix by using the CreateNamespace sync option:**

```yaml
spec:
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
```

Or create the namespace in your manifests with a sync wave to ensure it is created first:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
```

## Common Cause 5: Resource Quota Exceeded

The namespace has resource quotas that prevent the resource from being created:

```text
error creating resource: forbidden: exceeded quota: compute-resources,
requested: limits.cpu=4, used: limits.cpu=8, limited: limits.cpu=10
```

**Fix by either:**

1. Reducing resource requests/limits in your manifests
2. Increasing the ResourceQuota
3. Cleaning up unused resources in the namespace

```bash
# Check resource quota status
kubectl get resourcequota -n production
kubectl describe resourcequota compute-resources -n production
```

## Common Cause 6: Webhook Rejection

Admission webhooks (validating or mutating) might reject the resource:

```text
error creating resource: admission webhook "validate.example.com" denied the request:
resource does not comply with policy
```

**Identify the webhook:**

```bash
# List validating webhooks
kubectl get validatingwebhookconfigurations

# List mutating webhooks
kubectl get mutatingwebhookconfigurations
```

**Fix depends on the specific webhook policy.** Common fixes:
- Add required labels or annotations
- Set security contexts
- Add resource limits
- Fix container image sources

```yaml
# Example: OPA Gatekeeper requires specific labels
metadata:
  labels:
    app.kubernetes.io/name: my-app
    app.kubernetes.io/managed-by: argocd
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
      containers:
        - name: app
          securityContext:
            allowPrivilegeEscalation: false
```

## Common Cause 7: Conflict with Existing Resource

The resource exists but was not created by ArgoCD (or was created by a different application):

```text
error applying resource: the object has been modified; please apply your changes
to the latest version or use ServerSideApply
```

**Fix by using ServerSideApply:**

```yaml
syncPolicy:
  syncOptions:
    - ServerSideApply=true
```

Or force the sync:

```bash
argocd app sync my-app --force
```

## Common Cause 8: CRD Not Installed

Trying to apply a custom resource when the CRD does not exist:

```text
error applying resource: no matches for kind "Certificate" in version "cert-manager.io/v1"
```

**Fix by installing the CRD first using sync waves:**

```yaml
# CRD installation - wave -2
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
  name: certificates.cert-manager.io
spec:
  # ...

---
# Custom resource - wave 0 (default)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-cert
```

## Retrying After Fixing

After fixing the underlying issue:

```bash
# Retry the sync
argocd app sync my-app

# If the issue was in the manifests, push the fix to Git first
# then sync
argocd app sync my-app --retry-limit 3

# If you need to sync only the failed resources
argocd app sync my-app --resource apps:Deployment:my-app
```

## Enabling Automatic Retry

For transient failures, configure automatic retry:

```yaml
spec:
  syncPolicy:
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Summary

The "one or more objects failed to apply" error requires identifying which specific resource failed. Use `argocd app resources my-app` or the UI to find the failed resource, then check its detailed error message. Common causes include schema validation errors, immutable field changes, RBAC permission issues, missing namespaces, resource quota limits, and admission webhook rejections. Fix the specific issue, push to Git if it is a manifest problem, and retry the sync.
