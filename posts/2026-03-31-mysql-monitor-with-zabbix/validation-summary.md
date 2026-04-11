# Validation Summary: How to Monitor MySQL with Zabbix

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (user management, grants, replication monitoring)
- Zabbix Server 6.x
- Zabbix Agent 2 (built-in MySQL plugin)
- Zabbix templates ("MySQL by Zabbix agent 2")
- zabbix_get CLI tool

## Sources Consulted
- Zabbix official documentation: Zabbix Agent 2 MySQL plugin configuration (https://www.zabbix.com/documentation/6.0/en/manual/config/items/itemtypes/zabbix_agent/zabbix_agent2/plugins/mysql)
- Zabbix Git repository: "MySQL by Zabbix agent 2" template README (https://git.zabbix.com/projects/ZBX/repos/zabbix/browse/templates/db/mysql_agent2)
- MySQL documentation: MySQL option files and section headers (https://dev.mysql.com/doc/refman/8.0/en/option-files.html)

## Issues Found

1. **MySQL option file section header `[mysqld]` changed to `[client]`** (line 30): The post used `[mysqld]` as the section header in the MySQL credentials file. The `[mysqld]` section configures the MySQL server daemon, not client connections. The correct section for client credentials is `[client]`. Note: this option file is a legacy approach from Zabbix Agent 1; Agent 2 uses `Plugins.MySQL.Sessions.*` parameters directly, which the post also correctly includes.

2. **"Too many connections (>80% of max_connections)" trigger corrected to "Refused connections"** (line 78): The official "MySQL by Zabbix agent 2" template does not include a percentage-based connection threshold trigger. The actual trigger is "MySQL: Refused connections" which fires when `connection_errors_max_connections.rate > 0`.

3. **Replication lag default corrected from `30s` to `30m`** (line 82): The default value of `{$MYSQL.REPL_LAG.MAX.WARN}` in the official template is 30 minutes, not 30 seconds.

4. **Buffer pool trigger corrected from "too high (>95%)" to "too low (<50%)"** (line 83): The official template trigger alerts when buffer pool utilization drops *below* the threshold (indicating over-provisioned memory), not when it exceeds it. The default threshold is 50%, not 95%.

5. **`{$MYSQL.CONNECTIONS.MAX.WARN}` macro replaced with `{$MYSQL.ABORTED_CONN.MAX.WARN}`** (line 92): The macro `{$MYSQL.CONNECTIONS.MAX.WARN}` does not exist in the official template. Replaced with the actual macro `{$MYSQL.ABORTED_CONN.MAX.WARN}` (default: 3) which controls the aborted connections warning threshold.

6. **`{$MYSQL.BUFF_POOL.PUSED.MAX.WARN}` macro replaced with `{$MYSQL.BUFF_UTIL.MIN.WARN}`** (line 93): The macro `{$MYSQL.BUFF_POOL.PUSED.MAX.WARN}` does not exist. The actual macro is `{$MYSQL.BUFF_UTIL.MIN.WARN}` (default: 50) which sets the minimum acceptable buffer pool utilization percentage. All default values in the macros table were corrected accordingly.

## Review Notes
- The MySQL option file block (`/var/lib/zabbix/mysql.conf`) is a legacy approach from Zabbix Agent 1 userparameter-based monitoring. For Zabbix Agent 2, the `Plugins.MySQL.Sessions.*` configuration (which the post also correctly includes) is the primary and recommended method. The option file block is not harmful but is unnecessary for the Agent 2 workflow described in this post.
- The `FLUSH PRIVILEGES` statement after `CREATE USER` and `GRANT` is unnecessary in MySQL 5.7+ (these statements automatically update the privilege tables), but it is not harmful and is commonly included as a safety measure.
- The post uses `'zbx_monitor'@'localhost'` while the official Zabbix docs use `'zbx_monitor'@'%'`. The localhost restriction is actually more secure for local monitoring setups, so this is a reasonable choice.
