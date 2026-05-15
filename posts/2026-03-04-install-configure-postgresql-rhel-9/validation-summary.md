# Validation Summary: How to Install and Configure PostgreSQL on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- PostgreSQL
- MariaDB
- MySQL
- firewalld
- systemd
- DNF

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using PostgreSQL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9 documentation: Using MariaDB - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mariadb_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9 documentation: Using MySQL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/assembly_using-mysql_configuring-and-using-database-servers

## Issues Found
- The MySQL 8.0 install command used `mysql-community-server`, which is not the RHEL 9 package name documented by Red Hat. Changed it to `mysql-server`.
- The MySQL install steps omitted `mysql_secure_installation`, which Red Hat documents as the post-install security step for MySQL. Added the command after starting `mysqld`.
- The MariaDB/MySQL configuration path was listed as `/etc/my.cnf.d/server.cnf`, but Red Hat documents `/etc/my.cnf.d/mariadb-server.cnf` for MariaDB and `/etc/my.cnf.d/mysql-server.cnf` for MySQL. Split the bullet into the correct per-engine paths.
- The PostgreSQL user creation command did not set a password, while the verification command connects over TCP as `myappuser` and may require password authentication depending on `pg_hba.conf`. Changed `createuser myappuser` to `createuser --pwprompt myappuser`.
- The configuration section did not mention restarting services after changing server configuration files. Added a short note to restart the database service after configuration changes, matching Red Hat's documented PostgreSQL, MariaDB, and MySQL configuration procedures.

## Review Notes
- The post title is PostgreSQL-focused, but the body also includes MariaDB and MySQL commands. Those commands were reviewed because they are technical content in the post.
- RHEL 9 provides PostgreSQL, MariaDB, and MySQL versions through RPM packages and module streams. The post uses the default package examples rather than selecting alternate module streams, which is technically valid.
