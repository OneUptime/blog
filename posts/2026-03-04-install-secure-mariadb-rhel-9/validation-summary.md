# Validation Summary: How to Install and Secure MariaDB on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- MariaDB
- MySQL
- PostgreSQL
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers
- MariaDB documentation: mariadb-secure-installation - https://mariadb.com/docs/server/clients-and-utilities/deployment-tools/mariadb-secure-installation
- MariaDB documentation: mysql_secure_installation compatibility - https://mariadb.com/kb/en/mysql_secure_installation/
- firewalld documentation: Services - https://firewalld.org/documentation/service/

## Issues Found
- The post described securing MariaDB with `mysql_secure_installation`. MariaDB 10.5 and later use `mariadb-secure-installation`; `mysql_secure_installation` remains available as a compatibility name. Updated the description, overview, and MariaDB command to use `mariadb-secure-installation`.
- The MySQL 8.0 install example used `mysql-community-server`, which is not the RHEL 9 AppStream package name documented by Red Hat. Updated it to `mysql-server`.
- The MySQL 8.0 section started the service but did not run the documented security script. Added `sudo mysql_secure_installation`.
- The configuration file path was listed generically as `/etc/my.cnf.d/server.cnf` for both MariaDB and MySQL. Red Hat documents `/etc/my.cnf.d/mariadb-server.cnf` for MariaDB and `/etc/my.cnf.d/mysql-server.cnf` for MySQL, so the paths were corrected.

## Review Notes
The post is technically valid after the corrections. It still covers PostgreSQL and MySQL alongside MariaDB, which is broader than the title suggests, but the included commands are now aligned with RHEL 9 documentation.
