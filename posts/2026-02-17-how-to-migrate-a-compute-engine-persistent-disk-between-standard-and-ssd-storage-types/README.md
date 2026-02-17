# How to Migrate a Compute Engine Persistent Disk Between Standard and SSD Storage Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Persistent Disk, Storage Migration, Cloud Infrastructure

Description: Step-by-step guide to migrating a Compute Engine persistent disk from standard HDD to SSD or vice versa, covering snapshot-based migration, live migration, and performance considerations.

---

You provisioned a VM with a standard persistent disk to save money, but now the workload has grown and needs the IOPS that only an SSD can deliver. Or the opposite - you have an SSD disk running a cold storage workload where standard disk performance would be fine at a fraction of the cost. Either way, you need to change the disk type without losing data.

Google Cloud does not offer a direct "change disk type" button. You need to create a new disk from a snapshot of the old one. It is straightforward, but there are details that matter.

## Understanding the Disk Types

Compute Engine offers several persistent disk types:

| Type | Performance | Cost | Best For |
|------|-----------|------|----------|
| pd-standard | 0.75 read IOPS/GB, 1.5 write IOPS/GB | Lowest | Cold storage, backups, sequential reads |
| pd-balanced | 6 read IOPS/GB, 6 write IOPS/GB | Medium | General purpose, most workloads |
| pd-ssd | 30 read IOPS/GB, 30 write IOPS/GB | Higher | Databases, high-performance apps |
| pd-extreme | Up to 120,000 IOPS | Highest | Most demanding workloads |

The performance numbers scale with disk size. A 100 GB pd-ssd gives you 3,000 IOPS, while a 1,000 GB pd-ssd gives you 30,000 IOPS.

## Method 1: Snapshot-Based Migration (Recommended)

This is the most reliable approach. You create a snapshot of the existing disk, then create a new disk from that snapshot with the desired type.

### Step 1: Create a Snapshot

For data consistency, stop any applications writing to the disk, or better yet, stop the VM:

```bash
# Stop the VM for a consistent snapshot (recommended for databases)
gcloud compute instances stop my-vm --zone=us-central1-a
```

Create the snapshot:

```bash
# Create a snapshot of the disk you want to migrate
gcloud compute snapshots create my-disk-snapshot \
  --source-disk=my-data-disk \
  --source-disk-zone=us-central1-a \
  --storage-location=us-central1 \
  --description="Snapshot for disk type migration from pd-standard to pd-ssd"
```

Verify the snapshot was created:

```bash
# Check the snapshot status
gcloud compute snapshots describe my-disk-snapshot \
  --format="table(name, status, diskSizeGb, storageBytes, creationTimestamp)"
```

Wait until the status shows `READY` before proceeding.

### Step 2: Create a New Disk from the Snapshot

Create a new disk with the desired type from the snapshot:

```bash
# Create a new SSD disk from the snapshot
gcloud compute disks create my-data-disk-ssd \
  --source-snapshot=my-disk-snapshot \
  --zone=us-central1-a \
  --type=pd-ssd \
  --size=200GB
```

Note: you can make the new disk larger than the original, but not smaller. If the original was 200 GB, the new disk must be at least 200 GB.

### Step 3: Swap the Disks

Detach the old disk and attach the new one:

```bash
# Detach the old standard disk from the VM
gcloud compute instances detach-disk my-vm \
  --disk=my-data-disk \
  --zone=us-central1-a
```

```bash
# Attach the new SSD disk to the VM
gcloud compute instances attach-disk my-vm \
  --disk=my-data-disk-ssd \
  --zone=us-central1-a \
  --device-name=my-data-disk
```

Using the same `--device-name` as the original disk means the mount point inside the VM stays the same. The OS will see the new disk at the same device path.

### Step 4: Start the VM and Verify

```bash
# Start the VM
gcloud compute instances start my-vm --zone=us-central1-a
```

SSH in and verify the disk is mounted correctly:

```bash
# Check that the disk is mounted and has the right filesystem
lsblk
df -h

# Verify data integrity by checking a known file
ls -la /mnt/data/
```

### Step 5: Clean Up

Once you have verified everything works, delete the old disk and snapshot:

```bash
# Delete the old disk (only after verifying the new one works)
gcloud compute disks delete my-data-disk \
  --zone=us-central1-a \
  --quiet

# Delete the snapshot after confirming the migration is successful
gcloud compute snapshots delete my-disk-snapshot --quiet
```

## Migrating a Boot Disk

Migrating a boot disk is slightly different because you cannot detach a boot disk from a running instance. You need to create a new VM.

```bash
# Stop the VM
gcloud compute instances stop my-vm --zone=us-central1-a

# Create a snapshot of the boot disk
gcloud compute snapshots create boot-disk-snapshot \
  --source-disk=my-vm \
  --source-disk-zone=us-central1-a

# Create a new SSD boot disk from the snapshot
gcloud compute disks create my-vm-boot-ssd \
  --source-snapshot=boot-disk-snapshot \
  --zone=us-central1-a \
  --type=pd-ssd

# Delete the old VM but keep the disks
gcloud compute instances delete my-vm \
  --zone=us-central1-a \
  --keep-disks=all

# Create a new VM with the SSD boot disk
gcloud compute instances create my-vm \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --disk=name=my-vm-boot-ssd,boot=yes,auto-delete=yes
```

If the VM had additional disks, reattach them:

```bash
# Reattach any additional disks that were on the original VM
gcloud compute instances attach-disk my-vm \
  --disk=additional-data-disk \
  --zone=us-central1-a
```

## Scripting the Entire Migration

Here is a complete script that handles the migration with safety checks:

```bash
#!/bin/bash
# Migrate a persistent disk from one type to another
# Usage: ./migrate-disk.sh <disk-name> <zone> <new-type>

set -e

DISK_NAME="$1"
ZONE="$2"
NEW_TYPE="$3"  # pd-standard, pd-balanced, pd-ssd, pd-extreme
SNAPSHOT_NAME="${DISK_NAME}-migration-snapshot"
NEW_DISK_NAME="${DISK_NAME}-migrated"

# Validate inputs
if [ -z "$DISK_NAME" ] || [ -z "$ZONE" ] || [ -z "$NEW_TYPE" ]; then
  echo "Usage: $0 <disk-name> <zone> <new-type>"
  echo "Types: pd-standard, pd-balanced, pd-ssd, pd-extreme"
  exit 1
fi

# Get current disk info
echo "Getting disk information..."
CURRENT_SIZE=$(gcloud compute disks describe "${DISK_NAME}" \
  --zone="${ZONE}" \
  --format="value(sizeGb)")
CURRENT_TYPE=$(gcloud compute disks describe "${DISK_NAME}" \
  --zone="${ZONE}" \
  --format="value(type.basename())")

echo "Current disk: ${DISK_NAME}, Type: ${CURRENT_TYPE}, Size: ${CURRENT_SIZE}GB"
echo "Target type: ${NEW_TYPE}"

# Check if the disk is attached to a VM
ATTACHED_VM=$(gcloud compute disks describe "${DISK_NAME}" \
  --zone="${ZONE}" \
  --format="value(users[0].basename())" 2>/dev/null || echo "")

if [ -n "${ATTACHED_VM}" ]; then
  echo "Disk is attached to VM: ${ATTACHED_VM}"
  echo "Please stop the VM and detach the disk before migrating."
  exit 1
fi

# Create snapshot
echo "Creating snapshot: ${SNAPSHOT_NAME}..."
gcloud compute snapshots create "${SNAPSHOT_NAME}" \
  --source-disk="${DISK_NAME}" \
  --source-disk-zone="${ZONE}"

# Wait for snapshot to be ready
echo "Waiting for snapshot to be ready..."
while true; do
  STATUS=$(gcloud compute snapshots describe "${SNAPSHOT_NAME}" \
    --format="value(status)")
  if [ "${STATUS}" = "READY" ]; then
    break
  fi
  echo "  Status: ${STATUS}, waiting..."
  sleep 10
done

# Create new disk from snapshot
echo "Creating new disk: ${NEW_DISK_NAME} (type: ${NEW_TYPE})..."
gcloud compute disks create "${NEW_DISK_NAME}" \
  --source-snapshot="${SNAPSHOT_NAME}" \
  --zone="${ZONE}" \
  --type="${NEW_TYPE}" \
  --size="${CURRENT_SIZE}GB"

echo "Migration complete!"
echo "New disk: ${NEW_DISK_NAME}"
echo "Old disk: ${DISK_NAME} (still exists - delete manually after verification)"
echo "Snapshot: ${SNAPSHOT_NAME} (delete after verification)"
```

## Downtime Considerations

The snapshot-based migration requires downtime because you need to stop writing to the disk during the snapshot. The actual downtime depends on:

- Disk size (larger disks take longer to snapshot)
- How much data has changed since the last snapshot (if using incremental snapshots)
- The time to detach and attach disks (usually seconds)

For a typical 200 GB disk, expect 10-30 minutes of total downtime including the snapshot creation.

## Performance After Migration

After migrating from pd-standard to pd-ssd, you should see an immediate improvement in IOPS and latency. However, there is a warm-up period for disks created from snapshots. The first read of any block needs to fetch it from the snapshot, which is slower than subsequent reads.

To warm up the disk and get full performance:

```bash
# Warm up the disk by reading all blocks (run in background)
sudo dd if=/dev/sdb of=/dev/null bs=1M status=progress &
```

This reads the entire disk sequentially, pulling all data from the snapshot into the disk. After this completes, the disk will perform at full speed.

Migrating disk types is one of those tasks that sounds intimidating but is really just a snapshot and restore operation. The key is to plan the downtime window, verify the data after migration, and only delete the old resources once you are confident everything is working.
