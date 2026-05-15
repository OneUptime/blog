# Validation Summary: How to Secure Virtual Machines with SELinux sVirt on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- SELinux
- sVirt
- libvirt domain XML
- KVM/QEMU virtualization
- Linux audit tooling
- SELinux file context management

## Sources Consulted
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, sVirt Labeling: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sec-security-enhanced_linux-svirt_labeling
- Red Hat Enterprise Linux 7 Virtualization Security Guide, sVirt Labeling: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/virtualization_security_guide/virtualization_security_guide
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization, Securing Virtual Machines: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/securing-virtual-machines-in-rhel_configuring-and-managing-virtualization
- libvirt Domain XML format, security label element: https://www.libvirt.org/formatdomain
- semanage-fcontext man page: https://www.mankier.com/8/semanage-fcontext
- restorecon man page: https://www.mankier.com/8/restorecon
- ausearch man page: https://www.mankier.com/8/ausearch
- sealert man page: https://www.mankier.com/8/sealert

## Issues Found
1. **Imprecise statement that the disk image label matches the VM process label**: Updated the wording to say the disk image uses the same MCS categories as the VM process label. The SELinux type differs (`svirt_t` for the process and `svirt_image_t` for the image), while the MCS category pair is what enforces per-VM access.

2. **Unsafe implication about sharing writable disk images**: Clarified that VMs with the same static SELinux label can access the same labeled resources, but the same writable disk image should not be attached to multiple VMs unless the storage and guest file system are designed for concurrent access.

3. **Incorrect persistent context for non-standard VM image directories**: Changed the `semanage fcontext` example from `svirt_image_t` to `virt_image_t`. Red Hat storage-pool guidance uses `virt_image_t` as the persistent default label for VM image storage; libvirt/sVirt can then apply runtime MCS-specific labels as needed. Using `svirt_image_t:s0` broadly would label the content as shared writable sVirt content for all `svirt_t` processes.

## Review Notes
- The `ps -eZ`, `ls -Z`, `virsh dumpxml`, `virsh edit`, `ausearch`, `sealert`, `restorecon`, `setenforce`, and `semanage fcontext` examples use valid command forms.
- The libvirt `<seclabel>` examples are consistent with the documented `dynamic`, `static`, and `none` modes. The `imagelabel` element shown under dynamic labeling is output-only when viewing a running guest, which matches the post's use of `virsh dumpxml`.
- RHEL 9 documentation emphasizes SELinux virtualization booleans for fine-grained configuration, while the sVirt label model remains documented in Red Hat virtualization and SELinux guides and in libvirt domain XML documentation.
