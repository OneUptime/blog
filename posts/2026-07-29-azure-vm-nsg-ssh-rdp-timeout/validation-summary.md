# Validation Summary: NSG Allows SSH or RDP, but the Azure VM Still Times Out

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Microsoft Azure
- Azure Virtual Machines
- Azure Network Security Groups (NSGs)
- Azure Network Watcher IP flow verify, effective security rules, effective routes, and Next hop
- Azure Public IP and Azure Load Balancer inbound rules
- Azure Firewall and network virtual appliances
- Azure Bastion, VPN, and ExpressRoute
- Azure VM Agent, Run Command, VMAccess, Serial Console, and Boot diagnostics
- OpenSSH, SSH, and Linux socket and firewall tooling
- Remote Desktop Protocol (RDP), Remote Desktop Services, and Windows Defender Firewall
- Azure CLI and Windows PowerShell
- Microsoft Entra VM sign-in and Just-in-Time VM access

## Sources Consulted

- [Azure CLI reference: `az vm`](https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest)
- [Azure CLI reference: `az network watcher`](https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest)
- [Azure network security groups overview](https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview)
- [Troubleshoot NSG misconfigurations that block traffic](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/virtual-network-troubleshoot-nsg-blocking-traffic)
- [Diagnose a VM traffic filtering problem with IP flow verify](https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem)
- [Azure Load Balancer components](https://learn.microsoft.com/en-us/azure/load-balancer/components)
- [Create, change, or delete an Azure route table](https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table)
- [Azure Firewall forced tunneling](https://learn.microsoft.com/en-us/azure/firewall/forced-tunneling)
- [Detailed SSH troubleshooting for an Azure VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/detailed-troubleshoot-ssh-connection)
- [Troubleshoot SSH connection issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-ssh-connection)
- [Troubleshoot RDP connections](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-rdp-connection)
- [Detailed Remote Desktop troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/detailed-troubleshoot-rdp)
- [Azure VM guest firewall blocks inbound traffic](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/guest-os-firewall-blocking-inbound-traffic)
- [PowerShell `Test-NetConnection`](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps)
- [PowerShell `Get-NetTCPConnection`](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection?view=windowsserver2025-ps)
- [PowerShell `Get-NetFirewallRule`](https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewallrule?view=windowsserver2025-ps)
- [Windows Firewall Remote Desktop group identifier](https://learn.microsoft.com/en-us/windows-hardware/customize/desktop/unattend/networking-mpssvc-svc-firewallgroups)
- [OpenBSD `nc(1)` manual](https://man.openbsd.org/nc)
- [OpenBSD `ssh(1)` manual](https://man.openbsd.org/ssh)
- [OpenBSD `sshd(8)` manual](https://man.openbsd.org/sshd)
- [Linux `ss(8)` manual](https://man7.org/linux/man-pages/man8/ss.8.html)
- [Azure Boot diagnostics](https://learn.microsoft.com/en-us/azure/virtual-machines/boot-diagnostics)
- [Run Command for Windows VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/run-command)
- [VMAccess Extension for Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/vmaccess-windows)
- [VMAccess Extension for Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/vmaccess-linux)
- [Troubleshoot Azure VM extension failures](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/troubleshoot)
- [Redeploy a Windows VM to a new Azure node](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/redeploy-to-new-node-windows)
- [Azure Bastion remote access](https://learn.microsoft.com/en-us/azure/bastion/work-remotely-support)
- [Just-in-Time VM access](https://learn.microsoft.com/en-us/azure/defender-for-cloud/enable-just-in-time-access)
- [Microsoft Entra sign-in for Azure Linux VMs](https://learn.microsoft.com/en-us/entra/identity/devices/howto-vm-sign-in-azure-ad-linux)
- [Microsoft Entra sign-in for Azure Windows VMs](https://learn.microsoft.com/en-us/entra/identity/devices/howto-vm-sign-in-azure-ad-windows)
- [RFC 5737: IPv4 address blocks reserved for documentation](https://www.rfc-editor.org/rfc/rfc5737.html)

## Issues Found

- The introduction treated the presence of an inbound Allow rule as proof that NSG evaluation permits the flow, even though a higher-priority deny or another associated NSG can still block it. Changed this to refer specifically to an effective Allow result.
- The IP flow verify guidance required the client's public IP and used one arbitrary ephemeral source port. Clarified that the remote address must be the source address Azure observes, including private or translated addresses on VPN and ExpressRoute paths, and changed the example to the supported wildcard source port.
- The stateful NSG explanation named the wrong direction for the return rule. For an inbound SSH or RDP connection, the response does not require a mirror outbound NSG rule; the post incorrectly said inbound.
- The Windows firewall query used the localized `Remote Desktop` display-group name and did not request the effective active policy store. Changed it to the language-neutral Remote Desktop group identifier, queried `ActiveStore`, and displayed the applicable profiles.
- The redeploy warning mentioned only temporary-disk data and said dynamic IPs merely could change. Updated it to include ephemeral OS-disk data and to state that dynamic IP addresses associated with the NIC are updated, matching Azure's redeploy documentation.

## Review Notes

- Network Watcher must be enabled in the VM's region, and the VM must be running for IP flow verify and effective NIC views. The guide already checks that the VM is running but does not spell out the Network Watcher prerequisite.
- Just-in-Time VM access currently requires Microsoft Defender for Servers Plan 2.
- Microsoft Entra VM sign-in has operating-system, extension, identity, client, and role-assignment requirements; the post appropriately qualifies the recommendation with “where supported.”
- The example IP addresses are documentation-only TEST-NET addresses and must be replaced with addresses from the actual path.
