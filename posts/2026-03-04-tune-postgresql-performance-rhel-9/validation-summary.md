# Validation Summary: How to Tune PostgreSQL Performance on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- PostgreSQL
- MariaDB
- MySQL 8.0
- firewalld
- SQL user and privilege management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Installing PostgreSQL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/installing-postgresql_using-postgresql
- Red Hat Enterprise Linux 9 documentation, "Installing MariaDB": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/installing-mariadb_using-mariadb
- Red Hat Enterprise Linux 9 documentation, "Installing MySQL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/installing-mysql_assembly_using-mysql
- PostgreSQL documentation, "createdb": https://www.postgresql.org/docs/current/app-createdb.html
- PostgreSQL documentation, "The pg_hba.conf File": https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL documentation, "Connections and Authentication": https://www.postgresql.org/docs/current/runtime-config-connection.html
- MariaDB documentation, "CREATE USER": https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/create-user
- MariaDB documentation, "GRANT": https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant
- MySQL documentation, "CREATE USER Statement": https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL documentation, "GRANT Statement": https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found
- The MySQL 8.0 installation command used `mysql-community-server`, which is not the package name documented for RHEL 9's MySQL Application Stream. Changed it to `mysql-server`.
- The MySQL 8.0 setup commands did not include the documented `mysql_secure_installation` hardening step, while the MariaDB example did. Added it for MySQL as recommended by Red Hat.
- The PostgreSQL firewall example added a permanent service rule but only showed `firewall-cmd --reload` after the MySQL alternative. Added a reload after the PostgreSQL rule so the permanent change is applied for either choice.

## Review Notes
The PostgreSQL package installation, `postgresql-setup --initdb`, service management, default configuration file locations, `createuser`, `createdb -O`, `listen_addresses`/`pg_hba.conf` guidance, and database connection examples are consistent with the consulted documentation. The article title and description emphasize PostgreSQL performance tuning, but the body is closer to a general database installation and basic configuration guide and does not include concrete PostgreSQL performance parameters.
