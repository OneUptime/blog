# Validation Summary: How to Set Up Azure Firewall Policies with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Firewall
- Azure Firewall Policy
- Azure Firewall Premium
- AzureRM provider
- Azure CLI
- Azure Monitor Log Analytics
- Azure Key Vault

## Sources Consulted
- Terraform Registry: `azurerm_firewall_policy` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/firewall_policy
- Terraform Registry: `azurerm_firewall_policy_rule_collection_group` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/firewall_policy_rule_collection_group
- Terraform Registry: `azurerm_firewall` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/firewall
- Microsoft Learn: Azure Firewall Manager policy overview - https://learn.microsoft.com/en-us/azure/firewall-manager/policy-overview
- Microsoft Learn: Azure Firewall Premium features implementation guide - https://learn.microsoft.com/en-us/azure/firewall/premium-features
- Microsoft Learn: Azure Firewall Premium certificates - https://learn.microsoft.com/en-us/azure/firewall/premium-certificates
- Microsoft Learn: Azure Firewall policy DNS settings - https://learn.microsoft.com/en-us/azure/firewall-manager/dns-settings
- Microsoft Learn: Azure Firewall DNS Proxy details - https://learn.microsoft.com/en-us/azure/firewall/dns-details
- Microsoft Learn: Azure Firewall FQDN filtering in network rules - https://learn.microsoft.com/en-us/azure/firewall/fqdn-filtering-network-rules
- Microsoft Learn: FQDN tags overview for Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/fqdn-tags
- Microsoft Learn: Configure Azure Firewall rules - https://learn.microsoft.com/en-us/azure/firewall/rule-processing
- Microsoft Learn: Monitor Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/monitor-firewall
- Microsoft Learn: Azure CLI `az network firewall` - https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Microsoft Learn: Azure CLI `az monitor log-analytics query` - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics

## Issues Found
- The introduction implied that Web Categories are a Premium-only addition and that child policies are for team-specific overrides. I corrected this to match Microsoft’s current documentation: Standard policies also support Web Categories, Premium adds more granular URL-aware matching, and child policies extend parent policy behavior rather than overriding inherited rule collections.
- The TLS inspection example was incomplete. Azure Firewall Premium TLS inspection requires a user-assigned managed identity plus Key Vault Secret `Get`/`List` permissions via Key Vault access policies. I added that prerequisite and the `identity` block to the `azurerm_firewall_policy` example.
- The `sku` comment suggested `Standard or Premium` for a configuration that uses IDPS and TLS inspection. I corrected the comment to state that Premium is required for those features.
- The network rule example used `destination_fqdns = ["*.azure.com"]` in a network rule. Microsoft documents that wildcard FQDNs are not supported in network rules, so I replaced that example with an exact-FQDN NTP rule (`time.windows.com` on UDP/123) and renamed the rule accordingly.
- The Windows Update FQDN tag example used both HTTP and HTTPS protocol blocks. Microsoft’s FQDN tag guidance says to configure application-rule FQDN tags with HTTPS, so I removed the HTTP protocol block.
- The Log Analytics example queried the legacy `AzureDiagnostics` table. Current Azure Firewall monitoring guidance recommends resource-specific structured logs, so I updated the example to query `AZFWNetworkRule`.
- The DNS proxy conclusion was incomplete because enabling `proxy_enabled = true` alone is not enough for reliable FQDN-based network rules. I corrected it to note that clients or VNets also need to use the firewall’s private IP as DNS to keep name resolution consistent.
- The hierarchical-policy conclusion overstated inheritance by saying child policies inherit all parent rules. I corrected it to reflect Azure Firewall policy behavior: parent network and application rule collections are inherited, while NAT rule collections must be defined in the child policy.
- The post metadata used `IdP` instead of `IDPS`. I corrected the tag to match the feature actually discussed in the article.

## Review Notes
- The `az network firewall` command group is part of the Azure CLI `azure-firewall` extension. Current Microsoft CLI docs say the extension auto-installs when needed on supported Azure CLI versions.
- The updated Log Analytics query assumes Azure Firewall structured logs are enabled in resource-specific mode. If a deployment still uses legacy diagnostics mode, similar data appears in `AzureDiagnostics` instead.
- The snippets intentionally rely on surrounding resources and variables such as IP Groups, the managed identity ID, Key Vault secret ID, subnet ID, and public IP ID. That is technically fine for a focused tutorial, but those dependencies must exist elsewhere in the OpenTofu configuration.
