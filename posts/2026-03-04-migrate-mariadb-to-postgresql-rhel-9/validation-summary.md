# Validation Summary: How to Migrate from MariaDB to PostgreSQL on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- MariaDB
- MySQL
- PostgreSQL
- pgloader
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and using database servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- Red Hat Enterprise Linux 9: Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- PostgreSQL createuser documentation: https://www.postgresql.org/docs/current/app-createuser.html
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- MariaDB mariadb-secure-installation documentation: https://mariadb.com/docs/server/clients-and-utilities/deployment-tools/mariadb-secure-installation
- MariaDB CREATE USER documentation: https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/create-user
- MariaDB GRANT documentation: https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant
- pgloader MySQL to PostgreSQL documentation: https://pgloader.readthedocs.io/en/latest/ref/mysql.html

## Issues Found
- The post claimed to cover schema conversion and data transfer, but the original steps only installed and verified database servers. Added a pgloader prerequisite and migration command because pgloader officially supports MySQL-compatible source databases to PostgreSQL migration with schema conversion and data loading.
- The RHEL 9 MySQL package command used `mysql-community-server`, which is not the RHEL package name in Red Hat documentation. Changed it to `mysql-server`.
- The systemd service commands omitted the documented `.service` unit names. Updated PostgreSQL, MariaDB, and MySQL commands to use `postgresql.service`, `mariadb.service`, and `mysqld.service`.
- The MariaDB secure-installation command used the legacy `mysql_secure_installation` name. Changed the MariaDB command to `mariadb-secure-installation`, while leaving `mysql_secure_installation` for MySQL.
- The MariaDB/MySQL configuration file path was too generic for RHEL 9. Replaced it with `/etc/my.cnf.d/mariadb-server.cnf` for MariaDB and `/etc/my.cnf.d/mysql-server.cnf` for MySQL.
- The PostgreSQL user creation example created a user without a password, but the verification command connects over TCP as that user. Changed `createuser` to use `--pwprompt`.
- The firewall example used an ambiguous "or" comment even though a migration may require opening both source and target services when they are remote. Labeled the PostgreSQL and MariaDB/MySQL commands directly.
- Fixed the summary capitalization from `mariadb` and `postgresql` to `MariaDB` and `PostgreSQL`.

## Review Notes
The corrected pgloader command is suitable for a basic migration. Larger production migrations still need application-specific validation, testing for unsupported objects such as triggers or vendor-specific SQL, and a cutover plan.
