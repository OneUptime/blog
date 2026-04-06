# How to Troubleshoot Failed ObjectBucketClaims in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ObjectBucketClaim, Troubleshooting, Kubernetes, S3

Description: A systematic guide to diagnosing and resolving ObjectBucketClaim failures in Rook-Ceph, covering common error patterns and their fixes.

---

## Overview

ObjectBucketClaims (OBCs) can fail to provision for a variety of reasons - from misconfigured StorageClasses to Ceph RGW being unavailable. When an OBC stays in `Pending` or transitions to a failed state, you need a systematic approach to identify and fix the root cause. This guide covers the most common failure patterns and their remediation steps.

## Step 1: Check OBC Phase

```bash
kubectl get obc -n my-app
kubectl describe obc my-bucket -n my-app
```

Look for events at the bottom of the `describe` output:

```yaml
Events:
  Type     Reason       Age   From                              Message
  ----     ------       ----  ----                              -------
  Warning  Provisioning 2m    rook-ceph.ceph.rook.io/bucket    Failed to provision bucket: ...
```

## Step 2: Inspect the Operator Logs

Most provisioning errors are logged by the Rook operator:

```bash
kubectl logs -n rook-ceph deploy/rook-ceph-operator --tail=100 | grep -i "obc\|objectbucket\|bucket\|error"
```

## Common Failure: StorageClass Not Found

```yaml
Error: StorageClass "rook-ceph-bucket" not found
```

Fix:

```bash
# List available StorageClasses
kubectl get storageclass

# Check the provisioner annotation
kubectl get storageclass rook-ceph-bucket -o yaml | grep provisioner
```

Ensure the provisioner matches `rook-ceph.ceph.rook.io/bucket`.

## Common Failure: Object Store Not Ready

```yaml
Error: CephObjectStore my-store not found or not ready
```

Fix:

```bash
# Check the object store status
kubectl get cephobjectstore -n rook-ceph my-store

# Check RGW pods
kubectl get pods -n rook-ceph -l app=rook-ceph-rgw
```

If RGW pods are not running:

```bash
kubectl describe cephobjectstore -n rook-ceph my-store
kubectl logs -n rook-ceph -l app=rook-ceph-rgw --tail=50
```

## Common Failure: Quota Exceeded

```yaml
Error: bucket quota exceeded
```

Fix:

```bash
# Check Ceph cluster capacity
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- ceph df

# Check user quotas
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin quota get --quota-scope=user --uid=<rgw-user>
```

## Common Failure: RBAC Issues

If the Rook operator lacks permissions:

```bash
# Check operator RBAC
kubectl get clusterrolebinding | grep rook

# Check service account
kubectl get sa -n rook-ceph rook-ceph-operator
```

## Common Failure: Namespace Mismatch

The OBC must be in the same namespace as the consuming application. If the provisioner creates the Secret in the wrong namespace:

```bash
# Verify Secret exists in the right namespace
kubectl get secret my-bucket -n my-app

# If missing, check the OBC namespace
kubectl get obc -A | grep my-bucket
```

## Debugging with radosgw-admin

Verify the bucket was actually created in Ceph:

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin bucket list | grep my-bucket

# Check bucket stats
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin bucket stats --bucket=my-bucket-name
```

## Recreating a Stuck OBC

If an OBC is stuck and you need to start fresh:

```bash
# Delete and recreate
kubectl delete obc my-bucket -n my-app

# Wait a moment then reapply
kubectl apply -f obc.yaml
```

If the ObjectBucket object lingers:

```bash
kubectl delete objectbucket obc-my-app-my-bucket
```

## Summary

Troubleshooting failed ObjectBucketClaims requires checking OBC events, operator logs, RGW pod health, and Ceph cluster capacity in a systematic order. Most failures fall into four categories: missing resources (StorageClass or ObjectStore), capacity issues, RBAC problems, or network connectivity. Starting with `kubectl describe obc` and operator logs covers the majority of cases quickly.
