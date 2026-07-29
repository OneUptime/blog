# Validation Summary: Azure VM Agent Not Ready: DHCP, WireServer, Firewalls, and Proxies

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Microsoft Azure Virtual Machines
- Azure VM Agent for Windows
- Azure Linux Agent (`waagent`)
- Azure VM extensions
- Cloud-init
- Azure WireServer (`168.63.129.16`)
- Azure Instance Metadata Service (`169.254.169.254`)
- Azure virtual networking, DHCP, NIC IP configurations, NSGs, and user-defined routes
- Windows PowerShell and Azure CLI
- Linux systemd, networking tools, guest firewalls, and proxy configuration
- Azure Boot diagnostics, Serial Console, Run Command, and VMAccess

## Sources Consulted

- [Troubleshoot Azure Windows VM Agent issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/windows-azure-guest-agent)
- [Azure Linux VM Agent overview](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-linux)
- [Azure Linux Agent FAQ](https://github.com/Azure/WALinuxAgent/wiki/FAQ)
- [Azure IP address 168.63.129.16 overview](https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16)
- [Azure VM extensions and features for Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-windows)
- [Azure VM extensions and features for Linux](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-linux)
- [Update the Azure Linux Agent](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/update-linux-agent)
- [Cloud-init support for Linux VMs in Azure](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/using-cloud-init)
- [Configure IP addresses for an Azure network interface](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses)
- [Assign multiple IP addresses to virtual machines](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-multiple-ip-addresses-portal)
- [Azure Instance Metadata Service](https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service)
- [Azure CLI `az network nic` reference](https://learn.microsoft.com/en-us/cli/azure/network/nic)
- [PowerShell `Test-NetConnection` reference](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps)
- [PowerShell `Get-NetIPInterface` reference](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps)
- [Run Command overview](https://learn.microsoft.com/en-us/azure/virtual-machines/run-command-overview)
- [VMAccess Extension for Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/vmaccess-windows)
- [Azure Boot diagnostics](https://learn.microsoft.com/en-us/azure/virtual-machines/boot-diagnostics)

## Issues Found

- The update guidance referred to the distribution package generically as `walinuxagent`, but the package name varies by distribution (for example, `WALinuxAgent`, `python-azure-agent`, or `waagent`). Changed the sentence to recommend the Azure Linux Agent package from the distribution's repository without asserting a universal package name.

## Review Notes

- Verified the Windows service names `RdAgent` and `WindowsAzureGuestAgent`, the Windows log path `C:\WindowsAzure\Logs\WaAppAgent.log`, and the Linux log path `/var/log/waagent.log`.
- Verified that `waagent -version` is supported, and that the service unit name varies across Linux distributions.
- Verified that the VM Agent requires outbound TCP connectivity to `168.63.129.16` on ports 80 and 32526. This agent traffic is not subject to user-defined routes or configured NSGs, but guest firewalls, proxies, and applications can block it.
- Verified the PowerShell connectivity tests and the direct Linux `curl` and `nc` tests. The `nc` utility might need to be installed separately on minimal images.
- Verified that Azure DHCP supplies the primary private IPv4 address to the guest by default, and that multiple-IP configurations require the documented guest-OS procedure and correct primary-IP alignment.
- Verified the Windows Agent proxy limitation and the Linux `HttpProxy.Host`, `HttpProxy.Port`, `AutoUpdate.Enabled`, and `Logs.Verbose` configuration keys.
- Verified that cloud-init cannot process Azure VM extensions and that the Azure Linux Agent remains required when extensions are used.
- Verified the Azure CLI command name, arguments, output mode, JMESPath query fields, and NIC IP-configuration property names.
- Verified that Run Command and VMAccess depend on the VM Agent, while Boot diagnostics, Serial Console, and offline OS-disk repair remain appropriate recovery paths.
- All five documentation links in the post resolve to the intended Microsoft Learn pages.
