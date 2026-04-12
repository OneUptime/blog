# Validation Summary: How to Monitor Azure Cache for Redis with Azure Monitor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cache for Redis
- Azure Monitor
- Azure CLI (`az monitor`)
- Terraform (azurerm provider)
- Azure Diagnostic Settings
- Log Analytics Workspace

## Sources Consulted
- Microsoft Azure Monitor supported metrics for Microsoft.Cache/Redis: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-cache-redis-metrics
- Azure Cache for Redis monitoring data reference: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/monitor-cache-reference
- Azure CLI `az monitor metrics list` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Azure CLI `az monitor metrics alert create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Terraform azurerm_monitor_metric_alert resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert

## Issues Found

### 1. Incorrect metric name: `usedmemory_percentage`
- **What was wrong:** The post used `usedmemory_percentage` (with underscore) throughout the metrics table, CLI commands, Terraform config, and summary section.
- **What was changed:** Replaced with `usedmemorypercentage` (no underscore, all lowercase) — the correct Azure Monitor metric ID.
- **Why:** Azure Cache for Redis metric IDs do not use underscores. The correct ID is `usedmemorypercentage` as documented in the Azure Monitor supported metrics reference.

### 2. Non-existent metric: `cache_hit_ratio`
- **What was wrong:** The post listed `cache_hit_ratio` as a key metric with description "Hit rate (0-1)" and threshold "< 0.8". This metric does not exist in Azure Monitor for Microsoft.Cache/Redis.
- **What was changed:** Replaced with `cachemisses` (number of failed key lookups) with threshold "increasing trend".
- **Why:** Azure Cache for Redis exposes `cachehits` and `cachemisses` as separate count metrics, not a pre-calculated ratio. There is no `cache_hit_ratio` metric ID. `cachemisses` is the more actionable metric for alerting.

### 3. Incorrect metric name: `server_load`
- **What was wrong:** The post used `server_load` (with underscore) in the metrics table and summary.
- **What was changed:** Replaced with `serverLoad` (camelCase, no underscore) — the correct Azure Monitor metric ID.
- **Why:** This metric uses camelCase (`serverLoad`), not snake_case. Azure Cache for Redis metric naming is inconsistent — some are all lowercase (`evictedkeys`), some are camelCase (`serverLoad`, `cacheRead`).

## Review Notes
- Azure Cache for Redis metric naming conventions are inconsistent across the API (mix of all-lowercase and camelCase). The post could benefit from a note about this to help readers find correct metric names.
- The Terraform and CLI examples are structurally correct and follow current best practices.
- The diagnostic settings command correctly references the `ConnectedClientList` log category and `AllMetrics` metric category.
- The evictions alert uses severity 1 (Error) while memory uses severity 2 (Warning) — this is a valid design choice but readers should adjust based on their operational requirements.
