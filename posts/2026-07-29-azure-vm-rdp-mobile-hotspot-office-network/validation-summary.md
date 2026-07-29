# Validation Summary: Why Does Azure VM RDP Work on a Hotspot but Not at the Office?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Microsoft Azure Virtual Machines
- Remote Desktop Protocol (RDP)
- Azure Network Security Groups (NSGs)
- Azure Network Watcher IP flow verify
- Azure CLI
- Windows PowerShell networking and firewall cmdlets
- DNS, NAT, routing, VPN, and network virtual appliances
- Azure Bastion, Just-in-Time VM access, and private connectivity

## Sources Consulted

- [Troubleshoot RDP connections to an Azure VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-rdp-connection)
- [Troubleshoot RDP blocked by NSG rules](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-rdp-nsg-problem)
- [Azure CLI: `az network watcher test-ip-flow`](https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest#az-network-watcher-test-ip-flow)
- [Azure CLI: `az vm list-ip-addresses`](https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest#az-vm-list-ip-addresses)
- [Diagnose VM traffic filtering with IP flow verify](https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem)
- [Azure network security groups overview](https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview)
- [Upgrade Basic Public IP Address to Standard SKU](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-basic-upgrade-guidance)
- [Diagnose an Azure virtual machine routing problem](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/diagnose-network-routing-problem)
- [Azure Bastion overview](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview)
- [Developer and admin access to Azure VMs](https://learn.microsoft.com/en-us/azure/networking/design-guide/developer-admin-access)
- [PowerShell: `Resolve-DnsName`](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps)
- [PowerShell: `Test-NetConnection`](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps)
- [PowerShell: `Get-NetTCPConnection`](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection?view=windowsserver2025-ps)
- [PowerShell: `Get-NetFirewallRule`](https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewallrule?view=windowsserver2025-ps)

## Issues Found

- The public-IP discussion did not identify that a dynamic public IP on this VM would be a Basic SKU address. Basic SKU public IPs were retired on September 30, 2025, while Standard SKU public IPs use static allocation. Updated the text to identify the retired, unsupported Basic SKU and recommend migration to Standard.
- The post mentioned possible IPv6 path differences but did not state that `az network watcher test-ip-flow` accepts only IPv4 local and remote addresses. Added the IPv4 limitation and the requirement that Network Watcher be enabled in the VM's region, directing IPv6 investigations to effective security rules.

## Review Notes

- The Azure CLI commands and arguments are current and valid. The IP flow verify example correctly uses the VM private IPv4 address as the local endpoint, the office public IPv4 address as the remote endpoint, and an ephemeral remote source port for an inbound packet.
- The DNS, TCP handshake, NSG priority, NAT source-address, NIC/subnet NSG interaction, UDR/NVA return-path, guest firewall, and RDP listener explanations are technically consistent with current Azure and Windows documentation.
- `Get-NetFirewallRule -DisplayGroup 'Remote Desktop'` uses the English localized display-group name. On a non-English Windows guest, use the corresponding localized group name.
- If a VM has multiple NICs and IP forwarding is enabled on any of them, `az network watcher test-ip-flow` also requires the `--nic` argument.
