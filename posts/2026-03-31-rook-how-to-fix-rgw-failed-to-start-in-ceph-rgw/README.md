# How to Fix 'rgw failed to start' in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Object Storage, Troubleshooting

Description: Diagnose and fix Ceph RADOS Gateway startup failures by checking pool creation, keyring permissions, and port conflicts in Rook-Ceph deployments.

---

## What Causes RGW to Fail to Start

The Ceph RADOS Gateway (RGW) provides S3-compatible object storage. Startup failures typically occur due to:

- Missing or corrupted RGW pools
- Keyring authentication issues
- Port conflicts on the node
- Missing or invalid configuration
- Underlying OSD or MON issues

## Step 1 - Check RGW Pod Status

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-rgw
kubectl -n rook-ceph logs <rgw-pod-name>
```

Look for error messages like:

```text
failed to open keyring: (2) No such file or directory
could not initialize rgw: (22) Invalid argument
ERROR: failed to create bucket: (125) Operation canceled
```

## Step 2 - Check That RGW Pools Exist

RGW requires several pools to exist. Check them:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd lspools
```

Expected RGW pools:

```text
.rgw.root
default.rgw.log
default.rgw.control
default.rgw.meta
default.rgw.buckets.index
default.rgw.buckets.data
```

If pools are missing, create them manually:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool create .rgw.root 8
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool create default.rgw.log 8
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool create default.rgw.control 8
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool create default.rgw.meta 8
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- radosgw-admin realm create --rgw-realm=default --default
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- radosgw-admin zone create --rgw-zonegroup=default --rgw-zone=default --master --default
```

Or, let Rook handle pool creation by deleting and recreating the `CephObjectStore`:

```bash
kubectl -n rook-ceph delete cephobjectstore my-store
kubectl apply -f objectstore.yaml
```

## Step 3 - Verify Keyring Configuration

RGW needs a valid Ceph keyring to authenticate:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth get client.rgw.my-store
```

If the keyring is missing:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth get-or-create client.rgw.my-store osd 'allow rwx' mon 'allow rw' mgr 'allow rw'
```

In Rook, keyrings are stored as Kubernetes Secrets. Check them:

```bash
kubectl -n rook-ceph get secret rook-ceph-rgw-my-store -o yaml
```

## Step 4 - Check for Port Conflicts

RGW binds to a port on the node (default: 80 or 8080). Check if the port is in use:

```bash
# On the node running the RGW pod
ss -tlnp | grep :80
netstat -tlnp | grep :8080
```

If there's a conflict, change the RGW port in the `CephObjectStore`:

```yaml
spec:
  gateway:
    port: 8080
    securePort: 0
    instances: 1
```

## Step 5 - Check CephObjectStore Configuration

Review the Rook `CephObjectStore` custom resource:

```bash
kubectl -n rook-ceph get cephobjectstore -o yaml
```

Common issues in the spec:

```yaml
spec:
  metadataPool:
    replicated:
      size: 3   # Must not exceed OSD count
  dataPool:
    replicated:
      size: 3
  gateway:
    instances: 1
    port: 8080
```

If `size: 3` but you only have 2 OSDs, the pools won't be created properly.

## Step 6 - Check the Rook Operator Logs

The Rook operator reconciles `CephObjectStore` resources:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator | grep -i "objectstore\|rgw" | tail -30
```

Errors like:

```text
failed to create rgw keyring
pool replication size exceeds OSD count
```

Point to specific fixes needed.

## Step 7 - Delete and Recreate the RGW Deployment

If the RGW pod is in a CrashLoopBackOff state and other fixes haven't worked:

```bash
kubectl -n rook-ceph delete deploy rook-ceph-rgw-my-store-a
```

Rook's operator will recreate the deployment automatically.

## Step 8 - Test RGW After Fix

Once RGW is running, test it:

```bash
kubectl -n rook-ceph get svc -l app=rook-ceph-rgw
```

Access the RGW endpoint:

```bash
curl http://<rgw-service-ip>:8080/
```

Expected response:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ListAllMyBucketsResult>
  <Owner>...</Owner>
  <Buckets></Buckets>
</ListAllMyBucketsResult>
```

## Summary

RGW startup failures in Rook-Ceph are usually caused by missing pools, invalid keyrings, port conflicts, or mismatched replica counts in the `CephObjectStore` spec. Diagnose by checking RGW pod logs, verifying pool existence with `ceph osd lspools`, and reviewing the operator logs. Rook's operator will recreate resources automatically once the underlying configuration issue is resolved.
