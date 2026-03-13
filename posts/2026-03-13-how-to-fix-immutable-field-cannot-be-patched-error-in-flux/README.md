# How to Fix immutable field cannot be patched Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Immutable Fields, Server-Side Apply

Description: Learn how to diagnose and fix the "immutable field cannot be patched" error in Flux when Kubernetes prevents changes to fields that cannot be updated in place.

---

When Flux attempts to update a resource, you may see:

```
kustomize controller: failed to reconcile kustomization 'flux-system/my-app': The Job "my-job" is invalid: spec.template: Invalid value: core.PodTemplateSpec{...}: field is immutable
```

or:

```
failed to update resource: admission webhook denied the request: spec.selector: Invalid value: field is immutable after creation
```

This error occurs when Flux tries to apply changes to a Kubernetes resource field that cannot be modified after the resource has been created. Certain fields in Kubernetes resources are immutable by design.

## Root Causes

### 1. Changing Immutable Fields in Manifests

Certain resource fields are immutable after creation. The most common examples are:

- `spec.selector` on Deployments
- `spec.template` on Jobs
- `spec.clusterIP` on Services
- `spec.volumeClaimTemplates` on StatefulSets
- `spec.storageClassName` on PersistentVolumeClaims

### 2. Label Selector Changes

Changing the `matchLabels` selector on a Deployment or StatefulSet triggers this error because Kubernetes does not allow selector changes after creation.

### 3. Job Spec Changes

Jobs are largely immutable once created. Any change to the Job spec will result in this error.

### 4. Service Type Changes

Changing a Service from ClusterIP to NodePort or LoadBalancer may fail if the `clusterIP` field is set.

## Diagnostic Steps

### Step 1: Identify the Failing Resource

```bash
flux get kustomizations -A
```

Check the status message for the specific resource and field causing the error.

### Step 2: Compare Desired vs. Actual State

```bash
kubectl get job my-job -n default -o yaml > actual.yaml
```

Compare with the manifest in your Git repository to identify which field changed.

### Step 3: Check Controller Logs

```bash
kubectl logs -n flux-system deploy/kustomize-controller --since=5m | grep "immutable"
```

## How to Fix

### Fix 1: Use Replace Strategy for Jobs

For resources like Jobs that are largely immutable, configure Flux to delete and recreate them when changes are detected by using the `Replace` force strategy:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  force: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Setting `force: true` tells Flux to delete and recreate resources that cannot be patched. Use this carefully as it causes downtime for the affected resources.

### Fix 2: Delete the Resource and Let Flux Recreate It

Manually delete the resource so Flux can create it fresh with the new spec:

```bash
kubectl delete job my-job -n default
flux reconcile kustomization my-app
```

### Fix 3: Revert the Immutable Field Change

If the field change was unintentional, revert it in your Git repository to match the current cluster state.

### Fix 4: Use a Different Resource Name

For Jobs and similar resources, use a unique name that includes a version or hash:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-job-v2
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: worker
          image: my-image:v2
      restartPolicy: Never
```

### Fix 5: Use Helm for Complex Lifecycle Management

For resources with complex update patterns, use HelmReleases which have built-in support for handling immutable field changes:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
  upgrade:
    force: true
```

The `upgrade.force` option in HelmRelease causes Helm to delete and recreate resources when an upgrade fails due to immutable fields.

## Prevention

Avoid changing immutable fields on Kubernetes resources unless you intend to recreate them. Use naming conventions that include versions or hashes for resources that need to be replaced rather than updated. Document which fields are immutable for the resource types used in your cluster. Consider using `force: true` on Kustomizations that manage resources with frequently changing immutable fields, such as Jobs or CronJobs.
