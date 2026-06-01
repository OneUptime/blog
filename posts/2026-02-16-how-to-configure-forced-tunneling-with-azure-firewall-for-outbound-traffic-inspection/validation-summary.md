# Validation Summary: How to Configure Forced Tunneling with Azure Firewall

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Firewall
- Azure Firewall Policy
- Azure Firewall Management NIC
- Azure Virtual Network and VNet peering
- User-defined routes and route tables
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- Microsoft Learn: Azure Firewall forced tunneling - https://learn.microsoft.com/en-us/azure/firewall/forced-tunneling
- Microsoft Learn: Azure Firewall Management NIC - https://learn.microsoft.com/en-us/azure/firewall/management-nic
- Microsoft Learn: az network firewall CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Microsoft Learn: az network firewall management-ip-config CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall/management-ip-config
- Microsoft Learn: az network firewall policy rule-collection-group collection CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Microsoft Learn: Azure Firewall DNS settings - https://learn.microsoft.com/en-us/azure/firewall/dns-settings
- Microsoft Learn: Azure IP address 168.63.129.16 overview - https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16
- Microsoft Learn: Create, change, or delete Azure virtual network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn: Monitor Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall
- Microsoft Learn: az monitor diagnostic-settings CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- The post said a hub-spoke topology is required. Changed this to say it is a common design, because Azure Firewall forced tunneling and UDR-based egress routing can be implemented in other supported topologies.
- The post implied the `AzureFirewallManagementSubnet` and management public IP are always required when spoke workloads route internet-bound traffic through Azure Firewall. Clarified that these are required for Azure Firewall forced tunneling mode, where the firewall data path itself can be routed to another next hop, and that this example includes the management interface for that mode.
- The firewall deployment created the firewall first and then separately updated data and management IP configurations. Updated the command to specify the data and management IP configurations during `az network firewall create` using the current CLI parameters `--conf-name`, `--public-ip`, `--m-conf-name`, and `--m-public-ip`.
- The DNS rule guidance implied DNS always needs to be allowed through the firewall. Clarified that this applies when clients use a custom DNS resolver through the firewall, because Azure-provided DNS at `168.63.129.16` is a platform IP and is not subject to user-defined routes.

## Review Notes
The Azure Firewall policy rule collection CLI commands and management IP configuration command group are extension-backed, and several rule collection operations are currently marked preview in the CLI reference. The local review environment did not have Azure CLI installed, so command verification was performed against official Microsoft Learn CLI references rather than local `az --help` output.
