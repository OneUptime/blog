# Validation Summary: How to Snapshot and Restore KVM Virtual Machines on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- KVM (Kernel-based Virtual Machine)
- libvirt / virsh
- qemu-img
- qcow2 disk format
- Internal vs. external snapshots
- Bash scripting (backup workflow)
- Ubuntu

## Sources Consulted
- [libvirt: Snapshots](https://libvirt.org/kbase/snapshots.html)
- [libvirt virsh man page](https://www.libvirt.org/manpages/virsh.html)
- [Red Hat Enterprise Linux 9 - Saving and restoring VM state by using snapshots](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/creating-virtual-machine-snapshots_configuring-and-managing-virtualization)
- [Fedora Project Wiki: Virt Live Snapshots](https://fedoraproject.org/wiki/Features/Virt_Live_Snapshots)
- [Fabian Lee: KVM libvirt external snapshots](https://fabianlee.org/2021/01/10/kvm-creating-and-reverting-libvirt-external-snapshots/)
- [libvirt-users mailing list: Live backups create-snapshot-as and memspec](https://www.mail-archive.com/libvirt-users@redhat.com/msg12685.html)

## Issues Found

1. **First internal snapshot command had misleading comment.** The comment claimed "(disk only, no memory state)" but the command had no `--disk-only` flag. On a running VM, the default behavior of `virsh snapshot-create-as` is to capture BOTH disk and memory state as a system checkpoint (briefly pausing the VM). Fixed the comment to accurately describe the default behavior.

2. **Second example used non-standard `--memspec snapshot=internal`.** The `--memspec` syntax expects `[file=]name[,snapshot=type]` and is meant for controlling external memory snapshot files. For internal snapshots, memory is captured in the qcow2 by default (no `--memspec` needed). The command was also identical in effect to the first command. Replaced with a more useful demonstration of the `--atomic` flag, which guarantees all-or-nothing snapshot semantics.

3. **`--live` example alone for an internal snapshot is not supported.** Per libvirt's design, `--live` is intended for external snapshots where memory is dumped to a separate file via the QEMU live migration mechanism while the VM continues running. Using `--live` without `--memspec` for external memory does not work for an internal full snapshot. Replaced with a clearer "disk-only snapshot of a stopped VM" example that fits the Internal Snapshots section.

4. **`--disk-only` combined with `--memspec` in "External Snapshot with Memory" section was contradictory.** `--disk-only` explicitly means "memory contents will not be saved", while `--memspec` specifies where/how to save memory. These two flags cannot be combined. Removed `--disk-only` and added `--live` (which is the correct use case for keeping the VM running while memory is dumped to the external file).

## Review Notes

- The conceptual distinction between internal and external snapshots is accurate.
- The `virsh snapshot-list`, `snapshot-info`, `snapshot-dumpxml`, `snapshot-current`, `snapshot-revert`, and `snapshot-delete` commands and their flags (including `--tree`, `--children`, `--children-only`) are all correct.
- The `virsh blockcommit` and `virsh blockpull` examples with `--base`, `--top`, `--active`, `--pivot`, and `--wait` flags are syntactically correct.
- The `qemu-img info`, `qemu-img check`, `qemu-img rebase`, and `qemu-img convert` commands are all valid and used correctly.
- The backup workflow script is sound — it correctly creates an external snapshot, copies the now-frozen original disk, and merges the overlay back via blockcommit. Minor caveat: `awk 'NR>2 && /disk/ {print $1}'` parsing of `virsh domblklist` output is brittle if column formatting changes across libvirt versions, but it works with current output formats.
- The "Reverting to a Snapshot" comments are slightly simplified: for snapshots that include memory state, `snapshot-revert` restores the VM to its running state at snapshot time (no manual `start` needed). For disk-only snapshots the VM is left off. The examples shown all work; the comments are conservative but not technically incorrect.
- The best-practices section is sound advice (limit snapshot depth, snapshots are not backups, name meaningfully, delete after confirming).
