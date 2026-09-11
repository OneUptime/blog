# Validation Summary: Audit Azure SQL Serverless Pause History and Compute Savings

## Status

validated

## Post Type

Technical guide with Azure CLI commands and Python audit examples.

## Technologies Covered

- Azure SQL Database General Purpose serverless
- Azure Monitor Activity log and metrics
- Azure Cost Management and compute billing
- Azure CLI and Bash
- Python 3 JSON processing
- JMESPath queries

## Sources Consulted

- [Monitor serverless compute](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-monitor?view=azuresql)
- [Serverless compute billing](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-billing?view=azuresql)
- [Serverless auto-pause and auto-resume](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-auto-pause-resume?view=azuresql-db)
- [Azure Activity log and retention](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log)
- [Activity log event schema](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log-schema)
- [Azure SQL database CLI](https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-latest)
- [Activity log CLI](https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log?view=azure-cli-latest)
- [Azure Monitor metrics CLI](https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-latest)
- [Azure SQL supported metrics](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics)
- [Database GET response and properties](https://learn.microsoft.com/en-us/rest/api/sql/databases/get?view=rest-sql-2023-08-01)
- [Metrics List API and response schema](https://learn.microsoft.com/en-us/rest/api/monitor/metrics/list?view=rest-monitor-2023-10-01)
- [Understand Cost Management data](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data)
- [Python JSON library](https://docs.python.org/3/library/json.html)
- [Python built-in functions](https://docs.python.org/3/library/functions.html)
- Local command help: `az sql db show --help`, `az monitor activity-log list --help`, and `az monitor metrics list --help`.

## Issues Found

No technical issues found.

## Review Notes

- README.md was reviewed without modification. All seven Microsoft documentation links resolve to the relevant resources. No deprecated commands or APIs were identified in the examples.
- Confirmed the General Purpose auto-pause scope, documented database states, Activity log pause/resume history, and resume-trigger information in Started and Succeeded events. Management operations and service updates can cause resumes. Treating caller evidence as potentially incomplete is appropriate.
- Verified resource lookup, resource-ID selection, JSON/TSV output, query syntax, explicit UTC windows, and Activity log filtering options. The Activity log CLI defaults to 50 events; the explicit limit and truncation guidance are appropriate. The event schema supports eventDataId deduplication and correlation-based investigation. Retention is 90 days unless events are exported elsewhere.
- Verified Total aggregation for app_cpu_billed. The generic metrics catalog labels its unit Count, while the serverless-specific documentation defines its meaning as vCore-seconds; the post uses the correct interpretation. Official CLI examples support the singular --metric spelling and ISO 8601 intervals.
- Confirmed CPU/memory-based compute billing, the memory-dependent minimum floor, no compute charges while paused, continuing storage charges, and conversion from vCore-seconds to vCore-hours. Reconciliation with actual billing and explicit baseline assumptions are appropriate.
- All three Bash blocks passed bash -n. Both Python blocks passed syntax parsing. The event example was executed against synthetic event data; the metric example passed cases covering positive usage with zero and missing totals, no series, all-null totals, and zero-only usage.
- The missing_total_points output counts returned points without totals. It does not prove full temporal coverage when timestamps are omitted entirely; the post appropriately requires a separate coverage review before accepting the sum.
- Validation used official documentation, local CLI help, and synthetic fixtures. No live Azure resource queries or actual billing reconciliation were performed. Operational use requires an authenticated Azure CLI context, appropriate read access, and substitution of the example resource and audit window.
