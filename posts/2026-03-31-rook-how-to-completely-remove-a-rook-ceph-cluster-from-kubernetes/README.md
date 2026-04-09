# How to Completely Remove a Rook-Ceph Cluster from Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cleanup, Kubernetes, Uninstall, Operation

Description: Safely and completely remove a Rook-Ceph cluster from Kubernetes by deleting CRDs, cleaning OSD devices, removing finalizers, and purging host directories.

---

## Overview

Removing a Rook-Ceph cluster requires more than just deleting Kubernetes resources. Rook stores data and configurations on the host filesystem and on OSD block devices. If these are not cleaned up, reimporting or reinstalling Rook on the same hardware can fail. This guide provides a complete step-by-step cleanup procedure.

## Warning

This procedure permanently destroys all data stored in the Ceph cluster. Ensure you have backups of any important data before proceeding.

## Step 1 - Delete Applications Using Rook Storage

Before removing Rook, delete all PVCs and applications that use Rook storage:

```bash
# List all PVCs using Rook StorageClasses
kubectl get pvc --all-namespaces | grep rook

# Delete them
kubectl delete pvc <pvc-name> -n <namespace>
```

Wait for all PVs to be released or deleted.

## Step 2 - Delete Ceph Custom Resources

Delete the Ceph custom resources in the correct order:

```bash
kubectl -n rook-ceph delete cephblockpool --all
kubectl -n rook-ceph delete cephfilesystem --all
kubectl -n rook-ceph delete cephobjectstore --all
kubectl -n rook-ceph delete cephobjectstoreuser --all
kubectl delete objectbucketclaim --all --all-namespaces
```

## Step 3 - Remove Finalizers from the CephCluster

Rook adds finalizers that prevent deletion until cleanup is complete. Remove them if needed:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type merge \
  -p '{"spec":{"cleanupPolicy":{"confirmation":"yes-really-destroy-data"}}}'
```

Then delete the CephCluster:

```bash
kubectl -n rook-ceph delete cephcluster rook-ceph
```

If the CephCluster is stuck terminating, force-remove the finalizer:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type json \
  -p '[{"op":"remove","path":"/metadata/finalizers"}]'
```

## Step 4 - Delete the Rook Operator

```bash
kubectl delete -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/operator.yaml
kubectl delete -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/crds.yaml
```

Or delete the namespace:

```bash
kubectl delete namespace rook-ceph
```

If the namespace is stuck in `Terminating`, first identify remaining resources:

```bash
kubectl api-resources --verbs=list --namespaced -o name | \
  xargs -n 1 kubectl get --show-kind --ignore-not-found -n rook-ceph
```

Then remove the namespace finalizer to allow deletion:

```bash
kubectl get namespace rook-ceph -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/rook-ceph/finalize" -f -
```

## Step 5 - Clean Up Host Directories

Rook stores configuration and OSD data in `dataDirHostPath` (default `/var/lib/rook`). Clean this on every node:

```bash
# Run on each node
sudo rm -rf /var/lib/rook
```

Using a DaemonSet for cluster-wide cleanup:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: rook-cleanup
  namespace: default
spec:
  selector:
    matchLabels:
      app: rook-cleanup
  template:
    metadata:
      labels:
        app: rook-cleanup
    spec:
      hostPID: true
      containers:
        - name: cleanup
          image: busybox
          command: ["sh", "-c", "rm -rf /node/var/lib/rook && sleep infinity"]
          volumeMounts:
            - name: host
              mountPath: /node
      volumes:
        - name: host
          hostPath:
            path: /
```

## Step 6 - Wipe OSD Disks

The OSD block devices retain Ceph metadata. Wipe them on each node:

```bash
# Identify OSD devices (e.g., /dev/sdb, /dev/sdc)
lsblk

# Wipe each device
sudo sgdisk --zap-all /dev/sdb
sudo dd if=/dev/zero of=/dev/sdb bs=1M count=100 oflag=direct,dsync
sudo blkdiscard /dev/sdb
```

To wipe disks without SSH access to nodes, use a privileged DaemonSet or Job. Note that `sgdisk` is not available in minimal images like `busybox` - use an image like `ubuntu` or `alpine` with `sgdisk` installed:

```bash
# Example: run a privileged pod on a specific node
DISK="/dev/sdb"
NODE="<node-name>"
kubectl run disk-wipe --rm -it --restart=Never --image=ubuntu \
  --overrides='{"spec":{"nodeName":"'"$NODE"'","containers":[{"name":"wipe","image":"ubuntu","securityContext":{"privileged":true}}]}}' \
  -- bash -c "apt-get update && apt-get install -y gdisk && sgdisk --zap-all $DISK"
```

## Step 7 - Delete StorageClasses

```bash
kubectl delete storageclass rook-ceph-block rook-cephfs rook-ceph-bucket
```

## Step 8 - Verify Complete Removal

```bash
kubectl get all --all-namespaces | grep rook
kubectl get pv | grep rook
kubectl get crd | grep ceph
```

All should return empty or not found.

## Summary

Completely removing Rook-Ceph from Kubernetes requires deleting CRDs and workloads in order, removing finalizers to unblock stuck deletions, cleaning the `dataDirHostPath` on all nodes, and wiping OSD block devices. Skipping the disk wipe step is the most common mistake - Ceph leaves metadata on disks that prevents clean reinstallation. Always run the host directory and disk cleanup on every node that hosted OSDs or monitors.
