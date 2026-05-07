# Validation Summary: How to Configure Azure Firewall with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Microsoft Azure
- Azure Firewall
- Azure Virtual Network
- Azure CLI
- Terraform (`azurerm` provider)
- IPv6 and dual-stack networking
- User-defined routes

## Sources Consulted
- Microsoft Learn: Overview of IPv6 for Azure Virtual Network - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Azure Firewall known issues and limitations - https://learn.microsoft.com/en-us/troubleshoot/azure/firewall/firewall-known-issues
- Microsoft Learn: Deploy and configure Azure Firewall using Azure CLI - https://learn.microsoft.com/en-us/azure/firewall/deploy-cli
- Microsoft Learn: Azure CLI `az network firewall` - https://learn.microsoft.com/en-us/cli/azure/network/firewall?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network firewall ip-config` - https://learn.microsoft.com/en-us/cli/azure/network/firewall/ip-config?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network firewall network-rule` - https://learn.microsoft.com/en-us/cli/azure/network/firewall/network-rule?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az network route-table route` - https://learn.microsoft.com/en-us/cli/azure/network/route-table/route?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vnet subnet` - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-lts
- HashiCorp Terraform provider docs: `azurerm_firewall` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/firewall.html.markdown
- HashiCorp Terraform provider docs: `azurerm_firewall_policy` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/firewall_policy.html.markdown
- HashiCorp Terraform provider docs: `azurerm_firewall_policy_rule_collection_group` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/firewall_policy_rule_collection_group.html.markdown

## Issues Found
- The post claimed Azure Firewall Standard and Premium support IPv6 rules and IPv6 inspection. Microsoft currently documents IPv6 as unsupported in Azure Firewall and notes that rules fail if you add IPv6 addresses. I rewrote the title, description, introduction, code examples, and conclusion to reflect the current limitation.
- The Azure CLI example configured `AzureFirewallSubnet` with an IPv6 prefix and attempted to create an IPv6 network rule. Microsoft documents that Azure Firewall can run in a dual-stack VNet only when the firewall subnet is IPv4-only. I corrected the deployment example to use an IPv4-only firewall subnet and IPv4-only firewall rules.
- The sample IPv6 prefixes such as `fd00:hub::/48` and `fd00:spoke::/48` were invalid IPv6 syntax. I replaced them with valid example prefixes.
- The Terraform example created a firewall policy and rule collection group but never attached the policy to the firewall. I added `firewall_policy_id` and replaced the unsupported IPv6 rules with supported IPv4 rules.
- The routing section implied Azure Firewall could inspect routed IPv6 traffic and omitted the subnet association step for the route table. I corrected the example to a complete IPv4 UDR flow and added a note that Azure Firewall does not currently inspect IPv6 traffic.

## Review Notes
- Azure Firewall can still be deployed in a dual-stack VNet, but `AzureFirewallSubnet` must remain IPv4-only.
- Microsoft's Azure Firewall known issues page was last updated on April 28, 2026 and still lists IPv6 support as under investigation.
- Azure CLI was not installed in the local workspace, so CLI syntax was verified against current Microsoft Learn CLI reference pages rather than local `az --help` output.
