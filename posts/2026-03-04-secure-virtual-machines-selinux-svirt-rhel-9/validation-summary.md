# Validation Summary: How to Secure Virtual Machines with SELinux sVirt on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- sVirt
- KVM/QEMU
- libvirt domain XML
- SELinux booleans and file contexts

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing virtualization, "Securing virtual machines" and "SELinux booleans for virtualization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/securing-virtual-machines-in-rhel_configuring-and-managing-virtualization
- libvirt Domain XML format, "Security label": https://www.libvirt.org/formatdomain
- libvirt QEMU/KVM/HVF hypervisor driver, "SELinux sVirt confinement": https://libvirt.org/drvqemu
- Red Hat Enterprise Linux 7 Virtualization Security Guide, "sVirt Labeling" for detailed label descriptions still reflected by libvirt sVirt behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/virtualization_security_guide/index

## Issues Found
- The description said sVirt prevents VM escape attacks. Changed this to "help mitigate VM escape attacks" because sVirt is a defense-in-depth MAC confinement layer, not a complete prevention mechanism for every VM escape path.
- The "How sVirt Works" list referred generically to sockets and devices. Changed it to the resource types documented by Red Hat for dynamic sVirt labeling, including disk devices, PCI/USB devices, and boot files.
- The dynamic labeling section said libvirt removes categories at shutdown. Changed this to say libvirt restores resource labels when the VM stops, which better matches the documented lifecycle of dynamically relabeled VM resources.
- The SELinux contexts table described `virt_content_t` as content accessible to VMs. Changed this to `svirt_content_t` for shared read-only content, matching libvirt's sVirt shared read-only label behavior.
- The static `<seclabel>` XML included `<imagelabel>`, but libvirt documents `imagelabel` as output-only in supplied domain XML. Removed the input `imagelabel` line.
- The shared-content example used `virt_content_t`, which is not the sVirt shared read-only content label. Changed the example to use `svirt_content_t` and clarified that it is for shared read-only content.
- A section titled "iSCSI Storage" showed the `virt_use_samba` boolean for CIFS. Renamed the heading to "CIFS/Samba Storage" so the heading matches the command.
- The virtualization boolean list included `virt_sandbox_use_all_caps`, which is not listed in the RHEL 9 virtualization booleans table consulted. Replaced it with `virt_sandbox_use_sys_admin` and used the RHEL 9 description.

## Review Notes
The local review environment did not have SELinux administration tools such as `ausearch`, `semanage`, or `setsebool` installed, so command validation was performed against Red Hat and libvirt documentation rather than local command help.
