# Validation Summary: How to Monitor Azure Cache for Redis Performance and Memory Usage

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Azure Cache for Redis
- Azure Managed Redis
- Azure Monitor metrics and alerts
- Azure CLI
- Redis CLI and Redis INFO command
- Azure Monitor Logs / KQL

## Sources Consulted
- Microsoft Learn: Monitor Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/redis/monitor-cache
- Microsoft Learn: Monitoring data reference for Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/monitor-cache-reference
- Microsoft Learn: Supported metrics for Microsoft.Cache/redis - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-cache-redis-metrics
- Microsoft Learn: az monitor metrics - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: What is Azure Cache for Redis? - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview
- Microsoft Learn: What's New in Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new
- Redis command reference: INFO - https://redis.io/docs/latest/commands/info/

## Issues Found
- The Azure Monitor metric name for Used Memory RSS was written as `usedmemory_rss`, which is the Redis INFO-style naming pattern, not the Azure Monitor REST metric name. Changed it to `usedmemoryRss`.
- The Memory Fragmentation Ratio entry implied a direct Azure Monitor metric. Clarified that it is derived from RSS divided by used memory or available as `mem_fragmentation_ratio` from `INFO memory`.
- The Azure CLI examples used `date -u -v-...`, which is BSD/macOS-specific and fails in common GNU/Linux shells such as Azure Cloud Shell. Replaced the examples with GNU/Linux-compatible `date -u -d '...'` syntax.
- The alert section said evictions start at 85% memory usage. Evictions are tied to the `maxmemory` limit and policy, not an 85% threshold. Reworded the sentence to describe reduced headroom and possible eviction or write rejection if memory continues rising.
- The dashboard checklist referred to "Cache Latency P99"; the official Azure Monitor metric is "99th percentile latency" with REST name `LatencyP99`. Updated the label.
- Microsoft has announced retirement timelines for Azure Cache for Redis and recommends migration to Azure Managed Redis. Added a short caveat in the introduction while keeping the guide applicable to existing Azure Cache for Redis instances.

## Review Notes
The local environment did not have Azure CLI installed, so CLI syntax was verified against Microsoft Learn rather than local `az --help`. Alert thresholds such as 70%, 80%, and 85% are operational guidance, not Azure-enforced limits, and should be tuned per workload.
