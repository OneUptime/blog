# Validation Summary: How to Install and Configure MySQL 8.0 on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- MySQL 8.0
- DNF
- systemd
- firewalld
- SQL user and database management

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and using database servers, "Using MySQL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mysql_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9: Configuring and using database servers, "Using MariaDB" and "Using PostgreSQL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/
- MySQL 8.0 Reference Manual, "Installing MySQL on Linux Using the MySQL Yum Repository": https://dev.mysql.com/doc/refman/8.0/en/linux-installation-yum-repo.html
- firewalld documentation, "Open a Port or Service" and firewall-cmd manual: https://firewalld.org/documentation/

## Issues Found
- The install section mixed PostgreSQL, MariaDB, and Oracle MySQL Community repository commands into a post specifically about MySQL 8.0 on RHEL 9. Updated the section to use RHEL 9's MySQL 8.0 package, `mysql-server`, and the documented `mysqld` service.
- The MySQL installation command used `mysql-community-server`, which requires Oracle's MySQL Yum repository and additional repository selection for MySQL 8.0. Replaced it with `mysql-server`, which is the documented RHEL 9 package for MySQL 8.0 from the RHEL Application Stream.
- The MySQL hardening step was only shown under MariaDB. Added `sudo mysql_secure_installation` to the MySQL installation flow because Red Hat documents it as the post-install security step for MySQL.
- The configuration section pointed MySQL users to `/etc/my.cnf.d/server.cnf`, which is not the RHEL 9 MySQL server configuration file. Updated it to `/etc/my.cnf.d/mysql-server.cnf`.
- The network access section referenced PostgreSQL-style listen/authentication rules and included PostgreSQL firewall commands. Updated it to reference MySQL's `bind-address`, host-based MySQL grants, the `mysql` firewalld service, and restarting `mysqld`.
- The verification section included PostgreSQL commands in a MySQL-specific post. Removed the unrelated PostgreSQL example and kept the MySQL `SELECT VERSION()` check.
- The summary used lowercase "mysql". Corrected it to "MySQL".

## Review Notes
The post now follows the RHEL 9 native package path for MySQL 8.0. If the author wants to cover Oracle's MySQL Community packages instead, the post should explicitly add the MySQL Yum repository setup and enable the `mysql80-community` repository because current Oracle repository RPMs default to MySQL 8.4.
