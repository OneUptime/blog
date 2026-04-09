# How to Fix OSD Pods Not Starting in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, OSD, Troubleshooting, Storage

Description: Diagnose and fix Rook-Ceph OSD pods that fail to start or remain in CrashLoopBackOff, covering device, permission, and configuration root causes.

---

## Overview

OSD (Object Storage Daemon) pods are the foundation of Ceph's storage layer. When OSD pods fail to start, stored data becomes inaccessible and the cluster enters a degraded or unavailable state. This guide covers the systematic approach to diagnosing and resolving OSD pod startup failures.

## Checking OSD Pod Status

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-osd
```

Common failure states:

```text
rook-ceph-osd-0-xxx   0/1   CrashLoopBackOff   5   10m
rook-ceph-osd-0-xxx   0/1   Init:Error         0   2m
rook-ceph-osd-0-xxx   0/1   Pending            0   5m
```

## Diagnosing CrashLoopBackOff

Get the OSD pod name and read recent logs:

```bash
OSD_POD=$(kubectl get pod -n rook-ceph -l app=rook-ceph-osd \
  -o jsonpath='{.items[0].metadata.name}')

kubectl logs -n rook-ceph $OSD_POD --previous | tail -50
```

Also check the init container logs (OSD activation runs as an init container):

```bash
kubectl logs -n rook-ceph $OSD_POD -c activate --previous 2>/dev/null || \
kubectl logs -n rook-ceph $OSD_POD -c chown-container-data-dir --previous
```

## Common Causes and Fixes

### Cause 1: Device Already in Use

```text
error: unable to lock device /dev/sdb: Device or resource busy
```

The device is mounted or locked. Verify no other process holds it:

```bash
kubectl debug node/<node-name> -it --image=ubuntu -- \
  chroot /host fuser /dev/sdb
```

Unmount or release the device before Rook can use it.

### Cause 2: OSD Store Corruption

```text
failed to authenticate: invalid keyring
failed to mount metadata overlay: not a directory
```

The OSD's on-disk store is corrupted. The OSD must be replaced:

```bash
# Mark OSD as out and down
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph osd out osd.<id>

kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph osd down osd.<id>
```

Then follow the OSD replacement procedure.

### Cause 3: Insufficient Permissions

The OSD container needs to write to the data directory:

```bash
kubectl describe pod -n rook-ceph $OSD_POD | grep -A10 "Security"
```

Verify the `dataDirHostPath` directory has appropriate permissions on the node:

```bash
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls -la /host/var/lib/rook/
```

### Cause 4: Node Not Ready or Tainted

OSD pods may be pending due to node conditions:

```bash
kubectl describe pod -n rook-ceph $OSD_POD | grep -A10 "Events"
```

A `0/3 nodes are available: 3 node(s) had taint` message means a toleration is missing:

```yaml
spec:
  placement:
    all:
      tolerations:
        - key: dedicated
          operator: Exists
          effect: NoSchedule
```

### Cause 5: OSD Prepare Job Failing

The OSD is prepared by a Job that runs before the OSD pod. Check prepare job logs:

```bash
kubectl get job -n rook-ceph | grep osd-prepare
kubectl logs -n rook-ceph job/<osd-prepare-job> -c provision | tail -50
```

## Operator-Triggered OSD Restart

If OSD configuration was recently changed, force the operator to reconcile:

```bash
kubectl delete pod -n rook-ceph $OSD_POD
```

The operator recreates the OSD pod. Monitor the outcome:

```bash
kubectl get pod -n rook-ceph -l app=rook-ceph-osd -w
```

## Checking Cluster Health After Recovery

Once OSD pods are Running, verify cluster health:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph health detail

kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph osd status
```

## Summary

OSD pod startup failures in Rook-Ceph are diagnosed through CrashLoopBackOff logs, init container output, and node-level device inspection. The most common causes are device conflicts, on-disk store corruption, permission issues, and missing tolerations. Address the underlying device or configuration issue, then allow the operator to recreate the OSD pod to restore cluster health.
