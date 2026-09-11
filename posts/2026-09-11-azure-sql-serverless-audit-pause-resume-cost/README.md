# Audit Azure SQL Serverless Pause History and Compute Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Serverless, Monitoring, Cost Optimization, Azure

Description: Correlate Azure SQL serverless pause and resume events with billed vCore-seconds, identify wake-up callers, and verify savings against billing data.

---

A database that displays `Paused` once has demonstrated a state transition, not a month of savings. To evaluate Azure SQL serverless, build a timeline of pause and resume events and compare it with billed compute for the same resource and time window.

Use management-plane observations so the audit does not repeatedly connect to SQL and wake the database. Keep event evidence, metric totals, and billing records distinct: each answers a different question.

## Define the database and audit window

This workflow targets General Purpose serverless with auto-pause enabled. Record the database resource ID, UTC window, service tier, configured delay, and minimum capacity.

```bash
sql_resource_group=rg-data
sql_server=orders-prod
sql_database=orders
sql_audit_start=2026-09-01T00:00:00Z
sql_audit_end=2026-09-08T00:00:00Z

sql_resource_id=$(az sql db show \
  --resource-group "$sql_resource_group" \
  --server "$sql_server" --name "$sql_database" \
  --query id --output tsv)

az sql db show --ids "$sql_resource_id" \
  --query '{status:status,sku:sku,autoPauseDelay:autoPauseDelay,minCapacity:minCapacity}' \
  --output json
```

Substitute a window relevant to your investigation. Prefer a complete UTC day or week so activity and cost exports align. If capacity or pricing changed midway, split the analysis at that change rather than multiplying all usage by one assumed rate.

## Export Activity log evidence

Microsoft exposes pause and resume history through the database's Activity log. Export the resource's events before filtering:

```bash
az monitor activity-log list \
  --resource-id "$sql_resource_id" \
  --start-time "$sql_audit_start" \
  --end-time "$sql_audit_end" \
  --max-events 10000 \
  --output json > sql-activity.json
```

The CLI's default event limit is small, so set it explicitly. If the result reaches the configured maximum, split the query into shorter windows and deduplicate by `eventDataId`; a truncated export cannot support a complete timeline.

Inspect operation names and statuses before building a permanent filter:

```python
import json

with open("sql-activity.json") as source:
    events = json.load(source)

for event in sorted(events, key=lambda item: item.get("eventTimestamp", "")):
    operation = event.get("operationName") or {}
    name = operation.get("value", "")
    label = operation.get("localizedValue", "")
    if any(word in (name + " " + label).lower() for word in ("pause", "resume")):
        print(
            event.get("eventTimestamp"),
            name,
            (event.get("status") or {}).get("value"),
            event.get("correlationId"),
            event.get("caller"),
        )
```

This discovery filter prints candidates rather than assuming every matching record is a completed transition. Once the emitted provider operation names are confirmed, use those stable values in the maintained report.

Group Started and Succeeded records by operation and correlation information. Count a successful completion once. A Started event followed by failure is not proof that the database reached the destination state.

## Build an honest pause timeline

Use completed pause and resume operations to reconstruct intervals. Mark the start and end of the audit window as uncertain when you lack a preceding event or status snapshot. Do not count an entire day as paused merely because its first observed event was a resume.

For latency analysis, distinguish the start of resume from its completion. A conservative estimate of fully paused time ends at resume start; a state-duration chart can show the intervening `Resuming` interval separately. Neither reconstruction is a substitute for the metered compute total.

Microsoft's serverless documentation exposes resume-trigger information in the Activity log's `Caller` field. Compare it with deployment identities, scheduled jobs, and management activity. A missing or platform caller should remain unclassified until corroborated; inventing a human owner would make the report misleading.

Preserve enough event detail to explain repeated overnight wake-ups. Application sign-ins are not the only possible triggers: selected management operations and service maintenance can also resume a database.

## Retrieve billed compute for the same window

Use the `app_cpu_billed` metric, whose unit is vCore-seconds, with **Total** aggregation:

```bash
az monitor metrics list \
  --resource "$sql_resource_id" \
  --metric app_cpu_billed \
  --aggregation Total \
  --interval PT1H \
  --start-time "$sql_audit_start" \
  --end-time "$sql_audit_end" \
  --output json > sql-compute-metric.json
```

Sum reported totals while retaining a count of missing values:

```python
import json

with open("sql-compute-metric.json") as source:
    result = json.load(source)

points = [
    point
    for metric in result.get("value", [])
    for series in metric.get("timeseries", [])
    for point in series.get("data", [])
]
values = [point["total"] for point in points if point.get("total") is not None]
if not values:
    raise SystemExit("No billed-compute totals returned; usage is unknown.")
print("reported_vcore_seconds", sum(values))
print("reported_vcore_hours", sum(values) / 3600)
print("missing_total_points", len(points) - len(values))
```

Inspect the response's metric name, time range, and time series before accepting the sum. No series or missing points must not silently become evidence of zero consumption. Keep a coverage note alongside the calculated total.

## Translate usage into a defensible comparison

Serverless compute billing accounts for CPU and memory, with a minimum while the database is online. Therefore, average user CPU is not a reliable proxy for the bill. A paused database incurs no compute charge, but storage and other applicable charges remain.

Multiply billed vCore-seconds by the effective price per vCore-second for the matching region, configuration, agreement, and period. If the price is expressed per vCore-hour, divide usage by 3600 first. Reconcile the estimate with Azure Cost Management's actual resource and meter charges after billing data arrives.

To describe savings, state the baseline explicitly. Comparing with the previous week is useful only when workload, configuration, and prices are comparable. An always-online estimate should use the documented minimum compute floor, including memory effects, rather than assuming the configured minimum vCores alone always determines it.

## Retain evidence for the next audit

Azure Activity log retains events for 90 days by default. Export it to the organization's chosen destination when longer history is required. Store the report's UTC window, resource ID, event coverage, billed usage, effective rate, and baseline assumptions together.

## Conclusion

Verify serverless savings with a pause timeline and billed vCore-seconds for the same window. Use caller evidence to investigate unnecessary wake-ups, preserve gaps honestly, and reconcile compute estimates with actual cost records.

## Official Documentation

- [Monitor serverless pause and resume](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-monitor?view=azuresql)
- [Serverless compute billing](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-billing?view=azuresql)
- [Auto-resume triggers](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-auto-pause-resume?view=azuresql-db)
- [Azure Activity log and retention](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log)
- [Activity log CLI](https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log?view=azure-cli-latest)
- [Azure SQL supported metrics](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics)
- [Azure Monitor metrics CLI](https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-latest)
