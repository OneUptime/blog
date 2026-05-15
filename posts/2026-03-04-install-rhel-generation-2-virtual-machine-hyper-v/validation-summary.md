# Validation Summary: How to Install RHEL as a Generation 2 Virtual Machine on Hyper-V

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- Microsoft Hyper-V Generation 2 virtual machines
- Hyper-V PowerShell cmdlets
- UEFI Secure Boot
- Hyper-V Linux integration drivers and daemons
- Red Hat subscription-manager and dnf

## Sources Consulted
- Microsoft Learn: Should I create a generation 1 or 2 virtual machine in Hyper-V? https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/plan/Should-I-create-a-generation-1-or-2-virtual-machine-in-Hyper-V
- Microsoft Learn: Hyper-V Generation 2 virtual machine security features. https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/generation-2-virtual-machine-security-features
- Microsoft Learn: Hyper-V feature compatibility by generation and guest. https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/hyper-v-feature-compatibility-by-generation-and-guest
- Microsoft Learn: Hyper-V features and terminology. https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/features-terminology
- Microsoft Learn: New-VM PowerShell cmdlet. https://learn.microsoft.com/en-us/powershell/module/hyper-v/new-vm
- Microsoft Learn: Set-VMFirmware PowerShell cmdlet. https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vmfirmware
- Microsoft Learn: Add-VMDvdDrive PowerShell cmdlet. https://learn.microsoft.com/en-us/powershell/module/hyper-v/add-vmdvddrive
- Microsoft Learn: Set-VMProcessor PowerShell cmdlet. https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vmprocessor
- Microsoft Learn: Set-VMMemory PowerShell cmdlet. https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vmmemory
- Red Hat Customer Portal: How to install Red Hat provided Hyper V daemons. https://access.redhat.com/solutions/2949891
- Red Hat Documentation: RHEL 9 package manifest showing hyperv-daemons packages. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/repositories

## Issues Found
- The Secure Boot section said Generation 2 VMs are enabled by default "with a Microsoft UEFI CA." Microsoft documents Secure Boot as enabled by default and lists the Microsoft UEFI Certificate Authority as the Linux-compatible template. I changed the wording to say Secure Boot is enabled by default and that the VM should be switched to the Microsoft UEFI Certificate Authority template for Linux.
- The verification command used `ip addr show eth0`. RHEL 9 systems commonly use predictable interface names, so `eth0` may not exist. I changed the command to `ip addr show`, which works regardless of the interface name.

## Review Notes
- The PowerShell cmdlets and parameters used in the post are valid for current Hyper-V documentation.
- Microsoft's current support matrix lists RHEL/CentOS 8.x and 9.x as supported on Generation 2 VMs.
- The `hyperv-daemons` package is appropriate for Red Hat-provided Hyper-V guest services. The post enables KVP and VSS daemons; file copy daemon availability can also be relevant in environments that use guest file copy features.
