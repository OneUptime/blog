# How to Fix Rook Operator Pod CrashLoopBackOff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, Kubernetes, Operator

Description: Learn how to diagnose and fix Rook operator pod CrashLoopBackOff issues by inspecting logs, checking RBAC permissions, verifying CRDs, and resolving common configuration errors.

---

## Identifying the Problem

When the Rook operator pod enters CrashLoopBackOff, Ceph cluster management stops. New PVCs may fail to provision, and existing clusters may not recover from faults. Start by gathering diagnostic information:

```bash
# Check operator pod status
kubectl -n rook-ceph get pods -l app=rook-ceph-operator

# Get crash details
kubectl -n rook-ceph describe pod -l app=rook-ceph-operator

# View logs from the crashed container
kubectl -n rook-ceph logs -l app=rook-ceph-operator --previous
```

## Common Cause 1: Missing or Outdated CRDs

Rook requires specific CRDs to be installed. If you upgraded Rook but did not update the CRDs, the operator will crash:

```bash
# Check what CRDs are installed
kubectl get crd | grep ceph.rook.io

# Expected CRDs for Rook 1.13+
kubectl get crd cephclusters.ceph.rook.io
kubectl get crd cephblockpools.ceph.rook.io
kubectl get crd cephfilesystems.ceph.rook.io
kubectl get crd cephobjectstores.ceph.rook.io
```

If CRDs are missing or old, reinstall them:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/crds.yaml
```

## Common Cause 2: RBAC Permission Issues

The Rook operator needs ClusterRole and ClusterRoleBinding permissions. Check if they exist:

```bash
kubectl get clusterrole rook-ceph-global
kubectl get clusterrolebinding rook-ceph-global
kubectl get serviceaccount rook-ceph-operator -n rook-ceph
```

If missing, reapply the RBAC manifests:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/operator.yaml
```

## Common Cause 3: ConfigMap Conflict

A corrupted or conflicting operator ConfigMap can cause crashes. Inspect and recreate it:

```bash
kubectl -n rook-ceph get configmap rook-ceph-operator-config
kubectl -n rook-ceph describe configmap rook-ceph-operator-config
```

If the config is corrupted, delete it and redeploy the operator:

```bash
kubectl -n rook-ceph delete configmap rook-ceph-operator-config
kubectl apply -f operator.yaml
```

## Common Cause 4: Image Pull Failure

The operator pod may be referencing an unavailable image:

```bash
kubectl -n rook-ceph describe pod -l app=rook-ceph-operator | grep -A5 "Events:"
```

If you see `ImagePullBackOff` or `ErrImagePull`, verify the image tag is correct and accessible:

```bash
# Check which image is configured
kubectl -n rook-ceph get deploy rook-ceph-operator -o jsonpath='{.spec.template.spec.containers[0].image}'

# Test image pull manually
docker pull rook/ceph:v1.13.0
```

## Common Cause 5: Resource Constraints

If the node is under memory or CPU pressure, the operator pod may be OOMKilled:

```bash
# Check if OOMKilled
kubectl -n rook-ceph describe pod -l app=rook-ceph-operator | grep -i "oom\|killed\|reason"

# Check node resources
kubectl top node
```

Increase memory limits in the operator deployment:

```yaml
resources:
  requests:
    memory: "256Mi"
  limits:
    memory: "512Mi"
```

## Verify Operator is Running

After fixing the root cause, confirm the operator is healthy:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-operator
kubectl -n rook-ceph logs -l app=rook-ceph-operator --tail=50
```

Look for log lines like `"starting manager"` and `"watching all namespaces"` to confirm normal operation.

## Summary

Fixing Rook operator CrashLoopBackOff involves checking logs for the specific error, verifying CRDs are installed and up-to-date, confirming RBAC permissions are correct, inspecting ConfigMap integrity, and ensuring the operator image is accessible and the node has sufficient resources. Most crashes are caused by CRD version mismatches after upgrades or missing RBAC resources from incomplete deployments.
