# Validation Summary: How to Set Up MySQL Read/Write Splitting with ProxySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (replication setup)
- ProxySQL 2.x (proxy, query routing, admin interface)
- Read/Write Splitting (query rule-based routing)
- MySQL Replication (primary/replica topology)

## Sources Consulted
- ProxySQL official documentation: https://proxysql.com/documentation/
- ProxySQL GitHub wiki — mysql_query_rules: https://github.com/sysown/proxysql/wiki/MySQL-Query-Rules
- ProxySQL GitHub wiki — mysql_users: https://github.com/sysown/proxysql/wiki/MySQL-Users
- ProxySQL GitHub wiki — mysql_replication_hostgroups: https://github.com/sysown/proxysql/wiki/MySQL-Replication-Hostgroups
- ProxySQL GitHub wiki — global variables: https://github.com/sysown/proxysql/wiki/Global-variables
- ProxySQL GitHub releases (version verification): https://github.com/sysown/proxysql/releases

## Issues Found

### 1. Incorrect configuration in "Advanced: Sticky Connections for Transactions" section
- **What was wrong:** The section configured `mysql-handle_warnings` (which controls MySQL warning count handling) and `mysql-multiplexing` (which controls connection multiplexing and is already enabled by default) as if they enabled transaction-aware routing. Neither variable is related to transaction persistence.
- **What was changed:** Replaced the incorrect `global_variables` UPDATE statements with the correct approach: setting `transaction_persistent = 1` on the application user in the `mysql_users` table. Updated the explanatory text to clarify that ProxySQL automatically detects BEGIN/START TRANSACTION and that `transaction_persistent` ensures all queries within a transaction stay on the writer hostgroup.
- **Why:** `mysql-handle_warnings` controls whether ProxySQL tracks MySQL warning counts — it has no effect on transaction routing. The correct mechanism for transaction-aware hostgroup pinning is the `transaction_persistent` column in `mysql_users`.

## Review Notes
- The query rules handle `SELECT ... FOR UPDATE` correctly by routing it to the primary, but `SELECT ... FOR SHARE` and `SELECT ... LOCK IN SHARE MODE` are not covered. These also acquire locks and arguably should be routed to the primary. This is an omission rather than an error — the post doesn't claim to handle these cases.
- The verification query `SELECT rule_id, hits, destination_hostgroup, match_pattern FROM stats_mysql_query_rules` may not work in all ProxySQL versions, as `stats_mysql_query_rules` may only contain `rule_id` and `hits` columns. Users may need to JOIN with `mysql_query_rules` to see rule details alongside hit counts.
- ProxySQL v2.5.5 is a valid release. The installation URL and package name are correct for that version.
- The default admin credentials (admin/admin) shown in the post are correct but should ideally be changed in production — this is a best practice note, not an error.
