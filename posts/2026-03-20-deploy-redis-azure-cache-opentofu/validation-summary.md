# Validation Summary: How to Deploy Redis on Azure Cache with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Cache for Redis
- Azure Private Endpoint
- Azure Private DNS
- Azure Key Vault

## Sources Consulted
- AzureRM `azurerm_redis_cache` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache
- AzureRM `azurerm_redis_linked_server` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_linked_server
- AzureRM `azurerm_private_endpoint` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- AzureRM 4.0 upgrade guide: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/guides/4.0-upgrade-guide.html.markdown
- Azure Cache for Redis with Azure Private Link: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-private-link
- Data persistence in Azure Cache for Redis: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-premium-persistence
- Configure passive geo-replication for Premium Azure Cache for Redis instances: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-geo-replication
- High availability for Azure Cache for Redis: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-high-availability
- Azure Cache for Redis retirement FAQ: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/retirement-faq
- What's New in Azure Cache for Redis: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new

## Issues Found
- The post used removed AzureRM arguments: `enable_non_ssl_port` and `redis_configuration.enable_authentication`. I updated them to the current `non_ssl_port_enabled` and `redis_configuration.authentication_enabled` names required by current AzureRM/OpenTofu configurations.
- The Premium example enabled both RDB and AOF persistence at the same time. Azure Cache for Redis supports either RDB or AOF persistence, not both simultaneously, so I removed the AOF block and added a clarifying note.
- The clustered Premium example labeled P1-P5 sizes without accounting for sharding. I clarified that the listed sizes are per shard when `shard_count = 2`.
- The private endpoint example attached the endpoint to `azurerm_redis_cache.app` while disabling public access on a different cache resource, `azurerm_redis_cache.secure`. I corrected the private endpoint to target the same `secure` cache that has `public_network_access_enabled = false`.
- The conclusion referenced the removed `enable_non_ssl_port` argument. I updated it to `non_ssl_port_enabled`.
- The post did not mention the current retirement status of Azure Cache for Redis. I added a brief note that Basic, Standard, and Premium tiers retire on September 30, 2028 so the guidance is accurate as of the validation date.

## Review Notes
- Passive geo-replication on Premium caches cannot be combined with data persistence.
- Private Link cannot be added to a cache that is already passively geo-replicated without unlinking first, then relinking after the private endpoint is added.
- Microsoft states that Standard and Premium caches in supported regions are now zone redundant by default through automatic zonal allocation, though Premium still supports manual zone selection.
