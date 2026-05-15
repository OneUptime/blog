# Validation Summary: How to Perform Live Migration of Virtual Machines on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- KVM/QEMU virtualization
- libvirt and virsh
- SSH-based libvirt connections
- Shared storage for VM disk images
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing virtualization, migrating virtual machines: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- libvirt guest migration documentation: https://www.libvirt.org/migration.html
- libvirt virsh manual page: https://www.libvirt.org/manpages/virsh.html

## Issues Found
- The post described live migration as "zero downtime." Live migration keeps the VM running during most of the transfer, but libvirt has a final switchover pause and exposes a maximum downtime control. Changed the wording to "minimal downtime" and noted the brief switchover pause.
- The setup text said live migration uses SSH or TLS for the transport. In the shown command, SSH is used for the libvirt connection to the destination, while native QEMU migration can also require the migration data ports documented by Red Hat. Adjusted the wording to avoid implying that all migration data is necessarily carried by SSH.
- The verification command used `systemctl status libvirtd`. RHEL 9 commonly uses modular libvirt daemons, and Red Hat's migration procedure specifically enables `virtqemud.socket` for SSH-based migration. Updated the command to check `virtqemud`.
- The offline migration section said the VM is paused during transfer. libvirt documents `--offline` as migrating the domain definition without starting it on the destination or stopping it on the source, and Red Hat presents it for shut-off VMs. Updated the wording accordingly.
- The final paragraph stated that live migration requires shared storage. libvirt supports non-shared disk migration with options such as `--copy-storage-all`, though the post's workflow correctly uses shared storage. Reworded the paragraph to scope the requirement to this workflow.

## Review Notes
The main migration command, `--live`, `--persistent`, `--undefinesource`, `--bandwidth`, `domjobinfo`, and the QEMU migration port range are consistent with the official libvirt and Red Hat documentation. The post remains a concise shared-storage migration guide; future improvements could mention `--tunnelled`, TLS setup, or `--copy-storage-all` examples for non-shared storage, but those are outside the existing post scope.
