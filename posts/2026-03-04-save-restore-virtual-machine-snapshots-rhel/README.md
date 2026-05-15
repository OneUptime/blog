# How to Save and Restore Virtual Machine Snapshots on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Snapshot, Virtual Machine, Backup, Virtualization, Linux

Description: Learn how to create, manage, and restore KVM virtual machine snapshots on RHEL for backup, testing, and rollback purposes.

---

Snapshots capture the state of a virtual machine at a specific point in time, including its disk contents and optionally its memory state. This lets you quickly roll back after failed updates, test changes safely, or create restore points before maintenance.

## Creating a Snapshot

```bash
# Create a live snapshot of a running VM (includes memory state)

sudo virsh snapshot-create-as rhel9-vm before-update \
  "Snapshot before applying kernel update" \
  --live \
  --memspec /var/lib/libvirt/images/rhel9-vm-before-update-memory.img

# Create a disk-only snapshot (no memory, faster)
sudo virsh snapshot-create-as rhel9-vm disk-snap \
  "Disk-only snapshot" \
  --disk-only \
  --quiesce
```

## Listing Snapshots

```bash
# List all snapshots for a VM
sudo virsh snapshot-list rhel9-vm

# Show detailed info about a specific snapshot
sudo virsh snapshot-info rhel9-vm before-update

# View the snapshot XML configuration
sudo virsh snapshot-dumpxml rhel9-vm "before-update"
```

## Reverting to a Snapshot

```bash
# Revert the VM to a previous snapshot
sudo virsh snapshot-revert rhel9-vm before-update

# The VM returns to the exact state when the snapshot was taken
# If the snapshot included memory, the VM resumes running

# Revert and start the VM paused
sudo virsh snapshot-revert rhel9-vm before-update --paused
```

## Deleting Snapshots

```bash
# Delete a specific snapshot
sudo virsh snapshot-delete rhel9-vm before-update

# Delete a snapshot and its children
sudo virsh snapshot-delete rhel9-vm before-update --children

# Delete only the metadata (keep the disk data)
sudo virsh snapshot-delete rhel9-vm disk-snap --metadata
```

## Saving and Restoring VM State

For saving a running VM's memory state to a file (like hibernation):

```bash
# Save a running VM's state to a file
sudo virsh save rhel9-vm /var/lib/libvirt/save/rhel9-vm.save

# The VM is stopped after saving
# Restore the VM from the saved state
sudo virsh restore /var/lib/libvirt/save/rhel9-vm.save

# The VM resumes where it left off, as long as its disk state has not changed
```

## Snapshot Best Practices

```bash
# Show active disk images (external snapshots create overlay files)
sudo virsh domblklist rhel9-vm

# Snapshots with overlay chains can grow large
# Monitor disk usage
du -sh /var/lib/libvirt/images/

# For long-term backups, shut down or quiesce the VM and use full disk copies instead of snapshots
sudo cp /var/lib/libvirt/images/rhel9-vm.qcow2 \
  /backup/rhel9-vm-$(date +%Y%m%d).qcow2
```

## Merging Snapshot Chains

If you have a chain of external snapshots and want to flatten them:

```bash
# Block commit merges the overlay back into the base image
sudo virsh blockcommit rhel9-vm vda --active --pivot

# This pivots the VM back to the base image and consolidates the active chain
```

Use snapshots for short-term rollback points, not as a long-term backup strategy. Snapshot chains slow down disk I/O as they grow deeper. Delete snapshots when they are no longer needed.
