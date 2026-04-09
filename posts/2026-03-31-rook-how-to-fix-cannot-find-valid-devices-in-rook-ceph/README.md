# How to Fix 'cannot find valid devices' in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Troubleshooting, Kubernetes

Description: Resolve the 'cannot find valid devices' error in Rook-Ceph by checking disk conditions, wiping existing signatures, and correcting storage spec configuration.

---

## Understanding the Error

When Rook-Ceph's OSD prepare jobs run but cannot find usable block devices, the operator logs:

```text
cannot find valid devices
no valid devices found
```

This prevents any OSDs from being created. The error occurs when all candidate disks fail Rook's validation checks.

## Step 1 - Check Operator Logs

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator | grep -E "device|valid|skip" | tail -50
```

Common messages:

```text
skipping device /dev/sdb, in use
device /dev/sdb: unable to lock, in use
device /dev/sdb has a filesystem: ext4
```

Also check OSD prepare pods:

```bash
kubectl -n rook-ceph get pods | grep prepare
kubectl -n rook-ceph logs <osd-prepare-pod>
```

## Step 2 - Verify Block Devices Exist

Check available block devices on each node:

```bash
# From the rook-ceph-tools pod
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- lsblk
```

Or directly on the node:

```bash
ssh worker-1 lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE
```

Expected output for a suitable device:

```text
NAME   SIZE TYPE MOUNTPOINT FSTYPE
sda    100G disk
sdb     50G disk                     <- No MOUNTPOINT, no FSTYPE - suitable
sdc     50G disk           ext4      <- Has FSTYPE - not suitable without wiping
```

## Step 3 - Wipe Existing Filesystem Signatures

Rook will not use a device that has existing filesystem metadata. Wipe candidate devices:

```bash
# SSH into the node first
ssh worker-1

# Wipe filesystem signatures
sudo wipefs -a /dev/sdb

# Also zero out the beginning to clear partition tables
sudo dd if=/dev/zero of=/dev/sdb bs=1M count=100
sudo sync
```

For LVM metadata:

```bash
sudo vgremove <vg-name>
sudo pvremove /dev/sdb
sudo wipefs -a /dev/sdb
```

For LUKS encryption headers:

```bash
sudo cryptsetup luksErase /dev/sdb
sudo wipefs -a /dev/sdb
```

## Step 4 - Verify CephCluster Storage Spec

Check the `CephCluster` device configuration matches actual device names:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph -o yaml | grep -A 20 storage
```

Common mismatches:

```yaml
# Spec says sdb
devices:
  - name: "sdb"

# But actual device is nvme0n1
```

Fix the device name in the spec:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
```

Update the storage section to match actual device names.

## Step 5 - Check for OMAP/BlueStore Leftovers

Rook checks for existing Ceph OMAP/BlueStore metadata and skips devices that appear to be in use by another Ceph instance:

```bash
ssh worker-1 sudo ceph-volume lvm list 2>/dev/null
```

If devices show existing OSD data, they need to be zapped:

```bash
sudo ceph-volume lvm zap /dev/sdb --destroy
```

Or using Rook's cleanup job approach - delete the `CephCluster` with `cleanupPolicy: confirmation: yes-really-destroy-data` and redeploy.

## Step 6 - Check deviceFilter Regex

If using `deviceFilter`, verify it matches your devices:

```yaml
spec:
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]"
```

Test the filter on your actual device list:

```bash
ssh worker-1 ls /dev/ | grep -E "^sd[b-z]"
```

If nothing matches, update the regex to match your device naming convention (e.g., `^nvme[0-9]n1` for NVMe).

## Step 7 - Check Disk Lock Status

If a previous Rook deployment left lock files:

```bash
ssh worker-1 sudo fuser /dev/sdb
```

If anything has the device open, identify and stop it before redeploying.

## Step 8 - Verify Node Labels and Tolerations

If Rook uses node selectors, verify nodes have required labels:

```bash
kubectl get nodes --show-labels | grep storage
```

Add labels if needed:

```bash
kubectl label node worker-1 storage-node=true
```

## Step 9 - Force Rook Reconciliation

After fixing device issues, trigger Rook to re-evaluate:

```bash
kubectl -n rook-ceph annotate cephcluster rook-ceph rook.io/force-reconcile=$(date +%s) --overwrite
```

Monitor OSD creation:

```bash
watch kubectl -n rook-ceph get pods -l app=rook-ceph-osd
```

## Summary

"Cannot find valid devices" in Rook-Ceph means all candidate disks failed validation. Resolve it by wiping filesystem signatures with `wipefs -a`, clearing any LVM or LUKS metadata, fixing device name mismatches in the `CephCluster` spec, and verifying the `deviceFilter` regex matches your actual device names. After cleanup, force Rook to reconcile and it will create OSDs on the now-valid devices.
