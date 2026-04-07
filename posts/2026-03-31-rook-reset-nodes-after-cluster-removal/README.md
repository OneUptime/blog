# How to Reset Nodes After Rook-Ceph Cluster Removal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Node, Reset, Cleanup

Description: Complete guide to resetting Kubernetes nodes after Rook-Ceph cluster removal, covering disk cleanup, filesystem removal, and node state verification.

---

After removing a Rook-Ceph cluster, the storage nodes retain traces of the Ceph installation: data directories, disk labels, LVM volumes, and kernel modules. These remnants prevent a clean Rook reinstallation and can cause the new cluster to find and reuse stale state from the old one. A complete node reset is required.

## What Remains After Cluster Removal

After `kubectl delete cephcluster` and Rook uninstall, each storage node typically has:

1. **dataDirHostPath contents** (`/var/lib/rook/`): Monitor data, cluster config, keyrings
2. **OSD data**: If OSDs used directories (not dedicated disks), data is in `dataDirHostPath`
3. **Ceph disk labels**: OSDs using raw disks have `ceph_fsid` labels in the partition table
4. **LVM volumes**: Bluestore OSDs may have created LVM physical volumes (PVs), volume groups (VGs), and logical volumes (LVs)
5. **Kernel modules**: `rbd` and `ceph` kernel modules may be loaded

## Step 1: Verify Ceph Daemons Are Stopped

Before any node-level cleanup, confirm all Ceph processes are gone:

```bash
for node in node-1 node-2 node-3; do
  echo "=== $node ==="
  ssh $node "ps aux | grep -E 'ceph|rbd' | grep -v grep"
done
```

If any Ceph processes are still running, they indicate the cluster was not cleanly removed. Force kill them:

```bash
ssh node-1 "sudo pkill -9 ceph-mon; sudo pkill -9 ceph-osd; sudo pkill -9 ceph-mgr"
```

## Step 2: Clean dataDirHostPath

Remove all data from the host path directory on every node:

```bash
for node in node-1 node-2 node-3 node-4 node-5 node-6; do
  echo "Cleaning $node..."
  ssh $node "sudo rm -rf /var/lib/rook/*"
  ssh $node "ls /var/lib/rook/"
done
```

The `ls` should return nothing.

## Step 3: Remove LVM Volumes

If Rook created LVM volumes on OSD disks, remove them before wiping disk signatures:

```bash
ssh node-1 "sudo pvdisplay | grep -A5 'ceph'"
ssh node-1 "sudo vgdisplay | grep 'ceph'"
ssh node-1 "sudo lvdisplay | grep 'ceph'"
```

Remove in reverse order (LV, VG, PV):

```bash
ssh node-1 "sudo lvremove -f /dev/ceph-xxxx/osd-block-yyyy"
ssh node-1 "sudo vgremove ceph-xxxx"
ssh node-1 "sudo pvremove /dev/sdb"
```

After removing LVM volumes, zero out the first few MB of the disk to ensure no LVM signatures remain:

```bash
ssh node-1 "sudo dd if=/dev/zero of=/dev/sdb bs=1M count=100 status=progress"
```

## Step 4: Remove Ceph Labels from Disks

Ceph writes metadata to disk headers to identify OSD disks. These must be removed:

```bash
ssh node-1 "lsblk -f | grep ceph"
```

```text
sdb      ceph_bluestore  fsid-xxxx       /var/lib/ceph/osd/ceph-0
```

Use `wipefs` to remove all filesystem and Ceph signatures:

```bash
ssh node-1 "sudo wipefs -a /dev/sdb"
ssh node-1 "sudo wipefs -a /dev/sdc"
ssh node-1 "sudo wipefs -a /dev/sdd"
```

Verify disks are clean:

```bash
ssh node-1 "sudo wipefs /dev/sdb"
```

Should return no output if the disk is clean.

## Step 5: Remove SGDisk Partitions

If Rook created GPT partitions on disks, remove them:

```bash
ssh node-1 "sudo sgdisk --zap-all /dev/sdb"
```

This removes the GPT partition table. Then re-read the partition table:

```bash
ssh node-1 "sudo partprobe /dev/sdb"
```

## Step 6: Remove Kernel Modules

Unload Ceph-related kernel modules:

```bash
for node in node-1 node-2 node-3; do
  ssh $node "sudo modprobe -r rbd 2>/dev/null; sudo modprobe -r ceph 2>/dev/null"
  ssh $node "lsmod | grep -E 'rbd|ceph'"
done
```

Modules that are in use cannot be unloaded. A node reboot ensures clean module state:

```bash
for node in node-1 node-2 node-3; do
  ssh $node "sudo reboot" &
done
```

## Step 7: Verify Node Readiness

After reboots, verify nodes are ready for a fresh Rook installation:

```bash
kubectl get nodes

# Check disks are clean
for node in node-1 node-2 node-3; do
  echo "=== $node ==="
  ssh $node "lsblk -f"
  ssh $node "ls /var/lib/rook/ 2>/dev/null && echo 'Directory exists - check contents' || echo 'Directory empty or missing'"
done
```

Disks should show no filesystem labels, and `/var/lib/rook` should be empty or absent.

## Summary

Resetting nodes after Rook-Ceph cluster removal involves stopping all Ceph processes, clearing the `dataDirHostPath`, deleting any LVM volumes created by Rook, removing Ceph disk labels with `wipefs`, clearing GPT partition tables with `sgdisk --zap-all`, unloading Ceph kernel modules, and rebooting nodes to ensure clean state. Each step must be applied to every storage node. After completing all steps, verify that disks show no Ceph signatures before attempting a fresh Rook installation.
