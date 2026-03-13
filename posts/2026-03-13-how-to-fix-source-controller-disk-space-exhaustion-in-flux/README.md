# How to Fix Source Controller Disk Space Exhaustion in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Source Controller, Disk Space, Storage, Persistent Volumes

Description: Learn how to diagnose and fix disk space exhaustion in the Flux Source Controller caused by artifact accumulation, large repositories, and storage misconfiguration.

---

The Source Controller stores fetched artifacts such as Git repository tarballs, Helm chart archives, and OCI artifacts on local storage. Over time, these artifacts can consume all available disk space, causing the controller to fail when fetching or storing new artifacts. This guide explains how to diagnose and fix disk space exhaustion in the Source Controller.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Permissions to view pods, persistent volumes, and execute commands in the flux-system namespace

## Step 1: Confirm Disk Space Exhaustion

Check the Source Controller logs for disk-related errors:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "disk\|space\|no space\|storage\|quota\|ENOSPC"
```

If you see errors containing `no space left on device` or `ENOSPC`, the storage is full.

Check the pod status for eviction events:

```bash
kubectl describe pod -n flux-system -l app=source-controller | grep -A 3 "Reason\|Message"
```

Pods can be evicted when ephemeral storage limits are exceeded.

## Step 2: Check Current Disk Usage

If the Source Controller uses a PersistentVolumeClaim, check its status:

```bash
kubectl get pvc -n flux-system
```

Exec into the controller pod to check actual disk usage:

```bash
kubectl exec -n flux-system deploy/source-controller -- df -h /data
```

List the largest files and directories:

```bash
kubectl exec -n flux-system deploy/source-controller -- du -sh /data/*
```

For a more detailed breakdown:

```bash
kubectl exec -n flux-system deploy/source-controller -- find /data -type f -size +10M -exec ls -lh {} \;
```

## Step 3: Identify Causes of Disk Exhaustion

### Large Git Repositories

Git repositories with large binary files, extensive history, or many branches can consume significant disk space:

```bash
kubectl get gitrepositories --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.url}{"\n"}{end}'
```

Use the `ignore` field to exclude large files not needed for deployment:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/myrepo
  ref:
    branch: main
  ignore: |
    # Exclude non-deployment files
    /docs/
    /tests/
    /examples/
    *.md
    *.png
    *.jpg
```

### Old Artifact Versions Not Being Cleaned Up

The Source Controller should clean up old artifact versions, but in some cases old versions persist:

```bash
kubectl exec -n flux-system deploy/source-controller -- ls -la /data/
```

Check if garbage collection is working:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "garbage\|cleanup\|artifact.*deleted"
```

### Large Helm Repository Index Files

Traditional Helm repositories serve an index.yaml file that lists all available charts and versions. Popular repositories can have index files that are hundreds of megabytes:

```bash
kubectl get helmrepositories --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.type}{"\t"}{.spec.url}{"\n"}{end}'
```

Switch to OCI-based Helm repositories to avoid downloading large index files:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  type: oci
  url: oci://registry-1.docker.io/bitnamicharts
  interval: 10m
```

### Many Source Resources

Having a large number of GitRepository, HelmRepository, HelmChart, or OCIRepository resources means more artifacts are stored simultaneously:

```bash
echo "GitRepositories: $(kubectl get gitrepositories --all-namespaces --no-headers | wc -l)"
echo "HelmRepositories: $(kubectl get helmrepositories --all-namespaces --no-headers | wc -l)"
echo "HelmCharts: $(kubectl get helmcharts --all-namespaces --no-headers | wc -l)"
echo "OCIRepositories: $(kubectl get ocirepositories --all-namespaces --no-headers | wc -l)"
```

## Step 4: Free Up Disk Space

### Delete Unused Sources

Remove source resources that are no longer needed:

```bash
flux get sources all --all-namespaces
```

Delete unused sources:

```bash
flux delete source git <name> -n <namespace>
flux delete source helm <name> -n <namespace>
```

### Force Artifact Cleanup

Restart the Source Controller to trigger garbage collection:

```bash
kubectl rollout restart deployment/source-controller -n flux-system
```

### Manually Clean Up Artifacts

If the pod cannot start due to disk pressure, you may need to clean up manually. If using emptyDir, deleting the pod will clear the storage:

```bash
kubectl delete pod -n flux-system -l app=source-controller
```

If using a PVC, you may need to exec into the pod and manually remove old artifacts:

```bash
kubectl exec -n flux-system deploy/source-controller -- rm -rf /data/old-artifact-directory
```

## Step 5: Increase Storage Capacity

### For PersistentVolumeClaims

If your storage class supports volume expansion, increase the PVC size:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: source-controller
  namespace: flux-system
spec:
  resources:
    requests:
      storage: 10Gi
```

Check if the storage class allows expansion:

```bash
kubectl get storageclass -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.allowVolumeExpansion}{"\n"}{end}'
```

### For EmptyDir Volumes

If the Source Controller uses emptyDir, increase the size limit:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      volumes:
      - name: data
        emptyDir:
          sizeLimit: 5Gi
```

Also ensure the ephemeral storage limits on the container are sufficient:

```yaml
resources:
  limits:
    ephemeral-storage: 5Gi
  requests:
    ephemeral-storage: 1Gi
```

## Step 6: Verify the Fix

After making changes, verify the controller is healthy:

```bash
kubectl rollout status deployment/source-controller -n flux-system
kubectl logs -n flux-system deploy/source-controller --tail=50
```

Check that sources are being reconciled:

```bash
flux get sources all --all-namespaces
```

## Prevention Tips

- Monitor disk usage on the Source Controller storage using Prometheus node exporter or kubelet metrics
- Set up alerts when disk usage exceeds 80% of capacity
- Use OCI-based Helm repositories instead of traditional index-based ones
- Exclude unnecessary files from Git sources using the `ignore` field
- Regularly audit and remove unused source resources
- Set appropriate storage sizes based on the number and size of sources
- Use `ephemeral-storage` resource limits to prevent the controller from consuming excessive node storage
- Keep repositories lean by avoiding committing large binary files

## Summary

Source Controller disk space exhaustion is caused by accumulated artifacts, large Git repositories, oversized Helm repository index files, or insufficient storage allocation. Switching to OCI Helm repositories, excluding unnecessary files from Git sources, cleaning up unused resources, and properly sizing storage volumes are the most effective remediation and prevention strategies.
