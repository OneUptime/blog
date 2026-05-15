# Validation Summary: How to Use RHEL 9 as a Guest Operating System in VMware and Hyper-V

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- VMware vSphere / ESXi
- VMware Workstation Pro
- open-vm-tools
- Microsoft Hyper-V
- Hyper-V Integration Services / Linux Integration Services
- hyperv-daemons
- TuneD virtual-guest profile

## Sources Consulted
- Broadcom KB: Red Hat Enterprise Linux 9 guest operating system option not available during Virtual Machine creation, https://knowledge.broadcom.com/external/article?legacyId=88157
- Broadcom KB: VMware support for open-vm-tools, https://knowledge.broadcom.com/external/article?legacyId=2073803
- Broadcom KB: VMware Tools compatibility with guest operating systems, https://knowledge.broadcom.com/external/article/313371/vmware-tools-compatibility-with-guest-op.html
- Microsoft Learn: Supported CentOS and Red Hat Enterprise Linux virtual machines on Hyper-V, https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-centos-and-red-hat-enterprise-linux-virtual-machines-on-hyper-v
- Microsoft Learn: Hyper-V Generation 2 virtual machine security settings, https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/learn-more/generation-2-virtual-machine-security-settings-for-hyper-v
- Red Hat Documentation: Optimizing virtual machine performance by using TuneD in RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/optimizing-virtual-machine-performance-in-rhel_configuring-and-managing-virtualization
- Red Hat Documentation: RHEL 9 package manifest, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/repositories

## Issues Found
- The VMware VM recommendation listed VMX-17 or later. Broadcom states that on vSphere 7.0 U3 and later, the Red Hat Enterprise Linux 9 guest OS option should be used only with virtual hardware version 18 or later, so this was changed to VMX-18 or later.
- The Hyper-V supported versions list omitted currently documented supported hosts for RHEL/CentOS 9.x. Microsoft Learn lists Windows Server 2016, 2019, 2022, and 2025, plus Azure Stack HCI / Azure Local support, so the list was updated.

## Review Notes
The installation and verification commands for open-vm-tools, Hyper-V daemons, Hyper-V kernel modules, VMXNET3/PVSCSI checks, and the TuneD virtual-guest profile are technically sound. VMware and Microsoft compatibility can vary by exact product release, update level, and support contract, so future updates should re-check the Broadcom Compatibility Guide and Microsoft support matrix.
