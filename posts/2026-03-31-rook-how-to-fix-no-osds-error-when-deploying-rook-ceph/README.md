# How to Fix 'no osds' Error When Deploying Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, OSD, Kubernetes

Description: Diagnose and resolve the 'no osds' error in Rook-Ceph deployments by checking device configurations, node labels, and operator logs.

---

## Understanding the "no osds" Error

When Rook-Ceph is deployed but no OSD pods start, the cluster reports no available storage devices. You may see:

```text
health: HEALTH_WARN
    no osds
```

Or the `CephCluster` custom resource shows:

```text
Phase: Warning
Message: No OSDs found
```

This typically happens due to misconfiguration in the `CephCluster` spec or because Rook cannot find suitable disks on your nodes.

## Step 1 - Check Operator Logs

The first place to look is the Rook operator pod:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator | grep -i osd | tail -50
```

Common messages indicating the problem:

```text
no valid devices found
skipping device /dev/sda: in use
device /dev/sdb does not exist
```

## Step 2 - Verify the CephCluster Storage Spec

Check your `CephCluster` manifest storage section:

```yaml
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
```

Or a specific device list:

```yaml
spec:
  storage:
    useAllNodes: false
    nodes:
      - name: "worker-1"
        devices:
          - name: "sdb"
      - name: "worker-2"
        devices:
          - name: "sdb"
```

Common mistakes:
- Node names in the spec don't match actual node names
- Device names are wrong (e.g., `sdb` vs `nvme0n1`)

Verify node names:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name
```

Verify available block devices on a node:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- lsblk
```

## Step 3 - Check for Existing Partitions or Filesystems

Rook will not use a device that already has a filesystem or partition table. Check each device:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- lsblk -f
```

If a device shows a filesystem type (ext4, xfs, LVM, etc.), Rook skips it. To wipe a device for Rook use:

```bash
# Run on the node directly - THIS DESTROYS ALL DATA
sudo wipefs -a /dev/sdb
sudo dd if=/dev/zero of=/dev/sdb bs=1M count=100
```

## Step 4 - Check for the OSD Prepare Job

Rook creates a prepare job for each OSD. Check their status:

```bash
kubectl -n rook-ceph get jobs | grep osd-prepare
kubectl -n rook-ceph get pods | grep osd-prepare
```

Inspect a failed prepare pod:

```bash
kubectl -n rook-ceph logs <osd-prepare-pod-name>
```

Common errors in prepare logs:

```text
failed to find raw device: no raw device found
device /dev/sdb is already used by a filesystem
```

## Step 5 - Verify Node Labels (If Using Node Affinity)

If your `CephCluster` spec uses node affinity or placement, ensure nodes have the required labels:

```bash
kubectl get nodes --show-labels | grep storage
```

If labels are missing, add them:

```bash
kubectl label node worker-1 role=storage-node
```

## Step 6 - Check Device Discovery ConfigMap

Rook uses a device discovery mechanism. Verify the discovered devices:

```bash
kubectl -n rook-ceph get configmap rook-ceph-osd-<node-name> -o yaml
```

If the ConfigMap is empty or missing devices you expect, the issue is at the discovery stage.

## Step 7 - Validate the deviceFilter Setting

If using `deviceFilter`, verify the regex matches your devices:

```yaml
spec:
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]"
```

Test the regex against your actual device names:

```bash
ls /dev/ | grep -E "^sd[b-z]"
```

## Step 8 - Ensure No LVM or DMCRYPT Metadata

Rook-Ceph (Nautilus+) using BlueStore will skip devices with existing LVM metadata. Clear it:

```bash
sudo lvremove /dev/vg_name/lv_name
sudo vgremove vg_name
sudo pvremove /dev/sdb
sudo wipefs -a /dev/sdb
```

## Summary

The "no osds" error in Rook-Ceph is almost always caused by devices being unavailable - either because they have existing filesystem metadata, names don't match the cluster spec, or node labels are missing. Fix it by checking operator logs, wiping target devices, and validating the `CephCluster` storage spec against actual node and device names in your cluster.
