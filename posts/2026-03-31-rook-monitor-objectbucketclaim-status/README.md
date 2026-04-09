# How to Monitor ObjectBucketClaim Status in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ObjectBucketClaim, Monitoring, Kubernetes, S3

Description: Learn how to monitor ObjectBucketClaim status, interpret phase transitions, and detect provisioning failures in Rook-Ceph deployments.

---

## Overview

ObjectBucketClaims (OBCs) in Rook follow a lifecycle with distinct phases: Pending, Bound, and Released. Monitoring these phase transitions ensures that application pods receive their S3 storage on time and that failed provisions are detected quickly. This guide covers the commands and techniques for tracking OBC status in production environments.

## Checking OBC Phase

```bash
# List all OBCs in a namespace
kubectl get obc -n my-app

# Output:
# NAME          STORAGE-CLASS          PHASE   AGE
# app-bucket    rook-ceph-bucket       Bound   5m
# test-bucket   rook-ceph-bucket       Bound   1h
# new-bucket    rook-ceph-bucket       Pending 30s
```

## OBC Phase Descriptions

| Phase | Meaning |
|-------|---------|
| `Pending` | OBC submitted, provisioner is working |
| `Bound` | Bucket provisioned, Secret and ConfigMap are ready |
| `Released` | OBC deleted with Retain policy; bucket still exists |
| `Failed` | Provisioning encountered an error |

## Getting Detailed Status

```bash
kubectl describe obc app-bucket -n my-app
```

Look for the `Status` section:

```yaml
Status:
  Phase: Bound
```

## Checking the Associated ObjectBucket

Each bound OBC has a corresponding cluster-scoped `ObjectBucket` resource:

```bash
# List all ObjectBuckets
kubectl get objectbucket

# Get details including the bucket name in Ceph
kubectl describe objectbucket obc-my-app-app-bucket
```

## Verifying the Secret and ConfigMap

```bash
# Both should appear when OBC is Bound
kubectl get secret -n my-app app-bucket
kubectl get configmap -n my-app app-bucket

# Verify the endpoint is populated
kubectl get configmap -n my-app app-bucket \
  -o jsonpath='{.data.BUCKET_HOST}'
```

## Watching for Status Changes

```bash
# Watch OBC status changes in real time
kubectl get obc -n my-app -w

# Watch with wider output
kubectl get obc -n my-app -w -o wide
```

## Setting Up Monitoring with kubectl wait

For CI/CD pipelines and scripts, use `kubectl wait` to block until the OBC is bound:

```bash
kubectl wait obc/app-bucket -n my-app \
  --for=jsonpath='{.status.phase}'=Bound \
  --timeout=120s
```

## Checking Provisioner Logs

If an OBC is stuck in Pending, check the provisioner:

```bash
# Find the bucket provisioner pod
kubectl get pods -n rook-ceph | grep bucket

# Stream provisioner logs
kubectl logs -n rook-ceph deploy/rook-ceph-operator -f | grep -i "objectbucket\|obc\|bucket"
```

## Automating OBC Health Checks

```bash
#!/bin/bash
NAMESPACE=my-app
FAILED=0
while IFS= read -r line; do
  NAME=$(echo "$line" | awk '{print $1}')
  PHASE=$(echo "$line" | awk '{print $3}')
  if [ "$PHASE" != "Bound" ]; then
    echo "WARNING: OBC $NAME in namespace $NAMESPACE is in phase: $PHASE"
    FAILED=$((FAILED+1))
  fi
done < <(kubectl get obc -n "$NAMESPACE" --no-headers 2>/dev/null)

if [ $FAILED -gt 0 ]; then
  echo "$FAILED OBC(s) are not in Bound state"
  exit 1
fi
echo "All OBCs are Bound"
```

## Summary

Monitoring ObjectBucketClaim status involves watching the OBC phase transitions, verifying that associated Secrets and ConfigMaps are created, and checking provisioner logs when claims stay in Pending too long. Using `kubectl wait` in deployment scripts ensures applications only start after their S3 storage is fully provisioned, preventing connection failures at pod startup.
