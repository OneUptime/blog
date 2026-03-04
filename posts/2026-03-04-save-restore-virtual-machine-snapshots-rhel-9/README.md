# How to Save and Restore Virtual Machine Snapshots on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Snapshots, Virtualization, Backups, Linux

Description: Learn how to create, manage, and restore KVM virtual machine snapshots on RHEL 9 for backup, testing, and rollback purposes.

---

Snapshots capture the complete state of a virtual machine at a point in time, including disk contents and optionally memory state. On RHEL 9, snapshots are invaluable for testing changes, creating restore points before upgrades, and rapid rollback when something goes wrong.

## Types of Snapshots

### Internal Snapshots

Stored within the qcow2 disk image. Simple but limited to qcow2 format.

### External Snapshots

Create a new overlay file for changes. More flexible and better for production use.

### Memory Snapshots

Include VM memory state, allowing you to restore to the exact running state.

## Creating Snapshots

### Disk-Only Snapshot (VM can be running)

```bash
sudo virsh snapshot-create-as vmname snapshot1 \
    --description "Before upgrade" \
    --disk-only
```

### Full Snapshot with Memory

```bash
sudo virsh snapshot-create-as vmname snapshot1 \
    --description "Before upgrade"
```

### Snapshot of a Shut Down VM

```bash
sudo virsh snapshot-create-as vmname snapshot1 \
    --description "Clean state"
```

## Listing Snapshots

```bash
sudo virsh snapshot-list vmname
```

With parent information:

```bash
sudo virsh snapshot-list vmname --tree
```

## Viewing Snapshot Details

```bash
sudo virsh snapshot-info vmname --snapshotname snapshot1
```

## Reverting to a Snapshot

```bash
sudo virsh snapshot-revert vmname snapshot1
```

If the snapshot includes memory state, the VM resumes at the exact point it was captured. If it is a disk-only snapshot, the VM restarts from the restored disk state.

### Reverting a Running VM

```bash
sudo virsh snapshot-revert vmname snapshot1 --running
```

### Reverting to a Paused State

```bash
sudo virsh snapshot-revert vmname snapshot1 --paused
```

## Deleting Snapshots

### Delete a Specific Snapshot

```bash
sudo virsh snapshot-delete vmname snapshot1
```

### Delete Only Metadata (Keep Files)

```bash
sudo virsh snapshot-delete vmname snapshot1 --metadata
```

### Delete All Snapshots

```bash
for SNAP in $(sudo virsh snapshot-list vmname --name); do
    sudo virsh snapshot-delete vmname "$SNAP"
done
```

## Saving and Restoring VM State

For saving a running VM's complete state to a file (like hibernation):

### Save

```bash
sudo virsh save vmname /var/lib/libvirt/save/vmname.save
```

The VM is paused and its state is written to the file.

### Restore

```bash
sudo virsh restore /var/lib/libvirt/save/vmname.save
```

The VM resumes exactly where it was.

## Best Practices

- Take snapshots before system upgrades or configuration changes
- Do not keep too many snapshots as they degrade performance
- Delete snapshots when they are no longer needed
- Use external snapshots for production VMs
- Test snapshot restoration regularly
- Document what each snapshot represents in the description

## Snapshot Performance Impact

Each internal snapshot adds an overlay layer to the disk image. Performance degrades as layers accumulate:

- 1-3 snapshots: Minimal impact
- 4-10 snapshots: Noticeable I/O degradation
- 10+ snapshots: Significant performance loss

Merge snapshots when testing is complete:

```bash
sudo virsh blockcommit vmname vda --active --verbose --pivot
```

## Summary

VM snapshots on RHEL 9 provide a safety net for testing and changes. Create snapshots before risky operations, revert quickly if something goes wrong, and delete snapshots when they are no longer needed to maintain performance. Use save/restore for hibernation-like functionality that preserves the complete running state.
