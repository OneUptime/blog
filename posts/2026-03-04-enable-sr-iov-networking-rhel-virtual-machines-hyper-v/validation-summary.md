# Validation Summary: How to Enable SR-IOV Networking for RHEL Virtual Machines on Hyper-V

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Microsoft Hyper-V
- SR-IOV networking
- Hyper-V PowerShell cmdlets
- Linux `hv_netvsc` and VF network drivers
- `lspci`, `ip`, `ethtool`, `lsmod`, `dmesg`, and `iperf3`

## Sources Consulted
- Microsoft Learn, `Get-NetAdapterSriov`: https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadaptersriov
- Microsoft Learn, `New-VMSwitch`: https://learn.microsoft.com/en-us/powershell/module/hyper-v/new-vmswitch
- Microsoft Learn, `Set-VMNetworkAdapter`: https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vmnetworkadapter
- Microsoft Learn, supported CentOS and Red Hat Enterprise Linux VMs on Hyper-V: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-centos-and-red-hat-enterprise-linux-virtual-machines-on-hyper-v
- Microsoft Learn, Overview of Single Root I/O Virtualization: https://learn.microsoft.com/en-us/windows-hardware/drivers/network/overview-of-single-root-i-o-virtualization--sr-iov-
- Microsoft Learn, Overview of SR-IOV Data Paths: https://learn.microsoft.com/en-us/windows-hardware/drivers/network/overview-of-sr-iov-data-paths
- Microsoft Learn, SR-IOV VF Failover and Live Migration Support: https://learn.microsoft.com/en-us/windows-hardware/drivers/network/sr-iov-vf-failover-and-live-migration-support
- Linux kernel documentation, Hyper-V network driver: https://docs.kernel.org/networking/device_drivers/ethernet/microsoft/netvsc.html
- Red Hat Enterprise Linux 8.8 Release Notes, Technology Preview SR-IOV in RHEL guests on Hyper-V: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/8.8_release_notes/technology-previews

## Issues Found
- The prerequisite "RHEL 8 or RHEL Generation 2 VM" was malformed and implied "RHEL Generation 2" as an operating system. Changed it to "Supported RHEL VM (for example, RHEL 8 or later)."
- The physical NIC prerequisite named specific NIC families without noting that the guest also needs a supported RHEL VF driver. Reworded it to require a supported RHEL VF driver.
- The guest verification text said `ethtool -i eth0` checks the VF driver. On Hyper-V Linux guests, `eth0` is normally the synthetic `hv_netvsc` device and the VF is enslaved to it. Updated the text to identify `eth0` as the synthetic adapter and to mention that IP configuration should stay on the netvsc device.
- The host-side `Get-VMNetworkAdapter` example was inside a `bash` code block even though it is PowerShell. Changed the fence to `powershell`.
- The failover section suggested `cat /proc/net/dev` to check bonding/teaming status. That file shows interface counters, not Hyper-V VF failover state. Replaced it with a `dmesg` check for `hv_netvsc` VF attach/failover messages.

## Review Notes
The PowerShell cmdlets and SR-IOV parameters used in the post are valid. Red Hat documents SR-IOV for RHEL guests on Hyper-V as a Technology Preview in RHEL 8 release notes, and support details can vary by RHEL minor version, Windows Server version, NIC, and VF driver.
