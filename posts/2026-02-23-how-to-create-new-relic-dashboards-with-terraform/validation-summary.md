# Validation Summary: How to Create New Relic Dashboards with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- New Relic Terraform provider (`newrelic/newrelic` ~> 3.0)
- `newrelic_one_dashboard` resource
- NRQL (New Relic Query Language)
- New Relic event types: Transaction, TransactionError, PageView, SystemSample, Span
- Widget types: line, billboard, bar, pie, markdown, table

## Sources Consulted
- New Relic Provider Configuration: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/guides/provider_configuration
- newrelic_one_dashboard resource: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/one_dashboard
- v2 Migration Guide (api_key rename): https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/guides/migration_guide_v2
- NRQL Syntax, Clauses & Functions: https://docs.newrelic.com/docs/nrql/nrql-syntax-clauses-functions/
- NRQL percentile() improvements: https://docs.newrelic.com/docs/nrql/using-nrql/improvements-nrql-percentile/
- Default Infrastructure data (SystemSample attributes): https://docs.newrelic.com/docs/infrastructure/infrastructure-data/default-infra-data/
- New Relic data dictionary: https://docs.newrelic.com/attribute-dictionary/
- Browser monitoring events (PageView/session): https://docs.newrelic.com/docs/data-apis/understand-data/event-data/events-reported-browser-monitoring/

## Issues Found
1. **`DatabaseQuery` event type does not exist in New Relic.** The "Database Dashboard" section originally queried `FROM DatabaseQuery`, which is not a standard New Relic event. Database/query performance data is captured in `Span` events (with `category = 'datastore'` and the `db.statement` attribute) when distributed tracing is enabled, or in `Transaction` via `databaseDuration`. Updated both NRQL queries in the Database Dashboard to use `FROM Span WHERE category = 'datastore'` and `FACET db.statement` so the queries actually return data against a real schema.

## Review Notes
- Provider attribute `api_key` is correct for v2.x/3.x of the provider (replaced the older `personal_api_key` from v1.x); the User API key (NRAK-prefixed) is expected.
- `permissions = "public_read_only"` is a valid value (alongside `private` and `public_read_write`).
- All widget types referenced (`widget_line`, `widget_billboard`, `widget_bar`, `widget_pie`, `widget_markdown`, `widget_table`) exist in the provider; `widget_markdown` correctly uses a `text` attribute instead of `nrql_query`.
- `critical` and `warning` are valid simple numeric attributes on `widget_billboard`.
- NRQL forms verified: `percentage(count(*), WHERE ...)`, `apdex(duration, t: ...)`, multi-value `percentile(duration, 50, 90, 95, 99)`, and `uniqueCount(session) FROM PageView` are all current syntax.
- `SystemSample` attributes (`cpuPercent`, `memoryUsedPercent`, `diskUsedPercent`) are real and reported by the Infrastructure agent.
- `TransactionError` with `error.class` faceting is the documented pattern for error breakdowns.
- The semicolon-on-one-line variable declarations (`{ type = string; sensitive = true }`) are valid HCL; semicolons are accepted as attribute terminators in HCL2 native syntax.
