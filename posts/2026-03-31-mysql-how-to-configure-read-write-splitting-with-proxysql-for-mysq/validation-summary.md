# Validation Summary: How to Configure Read-Write Splitting with ProxySQL for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (replication, primary/replica topology)
- ProxySQL (query rules, hostgroups, monitoring, admin interface)
- Read-write splitting / load balancing

## Sources Consulted
- ProxySQL official documentation: https://proxysql.com/documentation/
- ProxySQL wiki on `mysql_query_rules`: https://proxysql.com/documentation/main-runtime/#mysql_query_rules
- ProxySQL wiki on `stats_mysql_query_rules`: https://proxysql.com/documentation/stats-statistics/
- ProxySQL wiki on global variables (monitor settings): https://proxysql.com/documentation/global-variables/mysql-variables/
- ProxySQL wiki on `mysql_users` and `mysql_servers` tables

## Issues Found

1. **Wrong table in monitoring query (Monitoring Rule Hit Counts section):** The query selected `rule_id, hits, destination_hostgroup` from `mysql_query_rules`, but the `hits` column does not exist in `mysql_query_rules` — it exists only in `stats_mysql_query_rules`. Additionally, `destination_hostgroup` is not a column in the stats table. Fixed by changing the query to join `stats_mysql_query_rules` with `runtime_mysql_query_rules` to get both `hits` and `destination_hostgroup`.

2. **Misleading text about a separate read-only user (Configuring the Application User section):** The text said "Add a separate read-only user pointing to the read group for explicit separation" but the code only creates a single user. The query rules handle read routing, so no second user is needed. Fixed the text to accurately describe what the code does.

3. **Missing quotes on variable value (Multiplexing and Connection Stickiness section):** `SET variable_value=1` was inconsistent with the rest of the post where string quotes are used (e.g., `variable_value='5000'`). Since `variable_value` is a TEXT column, changed to `variable_value='1'` for consistency and correctness.

## Review Notes
- The `mysql-monitor_slave_lag_when_null` variable is set to 60000, while the default is 60 (seconds). Since `max_replication_lag` is set to 30, both values effectively evict replicas when lag is unknown (both 60 and 60000 exceed 30). The value works correctly but is unusually high — the default of 60 would be more conventional.
- The `mysql-monitor_slave_lag_when_null` variable name uses "slave" terminology which is legacy MySQL/ProxySQL naming. This is the correct variable name in current ProxySQL versions — it has not been renamed.
- The post uses ProxySQL's default port 6033, which is correct.
- All `LOAD ... TO RUNTIME` and `SAVE ... TO DISK` commands are correctly paired throughout.
