# Validation Summary: How to Set Up Geo-Replication for Azure Cache for Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cache for Redis
- Azure Cache for Redis passive geo-replication
- Azure Cache for Redis active geo-replication
- Azure CLI
- Redis CLI
- Python redis client
- Azure Monitor metrics and alerts

## Sources Consulted
- Microsoft Learn: Configure passive geo-replication for Premium Azure Cache for Redis instances - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-geo-replication
- Microsoft Learn: Configure active geo-replication for Enterprise Azure Cache for Redis instances - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-active-geo-replication
- Microsoft Learn: Azure CLI `az redis server-link` reference - https://learn.microsoft.com/en-us/cli/azure/redis/server-link
- Microsoft Learn: Azure CLI `az redis create` reference - https://learn.microsoft.com/en-us/cli/azure/redis
- Microsoft Learn: Monitoring data reference for Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/monitor-cache-reference
- redis-py documentation: Commands / Redis client API - https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The active geo-replication description said failover is automatic. Updated it to describe active-active behavior more accurately and note that force unlink can be required when a replica is unavailable.
- The prerequisites said both caches must have the same SKU size. Updated this to match Azure's documented rule: the secondary can be the same size or larger, but geo-failover requires the same size.
- The prerequisites omitted same-subscription, same Redis server version, one-replica-per-primary-per-shard, and no-persistence requirements. Added those constraints.
- The Azure CLI link command was reversed. Updated `az redis server-link create` to run against the primary cache and link the secondary cache with `--replication-role Secondary`.
- The unlink command was reversed. Updated `az redis server-link delete` to run against the primary cache with the secondary as `--linked-server-name`.
- The monitoring examples used a non-current metric name, `ReplicationLag`. Replaced it with Azure Monitor's documented `GeoReplicationConnectivityLag` metric.
- The limitations section incorrectly described persistence as supported independently on linked caches. Updated it to state that persistence is not supported with passive geo-replication.
- The failover wording implied unlinking is the only promotion process. Clarified that passive geo-replication supports manual failover, and that the shown steps are the unlink-based approach.

## Review Notes
Azure Cache for Redis documentation now includes a retirement notice recommending migration to Azure Managed Redis. The post remains technically relevant for existing Azure Cache for Redis deployments, but a future content update should consider adding migration context.
