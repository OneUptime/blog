# Validation Summary: How to Set Up Azure Firewall Manager with Secured Virtual Hubs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Firewall Manager
- Azure Firewall
- Azure Firewall Policy
- Azure Virtual WAN
- Secured virtual hubs
- Azure PowerShell Az.Network
- Kusto Query Language

## Sources Consulted
- Microsoft Learn: Tutorial: Secure your virtual hub using Azure Firewall Manager - https://learn.microsoft.com/en-us/azure/firewall-manager/secure-cloud-network
- Microsoft Learn: Tutorial: Secure your virtual hub using Azure PowerShell - https://learn.microsoft.com/en-us/azure/firewall-manager/secure-cloud-network-powershell
- Microsoft Learn: What are the Azure Firewall Manager architecture options? - https://learn.microsoft.com/en-us/azure/firewall-manager/vhubs-and-vnets
- Microsoft Learn: Azure Firewall Manager policy overview - https://learn.microsoft.com/en-us/azure/firewall-manager/policy-overview
- Microsoft Learn: How to configure Virtual WAN Hub routing intent and routing policies - https://learn.microsoft.com/en-us/azure/virtual-wan/how-to-routing-policies
- Microsoft Learn: New-AzFirewallPolicy - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azfirewallpolicy
- Microsoft Learn: New-AzFirewallPolicyDnsSetting - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azfirewallpolicydnssetting
- Microsoft Learn: New-AzFirewallPolicyNetworkRule - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azfirewallpolicynetworkrule
- Microsoft Learn: New-AzFirewallPolicyApplicationRule - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azfirewallpolicyapplicationrule
- Microsoft Learn: New-AzFirewall - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azfirewall
- Microsoft Learn: New-AzVirtualHubVnetConnection - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azvirtualhubvnetconnection
- Microsoft Learn: Set-AzFirewallPolicy - https://learn.microsoft.com/en-us/powershell/module/az.network/set-azfirewallpolicy
- Microsoft Learn: New-AzFirewallPolicyIntrusionDetection - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azfirewallpolicyintrusiondetection
- Microsoft Learn: New-AzFirewallPolicyIntrusionDetectionSignatureOverride - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azfirewallpolicyintrusiondetectionsignatureoverride

## Issues Found
- The base firewall policy used a hashtable for `-DnsSetting`, but `New-AzFirewallPolicy` expects a `PSAzureFirewallPolicyDnsSettings` object. Changed the snippet to create the object with `New-AzFirewallPolicyDnsSetting`.
- The NTP network rule used `-DestinationAddress` with an FQDN. Changed it to `-DestinationFqdn`, which is the supported parameter for FQDN destinations in firewall policy network rules.
- The application rule examples used hashtables for `-Protocol`. Changed them to the documented `"https:443"` string format.
- The secured hub firewall deployment used `-Sku "AZFW_Hub"`. Changed it to `-SkuName "AZFW_Hub"` and added `-SkuTier "Standard"`, matching the current `New-AzFirewall` parameters.
- The spoke VNet connection passed a hashtable to `-RoutingConfiguration` and implied that associating a route table routes all traffic through the firewall. Replaced it with `-EnableInternetSecurityFlag $true` and left routing intent as the next step that steers traffic to Azure Firewall.
- The IDPS and TLS inspection snippet only built local hashtables and printed portal instructions. Replaced it with the supported `New-AzFirewallPolicyIntrusionDetectionSignatureOverride`, `New-AzFirewallPolicyIntrusionDetection`, and `Set-AzFirewallPolicy` commands.
- The pricing bullet said the first policy is free and additional policies have a small charge. Updated it to the documented model: policies with zero or one firewall association are free, while policies with multiple firewall associations are billed at a fixed rate.

## Review Notes
The KQL example uses the legacy `AzureDiagnostics` table and legacy firewall log categories, which are still commonly supported when diagnostic settings are configured that way. For new deployments, a future update could also show the newer resource-specific Azure Firewall tables.
