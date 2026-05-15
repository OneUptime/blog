# Validation Summary: How to Use RHEL as a Guest Operating System in VMware and Hyper-V

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- VMware vSphere
- VMware open-vm-tools
- Microsoft Hyper-V
- Hyper-V Linux Integration Services
- RHEL `hyperv-daemons`
- `tuned`
- `systemd`
- `chrony`

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and Managing Virtualization, Optimizing virtual machine performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/optimizing-virtual-machine-performance-in-rhel_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 Package Manifest, `hyperv-daemons`, `hypervkvpd`, `hypervvssd`, and `hypervfcopyd`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/red_hat_enterprise_linux-9-package_manifest-en-us.pdf
- Red Hat Customer Portal, open-vm-tools for RHEL: https://access.redhat.com/solutions/1694373
- VMware/Broadcom Knowledge Base, VMware Tools compatibility with guest operating systems: https://knowledge.broadcom.com/external/article/313371/vmware-tools-compatibility-with-guest-op.html
- VMware open-vm-tools README: https://github.com/vmware/open-vm-tools
- Microsoft Learn, Supported CentOS and Red Hat Enterprise Linux virtual machines on Hyper-V: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-centos-and-red-hat-enterprise-linux-virtual-machines-on-hyper-v
- Microsoft Learn, Hyper-V Generation 2 virtual machine security settings: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/learn-more/generation-2-virtual-machine-security-settings-for-hyper-v
- Microsoft Learn, Manage Hyper-V Integration Services: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/manage/manage-hyper-v-integration-services
- Microsoft Learn, Hyper-V Integration Services: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/integration-services

## Issues Found
- The opening sentence said RHEL is a fully supported guest operating system on VMware vSphere and Hyper-V without qualifying version and certification scope. I changed it to "Supported RHEL releases are certified guest operating systems" because support depends on the RHEL release and hypervisor certification matrix.
- The optional service-disable commands used unqualified unit names and did not stop already-running services. I changed them to `bluetooth.service` and `cups.service` with `--now`, which is clearer systemd syntax and matches the stated goal of disabling unnecessary services.

## Review Notes
- The VMware guidance to use OS-vendor `open-vm-tools` is current for modern RHEL releases. Broadcom documents `open-vm-tools` as the recommended Linux tools path, and Red Hat covers RHEL 8 and 9 in its open-vm-tools support scope.
- The Hyper-V guidance is accurate for modern RHEL releases: Linux Integration Services drivers are in the Linux kernel, and the `hyperv-daemons` package provides KVP, VSS, and file-copy daemons.
- The `virtual-guest` tuned profile is documented by Red Hat for RHEL guests. Workload-specific tuning can still override it when an application vendor provides a more specific profile.
