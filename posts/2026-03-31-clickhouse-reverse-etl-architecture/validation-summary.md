# Validation Summary: How to Use ClickHouse in a Reverse ETL Architecture

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL engine, `clickhouse-client` CLI)
- Reverse ETL concepts (Hightouch, Census)
- HubSpot CRM import API (v3)
- Salesforce (as a sync destination)
- cron scheduling
- CSV export with `FORMAT CSVWithNames`

## Sources Consulted
- ClickHouse SQL documentation — SELECT, GROUP BY, HAVING, alias scoping: https://clickhouse.com/docs/en/sql-reference/statements/select
- ClickHouse date functions (`today()`, date arithmetic): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `clickhouse-client` CLI reference: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse `FORMAT CSVWithNames`: https://clickhouse.com/docs/en/interfaces/formats#csvwithnames
- ClickHouse `LowCardinality` type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- HubSpot CRM Imports API (v3): https://developers.hubspot.com/docs/api/crm/imports
- Hightouch ClickHouse source documentation: https://hightouch.com/docs/sources/clickhouse
- Census ClickHouse source documentation: https://docs.getcensus.com/sources/clickhouse

## Issues Found

### 1. SELECT alias used in WHERE clause (lines 28–40)
**What was wrong:** The original query used `WHERE order_count >= 2`, but `order_count` is a column alias defined in the SELECT clause via `count(DISTINCT order_id) AS order_count`. In standard SQL and in ClickHouse, SELECT aliases are not available in the WHERE clause because WHERE is evaluated before SELECT expressions. This query would fail with an "Unknown identifier: order_count" error.

**What was changed:** Removed the `WHERE order_count >= 2` clause and moved the condition into the `HAVING` clause as `HAVING order_count >= 2 AND lifetime_value_usd > 500`. ClickHouse allows referencing SELECT aliases in HAVING (which is evaluated after GROUP BY and aggregation), so both conditions now work correctly.

**Why:** HAVING is the correct clause for filtering on aggregate results. The original placement in WHERE was syntactically invalid for an aggregate alias.

## Review Notes
- The HubSpot import API example is simplified for illustration. The real API requires additional fields in the `importRequest` JSON such as `columnMapping` to map CSV columns to HubSpot properties. This is acceptable for a conceptual blog post but readers implementing this will need to consult the full HubSpot API docs.
- The `clickhouse-client --query` usage and `FORMAT CSVWithNames` are correct and standard.
- The cron syntax `0 */4 * * *` (every 4 hours at minute 0) is valid.
- The `MergeTree()` table definition for `reverse_etl_log` is syntactically correct. `ORDER BY sync_time` is a reasonable choice for a time-series log table.
- The `LowCardinality(String)` type for `status` is a good ClickHouse practice for low-cardinality string columns.
- The Hightouch/Census section is presented as pseudocode configuration, which is appropriate — both tools do support ClickHouse as a source.
