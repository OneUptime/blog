# Validation Summary: How to Save and Restore Virtual Machine Snapshots on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9 virtualization
- KVM/QEMU
- libvirt and virsh
- VM snapshots
- VM save and restore state files

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization, Chapter 13: Saving and restoring virtual machine state by using snapshots: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization, Chapter 10: Saving and restoring virtual machines: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/saving-and-restoring-virtual-machines_configuring-and-managing-virtualization
- libvirt virsh manual, snapshot commands: https://www.libvirt.org/manpages/virsh.html#snapshot-commands
- libvirt virsh manual, save and restore commands: https://www.libvirt.org/manpages/virsh.html#save

## Issues Found
- The post described internal snapshots as simple but did not mention that internal VM snapshots are deprecated in RHEL 9 and not recommended for production. Added that caveat and clarified that external snapshots are the supported production choice on RHEL 9.
- The introduction implied broad RHEL 9 snapshot support. Updated it to note the RHEL 9.4-or-later and external snapshot support context from Red Hat documentation.
- The `snapshot-create-as` examples used a non-documented `--description` option. Changed the examples to pass the description as the documented positional argument.
- The running disk-only snapshot example omitted `--quiesce`. Added it to match Red Hat's supported running VM disk-only snapshot workflow.
- The full memory snapshot example omitted `--memspec`. Added a memory state file path, because RHEL/libvirt require `--memspec` to control and create a memory snapshot in this workflow.
- The shut-down VM snapshot example omitted `--disk-only`. Added it to match Red Hat's documented command for shut-down VMs.
- The `snapshot-info` example used `--snapshotname`, which is not the documented syntax. Changed it to `sudo virsh snapshot-info vmname snapshot1`.
- The disk-only snapshot revert explanation said the VM restarts from the restored disk state. Corrected it to say disk-only snapshots normally leave the VM inactive unless options such as `--running` are used.
- The `virsh save` explanation said the VM is paused and its complete state is written. Corrected it to explain that `virsh save` stops the running domain and saves RAM/CPU state, not disk state.
- The save file path used `/var/lib/libvirt/save`, while Red Hat documents `/var/lib/libvirt/qemu/save` as the default managed-save directory. Updated the example path for consistency.
- The performance section attributed overlay layers to internal snapshots. Corrected it to external snapshots, where overlay/backing chains are the relevant performance concern.
- The blockcommit explanation implied it applied to internal snapshots generally. Clarified that it applies to external active snapshots.

## Review Notes
The examples are technically valid as illustrative commands, but real systems may require additional `--diskspec` values for block-backed disks or custom external file names. `--quiesce` requires a working QEMU guest agent and will fail without one.
