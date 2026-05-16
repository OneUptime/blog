# Validation Summary: How to Clone a Virtual Machine on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- KVM virtualization
- libvirt and virsh
- virt-clone
- virt-sysprep
- guestfs-tools

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing virtualization, Chapter 11: Cloning virtual machines: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_managing_virtualization/Red_Hat_Enterprise_Linux-9-Configuring_and_managing_virtualization-en-US.pdf
- Red Hat Enterprise Linux 7 Virtualization Deployment and Administration Guide, Cloning Guests with virt-clone: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/virtualization_deployment_and_administration_guide/cloning-a-vm
- Red Hat Virtualization 4.3 Virtual Machine Management Guide, virt-sysprep Operations: https://docs.redhat.com/en/documentation/red_hat_virtualization/4.3/html/virtual_machine_management_guide/appe-virt_sysprep_operations
- virt-clone(1) manual page: https://man.archlinux.org/man/extra/virt-install/virt-clone.1.en
- virt-sysprep(1) manual page: https://man.archlinux.org/man/virt-sysprep.1.en

## Issues Found
- The post used `sudo dnf install -y libguestfs-tools` for RHEL 9. Red Hat's RHEL 9 virtualization documentation identifies `guestfs-tools` as the package containing `virt-sysprep`, so the command was changed to `sudo dnf install -y guestfs-tools`.
- The post said virt-sysprep removes "User accounts passwords (optional)." The documented operation is `user-account`, which removes user accounts when enabled; it is not a password cleanup operation. The wording was changed to "User accounts (only if the user-account operation is enabled)."
- The post stated the clone will get a new DHCP lease. That is only true when the guest is using DHCP, so the comment was changed to make the DHCP dependency explicit.
- The final recommendation said to always run `virt-sysprep` on clones. In a template workflow, `virt-sysprep` can be run on the template before cloning, so the wording was changed to recommend running it on the template or clone before cloned VMs are started.

## Review Notes
The `virt-clone` examples use valid options, including `--original`, `--name`, `--auto-clone`, and repeated `--file` arguments for multiple disks. The post correctly notes that the source VM must be shut down before cloning and that `virt-sysprep` must be run only against shut-down guests or offline disk images.
