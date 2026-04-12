# Validation Summary: How to Implement Connection Pooling for MySQL in PHP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL
- PHP (PDO, MySQLi)
- PHP-FPM
- ProxySQL

## Sources Consulted
- PHP PDO documentation: https://www.php.net/manual/en/pdo.connections.php
- PHP PDO::__construct persistent connections: https://www.php.net/manual/en/pdo.construct.php
- PHP MySQLi persistent connections: https://www.php.net/manual/en/mysqli.persistconns.php
- PHP MySQLi::bind_param documentation: https://www.php.net/manual/en/mysqli-stmt.bind-param.php
- ProxySQL documentation: https://proxysql.com/documentation/
- ProxySQL admin interface (mysql_servers, mysql_users tables): https://proxysql.com/documentation/main-runtime/
- PHP-FPM configuration directives: https://www.php.net/manual/en/install.fpm.configuration.php

## Issues Found

1. **Description referenced PgBouncer (a PostgreSQL tool) instead of ProxySQL**: The post description mentioned "PgBouncer-style proxies" but PgBouncer is a PostgreSQL connection pooler, not a MySQL one. The post actually covers ProxySQL. Changed to "ProxySQL for connection multiplexing, and PHP-FPM pool management."

2. **MySQLi example: `$maxPrice` defined after `bind_param` call**: `mysqli_stmt::bind_param()` binds by reference, so the variable must exist at bind time. Having `$maxPrice` undefined at the point of `bind_param('d', $maxPrice)` generates an "Undefined variable" warning. Moved `$maxPrice = 500.00;` before the `prepare()` and `bind_param()` calls.

3. **ProxySQL configuration missing `SAVE MYSQL USERS TO DISK`**: The configuration saved server settings to disk (`SAVE MYSQL SERVERS TO DISK`) but did not persist user settings. Without `SAVE MYSQL USERS TO DISK`, the user configuration would be lost on ProxySQL restart. Added the missing command.

## Review Notes
- The singleton pattern used in the `Database` class works for persistent connections but note that `PDO::ATTR_PERSISTENT` with identical DSN/user/password will reuse the same underlying connection within a PHP-FPM worker process even without the singleton — the singleton just avoids re-instantiating the PDO object.
- The post correctly notes that the effective pool size equals `pm.max_children`. In multi-pool or multi-server PHP-FPM setups, the total connection count would be the sum across all pools/servers, which is worth keeping in mind.
- ProxySQL installation via `apt install proxysql` assumes the ProxySQL repository has already been added to the system. In practice, users would need to add the ProxySQL APT repository first, but this is acceptable brevity for a tutorial focused on configuration rather than installation.
