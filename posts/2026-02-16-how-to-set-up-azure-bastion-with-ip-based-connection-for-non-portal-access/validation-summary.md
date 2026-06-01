# Validation Summary: How to Set Up Azure Bastion with IP-Based Connection for Non-Portal Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bastion
- Azure CLI
- Azure Virtual Network and VNet peering
- SSH
- RDP
- Network Security Groups
- Azure Monitor diagnostic settings

## Sources Consulted
- Azure Bastion IP-based connection documentation: https://learn.microsoft.com/en-us/azure/bastion/connect-ip-address
- Azure CLI `az network bastion` command reference: https://learn.microsoft.com/en-us/cli/azure/network/bastion?view=azure-cli-latest
- Azure Bastion native client configuration documentation: https://learn.microsoft.com/en-us/azure/bastion/native-client
- Azure Bastion Windows native client documentation: https://learn.microsoft.com/en-us/azure/bastion/connect-vm-native-client-windows
- Azure Bastion Linux native client documentation: https://learn.microsoft.com/en-us/azure/bastion/connect-vm-native-client-linux
- Azure Bastion SKU upgrade documentation: https://learn.microsoft.com/en-us/azure/bastion/upgrade-sku
- Azure Bastion FAQ: https://learn.microsoft.com/en-us/azure/bastion/bastion-faq
- Azure Bastion monitoring documentation: https://learn.microsoft.com/en-us/azure/bastion/monitor-bastion
- Azure Monitor supported logs for `microsoft.network/bastionHosts`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-network-bastionhosts-logs

## Issues Found
- Updated the Azure CLI prerequisite from version 2.32 or later with both `ssh` and `bastion` extensions to version 2.62 or later with the `bastion` extension. The current `az network bastion` command reference states that these commands are part of the `bastion` extension for Azure CLI 2.62.0 or higher. The `ssh` extension is only needed for some `az network bastion ssh` flows, not for the tunnel commands used in this post.
- Fixed the Basic-to-Standard upgrade command to include `--location eastus` and use `--sku name=Standard`, matching the current Azure Bastion SKU upgrade documentation. Microsoft notes that `az network bastion update` should include the existing Bastion location to avoid `InvalidResourceLocation`.
- Narrowed the "Non-Azure Resources" section to "Non-Azure VMs" and supported SSH/RDP access. Microsoft documents IP-based Bastion connections for Azure, on-premises, and non-Azure virtual machines, and the native client tunnel documentation says the tunnel is for SSH/RDP VM access, not arbitrary web servers or hosts.
- Corrected the RBAC section. The post previously said no specific VM permissions were needed for IP-based connect. Microsoft documentation lists Reader on the Azure VM, Reader on the NIC with the private IP, Reader on the Bastion resource, and, for peered deployments, Reader on the target VM virtual network. The post now scopes those Azure resource permissions to Azure VM targets and separately calls out target credentials and reachability for on-premises or non-Azure targets.
- Clarified audit logging. Azure Activity Log records control-plane events, while Bastion audit logs provide connection/session details when diagnostic settings are enabled.

## Review Notes
The tunnel examples use supported `az network bastion tunnel` parameters and local SSH/RDP client usage. The post does not cover documented limitations such as force tunneling/default route advertisement, UDRs on the Bastion subnet, Cloud Shell support, or Microsoft Entra authentication limitations for IP-based connections; those are useful future additions but not required to make the current examples correct.
