# Validation Summary: How to Back Up and Restore PostgreSQL Databases on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- PostgreSQL
- `dnf`
- `systemctl`
- `postgresql-setup`
- `pg_dump`
- `pg_restore`
- `psql`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using PostgreSQL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- PostgreSQL documentation, `pg_dump`: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL documentation, `pg_restore`: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL documentation, "SQL Dump": https://www.postgresql.org/docs/current/backup-dump.html
- PostgreSQL documentation, `pg_hba.conf`: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- Red Hat Enterprise Linux 9 documentation, "Using MariaDB": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mariadb_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9 documentation, "Using MySQL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/assembly_using-mysql_configuring-and-using-database-servers

## Issues Found
- The post title, description, overview, and summary said the article covered PostgreSQL backup and restore with `pg_dump` and `pg_restore`, but the body only covered generic database installation and setup. I replaced the unrelated setup flow with PostgreSQL-specific backup and restore commands.
- The post included MariaDB and MySQL installation/configuration examples even though the article is specifically about PostgreSQL backup and restore. I removed those unrelated examples to avoid inaccurate scope and conflicting RHEL package guidance.
- The MySQL example used `mysql-community-server`, which is not the RHEL 9 package documented by Red Hat for the built-in MySQL Application Stream. Removing the MySQL section resolved this issue without expanding the PostgreSQL-focused article.
- The PostgreSQL user creation example created a role without a password, while the later connection example used TCP authentication with `-h localhost`. I changed the user creation command to create a password-authenticated PostgreSQL role.
- The original post did not include any actual backup or restore command. I added a `pg_dump -F c` custom-format backup and a matching `pg_restore` command, consistent with PostgreSQL documentation that custom/non-plain-text dumps are restored with `pg_restore`.
- The summary used lowercase "postgresql". I corrected it to "PostgreSQL".

## Review Notes
Local PostgreSQL client commands were not installed in the review environment, so command availability could not be verified with local `--help` output. Syntax and behavior were verified against Red Hat and PostgreSQL official documentation.
