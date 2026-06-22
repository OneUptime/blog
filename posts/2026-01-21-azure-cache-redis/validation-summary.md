# Validation Summary: How to Set Up Azure Cache for Redis

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Azure Cache for Redis
- Azure Managed Redis
- Azure CLI
- Terraform AzureRM provider
- Azure Bicep / ARM templates
- Redis client libraries for Python, Node.js, .NET, and Go
- Azure Private Link / private endpoints
- Azure Monitor metric alerts and diagnostic settings

## Sources Consulted
- Microsoft Learn: Azure Cache for Redis retirement FAQ - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/retirement-faq
- Microsoft Learn: What's new in Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new
- Microsoft Learn: Azure CLI `az redis` reference - https://learn.microsoft.com/en-us/cli/azure/redis
- Microsoft Learn: Azure CLI `az redis server-link` reference - https://learn.microsoft.com/en-us/cli/azure/redis/server-link
- Microsoft Learn: Microsoft.Cache/redis Bicep and ARM reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.cache/2023-08-01/redis
- Microsoft Learn: Azure Cache for Redis with Azure Private Link - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-private-link
- Microsoft Learn: Azure Cache for Redis monitoring data reference - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/monitor-cache-reference
- Microsoft Learn: What is Azure Managed Redis? - https://learn.microsoft.com/en-us/azure/redis/overview
- HashiCorp Terraform AzureRM provider `azurerm_redis_cache` documentation - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache
- Azure pricing: Azure Cache for Redis reserved capacity - https://azure.microsoft.com/en-us/pricing/details/cache/

## Issues Found
- The article did not mention the Azure Cache for Redis retirement timeline. Added a current warning that Microsoft recommends Azure Managed Redis for new deployments, that Basic/Standard/Premium creation is blocked for new customers as of April 1, 2026, that Enterprise/Enterprise Flash creation is blocked for all customers as of April 1, 2026, and that existing customers can create Basic/Standard/Premium caches only until October 1, 2026.
- The prerequisites incorrectly implied that a virtual network is required for Premium/Enterprise tiers. Updated the wording to state that a virtual network is needed only when using Premium VNet injection or private endpoints.
- The Azure CLI create examples used `--enable-non-ssl-port false`. The Azure CLI option is a presence flag that enables the non-SSL port when supplied, so passing it was incorrect for disabling the port. Removed the flag from the secure examples.
- The Terraform examples used deprecated `enable_non_ssl_port`. Updated both cache resources to the current `non_ssl_port_enabled` argument used by the AzureRM provider.
- The .NET snippet placed top-level usage statements after a type declaration and omitted `using System;`, making the example invalid as standalone C# top-level code. Moved the usage statements before the class and added the missing import.

## Review Notes
Azure Cache for Redis remains technically usable for existing customers during the retirement transition, but new deployments should generally target Azure Managed Redis. The post is now accurate for Azure Cache for Redis scenarios that can still be provisioned during that transition.
