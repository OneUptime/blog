# Validation Summary: How to Configure MaxScale for MySQL HA on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- MariaDB MaxScale
- MariaDB/MySQL replication
- MaxScale `mariadbmon`
- MaxScale `readwritesplit` and `readconnroute`
- MaxCtrl
- MaxScale REST API

## Sources Consulted
- MariaDB MaxScale Installation Guide: https://mariadb.com/docs/maxscale/maxscale-quickstart-guides/mariadb-maxscale-installation-guide
- Setting up MariaDB MaxScale: https://mariadb.com/docs/maxscale/mariadb-maxscale-tutorials/setting-up-mariadb-maxscale
- MariaDB MaxScale Authentication Modules: https://mariadb.com/docs/maxscale/maxscale-security/authentication-modules
- MariaDB Monitor reference: https://mariadb.com/docs/maxscale/reference/maxscale-monitors/mariadb-monitor
- Automatic Failover with MariaDB Monitor: https://mariadb.com/docs/maxscale/mariadb-maxscale-tutorials/automatic-failover-with-mariadb-monitor
- Readwritesplit router reference: https://mariadb.com/docs/maxscale/reference/maxscale-routers/maxscale-readwritesplit
- Readconnroute router reference: https://mariadb.com/docs/maxscale/reference/maxscale-routers/maxscale-readconnroute
- MaxCtrl documentation: https://mariadb.com/docs/maxscale/maxscale-management/administrative-tools-for-mariadb-maxscale-maxctrl
- MaxScale configuration guide / REST API settings: https://mariadb.com/docs/maxscale/reference/maxscale-configuration-settings
- MaxScale upgrade notes for removed MaxAdmin and deprecated drain command: https://mariadb.com/docs/maxscale/maxscale-management/installation-and-configuration/upgrading-maxscale

## Issues Found
- The monitor user grants were insufficient and used older replication privilege terminology for current MariaDB. Updated the SQL to grant the privileges needed for monitoring and automatic cluster manipulation, and added the replication user referenced by the MaxScale configuration.
- The MaxScale service user grants were missing current authentication-table privileges such as `mysql.procs_priv`, `mysql.global_priv`, and `mysql.roles_mapping`. Added them so MaxScale can fetch user account and grant data correctly.
- The sample configuration included legacy MaxAdmin `cli`/`maxscaled` objects and an HTTPD REST listener. These modules were removed in MaxScale 2.5. Updated the configuration to use the REST API settings in `[maxscale]`.
- The server definitions included `protocol = MariaDBBackend`, which is deprecated and ignored in modern MaxScale. Removed the deprecated server protocol entries.
- The `readwritesplit` configuration used `max_slave_connections = 100%`, but current documentation defines it as an integer from 0 to 255. Changed it to `255`.
- The `master_failure_mode` comment and value did not match the failover behavior being described. Changed it to `fail_on_write`, which is the recommended mode with primary reconnection and transaction replay.
- The transaction replay size used `1Mi`; the documented size format uses `1MiB`. Updated the value.
- The `maxctrl drain server` command is obsolete/removed in newer MaxScale versions. Replaced it with `maxctrl set server replica-1 drain`.
- The troubleshooting commands used `maxctrl alter maxscale log_debug`, while current MaxCtrl exposes log priorities through `enable log-priority` and `disable log-priority`. Updated the example to use temporary info logging.
- The failover and connectivity examples assumed the database service name was always `mysql` and used a replication-specific query for a basic connectivity check. Added the `mariadb` service-name alternative and changed the connectivity check to `SELECT 1`.

## Review Notes
- The guide remains primarily a MariaDB MaxScale tutorial. It mentions MySQL compatibility, but automatic failover through `mariadbmon` is documented for MariaDB GTID-based primary-replica clusters, so the prerequisites now call out that caveat.
