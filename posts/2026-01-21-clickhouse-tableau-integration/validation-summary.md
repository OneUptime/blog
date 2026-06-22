# Validation Summary: How to Connect Tableau to ClickHouse for Enterprise Analytics

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse
- Tableau Desktop
- Tableau Server
- Tableau Prep
- ClickHouse JDBC driver
- ClickHouse ODBC driver
- Tableau connector plugins
- ClickHouse SQL, table engines, materialized views, query cache, data skipping indexes, and access control

## Sources Consulted
- ClickHouse Tableau integration documentation: https://clickhouse.com/docs/integrations/tableau
- Official ClickHouse Tableau JDBC connector repository: https://github.com/ClickHouse/clickhouse-tableau-connector-jdbc
- ClickHouse JDBC driver documentation: https://clickhouse.com/docs/integrations/language-clients/java/jdbc
- ClickHouse ODBC driver documentation: https://clickhouse.com/docs/interfaces/odbc
- ClickHouse CREATE USER documentation: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse data skipping index documentation: https://clickhouse.com/docs/sql-reference/statements/alter/skipping-index
- ClickHouse query cache documentation: https://clickhouse.com/docs/operations/query-cache
- Tableau JDBC customization documentation: https://help.tableau.com/current/pro/desktop/en-us/connect_customize.htm
- Tableau Custom SQL documentation: https://help.tableau.com/current/pro/desktop/en-us/customsql.htm
- Tableau tabcmd command documentation: https://help.tableau.com/current/server/en-us/tabcmd_cmd.htm

## Issues Found
- The architecture diagram showed the JDBC driver using ClickHouse's native protocol. Updated it to show JDBC and ODBC using the HTTP/HTTPS interface, matching the current ClickHouse Java/JDBC implementation.
- The JDBC setup used an outdated ClickHouse JDBC 0.6.0 artifact and omitted the Tableau `.taco` connector file. Updated the example to use the current 0.9.8 shaded JDBC artifact and the official ClickHouse Tableau connector release.
- The Tableau properties example used an invalid INI-style block for a Java properties file. Replaced it with plain JDBC connection properties and the correct connector-oriented filename.
- The JDBC URL omitted the explicit `https` protocol form expected by current ClickHouse JDBC URL syntax. Updated the connection string.
- The ODBC DSN example mixed server/port/SSL fields with an ini-style driver path. Updated it to use the official `Url` parameter and registered Unicode driver name.
- The ClickHouse read-only user used `readonly = 1`, which would block Tableau Initial SQL settings. Changed it to `readonly = 2` so read queries remain enforced while session settings can be changed.
- The summary table used `SummingMergeTree` with `uniq(customer_id)`, which can overcount unique customers across merged parts. Replaced it with `AggregatingMergeTree`, `AggregateFunction(uniq, ...)`, `uniqState`, and a Tableau-facing view using `uniqMerge`.
- The Custom SQL example used a multi-value `IN (<Parameters.Selected Regions>)` pattern even though Tableau parameters replace literal values, not arbitrary expression lists. Changed it to a single selected region parameter.
- The data skipping index example did not materialize indexes for existing data. Added `MATERIALIZE INDEX` statements.
- The Tableau Server YAML example was not a native Tableau Server configuration format. Replaced it with a `tabcmd publish` example for a prepared `.tdsx` data source package.
- The row-level security example compared Tableau usernames to `currentUser()` while using a shared ClickHouse user and left segment filters unused. Clarified that the view applies when Tableau connects with per-user database credentials and added the segment filter.
- The KPI revenue change query filtered to the current period and then compared against rows excluded by the `WHERE` clause. Expanded the window to 60 days and used `sumIf` for current and previous periods.
- The time series comparison query grouped previous-period revenue on the previous dates instead of aligning it with current dates. Rewrote it with a shifted previous-period subquery.
- The Top N query filtered a window-function alias with `HAVING`, which is not the right clause for window results in ClickHouse. Rewrote it to aggregate in a subquery and filter the window result with `QUALIFY`.

## Review Notes
The guide is technically relevant and salvageable. Some examples still assume representative table schemas and deployment conventions; in a production post, it would be useful to mention that column types such as `customer_id`, `amount`, and ODBC driver names may need adjustment for the reader's environment.
