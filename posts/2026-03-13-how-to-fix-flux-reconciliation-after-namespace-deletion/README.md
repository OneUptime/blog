# How to Fix Flux Reconciliation After Namespace Deletion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, Namespace, Recovery

Description: Recover Flux reconciliation after a namespace containing managed resources is accidentally or intentionally deleted, including handling stuck finalizers and inventory cleanup.

---

Deleting a namespace that contains Flux-managed resources causes significant disruption. All resources in that namespace are gone, the Flux inventory becomes stale, and reconciliation may fail or get stuck trying to prune resources that no longer exist. This post covers the full recovery process.

## Symptoms

After a namespace is deleted, Flux may show various error states:

```bash
flux get kustomizations
```

```
NAME        REVISION              SUSPENDED   READY   MESSAGE
my-app      main@sha1:abc123      False       False   namespace "production" not found
```

Or the Kustomization may succeed but report that it cannot find resources to prune:

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep "prune"
```

## Diagnostic Commands

### Verify the namespace is gone

```bash
kubectl get namespace production
```

### Check if the namespace is stuck in Terminating

```bash
kubectl get namespace production -o jsonpath='{.status.phase}'
kubectl get namespace production -o jsonpath='{.spec.finalizers}'
```

### Check the Flux inventory for resources in the deleted namespace

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.inventory.entries}' | jq '.[] | select(.v | contains("production"))'
```

### Look for orphaned resources

```bash
kubectl api-resources --verbs=list --namespaced -o name | while read resource; do
  kubectl get $resource -n production 2>/dev/null
done
```

## Common Root Causes

### 1. Accidental namespace deletion

Someone ran `kubectl delete namespace production` without realizing it contained Flux-managed resources.

### 2. Namespace stuck in Terminating state

The namespace deletion hangs due to finalizers on resources within it, preventing recreation.

### 3. Flux prune enabled with stale inventory

With `prune: true`, Flux tries to manage the lifecycle of resources in its inventory. When the namespace disappears, Flux cannot prune those resources and may error out.

### 4. Namespace recreated without labels or annotations

The namespace is recreated but missing required labels, annotations, or resource quotas that other resources depend on.

## Step-by-Step Fixes

### Fix 1: Let Flux recreate the namespace

If the namespace is defined in your Git repository, Flux should recreate it on the next reconciliation. Force reconciliation:

```bash
flux reconcile kustomization my-app --with-source
```

Ensure your Git repository includes the namespace definition:

```yaml
# namespaces/production.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
```

### Fix 2: Handle a namespace stuck in Terminating

If the namespace is stuck in `Terminating` state:

```bash
kubectl get namespace production -o json | jq '.spec.finalizers = []' | kubectl replace --raw "/api/v1/namespaces/production/finalize" -f -
```

Wait for it to be fully deleted, then trigger Flux reconciliation:

```bash
flux reconcile kustomization my-app --with-source
```

### Fix 3: Clean up the Flux inventory

If the inventory references resources in the deleted namespace that cannot be pruned, you may need to reset the inventory. Suspend the Kustomization, clear the inventory, and resume:

```bash
flux suspend kustomization my-app
```

Edit the Kustomization to remove stale inventory entries:

```bash
kubectl patch kustomization my-app -n flux-system --type=json -p='[{"op": "remove", "path": "/status/inventory"}]'
```

Resume and let Flux rebuild the inventory:

```bash
flux resume kustomization my-app
flux reconcile kustomization my-app --with-source
```

### Fix 4: Recreate the namespace manually first

If Flux cannot create the namespace because it fails before reaching that step:

```bash
kubectl create namespace production
```

Then let Flux reconcile to apply all resources:

```bash
flux reconcile kustomization my-app --with-source
```

### Fix 5: Handle dependent resources

If other Kustomizations depend on resources in the deleted namespace, they will also fail. Fix them in dependency order:

```bash
# First, reconcile the infrastructure that creates the namespace
flux reconcile kustomization infra --with-source

# Then reconcile the apps that deploy into it
flux reconcile kustomization apps --with-source
```

## Prevention Strategies

1. **Protect namespaces with RBAC** to prevent accidental deletion:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deny-namespace-deletion
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["delete"]
    resourceNames: ["production", "staging"]
```

Bind this role with a deny policy using an admission controller.

2. **Use Kyverno or OPA Gatekeeper** to prevent deletion of critical namespaces:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: protect-namespaces
spec:
  validationFailureAction: Enforce
  rules:
    - name: block-namespace-deletion
      match:
        any:
          - resources:
              kinds:
                - Namespace
              selector:
                matchLabels:
                  protected: "true"
      validate:
        message: "This namespace is protected and cannot be deleted."
        deny:
          conditions:
            any:
              - key: "{{request.operation}}"
                operator: Equals
                value: DELETE
```

3. **Separate namespace creation** into its own Kustomization at the infrastructure layer so namespaces are created first and independently.
4. **Back up namespace metadata** so you can quickly recreate namespaces with the correct labels and annotations.
5. **Monitor namespace existence** and alert immediately when a managed namespace disappears.

Namespace deletion is one of the more disruptive events in a Flux-managed cluster. Protecting critical namespaces with admission policies and having a clear recovery runbook minimizes downtime.
