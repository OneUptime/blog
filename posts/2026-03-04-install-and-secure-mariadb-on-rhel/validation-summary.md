# Validation Summary: How to Install and Secure MariaDB on RHEL

## Status
validated

## Post Type
Tutorial / installation and security hardening guide

## Technologies Covered
- Red Hat Enterprise Linux
- MariaDB Server
- MariaDB command-line clients and security utilities
- MariaDB SQL account and privilege management
- systemd
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using MariaDB, including package installation, Application Streams, and `mariadb.service`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mariadb_configuring-and-using-database-servers
- MariaDB documentation: `mariadb-secure-installation`: https://mariadb.com/docs/server/clients-and-utilities/deployment-tools/mariadb-secure-installation
- MariaDB documentation: Authentication from MariaDB 10.4, including default Unix socket authentication and `mysql.global_priv`: https://mariadb.com/docs/server/security/user-account-management/authentication-from-mariadb-10-4
- MariaDB documentation: `CREATE USER`: https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/create-user
- MariaDB documentation: `GRANT`: https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant
- MariaDB documentation: Server system variables, including `bind_address`, `local_infile`, `symbolic_links`, `max_connections`, and `slow_query_log`: https://mariadb.com/docs/server/server-management/variables-and-modes/server-system-variables
- MariaDB documentation: `mysql.user` table compatibility view and authentication columns: https://mariadb.com/docs/server/reference/system-tables/the-mysql-database-tables/mysql-user-table
- MariaDB documentation: Slow query log configuration: https://mariadb.com/docs/server/server-management/server-monitoring-logs/slow-query-log/slow-query-log-overview
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld predefined services and `firewall-cmd`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The introduction said MariaDB is included in the "base RHEL repositories." RHEL 9 documentation describes MariaDB as provided through Application Streams, so this was changed to say it is available as an Application Stream and installable from RHEL repositories.
- The security step used `mysql_secure_installation` and instructed readers to set the root password. MariaDB documentation identifies the current utility as `mariadb-secure-installation`, with `mysql_secure_installation` retained as a compatibility name, and notes that MariaDB 10.4+ commonly uses Unix socket authentication for root. The command and prompt guidance were updated accordingly.
- Local root login examples used `mysql -u root -p`. On current RHEL/MariaDB defaults, `sudo mariadb` is the more accurate root-administration example when Unix socket authentication is in use. The root connection and verification commands were updated.
- The hardening comment said to edit `/etc/my.cnf.d/mariadb-server.cnf` immediately before creating `/etc/my.cnf.d/security.cnf`. The comment was corrected to say it creates a drop-in configuration file.
- The query for accounts without passwords checked only `password = ''`, which can be misleading with non-password authentication plugins. It now checks password-based plugins with an empty password field.

## Review Notes
The SQL examples for `CREATE DATABASE`, `CREATE USER`, and `GRANT` are syntactically valid. The firewall commands are valid for a default-zone setup, but production systems should normally scope the allowed source addresses or zone rather than exposing MariaDB broadly.
