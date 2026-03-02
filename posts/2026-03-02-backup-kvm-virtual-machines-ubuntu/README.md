# How to Back Up KVM Virtual Machines on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Backup, Virtualization

Description: Learn how to back up KVM virtual machines on Ubuntu using snapshot-based live backups, disk image copies, and XML configuration exports for complete VM recovery.

---

Backing up virtual machines is more involved than backing up regular files. A complete VM backup includes the disk image, the XML configuration, and ideally a consistent filesystem state inside the VM. Skipping any of these makes recovery difficult or impossible. This guide covers multiple approaches to VM backup, from simple disk copies to production-grade live backup with snapshots.

## What to Back Up

A complete KVM VM backup requires:

1. **Disk images** (`.qcow2`, `.raw` files) - contain all VM data
2. **VM XML configuration** - defines hardware, networks, storage paths
3. **Snapshots** (if any exist and you want to preserve them)
4. **Cloud-init or cloud configuration** (if used)

Missing the XML means you can recover the data but have to manually recreate the VM configuration. Missing the disk means you have a useless XML file.

## Backing Up VM Configuration (XML)

XML backups are small and fast - always do this:

```bash
# Export XML for a single VM
virsh dumpxml myvm > /backup/vm-configs/myvm.xml

# Export XML for all VMs
mkdir -p /backup/vm-configs
for vm in $(virsh list --all --name); do
    virsh dumpxml "$vm" > "/backup/vm-configs/${vm}.xml"
    echo "Exported: $vm"
done

# Also export network and storage pool configs
virsh net-dumpxml default > /backup/vm-configs/network-default.xml
virsh pool-dumpxml default > /backup/vm-configs/pool-default.xml
```

## Simple Offline Backup (VM Shutdown)

The simplest backup: shut down the VM, copy the disk, restart:

```bash
# Graceful shutdown
virsh shutdown myvm

# Wait for VM to stop
timeout 60 bash -c 'until virsh domstate myvm | grep -q "shut off"; do sleep 2; done'
echo "VM stopped"

# Copy disk image
cp /var/lib/libvirt/images/myvm.qcow2 /mnt/backup/myvm-$(date +%Y%m%d).qcow2

# Export XML
virsh dumpxml myvm > /mnt/backup/myvm-$(date +%Y%m%d).xml

# Restart VM
virsh start myvm
```

This is the safest method and produces a fully consistent backup. The downtime depends on VM disk size and storage speed - typically a few seconds to a few minutes.

## Live Backup Using External Snapshots

Live backup uses qcow2's overlay mechanism to freeze the original disk while the VM writes to a new overlay:

```bash
sudo nano /usr/local/bin/kvm-live-backup.sh
```

```bash
#!/bin/bash
# Live KVM VM backup using external snapshots
# VM remains running throughout the backup process

set -euo pipefail

VM_NAME="${1:?Usage: $0 <vm-name>}"
BACKUP_DIR="/mnt/backup/vms/$VM_NAME"
DATE=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/var/log/kvm-backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"

# Step 1: Export VM XML configuration
log "Exporting XML configuration"
virsh dumpxml "$VM_NAME" > "$BACKUP_DIR/${VM_NAME}-${DATE}.xml"

# Step 2: Get list of disks and their details
log "Discovering VM disks"
DISK_INFO=$(virsh domblklist "$VM_NAME" --details | awk '/disk/')

# Build disk spec strings for snapshot
DISK_SPECS=""
declare -A DISK_PATHS
while IFS= read -r line; do
    TARGET=$(echo "$line" | awk '{print $3}')
    SOURCE=$(echo "$line" | awk '{print $4}')
    [ -z "$SOURCE" ] && continue
    SNAP_FILE="${SOURCE%.*}-snap-${DATE}.qcow2"
    DISK_SPECS="$DISK_SPECS --diskspec ${TARGET},snapshot=external,file=${SNAP_FILE}"
    DISK_PATHS[$TARGET]="$SOURCE"
    log "  Disk $TARGET: $SOURCE -> snap: $SNAP_FILE"
done <<< "$DISK_INFO"

# Step 3: Create external snapshot (freezes original disk for backup)
log "Creating external snapshot for $VM_NAME"
virsh snapshot-create-as \
    --domain "$VM_NAME" \
    --name "backup-snap-${DATE}" \
    --disk-only \
    --atomic \
    --no-metadata \
    $DISK_SPECS

log "Snapshot created - original disks are now frozen"

# Step 4: Copy original disk images (they are now read-only)
for TARGET in "${!DISK_PATHS[@]}"; do
    ORIGINAL="${DISK_PATHS[$TARGET]}"
    BACKUP_FILE="$BACKUP_DIR/$(basename "${ORIGINAL%.*}")-${DATE}.qcow2"
    log "Copying $ORIGINAL -> $BACKUP_FILE"
    rsync --progress "$ORIGINAL" "$BACKUP_FILE"
    log "  Done: $(du -sh "$BACKUP_FILE" | cut -f1)"
done

# Step 5: Merge the snapshot back into the active disk (blockcommit)
log "Merging snapshot back to active disks"
for TARGET in "${!DISK_PATHS[@]}"; do
    log "  Blockcommit on $TARGET"
    virsh blockcommit "$VM_NAME" "$TARGET" \
        --active \
        --wait \
        --pivot
    log "  $TARGET merged successfully"
done

# Step 6: Clean up snapshot files (they are now merged back)
log "Cleaning up snapshot files"
virsh domblklist "$VM_NAME" --details | awk '/disk/ {print $4}' | while read -r path; do
    if echo "$path" | grep -q "snap-${DATE}"; then
        rm -f "$path"
        log "  Removed: $path"
    fi
done

log "Backup complete for $VM_NAME"
log "Backup files:"
ls -lh "$BACKUP_DIR/" | tee -a "$LOG_FILE"
```

```bash
sudo chmod +x /usr/local/bin/kvm-live-backup.sh
```

## Backing Up Multiple VMs

```bash
sudo nano /usr/local/bin/backup-all-vms.sh
```

```bash
#!/bin/bash
# Back up all running and stopped KVM VMs

set -euo pipefail

BACKUP_SCRIPT="/usr/local/bin/kvm-live-backup.sh"
LOG_FILE="/var/log/kvm-backup-all.log"
ERRORS=0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "Starting backup of all VMs"

# Get list of all VMs (running and stopped)
while IFS= read -r vm; do
    [ -z "$vm" ] && continue

    STATE=$(virsh domstate "$vm")
    log "Processing: $vm (state: $STATE)"

    if [ "$STATE" = "running" ]; then
        # Use live backup for running VMs
        if "$BACKUP_SCRIPT" "$vm"; then
            log "Live backup successful: $vm"
        else
            log "ERROR: Live backup failed for $vm"
            ((ERRORS++))
        fi
    else
        # Simple copy for stopped VMs
        BACKUP_DIR="/mnt/backup/vms/$vm"
        DATE=$(date +%Y%m%d-%H%M%S)
        mkdir -p "$BACKUP_DIR"

        virsh dumpxml "$vm" > "$BACKUP_DIR/${vm}-${DATE}.xml"

        # Copy each disk
        virsh domblklist "$vm" --details | awk '/disk/ {print $4}' | while read -r disk; do
            [ -z "$disk" ] && continue
            cp "$disk" "$BACKUP_DIR/$(basename "${disk%.*}")-${DATE}.qcow2"
            log "Copied disk: $disk"
        done

        log "Offline backup complete: $vm"
    fi
done < <(virsh list --all --name)

log "All VM backups complete. Errors: $ERRORS"
exit $ERRORS
```

```bash
sudo chmod +x /usr/local/bin/backup-all-vms.sh
```

## Scheduling VM Backups

```bash
sudo crontab -e
```

```bash
# Back up all VMs at 3 AM daily
0 3 * * * /usr/local/bin/backup-all-vms.sh

# Or back up specific VMs at staggered times
0 1 * * * /usr/local/bin/kvm-live-backup.sh webserver-01
30 1 * * * /usr/local/bin/kvm-live-backup.sh database-01
0 2 * * * /usr/local/bin/kvm-live-backup.sh appserver-01
```

## Restoring a VM from Backup

```bash
# Step 1: Copy disk image back
cp /mnt/backup/vms/myvm/myvm-20260302.qcow2 /var/lib/libvirt/images/myvm.qcow2

# Step 2: Restore VM definition from XML
virsh define /mnt/backup/vms/myvm/myvm-20260302.xml

# Step 3: Start the VM
virsh start myvm

# If disk path changed, edit XML before defining
sed -i "s|/old/path|/new/path|g" /mnt/backup/vms/myvm/myvm-20260302.xml
virsh define /mnt/backup/vms/myvm/myvm-20260302.xml
```

## Compressing Backup Images

```bash
# Convert and compress a backup image
qemu-img convert \
  -c \                       # Enable compression
  -O qcow2 \
  /mnt/backup/vms/myvm/myvm-20260302.qcow2 \
  /mnt/backup/vms/myvm/myvm-20260302-compressed.qcow2

# Check size reduction
ls -lh /mnt/backup/vms/myvm/
```

## Verifying VM Backups

```bash
# Verify disk image is readable and undamaged
qemu-img check /mnt/backup/vms/myvm/myvm-20260302.qcow2

# Test XML is valid
virsh define --validate /mnt/backup/vms/myvm/myvm-20260302.xml
virsh undefine myvm  # If it was only created for validation

# Optionally boot the backup in a test environment
qemu-img create \
  -f qcow2 \
  -b /mnt/backup/vms/myvm/myvm-20260302.qcow2 \
  -F qcow2 \
  /tmp/myvm-test.qcow2 \
  0  # No extra space needed for test overlay

virsh define /mnt/backup/vms/myvm/myvm-20260302.xml
# Edit the XML to point to /tmp/myvm-test.qcow2 for testing
```

## Managing Backup Retention

```bash
# Clean up VM backups older than 30 days
find /mnt/backup/vms -name "*.qcow2" -mtime +30 -delete
find /mnt/backup/vms -name "*.xml" -mtime +30 -delete

# Keep weekly snapshots for 3 months
find /mnt/backup/vms -name "*-$(date -d '90 days ago' +%Y%m%d)*.qcow2" -delete
```

VM backups are larger and more time-consuming than file backups, but the live snapshot approach minimizes downtime to near zero. For critical production VMs, combine live backups with periodic offline snapshots (taken during maintenance windows) for the most comprehensive protection.
