# Validation Summary: How to Build Real-Time Alerting with ClickHouse

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- ClickHouse (SQL DDL, MergeTree engines, ReplacingMergeTree, materialized views, TTL, FINAL keyword, mutations)
- Python (clickhouse_connect client library, requests library)
- Slack Webhooks
- Kafka (mentioned in architecture)

## Sources Consulted
- ClickHouse documentation on MergeTree engine family: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse documentation on materialized views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse documentation on ALTER TABLE UPDATE (mutations): https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse documentation on Bool type: https://clickhouse.com/docs/en/sql-reference/data-types/boolean
- ClickHouse documentation on arithmetic operators (division returns Float64): https://clickhouse.com/docs/en/sql-reference/operators#arithmetic
- ClickHouse documentation on EXISTS subqueries: https://clickhouse.com/docs/en/sql-reference/operators/exists
- clickhouse-connect Python client documentation: https://clickhouse.com/docs/en/integrations/python
- Slack Incoming Webhooks API: https://api.slack.com/messaging/webhooks

## Issues Found
1. **Operator precedence bug in Alert Evaluation Query (line 112-119):** The `WHERE` clause had `OR` and `AND NOT EXISTS` without proper grouping parentheses. Since SQL `AND` binds tighter than `OR`, the `NOT EXISTS` deduplication check only applied to the `lt` condition, not the `gt` condition. This meant all "greater than" threshold alerts would fire on every evaluation cycle without deduplication, causing alert storms. **Fix:** Added parentheses around the two OR-ed threshold conditions so that `NOT EXISTS` applies to both: `((d.condition = 'gt' AND ...) OR (d.condition = 'lt' AND ...)) AND NOT EXISTS (...)`.

## Review Notes
- The `alert_id` column in `alert_events` is never populated by the Alert Evaluation INSERT query. It will always contain the zero UUID (`00000000-0000-0000-0000-000000000000`). The column could be given a `DEFAULT generateUUIDv4()` or be removed from the table definition.
- The `window_seconds` column in `alert_definitions` is defined but never referenced in any of the evaluation queries. The metric aggregation window is hardcoded to 5 minutes in the evaluation query instead.
- ClickHouse mutations (`ALTER TABLE ... UPDATE`) are asynchronous. The `notified = true` update in the Python dispatcher may not be visible immediately, which could cause duplicate notifications on the next poll cycle. A production system should either check mutation completion or use a separate tracking table with a standard INSERT.
- The Python dispatcher uses f-string interpolation to build SQL for the mutation, which is a SQL injection anti-pattern. While the data originates from the database itself (not user input), a production implementation should use parameterized queries.
- The spike detection query has a potential division-by-zero if `b.avg_cnt` is 0 (no baseline data). A production version should handle this with `if(b.avg_cnt > 0, c.cnt / b.avg_cnt, 0)` or similar.
- All ClickHouse SQL syntax is valid for ClickHouse 22.x+ (current LTS and recent versions).
