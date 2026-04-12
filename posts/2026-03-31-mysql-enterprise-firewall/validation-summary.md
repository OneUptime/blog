# Validation Summary: How to Use the MySQL Enterprise Firewall

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Enterprise Edition
- MySQL Enterprise Firewall plugin
- SQL (stored procedures, information_schema queries)

## Sources Consulted
- MySQL 8.0 Enterprise Firewall Installation: https://dev.mysql.com/doc/refman/8.0/en/firewall-installation.html
- MySQL 8.0 Enterprise Firewall Usage: https://dev.mysql.com/doc/refman/8.0/en/firewall-usage.html
- MySQL 8.0 Firewall Reference: https://dev.mysql.com/doc/refman/8.0/en/firewall-reference.html
- MySQL 8.0 MYSQL_FIREWALL_WHITELIST Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-mysql-firewall-whitelist-table.html
- MySQL 8.4 Firewall Installation: https://dev.mysql.com/doc/refman/8.4/en/firewall-installation.html

## Issues Found

### 1. Incomplete firewall mode list
- **What was wrong:** The "How the Enterprise Firewall Works" section listed only three modes (RECORDING, PROTECTING, OFF) but omitted DETECTING, which is a fourth valid mode discussed later in the post.
- **What was changed:** Updated the list to say "four modes" and added DETECTING with its description.
- **Why:** DETECTING is an important operational mode for non-blocking transition periods. Omitting it from the overview was misleading.

### 2. Incomplete installation instructions
- **What was wrong:** The installation section showed three `INSTALL PLUGIN` statements, which only install the plugins but do not create the required stored procedures (`sp_set_firewall_mode`, `sp_reload_firewall_rules`) or underlying tables (`mysql.firewall_whitelist`, `mysql.firewall_users`). Without these, the CALL statements later in the post would fail.
- **What was changed:** Replaced the INSTALL PLUGIN commands with the recommended approach of running the installation SQL script (`linux_install_firewall.sql` or `win_install_firewall.sql`), which installs plugins, creates tables, and registers stored procedures in one step.
- **Why:** MySQL documentation recommends the installation script as the standard installation method. Using INSTALL PLUGIN alone leaves the firewall in a non-functional state.

### 3. Incorrect monitoring query
- **What was wrong:** The "Monitoring Blocked Queries" section used `SELECT * FROM performance_schema.events_statements_history_long WHERE sql_text LIKE '%DENIED%'`. This is incorrect — blocked queries do not appear in performance_schema with 'DENIED' in the sql_text column. The sql_text contains the original SQL statement, not the firewall's error message.
- **What was changed:** Replaced with `SHOW GLOBAL STATUS LIKE 'Firewall%'` which shows the correct firewall status variables (`Firewall_access_denied`, `Firewall_access_granted`, `Firewall_cached_entries`), and noted that individual blocked queries are logged to the MySQL error log.
- **Why:** The original query would return no useful results. The status variables and error log are the documented and correct ways to monitor firewall activity.

## Review Notes
- The post covers account-based profiles only. MySQL 8.0.23+ also supports group profiles via `sp_set_firewall_group_mode`, which could be mentioned in a future update.
- MySQL 8.4+ documentation mentions component-based installation as preferred, but the script-based approach remains valid and widely used.
- The `sp_reload_firewall_rules` stored procedure may reset the account's firewall mode to OFF as a side effect; users should call `sp_set_firewall_mode` again afterward to restore the desired mode.
