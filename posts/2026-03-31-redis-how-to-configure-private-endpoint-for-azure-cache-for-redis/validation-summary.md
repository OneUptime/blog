# Validation Summary: How to Configure Private Endpoint for Azure Cache for Redis

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Azure Cache for Redis
- Azure Private Endpoint
- Azure Private DNS Zones
- Azure CLI (`az network`, `az redis`)
- Terraform (AzureRM provider)
- Azure VNet Peering
- redis-cli

## Sources Consulted
- Azure Cache for Redis Private Link documentation: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-private-link
- Azure CLI `az network private-endpoint` reference: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Azure CLI `az redis update` reference: https://learn.microsoft.com/en-us/cli/azure/redis
- Azure Private DNS zone names for private endpoints: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Terraform AzureRM `azurerm_private_endpoint` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- Terraform AzureRM `azurerm_redis_cache` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache
- Terraform AzureRM `azurerm_subnet` resource (private endpoint network policies): https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet

## Issues Found
No technical issues found.

## Review Notes
- The `private_endpoint_network_policies = "Disabled"` attribute in the Terraform subnet config is the current syntax for AzureRM provider v3.x+. Older provider versions used the confusingly double-negative `enforce_private_link_endpoint_network_policies` boolean. The post uses the modern attribute, which is correct.
- The troubleshooting tip about verifying NSGs allow ports 6379/6380 is contextually valid — NSGs only affect private endpoint traffic if network policies are enabled on the subnet. Since the post's own config disables network policies, NSGs would not block traffic in that specific setup, but the tip remains a good general troubleshooting step for varied configurations.
- The `az network private-endpoint-connection approve` command in the troubleshooting section lacks line-continuation backslashes, but since it is in a `text` block (not `bash`) serving as a reference rather than a directly copyable script, this is acceptable.
- Step 5 (Disable Public Network Access) is at the same heading level as the parent CLI section rather than nested within it, creating a minor structural inconsistency. This is a stylistic observation, not a technical error.
