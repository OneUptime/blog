# Validation Summary: How to Install and Configure ProxySQL for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ProxySQL 2.6.x
- MySQL
- Ubuntu/Debian (APT package management)
- RHEL/CentOS (YUM package management)
- systemd

## Sources Consulted
- ProxySQL official documentation: https://proxysql.com/documentation/
- ProxySQL admin interface variables: https://proxysql.com/documentation/global-variables/admin-variables/
- ProxySQL monitor module documentation: https://proxysql.com/documentation/monitor/
- ProxySQL `mysql_server_connect_log` table schema: https://proxysql.com/documentation/monitor/
- ProxySQL `admin-admin_credentials` variable format: https://proxysql.com/documentation/global-variables/admin-variables/

## Issues Found

### 1. Incorrect column names in `monitor.mysql_server_connect_log` query
- **What was wrong:** The query under "Verifying Backend Health" selected `hostgroup_id`, `hostname`, `port`, `status`, `latency_us` from `monitor.mysql_server_connect_log`. The columns `hostgroup_id`, `status`, and `latency_us` do not exist in that table. The actual columns are `hostname`, `port`, `time_start_us`, `connect_success_time_us`, and `connect_error`.
- **What was changed:** Replaced the column list with `hostname, port, time_start_us, connect_success_time_us, connect_error`.
- **Why:** The original query would fail with an "Unknown column" error when executed in the ProxySQL admin interface.

### 2. Incorrect format for `admin-admin_credentials` variable
- **What was wrong:** The value was set to `'newadminpassword'` (bare password string). The `admin-admin_credentials` variable requires the `user:password` format (e.g., `'admin:newadminpassword'`).
- **What was changed:** Updated the value from `'newadminpassword'` to `'admin:newadminpassword'`.
- **Why:** Without the `user:password` format, ProxySQL would misinterpret the credential string, potentially locking out admin access.

## Review Notes
- The monitoring user is granted only `USAGE` privilege, which is sufficient for basic connect and ping monitoring. If replication lag monitoring is needed (via `SHOW SLAVE STATUS`), the `REPLICATION CLIENT` privilege would also be required, but that is outside the scope of this basic setup guide.
- The post uses ProxySQL 2.6.x repository URLs. These are current as of the review date but readers should check for newer stable releases.
- The `SELECT @@hostname` test command is a good way to verify which backend server ProxySQL routes traffic to, though the variable availability depends on the MySQL backend configuration.
