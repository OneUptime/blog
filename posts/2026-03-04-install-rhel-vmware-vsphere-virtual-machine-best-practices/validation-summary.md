# Validation Summary: How to Install RHEL as a VMware vSphere Virtual Machine with Best Practices

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- VMware vSphere / ESXi
- VMware Paravirtual SCSI (PVSCSI)
- VMXNET3 network adapters
- open-vm-tools
- chrony / NTP
- Red Hat Subscription Manager

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring basic system settings - registering a system and chrony/time synchronization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/
- Red Hat Enterprise Linux 9.5 Release Notes: deprecated subscription-manager modules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/deprecated-functionalities
- Red Hat Enterprise Linux 9 installation requirements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/interactively_installing_rhel_over_the_network/interactively_installing_rhel_over_the_network
- Broadcom/VMware KB: VMware Tools compatibility with guest operating systems: https://knowledge.broadcom.com/external/article/313371/vmware-tools-compatibility-with-guest-op.html
- Broadcom/VMware KB: Installing VMware Tools on a virtual machine that supports open-vm-tools: https://knowledge.broadcom.com/external/article/340196/installing-vmware-tools-on-a-virtual-mac.html
- Broadcom/VMware KB: Configuring disks to use VMware Paravirtual SCSI adapters: https://knowledge.broadcom.com/external/article/327218/vmware-scsi-pvscsi.html
- Broadcom/VMware KB: Choosing a network adapter for a virtual machine: https://knowledge.broadcom.com/external/article/321259/choosing-a-network-adapter-for-a-virtual.html
- Broadcom/VMware KB: Timekeeping best practices for Linux guests: https://knowledge.broadcom.com/external/article/310053/timekeeping-best-practices-for-linux-gue.html

## Issues Found
- The registration example used `subscription-manager attach --auto`. Red Hat lists `attach` and `auto-attach` among deprecated subscription-manager modules in RHEL 9.5, so the command was removed and the example now registers the system before updating.
- Several non-shell instruction/configuration blocks were fenced as `bash`. They were changed to `text` so readers and tooling do not treat numbered UI steps or configuration notes as executable shell commands.

## Review Notes
- The open-vm-tools guidance is correct for RHEL 9; VMware/Broadcom recommends vendor-provided open-vm-tools for modern Linux guests, including RHEL 7 and later.
- The PVSCSI and VMXNET3 recommendations are technically valid for supported vSphere/RHEL combinations. For environments where the exact RHEL 9 guest OS option is not available, VMware's guidance is to choose the closest matching supported guest OS type and confirm support in the Broadcom Compatibility Guide.
- The chrony example is syntactically valid for a simple NTP client. VMware recommends using a native guest time synchronization service such as chrony/NTP and avoiding multiple periodic time synchronization mechanisms at the same time.
