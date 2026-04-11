# Validation Summary: How to Monitor MySQL Replication with MaxScale

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MariaDB MaxScale (monitor module, maxctrl CLI, REST API)
- MySQL / MariaDB replication
- mariadbmon monitor module
- MaxScale REST API

## Sources Consulted
- MariaDB MaxScale MariaDB Monitor documentation: https://mariadb.com/docs/maxscale/reference/maxscale-monitors/mariadb-monitor
- MaxScale Configuration Guide (GitHub): https://github.com/mariadb-corporation/MaxScale/blob/24.02/Documentation/Getting-Started/Configuration-Guide.md
- MaxScale REST API documentation: https://mariadb.com/docs/maxscale/mariadb-maxscale-tutorials/rest-api-tutorial
- MaxScale 2.2 release notes (mysqlmon rename)

## Issues Found

1. **`mysqlmon` presented as a separate module from `mariadbmon`** (line 13): The post stated "The two most common monitor modules for MySQL are `mariadbmon` (which also works with MySQL) and `mysqlmon`," implying they are two distinct modules. In reality, `mysqlmon` was renamed to `mariadbmon` in MaxScale 2.2 and is no longer a separate module. Fixed to clarify that `mariadbmon` is the standard module, formerly known as `mysqlmon`.

2. **Incorrect field names for `maxctrl show server` output** (line 69): The post referenced `Slave_SQL_Running_State`, `Seconds_Behind_Master`, and `GTID_IO_Pos` as fields to look for in `maxctrl show server` output. These are raw MySQL `SHOW SLAVE STATUS` field names, not the labels used in MaxScale's CLI output. MaxScale uses `Replication Lag`, `Slave SQL Running`, and `Gtid IO Position`. Fixed to use the correct MaxScale field names.

3. **Alerting script grepped for wrong field name** (line 92): The monitoring script used `grep 'Seconds_Behind_Master'` against `maxctrl show server` output, which would not match. Fixed to grep for `Replication Lag` and use `--tsv` output format with tab-delimited awk parsing for more reliable extraction.

## Review Notes
- The `replication_user` and `replication_password` config parameters are valid but unnecessary when `auto_failover=false` and `auto_rejoin=false` are set, since those credentials are only used during failover/switchover CHANGE MASTER TO operations. Not an error, but could be noted for clarity.
- The `REPLICATION SLAVE` grant is not strictly required for basic monitoring (only `REPLICATION CLIENT` is needed). It provides more privileges than necessary but is not harmful. On MariaDB 10.5.9+, the `REPLICA MONITOR` privilege is the recommended minimal grant.
- MaxScale is primarily a MariaDB product. While it can work with MySQL servers in some configurations, the `mariadbmon` module is optimized for MariaDB replication including MariaDB GTID. Users running MySQL (not MariaDB) should be aware of potential compatibility limitations.
