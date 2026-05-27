# Validation Summary: How to Use BigQuery Wildcard Tables to Query Multiple Date-Sharded Tables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery wildcard tables
- BigQuery `_TABLE_SUFFIX` pseudocolumn
- BigQuery partitioned tables
- Google Analytics 4 BigQuery Export
- `bq` command-line tool

## Sources Consulted
- BigQuery wildcard table documentation: https://cloud.google.com/bigquery/docs/querying-wildcard-tables
- BigQuery partitioned tables documentation: https://cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery partitioned table creation documentation: https://cloud.google.com/bigquery/docs/creating-partitioned-tables
- BigQuery `bq` command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery run query documentation: https://cloud.google.com/bigquery/docs/running-queries
- GA4 BigQuery Export schema documentation: https://support.google.com/analytics/answer/7029846

## Issues Found
- The "Specific Month" example used `_TABLE_SUFFIX LIKE '202602%'`. BigQuery's wildcard table documentation shows suffix pruning with constant comparison predicates such as equality and `BETWEEN`, and separately warns that some pattern predicates such as regular expressions can scan all matching tables. Changed the example to `_TABLE_SUFFIX BETWEEN '20260201' AND '20260228'` so it uses the documented range-filter pattern for a complete February 2026 date shard range.
- The first GA4 wildcard query used `events_*` with only a lower `_TABLE_SUFFIX` bound. GA4 can create both `events_YYYYMMDD` and `events_intraday_YYYYMMDD` tables, and `events_*` matches both names. Added an upper bound through `CURRENT_DATE()` so the example returns daily tables for the stated last-7-days range and does not unintentionally include intraday suffixes.
- The troubleshooting section said a query selecting a column missing from one shard would "fail on table B's rows." BigQuery wildcard queries fail the query when matched table schemas are incompatible. Reworded this to say the query fails.

## Review Notes
The `bq` CLI was not installed locally, so CLI flags were verified against the official BigQuery CLI reference and run-query documentation instead of local `bq query --help`. The post's dry-run command, backtick quoting, `_TABLE_SUFFIX` usage, partitioned-table recommendation, GA4 table naming, and selected-column cost guidance match official documentation after the fixes above.
