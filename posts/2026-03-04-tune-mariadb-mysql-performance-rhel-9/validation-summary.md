# Validation Summary: How to Tune MariaDB/MySQL Performance on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- MariaDB
- MySQL
- InnoDB buffer pool configuration
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and using database servers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers
- MySQL 8.0 Reference Manual, "Configuring InnoDB Buffer Pool Size": https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-resize.html
- MariaDB Server Documentation, "InnoDB Buffer Pool": https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-buffer-pool
- firewalld documentation, "Open a Port or Service": https://firewalld.org/documentation/howto/open-a-port-or-service.html

## Issues Found
- The post included PostgreSQL install, user creation, firewall, and verification examples even though the title and description are specifically about MariaDB/MySQL performance tuning. Removed the PostgreSQL examples so the instructions match the post scope.
- The MySQL 8.0 installation command used `mysql-community-server`, which is the Oracle community repository package name, not the RHEL 9 Application Stream package name. Changed it to `mysql-server`, matching Red Hat documentation for RHEL 9.
- The MySQL installation example did not run `mysql_secure_installation`, while Red Hat documents it as the security hardening step after enabling MySQL. Added the command.
- The configuration file path `/etc/my.cnf.d/server.cnf` was too generic and did not match the RHEL 9 documented server configuration files. Changed it to `/etc/my.cnf.d/mariadb-server.cnf` for MariaDB and `/etc/my.cnf.d/mysql-server.cnf` for MySQL.
- The post claimed optimized buffer pool settings but did not show a buffer pool setting. Added a minimal `[mysqld]` example using `innodb_buffer_pool_size`, which is the documented InnoDB buffer pool variable for MariaDB and MySQL.
- The post implied MariaDB and MySQL could simply be selected interchangeably on one host. Added the RHEL 9 caveat that their packages conflict and should not be installed on the same host.

## Review Notes
The `innodb_buffer_pool_size=2G` value is a valid example, but the right production value depends on workload, total RAM, and whether the database host runs other services. Remote access also requires a suitable bind address and user host grants in addition to opening the `mysql` firewalld service.
