# Validation Summary: How to Deploy a High-Performance WordPress Site on Azure App Service

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure App Service for Linux
- Azure App Service plans and autoscale
- Azure Database for MySQL Flexible Server
- Azure Front Door Standard
- Azure CLI
- WordPress
- PHP and OPcache configuration
- Azure Monitor and Application Insights

## Sources Consulted
- Microsoft Learn: Quickstart: Create a PHP web app in Azure App Service - https://learn.microsoft.com/azure/app-service/quickstart-php
- Microsoft Learn: Configure a PHP app for Azure App Service - https://learn.microsoft.com/azure/app-service/configure-language-php
- Microsoft Learn: Azure App Service app settings reference - https://learn.microsoft.com/azure/app-service/reference-app-settings
- Microsoft Learn: Azure App Service plans - https://learn.microsoft.com/azure/app-service/overview-hosting-plans
- Microsoft Azure pricing: App Service Basic and Standard plan sizes - https://azure.microsoft.com/pricing/details/app-service
- Microsoft Learn: Azure Database for MySQL Flexible Server firewall rules CLI - https://learn.microsoft.com/cli/azure/mysql/flexible-server/firewall-rule
- Microsoft Learn: Manage Azure Database for MySQL Flexible Server firewall rules - https://learn.microsoft.com/azure/mysql/flexible-server/security-how-to-manage-firewall-cli
- Microsoft Azure: Azure Content Delivery Network retirement notice - https://azure.microsoft.com/pricing/details/cdn/
- Microsoft Learn: Quickstart: Create Azure Front Door using Azure CLI - https://learn.microsoft.com/azure/frontdoor/create-front-door-cli
- Microsoft Learn: Azure Front Door caching - https://learn.microsoft.com/azure/frontdoor/front-door-caching
- Microsoft Learn: Azure CLI `az afd route` reference - https://learn.microsoft.com/cli/azure/afd/route
- Microsoft Learn: Azure CLI `az afd custom-domain` reference - https://learn.microsoft.com/cli/azure/afd/custom-domain
- Microsoft Learn: Azure Monitor autoscale CLI reference - https://learn.microsoft.com/cli/azure/monitor/autoscale
- Microsoft Learn: Azure Monitor autoscale rule CLI reference - https://learn.microsoft.com/cli/azure/monitor/autoscale/rule
- WordPress Developer Resources: wp-config.php - https://developer.wordpress.org/apis/wp-config-php/

## Issues Found
- The post used `az cdn profile create --sku Standard_Microsoft` and `azureedge.net` endpoint examples. Azure CDN Standard from Microsoft (classic) no longer allows new instances as of October 1, 2025 and retires on September 30, 2027. I updated the CDN setup to use Azure Front Door Standard (`az afd`) commands, `azurefd.net` endpoint terminology, and Front Door custom domain configuration.
- The CDN caching rule example used the classic `az cdn endpoint rule add` path and an invalid/obsolete context for new deployments. I replaced it with Azure Front Door route caching and compression configuration using current `az afd route` parameters.
- The post recommended a Basic B2 App Service plan while later configuring autoscale. App Service autoscale is supported on Standard and higher tiers, so I changed the plan to S2 and adjusted the recommendation text.
- The App Service tuning snippet set `WEBSITE_DYNAMIC_CACHE=0` while presenting it as a performance optimization. Microsoft documents dynamic cache as a local file cache that improves performance, so I changed the example to `WEBSITE_DYNAMIC_CACHE=2` for metadata caching.
- The monitoring section claimed Application Insights could directly track database query performance for WordPress. I softened this to request/failure monitoring with WordPress-specific instrumentation for database query details.
- The MySQL firewall comment implied the "Allow Azure services" rule is universally required for App Service. I clarified that it applies to the public-access example.

## Review Notes
The post is technically relevant and now uses current Azure Front Door guidance for new CDN-style deployments. Future improvements could add a private networking variant for App Service to MySQL Flexible Server and a more complete Front Door rules-engine example for separate static and dynamic WordPress paths.
