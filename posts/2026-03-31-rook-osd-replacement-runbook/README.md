# How to Create a Ceph OSD Replacement Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Runbook, Storage, Kubernetes

Description: Step-by-step runbook for replacing a failed Ceph OSD in Rook, from identifying the failed disk to reintegrating a new OSD safely.

---

## Overview

When a disk fails in a Rook-Ceph cluster, the OSD process goes down and the cluster enters `HEALTH_WARN` or `HEALTH_ERR`. This runbook walks through safe OSD replacement without data loss.

## Step 1: Identify the Failed OSD

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree | grep -E "down|out"
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Note the OSD ID (e.g., `osd.5`) and the node it resides on.

## Step 2: Mark the OSD Out

Marking the OSD `out` tells Ceph to stop assigning PGs to it and begin backfill:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd out osd.5
```

Wait for recovery to complete before proceeding:

```bash
watch kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Step 3: Remove the OSD from Crush Map

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush remove osd.5
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth del osd.5
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd rm osd.5
```

## Step 4: Delete the OSD Deployment

Find and delete the Kubernetes deployment for the failed OSD:

```bash
kubectl -n rook-ceph get deployments | grep osd
kubectl -n rook-ceph delete deployment rook-ceph-osd-5
```

Also delete the `ConfigMap` that tracks the OSD status for its node:

```bash
kubectl -n rook-ceph delete configmap rook-ceph-osd-worker-node-1-status
```

## Step 5: Wipe and Replace the Physical Disk

After the old disk is physically removed and the new disk inserted:

```bash
# SSH to the node and wipe the new disk
sudo sgdisk --zap-all /dev/sdf
sudo dd if=/dev/zero of=/dev/sdf bs=1M count=100 oflag=direct,dsync
```

## Step 6: Allow Rook to Discover and Provision

Edit or reconcile the `CephCluster` to trigger OSD discovery, or simply wait for the operator to detect the new disk if `useAllDevices: true`:

```yaml
spec:
  storage:
    useAllDevices: true
    nodes:
    - name: "worker-node-1"
      devices:
      - name: "sdf"
```

Apply the change:

```bash
kubectl -n rook-ceph apply -f ceph-cluster.yaml
```

## Step 7: Verify the New OSD

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Confirm the new OSD is `up` and `in`, and the cluster returns to `HEALTH_OK`.

## Summary

OSD replacement in Rook-Ceph follows a clear sequence: identify the failure, mark the OSD out, remove it from the CRUSH map, replace the disk, and let the operator provision a new OSD. Following this runbook prevents data loss and ensures cluster recovery is systematic.
