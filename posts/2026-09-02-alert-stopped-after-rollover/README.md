# Why Did an OpenSearch Alert Stop Firing After an Index Rollover? Fixing Aliases and Monitor Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Alerting, Index Management, Monitoring, Troubleshooting

Description: Keep OpenSearch monitors on a stable data stream or rollover alias and verify query, mapping, and creator permissions after each generation change.

---

A monitor stores its own search input. If that input names `logs-app-000001`, it keeps querying that concrete index after rollover writes move to `logs-app-000002`. Updating a Dashboards index pattern does not update the monitor.

The durable target is a data stream or an index alias that continues to cover the intended generations.

## Confirm where new documents are going

```http
GET _cat/indices/logs-app-*?v&s=index
GET _alias/logs-app?pretty
GET _data_stream/logs-app
```

One of the last two requests should identify the stable abstraction. For an alias pointing to multiple indexes, exactly one must have `is_write_index: true` if clients write through the alias.

Fetch the monitor and inspect its `inputs[].search.indices` array:

```http
GET _plugins/_alerting/monitors/MONITOR_ID
```

Then run the monitor without actions:

```http
POST _plugins/_alerting/monitors/MONITOR_ID/_execute?dryrun=true
```

Compare that result with the same search against the newest concrete index. This separates an index-target failure from a trigger or notification failure.

## Repair a rollover alias

A durable regular-index rollover family puts the rollover-alias setting in a template so future generations inherit it, then bootstraps the first write index:

```http
PUT _index_template/logs-app-rollover
{
  "index_patterns": ["logs-app-*"],
  "template": {
    "settings": {
      "plugins.index_state_management.rollover_alias": "logs-app"
    }
  }
}

PUT logs-app-000001
{
  "aliases": {
    "logs-app": {
      "is_write_index": true
    }
  }
}
```

Inspect other matching composable templates and their priorities before installing this example. The bootstrap index needs the setting too, but it should receive it from the template rather than from a one-generation-only index setting.

After rollover, the alias should include old generations for search and designate only the newest for writes. The Manage Aliases API performs changes atomically:

```http
POST _aliases
{
  "actions": [
    {
      "add": {
        "index": "logs-app-000001",
        "alias": "logs-app",
        "is_write_index": false
      }
    },
    {
      "add": {
        "index": "logs-app-000002",
        "alias": "logs-app",
        "is_write_index": true
      }
    }
  ]
}
```

Resolve the existing alias state before applying this example. Do not guess generation names or change a live write target without coordinating the shipper and ISM policy.

Update the monitor through the Alerting UI or API so its indices array uses `logs-app`, then dry-run it again. Keep the monitor's time range relative to the scheduled period so it does not repeatedly scan all retained generations.

## Prefer a data stream for append-only logs

Data streams route writes to the newest backing index and searches across all backing indexes under one name. A monitor that queries `logs-app` remains valid across stream rollover without manual alias bookkeeping.

Do not query `.ds-logs-app-*` from the monitor. Those hidden names are backing-index implementation details.

## Check the other rollover boundaries

If the stable name already works but the monitor still fails, verify:

### Mapping consistency

```http
POST logs-app/_field_caps?fields=@timestamp,log.level,service.name,error.code
```

A new generation may have missed the intended template or mapped a field to a conflicting type. The monitor can return a shard failure even while Discover shows some data.

### Time field and time zone

Confirm new documents carry the field used by the monitor's range query and that it is a `date`. Compare the newest event timestamp with `ctx.periodStart`/`ctx.periodEnd` from the dry run.

### Creator permissions

Alerting monitors use the permissions of the user who created them. That user may have access only to the original concrete index, while the new generation falls outside its role. Grant read access to the stable, narrowly scoped pattern (for example, `logs-app-*`) and recreate/update the monitor under the intended service identity according to your security process.

### ISM state

```http
GET _plugins/_ism/explain/logs-app-*?validate_action=true
```

Check for “missing alias,” “not the write index,” a missing rollover-alias setting, a blocked index, or a policy not attached to the new generation.

### Notification health

If the dry run says the trigger is true, the index query is no longer the problem. Inspect action results and Notifications channel status. Keep query failures, trigger false, throttled actions, and delivery failures as distinct alert-health signals.

## Regression-test rollover

In staging, index a matching event, force or manually perform a controlled rollover, index another matching event through the stable write name, and execute the monitor dry. Verify that both generations are searchable and the new event can trigger. Repeat this whenever changing the template, alias, data stream, ISM policy, or monitor creator role.

## Official References

- [OpenSearch index aliases](https://docs.opensearch.org/latest/im-plugin/index-alias/)
- [OpenSearch Manage Aliases API](https://docs.opensearch.org/latest/api-reference/alias/aliases-api/)
- [OpenSearch ISM rollover policy requirements](https://docs.opensearch.org/latest/im-plugin/ism/policies/)
- [OpenSearch data streams](https://docs.opensearch.org/latest/im-plugin/data-streams/)
- [OpenSearch Alerting API](https://docs.opensearch.org/latest/observing-your-data/alerting/api/)
