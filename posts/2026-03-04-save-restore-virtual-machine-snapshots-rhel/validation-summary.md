# Validation Summary: How to Save and Restore Virtual Machine Snapshots on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux virtualization
- KVM/QEMU
- libvirt
- virsh snapshot commands
- VM save and restore operations

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/
- libvirt virsh manual page: https://www.libvirt.org/manpages/virsh.html
- libvirt knowledge base, Merging disk image chains: https://libvirt.org/kbase/merging_disk_image_chains.html

## Issues Found
- The `snapshot-create-as` examples used `--name` and `--description`, but the documented `virsh` syntax takes the snapshot name and description as positional arguments. Updated both examples to use positional arguments.
- The running VM snapshot example did not provide `--memspec`, which RHEL documents as required when saving memory state. Updated it to use `--live --memspec`.
- The disk-only snapshot example for a running VM omitted `--quiesce`, which RHEL documents for supported running disk-only snapshots. Added `--quiesce`.
- The `snapshot-info`, `snapshot-revert`, and `snapshot-delete` examples used `--snapshotname`, but the documented syntax takes the snapshot name as a positional argument. Updated those commands.
- The `virsh save` section described saving a complete VM state, but libvirt documents `virsh save` as saving RAM, not disk state. Updated the text and restore note to avoid implying disk state is captured.
- The backup example implied copying a VM disk image directly is a safe long-term backup. Updated the comment to state that the VM should be shut down or quiesced before copying.
- The `blockcommit` note said the command removes the overlay. Updated the wording to say it pivots the VM back to the base image and consolidates the active chain.

## Review Notes
RHEL 9 supports VM snapshots only for external snapshot configurations, and internal snapshots are deprecated and not recommended for production. The examples now follow the documented RHEL 9.4-or-later external snapshot scenarios, but production backup procedures should still include application consistency checks and restore testing.
