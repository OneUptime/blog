# How to Fix Flux Reconciliation After Manual kubectl Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, Drift, kubectl

Description: Restore Flux reconciliation to a clean state after manual kubectl changes have introduced drift between the cluster and your Git repository.

---

Manual `kubectl` edits are sometimes necessary for emergency fixes, but they create drift between your cluster state and your Git-declared state. When Flux reconciles, it may conflict with those manual changes, fail to apply, or overwrite your emergency fixes. This post covers how to handle the aftermath of manual changes and get Flux back in control.

## Symptoms

After someone runs `kubectl edit`, `kubectl apply`, or `kubectl patch` on a Flux-managed resource, you may see:

- Flux overwriting the manual change on the next reconciliation cycle
- Flux failing with conflict errors when trying to apply
- Resources oscillating between the manual state and the Git state

```bash
flux get kustomizations
```

```
NAME        REVISION              SUSPENDED   READY   MESSAGE
my-app      main@sha1:abc123      False       False   Apply failed: conflict with field manager kubectl-client-side-apply
```

## Diagnostic Commands

### Check for drift between Git and cluster

```bash
flux diff kustomization my-app --path ./path/to/app/
```

### Identify manually modified resources

```bash
kubectl get deployment my-app -n production -o jsonpath='{.metadata.managedFields}' | jq '.[] | select(.manager != "kustomize-controller")'
```

### Check which field managers have modified the resource

```bash
kubectl get deployment my-app -n production -o jsonpath='{.metadata.managedFields[*].manager}'
```

### Review Flux controller logs for conflicts

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep "conflict"
```

## Common Root Causes

### 1. Emergency kubectl apply or edit

Someone applied a hotfix directly to the cluster without updating Git. The next Flux reconciliation tries to revert the change.

### 2. Field manager conflicts

Server-side apply tracks which field manager owns each field. When kubectl and Flux both modify the same field, conflicts arise.

### 3. kubectl scale or autoscaler changes

Manually scaling a deployment or having an HPA modify replicas conflicts with the replica count in Git.

### 4. Annotation or label modifications

Adding annotations or labels via kubectl that are also defined in Git manifests causes conflicts on every reconciliation.

## Step-by-Step Fixes

### Fix 1: Commit the manual change to Git

The cleanest solution is to update Git to match what you applied manually. This makes Flux and the cluster agree:

```bash
# Check what the current cluster state looks like
kubectl get deployment my-app -n production -o yaml > current-state.yaml
# Update your Git manifests to match
# Commit and push
git add . && git commit -m "Apply emergency fix for my-app" && git push
```

Then reconcile:

```bash
flux reconcile kustomization my-app --with-source
```

### Fix 2: Force Flux to overwrite manual changes

If the manual change was temporary and you want to revert to the Git state:

```bash
flux reconcile kustomization my-app --with-source --force
```

Or use the `force` spec option:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  force: true  # Overwrite field manager conflicts
```

After Flux has reconciled successfully, remove the `force: true` setting.

### Fix 3: Resolve field manager conflicts

If server-side apply conflicts are the issue, you can transfer field ownership to Flux:

```bash
kubectl apply --server-side --field-manager=kustomize-controller --force-conflicts -f <(kustomize build ./path/to/app/)
```

Or set `force: true` on the Kustomization temporarily to let Flux claim the fields.

### Fix 4: Suspend Flux before making manual changes

If you need to make manual changes and keep them temporarily, suspend reconciliation first:

```bash
flux suspend kustomization my-app
```

Make your changes:

```bash
kubectl edit deployment my-app -n production
```

When ready to hand control back to Flux, update Git to reflect the desired final state and resume:

```bash
flux resume kustomization my-app
```

### Fix 5: Exclude fields from Flux management

If certain fields should always be managed manually (like replica count managed by HPA), remove them from your Git manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  # Do NOT set replicas here if HPA manages it
  # replicas: 3
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:v1.0
```

## Prevention Strategies

1. **Establish a no-kubectl-apply policy** for Flux-managed resources. All changes should go through Git.
2. **Use Flux suspend/resume** for legitimate emergency interventions:

```bash
# Before emergency changes
flux suspend kustomization my-app

# After changes, update Git, then resume
flux resume kustomization my-app
```

3. **Set up policy enforcement** with OPA Gatekeeper or Kyverno to prevent direct modifications to Flux-managed resources:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: prevent-direct-changes
spec:
  validationFailureAction: Enforce
  rules:
    - name: block-non-flux-changes
      match:
        any:
          - resources:
              namespaces:
                - production
      preconditions:
        all:
          - key: "{{request.userInfo.username}}"
            operator: NotEquals
            value: "system:serviceaccount:flux-system:kustomize-controller"
      validate:
        message: "Direct changes to production are not allowed. Use GitOps."
        deny: {}
```

4. **Monitor drift** with regular `flux diff` checks and alert when cluster state diverges from Git.
5. **Document the emergency procedure** so that team members know to suspend Flux before making manual changes and to commit changes to Git afterward.

Manual kubectl changes are the most common source of GitOps drift. Having clear procedures for emergency changes and policy enforcement prevents most reconciliation conflicts.
