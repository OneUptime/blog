# Validation Summary: How to Create a Live View in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (DDL)
- Live Views
- WATCH streaming statement
- MergeTree table engine

## Sources Consulted
- [ClickHouse CREATE VIEW documentation](https://clickhouse.com/docs/en/sql-reference/statements/create/view)
- [ClickHouse WATCH statement documentation](https://clickhouse.com/docs/en/sql-reference/statements/watch)
- [ClickHouse/docs view.md on GitHub](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/statements/create/view.md)
- [Altinity blog — Making Data Come to Life with ClickHouse Live View Tables](https://altinity.com/blog/2019-11-13-making-data-come-to-life-with-clickhouse-live-view-tables)
- [Altinity blog — Taking a Closer Look at ClickHouse Live View Tables](https://altinity.com/blog/2019-12-05-taking-a-closer-look-at-clickhouse-live-view-tables)
- [ClickHouse PR #14822 — Periodically refreshed LIVE VIEW tables](https://github.com/ClickHouse/ClickHouse/pull/14822)

## Issues Found
1. **`WATCH ... EVENTS` semantics were incorrect.** The post stated that EVENTS mode "returns a version counter alongside each result block." Per the archived ClickHouse docs and Altinity's reference material, `WATCH view EVENTS` returns *only* the version counter; result rows are not included. Updated the description to "returns only the version counter (no result rows) on each change."
2. **Deprecation status missing.** The post described Live Views as merely "experimental." The current official ClickHouse documentation explicitly marks Live Views (and the `WATCH` statement) as deprecated and scheduled for removal. Updated the introductory paragraph and the corresponding bullet in the Limitations section to note the deprecation alongside the existing experimental warning.

## Review Notes
- All other SQL and syntax items were verified: `allow_experimental_live_view = 1`, the `CREATE LIVE VIEW ... WITH [TIMEOUT N] [AND] [REFRESH N]` grammar, `WATCH ... LIMIT N`, filtering by `engine = 'LiveView'` in `system.tables`, and `DROP TABLE` for removal all match the documented behavior.
- The limitation that live views only fire on INSERT (not mutations) and are not supported over Distributed tables in all configurations is accurate per upstream issues/PRs.
- Because Live Views are officially deprecated, readers considering production use should prefer Refreshable Materialized Views or `AggregatingMergeTree`-based materialized views; the post already makes this recommendation in the Limitations section.
