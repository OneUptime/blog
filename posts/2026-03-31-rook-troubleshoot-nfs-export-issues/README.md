# How to Troubleshoot NFS Export Issues in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, Troubleshooting, Kubernetes

Description: Learn how to diagnose and resolve common NFS export issues in Rook including mount failures, permission errors, and stale exports.

---

## Common NFS Export Problems in Rook

NFS issues in a Rook cluster typically fall into a few categories: the NFS pod is not running, the export was not created correctly in RADOS, the client cannot reach the NFS service, or permission/squash settings are blocking access. This guide walks through systematic diagnostics for each scenario.

## Step 1: Verify NFS Pod Health

Check that the Ganesha pods are running:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nfs
```

If pods are in `CrashLoopBackOff` or `Error`, check their logs:

```bash
kubectl -n rook-ceph logs \
  $(kubectl -n rook-ceph get pod -l app=rook-ceph-nfs -o name | head -1)
```

Look for errors like `Failed to read config from RADOS` or `export path not found`. These indicate misconfiguration in the `CephNFS` CR or the RADOS config object.

## Step 2: Check Export Configuration in RADOS

List exports to confirm they exist:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nfs export ls my-nfs
```

If the list is empty or missing an expected export, the export was not created. Re-create it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nfs export create cephfs \
  --cluster-id my-nfs \
  --pseudo-path /data \
  --fsname my-fs \
  --path /
```

## Step 3: Test Network Connectivity

From a pod inside the cluster, test connectivity to the NFS service:

```bash
kubectl run nfs-test --rm -it --image=alpine -- sh
```

Inside the test pod:

```bash
apk add --no-cache nfs-utils
showmount -e rook-ceph-nfs-my-nfs-0.rook-ceph.svc
```

If `showmount` returns no exports or hangs, the NFS pod is not responding on port 2049. Check the Service selector:

```bash
kubectl -n rook-ceph describe service rook-ceph-nfs-my-nfs-0
```

## Step 4: Debug Mount Failures

When the client reports `mount.nfs4: No such file or directory`, the pseudo path may be wrong. Confirm the exact pseudo path:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nfs export info my-nfs /data
```

When the client reports `Permission denied`, check squash settings and ensure the export's `access_type` is not `RO` when you need write access.

## Step 5: Check CephFS Health

If the NFS export is CephFS-backed, verify the filesystem is healthy:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status
```

A degraded MDS or unhealthy filesystem will cause NFS Ganesha to fail to open the backing path.

## Step 6: Inspect Ganesha Stats

Get live Ganesha statistics:

```bash
kubectl -n rook-ceph exec -it \
  $(kubectl -n rook-ceph get pod -l app=rook-ceph-nfs -o name | head -1) -- \
  sh -c 'ganesha_mgr stats_reset && ganesha_mgr get_stats'
```

This shows NFS operation counts and error rates, helping identify whether errors occur at the NFS protocol level or deeper in the FSAL (filesystem abstraction layer).

## Summary

Troubleshooting NFS exports in Rook starts with verifying pod health and then checking export configuration via the Ceph CLI. Network connectivity issues are debugged with `showmount`, permission problems are traced through export squash and access_type settings, and filesystem-level issues are caught by checking CephFS status. Use Ganesha live stats to pinpoint whether errors are protocol-level or storage-backend issues.
