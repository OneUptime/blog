# How to Save and Restore Virtual Machine Snapshots on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Snapshot, Virtualization, Backup, Linux

Description: Learn how to create, manage, and restore KVM virtual machine snapshots on RHEL 9 for backup, testing, and rollback purposes.

---

Snapshots capture the state of a virtual machine at a point in time, including disk contents and optionally memory state. On RHEL 9.4 and later, Red Hat supports VM snapshots when they are external snapshots created with supported storage and snapshot options. Snapshots are invaluable for testing changes, creating restore points before upgrades, and rapid rollback when something goes wrong.

## Types of Snapshots

### Internal Snapshots

Stored within the qcow2 disk image. Simple but limited to qcow2 format.

Internal snapshots are deprecated in RHEL 9 and should not be used for production VMs.

### External Snapshots

Create a new overlay file for changes. This is the supported and recommended snapshot type for production use on RHEL 9.

### Memory Snapshots

Include VM memory state, allowing you to restore to the exact running state.

## Creating Snapshots

### Disk-Only Snapshot (VM can be running)

```bash
sudo virsh snapshot-create-as vmname snapshot1 "Before upgrade" \
    --disk-only \
    --quiesce
```

### Full Snapshot with Memory

```bash
sudo virsh snapshot-create-as vmname snapshot1 "Before upgrade" \
    --memspec /var/lib/libvirt/images/vmname-snapshot1-memory.img
```

### Snapshot of a Shut Down VM

```bash
sudo virsh snapshot-create-as vmname snapshot1 "Clean state" \
    --disk-only
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
sudo virsh snapshot-info vmname snapshot1
```

## Reverting to a Snapshot

```bash
sudo virsh snapshot-revert vmname snapshot1
```

If the snapshot includes memory state, the VM resumes from the state captured in the snapshot. If it is a disk-only snapshot, the VM is restored to the disk state and normally remains shut off unless you use options such as `--running`.

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
sudo virsh save vmname /var/lib/libvirt/qemu/save/vmname.save
```

The VM stops running, and its RAM and CPU state are written to the file. Disk contents are not saved, so the VM disk images must remain unchanged until restore.

### Restore

```bash
sudo virsh restore /var/lib/libvirt/qemu/save/vmname.save
```

The VM resumes from the saved state, assuming its disks still match the state they had when the save file was created.

## Best Practices

- Take snapshots before system upgrades or configuration changes
- Do not keep too many snapshots as they degrade performance
- Delete snapshots when they are no longer needed
- Use external snapshots for production VMs
- Test snapshot restoration regularly
- Document what each snapshot represents in the description

## Snapshot Performance Impact

Each external snapshot adds an overlay layer to the disk backing chain. Performance can degrade as layers accumulate:

- 1-3 snapshots: Minimal impact
- 4-10 snapshots: Noticeable I/O degradation
- 10+ snapshots: Significant performance loss

For external active snapshots, merge the active overlay back into the backing image when testing is complete:

```bash
sudo virsh blockcommit vmname vda --active --verbose --pivot
```

## Summary

VM snapshots on RHEL 9 provide a safety net for testing and changes. Create snapshots before risky operations, revert quickly if something goes wrong, and delete snapshots when they are no longer needed to maintain performance. Use save/restore for hibernation-like functionality that preserves the complete running state.
