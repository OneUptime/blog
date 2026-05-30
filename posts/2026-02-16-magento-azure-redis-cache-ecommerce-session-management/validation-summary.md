# Validation Summary: How to Connect Magento to Azure Redis Cache for High-Performance E-Commerce

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Magento 2 / Adobe Commerce
- Azure Cache for Redis
- Azure CLI
- Redis sessions, default cache, and full-page cache
- Redis CLI

## Sources Consulted
- Adobe Commerce: Configure Redis for session storage - https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/cache/redis/redis-session
- Adobe Commerce: Configure Redis for default and page cache - https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/cache/redis/redis-pg-cache
- Adobe Commerce: Caching overview and configuration options - https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/cache/caching-overview
- Microsoft Learn: Azure CLI `az redis` reference - https://learn.microsoft.com/cli/azure/redis
- Microsoft Learn: What is Azure Cache for Redis? - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview
- Microsoft Learn: Scale an Azure Cache for Redis instance - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-scale
- Microsoft Learn: Configure Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-configure

## Issues Found
- The `az redis create` example used `--enable-non-ssl-port false`. The Azure CLI documents `--enable-non-ssl-port` as a switch that enables port 6379 when present, so passing `false` is not the correct way to keep the non-TLS port disabled. Removed the option; the secure TLS port remains available and the non-TLS port is not enabled.
- The Redis creation comments said "Standard C1" while the command used `--vm-size c2`. Updated the comment to "Standard C2" so it matches the command and the sizing recommendation later in the post.
- The scaling section recommended Premium clustering without warning that clustered Azure Cache for Redis supports only database 0. Added a caveat that the post's DB 0, DB 1, and DB 2 layout does not work on a clustered cache and that separate cache instances or a non-clustered cache are required for that layout.

## Review Notes
- Microsoft documentation now notes that Azure Cache for Redis has a retirement timeline and recommends moving existing instances to Azure Managed Redis. The post remains technically relevant for Azure Cache for Redis, but a future update should consider an Azure Managed Redis version.
- Adobe Commerce documentation strongly recommends Varnish for production full-page caching because it is faster than the built-in full-page cache. The Redis full-page cache configuration shown is valid for Magento's built-in page cache, but production architecture should evaluate Varnish.
- Adobe Commerce 2.4.9 introduced newer Valkey/Symfony cache guidance. The Redis configuration remains documented, but a future version-specific post should distinguish Commerce 2.4.8 and earlier from 2.4.9+ where needed.
