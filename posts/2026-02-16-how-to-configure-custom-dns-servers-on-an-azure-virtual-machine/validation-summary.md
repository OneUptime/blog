# Validation Summary: How to Configure Custom DNS Servers on an Azure Virtual Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure Virtual Network DNS settings
- Azure network interfaces
- Azure CLI
- Azure DNS Private Resolver
- BIND 9
- Windows DNS Server / Active Directory DNS
- Linux and Windows DNS troubleshooting tools

## Sources Consulted
- Microsoft Learn: Configure DNS name resolution for Azure virtual networks - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-name-resolution-for-vms-and-role-instances
- Microsoft Learn: Azure Virtual Network FAQ - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- Microsoft Learn: Create, change, or delete Azure network interfaces - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface?tabs=network-interface-cli
- Microsoft Learn: Azure CLI `az network vnet` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network nic` reference - https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az dns-resolver` reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az dns-resolver inbound-endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver/inbound-endpoint?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az dns-resolver outbound-endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver/outbound-endpoint?view=azure-cli-latest
- Microsoft Learn: Azure DNS Private Resolver overview - https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview
- ISC BIND 9 documentation: Configurations and Zone Files - https://bind9.readthedocs.io/en/v9.21.14/chapter3.html

## Issues Found
- The NIC-level DNS revert command used `--dns-servers ""`. Microsoft documentation shows `--dns-servers null` to remove NIC DNS servers and return to virtual network inheritance, so the command was corrected.
- The BIND configuration declared a reverse zone file at `/etc/bind/zones/db.10.0` but did not create that file. A matching reverse zone file and `named-checkzone` validation command were added so the sample is internally consistent.
- The Azure DNS Private Resolver inbound endpoint example used an unsupported/undocumented JSON shape for `--ip-configurations`. It was changed to the current Azure CLI shorthand shape shown in Microsoft documentation.
- The Azure DNS Private Resolver outbound endpoint example used `--subnet-id`, but the current Azure CLI reference requires `--id` for the subnet resource ID. The flag was corrected.
- The troubleshooting section said a custom DNS server that does not forward to Azure DNS would break Azure service endpoint DNS and Private Link DNS names. That was too broad. It was narrowed to Azure-provided internal names and Azure Private DNS zones linked to the VNet, including Private Link records hosted in those zones.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn Azure CLI reference documentation rather than local `az --help` output.
