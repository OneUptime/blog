# How to Fix Helm Controller Disk Space Exhaustion in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Helm Controller, Disk Space, Helm, Storage

Description: Learn how to diagnose and fix disk space exhaustion in the Flux Helm Controller caused by release secret accumulation, temporary chart rendering files, and storage misconfiguration.

---

The Helm Controller consumes disk space during chart rendering, template processing, and temporary file creation. While the Helm Controller primarily stores release metadata as Kubernetes secrets rather than on disk, it still uses local storage for chart downloads, template rendering, and temporary files. When disk space is exhausted, Helm operations fail and new releases cannot be installed or upgraded. This guide covers how to diagnose and fix disk space exhaustion in the Helm Controller.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Permissions to view pods, secrets, and execute commands in the flux-system namespace

## Step 1: Confirm Disk Space Exhaustion

Check the Helm Controller logs for disk-related errors:

```bash
kubectl logs -n flux-system deploy/helm-controller | grep -i "disk\|space\|no space\|ENOSPC\|storage"
```

Check pod events for eviction:

```bash
kubectl describe pod -n flux-system -l app=helm-controller | grep -A 5 "Events\|Reason\|evict"
```

Check ephemeral storage usage:

```bash
kubectl exec -n flux-system deploy/helm-controller -- df -h /tmp
kubectl exec -n flux-system deploy/helm-controller -- df -h /
```

## Step 2: Check Disk Usage Details

Examine what is consuming disk space:

```bash
kubectl exec -n flux-system deploy/helm-controller -- du -sh /tmp/*
```

Check for leftover temporary directories from chart rendering:

```bash
kubectl exec -n flux-system deploy/helm-controller -- find /tmp -type d -name "helm-*" | wc -l
```

## Step 3: Identify Causes

### Temporary Files Not Being Cleaned Up

During chart rendering, the Helm Controller creates temporary directories. If rendering fails or the controller is interrupted, these directories may not be cleaned up:

```bash
kubectl exec -n flux-system deploy/helm-controller -- ls -la /tmp/ | head -30
```

### Large Helm Charts

Charts with many templates, large embedded files, or extensive CRDs consume more disk space during rendering:

```bash
flux get helmreleases --all-namespaces
```

Identify which charts are the largest by checking chart sizes in the Source Controller:

```bash
kubectl exec -n flux-system deploy/source-controller -- du -sh /data/helmchart/*
```

### Many Simultaneous Reconciliations

When many HelmReleases are being reconciled concurrently, each one creates temporary files. High concurrency multiplies disk usage:

```bash
kubectl get deploy helm-controller -n flux-system -o jsonpath='{.spec.template.spec.containers[0].args}'
```

### Release Secrets Consuming etcd Space

While Helm release secrets are stored in etcd rather than on controller disk, an excessive number of secrets can cause etcd storage issues that manifest as Helm Controller failures:

```bash
kubectl get secrets --all-namespaces -l owner=helm --no-headers | wc -l
```

Check the total size of release secrets for a specific release:

```bash
kubectl get secrets -n <namespace> -l name=<release-name>,owner=helm -o json | wc -c
```

## Step 4: Clean Up Disk Space

### Restart the Controller

The simplest way to clean up temporary files is to restart the controller pod:

```bash
kubectl rollout restart deployment/helm-controller -n flux-system
```

### Clean Up Stale Release Secrets

Remove old release revisions across all namespaces. First, identify releases with many revisions:

```bash
kubectl get secrets --all-namespaces -l owner=helm -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.labels.name}{"\n"}{end}' | sort | uniq -c | sort -rn | head -20
```

For releases with excessive revisions, delete old ones:

```bash
# Keep only the last 3 revisions for a release
NAMESPACE=default
RELEASE=my-app
kubectl get secrets -n $NAMESPACE -l name=$RELEASE,owner=helm --sort-by=.metadata.creationTimestamp -o name | head -n -3 | xargs kubectl delete -n $NAMESPACE
```

### Set maxHistory on HelmReleases

Prevent future accumulation by setting `maxHistory` on all HelmReleases:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
spec:
  maxHistory: 3
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-charts
```

## Step 5: Adjust Storage Configuration

### Increase Ephemeral Storage Limits

If the controller uses ephemeral storage, increase the limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
      - name: manager
        resources:
          limits:
            ephemeral-storage: 2Gi
          requests:
            ephemeral-storage: 500Mi
```

Apply this with kustomize:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/resources/limits/ephemeral-storage
        value: 2Gi
      - op: add
        path: /spec/template/spec/containers/0/resources/requests/ephemeral-storage
        value: 500Mi
```

### Reduce Concurrency

Lower the number of concurrent operations to reduce peak disk usage:

```bash
kubectl patch deployment helm-controller -n flux-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--concurrent=3"}]'
```

### Mount a Dedicated Temporary Volume

For clusters with constrained node storage, mount a dedicated volume for temporary files:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
      - name: manager
        volumeMounts:
        - name: temp
          mountPath: /tmp
      volumes:
      - name: temp
        emptyDir:
          sizeLimit: 2Gi
```

## Step 6: Verify the Fix

After making changes, verify the controller is healthy:

```bash
kubectl rollout status deployment/helm-controller -n flux-system
```

Check that HelmReleases are reconciling:

```bash
flux get helmreleases --all-namespaces
```

Monitor disk usage:

```bash
kubectl exec -n flux-system deploy/helm-controller -- df -h /tmp
```

## Prevention Tips

- Always set `maxHistory` on HelmRelease resources to limit release secret accumulation
- Monitor ephemeral storage usage on Flux controller pods
- Set appropriate ephemeral storage resource limits
- Periodically audit and clean up stale Helm release secrets
- Keep chart sizes manageable by splitting large umbrella charts
- Set up alerts for disk usage exceeding 80% on controller pods
- Reduce concurrency if many HelmReleases are reconciling simultaneously
- Use cleanup hooks in Helm charts to remove temporary resources

## Summary

Helm Controller disk space exhaustion is typically caused by accumulated temporary files from chart rendering, excessive release secret history, high concurrency during reconciliation, or insufficient ephemeral storage limits. Setting `maxHistory` on HelmReleases, cleaning up stale secrets, reducing concurrency, and properly sizing storage limits are the most effective remediation and prevention strategies.
