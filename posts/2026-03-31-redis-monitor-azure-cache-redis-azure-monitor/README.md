# How to Monitor Azure Cache for Redis with Azure Monitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, Azure Monitor, Monitoring, Observability

Description: Learn how to use Azure Monitor to track key Azure Cache for Redis metrics, set up alerts for memory and connection issues, and build a monitoring dashboard.

---

Azure Cache for Redis integrates natively with Azure Monitor, exposing dozens of metrics. The most important ones to watch are memory usage, CPU, evictions, connected clients, and cache hit rate.

## Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|---|---|---|
| `usedmemorypercentage` | Percent of max memory used | > 80% |
| `cachemisses` | Number of failed key lookups | increasing trend |
| `evictedkeys` | Keys removed due to maxmemory | > 0 |
| `connectedclients` | Active connections | > 80% of limit |
| `serverLoad` | Redis CPU load (0-100) | > 80 |
| `errors` | Command errors | > 0 per minute |

## Viewing Metrics via CLI

```bash
# Check memory usage over the last hour
az monitor metrics list \
  --resource /subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.Cache/Redis/my-redis \
  --metric "usedmemorypercentage" \
  --interval PT5M \
  --start-time 2026-03-31T08:00:00Z \
  --end-time 2026-03-31T09:00:00Z \
  --query "value[0].timeseries[0].data[*].{Time:timeStamp,Avg:average}"
```

## Creating an Alert Rule

Alert when memory usage exceeds 85%:

```bash
az monitor metrics alert create \
  --name "redis-high-memory" \
  --resource-group rg-prod \
  --scopes /subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.Cache/Redis/my-redis \
  --condition "avg usedmemorypercentage > 85" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --action /subscriptions/<sub>/resourceGroups/rg-prod/providers/microsoft.insights/actionGroups/ops-team
```

## Terraform Alert Rules

```hcl
resource "azurerm_monitor_metric_alert" "redis_memory" {
  name                = "redis-high-memory"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_redis_cache.main.id]
  severity            = 2
  window_size         = "PT5M"
  frequency           = "PT1M"

  criteria {
    metric_namespace = "Microsoft.Cache/Redis"
    metric_name      = "usedmemorypercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops.id
  }
}

resource "azurerm_monitor_metric_alert" "redis_evictions" {
  name                = "redis-evictions"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_redis_cache.main.id]
  severity            = 1
  window_size         = "PT5M"
  frequency           = "PT1M"

  criteria {
    metric_namespace = "Microsoft.Cache/Redis"
    metric_name      = "evictedkeys"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 0
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops.id
  }
}
```

## Enabling Diagnostic Logs

```bash
az monitor diagnostic-settings create \
  --name redis-diagnostics \
  --resource /subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.Cache/Redis/my-redis \
  --logs '[{"category":"ConnectedClientList","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]' \
  --workspace /subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.OperationalInsights/workspaces/my-workspace
```

## Summary

Azure Monitor provides native Redis metrics without any agents. Set alerts on `usedmemorypercentage`, `evictedkeys`, and `serverLoad` at minimum. Enable diagnostic settings to send metrics and connection logs to a Log Analytics workspace for historical analysis. Complement Azure Monitor with [OneUptime](https://oneuptime.com) for end-to-end application health monitoring that correlates Redis performance with API latency.
