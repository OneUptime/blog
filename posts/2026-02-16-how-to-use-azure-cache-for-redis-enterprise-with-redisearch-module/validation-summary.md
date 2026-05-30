# Validation Summary: How to Use Azure Cache for Redis Enterprise with RediSearch Module

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Cache for Redis Enterprise
- Azure CLI redisenterprise extension
- Redis Search / RediSearch
- Redis hashes
- Python
- redis-py

## Sources Consulted
- Microsoft Learn: Azure Cache for Redis overview and tier/module support, https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview
- Microsoft Learn: Azure Cache for Redis retirement announcement and dates, https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new
- Microsoft Learn: az redisenterprise CLI reference, https://learn.microsoft.com/en-us/cli/azure/redisenterprise?view=azure-cli-latest
- Microsoft Learn: az redisenterprise database CLI reference, https://learn.microsoft.com/en-us/cli/azure/redisenterprise/database?view=azure-cli-latest
- Microsoft Learn: Azure Redis modules and RediSearch policy requirements, https://learn.microsoft.com/en-us/azure/redis/redis-modules
- Microsoft Learn: Enterprise tier best practices and RediSearch clustering policy requirement, https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-enterprise-tiers
- Redis docs: FT.CREATE command and HASH/PREFIX indexing behavior, https://redis.io/docs/latest/commands/ft.create/
- Redis docs: Redis Search indexing and query concepts, https://redis.io/docs/latest/develop/ai/search-and-query/
- Redis docs: redis-py index and query examples, https://redis.io/docs/latest/develop/clients/redis-py/queryjson/
- redis-py documentation: current search import paths and command APIs, https://redis.readthedocs.io/en/stable/examples/search_json_examples.html
- Redis knowledge base: index updates are synchronous and add write CPU cost, https://redis.io/kb/doc/2cxjc2a8ux/whenever-indexed-data-changes-is-the-index-update-a-blocking-operation

## Issues Found
- The setup flow presented new Azure Cache for Redis Enterprise cache creation as currently available. Microsoft now blocks creation of new Enterprise and Enterprise Flash caches as of April 1, 2026, so I added a caveat that the commands are for existing Azure Cache for Redis Enterprise environments and that new deployments should use Azure Managed Redis.
- The endpoint retrieval command queried `resourceState`, which returns status rather than the Redis host name. I changed it to `az redisenterprise show --query "hostName" --output tsv`.
- The redis-py install comment said `redis[hiredis]` installs search extras. Search commands are part of redis-py; `hiredis` is an optional parser. I corrected the comment and quoted the package spec.
- The Python example imported `IndexDefinition` from the older `redis.commands.search.indexDefinition` path. I updated it to the current `redis.commands.search.index_definition` import path.
- The index-drop example used a bare `except`. I changed it to catch `redis.exceptions.ResponseError`, matching the expected Redis error for a missing index without hiding unrelated failures.
- The performance section said indexing happens asynchronously during writes. Redis documents index creation and updates as synchronous work, so I changed the wording to explain that index updates add write CPU cost and that pipelines reduce client round trips.

## Review Notes
The Azure Cache for Redis Enterprise content remains useful for existing Enterprise caches during the retirement window, but future updates should consider retargeting the tutorial to Azure Managed Redis because new Azure Cache for Redis Enterprise cache creation is blocked.
