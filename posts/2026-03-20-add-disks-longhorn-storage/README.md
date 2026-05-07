# How to Add Additional Disks for Longhorn Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Disk, Configuration, Capacity

Description: Step-by-step guide for adding new disks to Kubernetes nodes and registering them with Longhorn to expand storage capacity.

## Introduction

As your storage needs grow, you will need to add more disk capacity to your Longhorn cluster. This can be done by adding new disks to existing nodes or by adding new nodes entirely. This guide focuses on the process of attaching new physical or virtual disks to existing nodes, mounting them on the host, and registering them as filesystem-type disks with Longhorn.

## Prerequisites

- Longhorn installed and running
- Root or sudo access to the target Kubernetes nodes
- New disks attached to the node (physical, virtual, or cloud block storage)

## Step 1: Identify and Prepare the New Disk

SSH into the target node and identify the new disk:

```bash
# List all block devices

lsblk

# Example output:
# NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
# sda      8:0    0   50G  0 disk
# └─sda1   8:1    0   50G  0 part /
# sdb      8:16   0  200G  0 disk   ← New disk (no partition/mount)

# Verify the disk details
fdisk -l /dev/sdb

# Check if the disk has any existing data (important before formatting!)
blkid /dev/sdb
```

## Step 2: Format the Disk

Format the new disk or partition with a filesystem compatible with Longhorn (ext4 recommended):

```bash
# Option 1: Format the entire disk directly (no partition table)
mkfs.ext4 -L longhorn-disk1 /dev/sdb

# Option 2: Create a partition first (more organized)
# Create a GPT partition table
parted /dev/sdb mklabel gpt

# Create a single partition using all space
parted /dev/sdb mkpart primary ext4 0% 100%

# Format the partition
mkfs.ext4 -L longhorn-disk1 /dev/sdb1
```

## Step 3: Create the Mount Point and Mount the Disk

```bash
# Create the directory where Longhorn will store data
mkdir -p /mnt/longhorn-disk1

# Use the device you formatted in Step 2:
# - /dev/sdb if you formatted the whole disk
# - /dev/sdb1 if you created a partition
DEVICE=/dev/sdb

# Mount the disk (temporary, to test)
mount $DEVICE /mnt/longhorn-disk1

# Verify the mount
df -h /mnt/longhorn-disk1
```

## Step 4: Configure Persistent Mount via /etc/fstab

```bash
# Use the same device you mounted in Step 3
DEVICE=/dev/sdb

# Get the filesystem UUID (preferred over device name)
UUID=$(blkid -s UUID -o value $DEVICE)
echo "Disk UUID: $UUID"

# Add to /etc/fstab for persistent mount across reboots
echo "UUID=$UUID /mnt/longhorn-disk1 ext4 defaults,nofail 0 2" >> /etc/fstab

# Test the fstab entry
mount -a
df -h /mnt/longhorn-disk1
```

The `nofail` option ensures the system boots even if the disk is temporarily unavailable.

## Step 5: Register the Disk with Longhorn

### Via Longhorn UI

1. Open the Longhorn UI
2. Navigate to **Nodes**
3. Find the node where you added the disk
4. Click the three-dot menu (⋮)
5. Select **Edit Node and Disks**
6. Click **Add Disk**
7. Fill in the details:
   - **Name**: `disk1` (unique name for this disk)
   - **Disk Type**: `Filesystem`
   - **Path**: `/mnt/longhorn-disk1`
   - **Storage Reserved**: How much space to reserve (e.g., 5 GiB)
   - **Tags**: Optional tags like `ssd` or `hdd`
8. Toggle **Scheduling** to enabled
9. Click **Save**

### Via kubectl

```yaml
# add-disk-to-node.yaml - Add the new disk to a Longhorn node
apiVersion: longhorn.io/v1beta2
kind: Node
metadata:
  name: worker-node-1
  namespace: longhorn-system
spec:
  allowScheduling: true
  disks:
    # Keep existing default disk
    default-disk-abc123:
      allowScheduling: true
      diskType: filesystem
      evictionRequested: false
      path: /var/lib/longhorn
      storageReserved: 5368709120   # 5 GiB reserved
      tags: []
    # Add the new disk
    disk1:
      allowScheduling: true
      diskType: filesystem
      evictionRequested: false
      path: /mnt/longhorn-disk1     # Path must exist on the node
      storageReserved: 10737418240  # Reserve 10 GiB
      tags:
        - additional              # Custom tags for scheduling
```

```bash
# Note: Do not create a new Node manifest from scratch.
# Export the existing resource first so you keep the current disks.
kubectl get nodes.longhorn.io worker-node-1 -n longhorn-system -o yaml > node-config.yaml

# Edit node-config.yaml to add the new disk under spec.disks
# Then apply:
kubectl apply -f node-config.yaml
```

For a safe approach, use a merge patch to add the disk without removing existing disks:

```bash
# Add a disk using merge patch (won't remove existing disks)
kubectl patch nodes.longhorn.io worker-node-1 \
  -n longhorn-system \
  --type merge \
  -p '{
    "spec": {
      "disks": {
        "disk1": {
          "allowScheduling": true,
          "diskType": "filesystem",
          "evictionRequested": false,
          "path": "/mnt/longhorn-disk1",
          "storageReserved": 10737418240,
          "tags": ["additional"]
        }
      }
    }
  }'
```

## Step 6: Verify the Disk was Added

```bash
# Check the node now shows the new disk
kubectl describe nodes.longhorn.io worker-node-1 -n longhorn-system | grep -A 30 "Disk Status"

# Check available storage increased
kubectl get nodes.longhorn.io worker-node-1 \
  -n longhorn-system -o yaml | grep storageAvailable
```

In the Longhorn UI, navigate to **Dashboard** - the total storage should reflect the new disk capacity.

## Preparing Disks at Scale

For preparing the same disk path on multiple nodes simultaneously:

```bash
# Script to prepare disks on all nodes (run on each node or via ansible)
cat << 'EOF' > prepare-disk.sh
#!/bin/bash
# Format and mount the disk
DISK="/dev/sdb"  # Use /dev/sdb1 instead if you created a partition
MOUNT_POINT="/mnt/longhorn-disk1"

mkfs.ext4 -L longhorn-disk1 $DISK
mkdir -p $MOUNT_POINT
UUID=$(blkid -s UUID -o value $DISK)
echo "UUID=$UUID $MOUNT_POINT ext4 defaults,nofail 0 2" >> /etc/fstab
mount -a
echo "Disk prepared: $MOUNT_POINT"
EOF
```

## Monitoring Disk Utilization

```bash
# Check disk usage across all Longhorn nodes
kubectl get nodes.longhorn.io -n longhorn-system \
  -o yaml | grep -E "storageAvailable|storageMaximum|storageScheduled"

# Alert when disk usage exceeds threshold
kubectl get settings.longhorn.io storage-minimal-available-percentage \
  -n longhorn-system -o yaml
```

## Conclusion

Adding disks to Longhorn is a straightforward process that expands your cluster's storage capacity without interrupting running workloads. By properly formatting disks, configuring persistent mounts, and registering them with Longhorn using appropriate tags and reservations, you can scale your storage infrastructure to meet growing demands. Always monitor disk utilization after adding new capacity and before existing disks become critically full.
