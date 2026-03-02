# How to Snapshot and Restore KVM Virtual Machines on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Snapshot, Virtualization

Description: Learn how to create, manage, and restore snapshots of KVM virtual machines on Ubuntu using virsh and qemu-img for both internal and external snapshots.

---

Snapshots capture the state of a virtual machine at a specific point in time and let you return to that state if something goes wrong. Before a risky change - a kernel upgrade, a database migration, a configuration overhaul - taking a snapshot means you can roll back in seconds rather than spending hours on recovery.

## Internal vs External Snapshots

KVM supports two snapshot types with different characteristics:

**Internal snapshots:**
- Stored inside the qcow2 disk image
- Can capture disk + memory state (live snapshot) or disk only
- Simple to create and revert
- Cannot be used with raw disk format
- Older approach, less flexible

**External snapshots:**
- Create a new overlay disk image; original becomes read-only backing file
- Better for backup workflows
- Required for live snapshots with memory state saved separately
- More flexible, easier to manage disk state independently

For most use cases (save state before a change, revert if something breaks), internal snapshots are simpler. For backup workflows and long-term retention, external snapshots are preferred.

## Creating Internal Snapshots

```bash
# Create a snapshot of a running VM (disk only, no memory state)
virsh snapshot-create-as \
  --domain myvm \
  --name "before-nginx-upgrade" \
  --description "Before upgrading nginx from 1.18 to 1.24"

# Create a snapshot including memory state (VM continues running)
virsh snapshot-create-as \
  --domain myvm \
  --name "pre-db-migration" \
  --description "Full state before database migration" \
  --memspec snapshot=internal

# Create a snapshot while VM is running, including current memory
virsh snapshot-create-as \
  --domain myvm \
  --name "live-snapshot-$(date +%Y%m%d-%H%M)" \
  --live

# Create a snapshot while VM is paused (atomic)
virsh suspend myvm
virsh snapshot-create-as myvm --name "paused-snapshot"
virsh resume myvm
```

## Listing and Inspecting Snapshots

```bash
# List all snapshots for a VM
virsh snapshot-list myvm

# Detailed listing with parent/child relationships
virsh snapshot-list myvm --tree

# Show full snapshot details
virsh snapshot-info myvm before-nginx-upgrade

# View snapshot XML
virsh snapshot-dumpxml myvm before-nginx-upgrade

# Show current active snapshot
virsh snapshot-current myvm
```

## Reverting to a Snapshot

```bash
# Revert to a snapshot (VM is shut down and state is restored)
virsh snapshot-revert myvm before-nginx-upgrade

# Revert and start the VM
virsh snapshot-revert myvm before-nginx-upgrade
virsh start myvm

# Revert a running VM to a snapshot (VM must be shut down first)
virsh shutdown myvm
virsh snapshot-revert myvm before-nginx-upgrade

# Force shutdown if needed
virsh destroy myvm
virsh snapshot-revert myvm before-nginx-upgrade
```

After reverting, the VM is in the exact state it was when the snapshot was taken - same running processes, same open files, same network connections if memory state was included.

## Deleting Snapshots

```bash
# Delete a single snapshot
virsh snapshot-delete myvm before-nginx-upgrade

# Delete with all children (if snapshot has children snapshots)
virsh snapshot-delete myvm before-nginx-upgrade --children

# Delete children only
virsh snapshot-delete myvm before-nginx-upgrade --children-only
```

## External Snapshots

External snapshots are better for backup and long-term management:

```bash
# Create an external snapshot (disk only)
virsh snapshot-create-as \
  --domain myvm \
  --name "external-snap-$(date +%Y%m%d)" \
  --disk-only \
  --diskspec vda,snapshot=external,file=/var/lib/libvirt/images/myvm-snap-$(date +%Y%m%d).qcow2 \
  --no-metadata

# Verify the snapshot chain
qemu-img info /var/lib/libvirt/images/myvm.qcow2
# Shows: backing file: /var/lib/libvirt/images/myvm-original.qcow2
```

### External Snapshot with Memory

```bash
# Create external snapshot with memory state saved to separate file
virsh snapshot-create-as \
  --domain myvm \
  --name "external-with-mem" \
  --disk-only \
  --diskspec vda,snapshot=external,file=/var/lib/libvirt/images/myvm-disk.qcow2 \
  --memspec file=/var/lib/libvirt/images/myvm-mem.snap,snapshot=external
```

### Merging External Snapshots (Blockcommit)

After taking external snapshots, you may want to merge them back to avoid a long chain:

```bash
# Merge snapshot into base image (blockcommit)
# This merges the overlay back into the original image
virsh blockcommit myvm vda \
  --base /var/lib/libvirt/images/myvm-base.qcow2 \
  --top /var/lib/libvirt/images/myvm-overlay.qcow2 \
  --active \
  --pivot \
  --wait

# Or use blockpull to pull base into overlay
virsh blockpull myvm vda \
  --base /var/lib/libvirt/images/myvm-base.qcow2 \
  --wait
```

## Snapshot-Based Backup Workflow

External snapshots enable consistent backups of running VMs:

```bash
sudo nano /usr/local/bin/vm-snapshot-backup.sh
```

```bash
#!/bin/bash
# Backup a running KVM VM using external snapshots
# Creates a consistent backup without shutting down the VM

set -euo pipefail

VM_NAME="${1:?Usage: $0 <vm-name>}"
BACKUP_DIR="/mnt/backup/vm-backups/$VM_NAME"
DATE=$(date +%Y%m%d-%H%M%S)
SNAP_NAME="backup-$DATE"
LOG_FILE="/var/log/vm-backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"

log "Starting backup of $VM_NAME"

# Get list of disks
DISKS=$(virsh domblklist "$VM_NAME" --details | awk '/disk/ {print $3}')
log "Disks: $DISKS"

# Build diskspec arguments for each disk
DISK_SPECS=""
SNAP_FILES=()
for DISK_PATH in $DISKS; do
    DISK_NAME=$(basename "$DISK_PATH" .qcow2)
    SNAP_FILE="$BACKUP_DIR/${DISK_NAME}-snap-${DATE}.qcow2"
    DISK_TARGET=$(virsh domblklist "$VM_NAME" | grep "$DISK_PATH" | awk '{print $1}')
    DISK_SPECS="$DISK_SPECS --diskspec $DISK_TARGET,snapshot=external,file=$SNAP_FILE"
    SNAP_FILES+=("$SNAP_FILE")
    log "Snapshot file: $SNAP_FILE"
done

# Create external snapshot (VM keeps running, writes go to snap file)
virsh snapshot-create-as \
    --domain "$VM_NAME" \
    --name "$SNAP_NAME" \
    --disk-only \
    --atomic \
    --no-metadata \
    $DISK_SPECS

log "Snapshot created, copying original disks"

# Now copy the original disk files (they are now frozen/read-only)
for DISK_PATH in $DISKS; do
    BACKUP_FILE="$BACKUP_DIR/$(basename $DISK_PATH .qcow2)-$DATE.qcow2"
    log "Copying $DISK_PATH -> $BACKUP_FILE"
    cp "$DISK_PATH" "$BACKUP_FILE"
done

log "Copy complete, merging snapshot back to disk"

# Merge snapshot back into disk (blockcommit)
for DISK_TARGET in $(virsh domblklist "$VM_NAME" | awk 'NR>2 && /disk/ {print $1}'); do
    virsh blockcommit "$VM_NAME" "$DISK_TARGET" \
        --active \
        --pivot \
        --wait
done

log "Backup complete. Files in: $BACKUP_DIR"
ls -lh "$BACKUP_DIR/"
```

```bash
sudo chmod +x /usr/local/bin/vm-snapshot-backup.sh
sudo /usr/local/bin/vm-snapshot-backup.sh myvm
```

## Managing Snapshot Chains with qemu-img

```bash
# View the full backing chain of a disk image
qemu-img info --backing-chain /var/lib/libvirt/images/myvm-current.qcow2

# Check a qcow2 file for errors
qemu-img check /var/lib/libvirt/images/myvm.qcow2

# Rebase to a different backing file
qemu-img rebase \
  -b /var/lib/libvirt/images/myvm-new-base.qcow2 \
  /var/lib/libvirt/images/myvm-overlay.qcow2

# Flatten a chain into a single image (removes dependency on backing file)
qemu-img convert \
  -O qcow2 \
  /var/lib/libvirt/images/myvm-overlay.qcow2 \
  /var/lib/libvirt/images/myvm-flat.qcow2
```

## Snapshot Best Practices

**Limit snapshot depth:** Long chains of snapshots hurt performance as every read may need to traverse multiple backing files. Merge or delete old snapshots regularly.

**Take snapshots before changes, not as long-term storage:** Snapshots are not backups. They are change safety nets. For long-term data protection, copy the disk image to a separate location.

**Name snapshots meaningfully:** Use names that explain why the snapshot was taken - `before-kernel-5.15-upgrade` is more useful than `snap1`.

**Delete snapshots after confirming changes:** After a successful upgrade, delete the pre-upgrade snapshot. Keeping snapshots long-term wastes disk space and can cause performance degradation.

```bash
# Check disk space used by snapshots
du -sh /var/lib/libvirt/images/

# Find large snapshot files
find /var/lib/libvirt/images/ -name "*.qcow2" -exec du -sh {} \; | sort -h
```

Snapshots give you a fast undo button for VM operations. Use them liberally for testing changes, and clean them up once you have confirmed the changes work correctly.
