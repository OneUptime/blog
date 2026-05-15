# Validation Summary: How to Configure Automated Database Backups with pg_dump and Cron on RHEL 9

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

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers
- MariaDB documentation: mariadb-secure-installation: https://mariadb.com/docs/server/clients-and-utilities/deployment-tools/mariadb-secure-installation
- MySQL documentation: mysql_secure_installation: https://dev.mysql.com/doc/refman/8.4/en/mysql-secure-installation.html

## Issues Found
- The title, tags, description, overview, and summary claimed the post configured automated PostgreSQL backups with `pg_dump` and `cron`, but the body only covered database server setup. Updated those fields to describe configuring PostgreSQL, MariaDB, and MySQL database servers on RHEL 9.
- The MySQL installation command used `mysql-community-server`, which is not the RHEL 9 AppStream package name documented by Red Hat. Changed it to `mysql-server`.
- The MySQL setup commands omitted `mysql_secure_installation`, which Red Hat documents as the security hardening step after starting `mysqld`. Added it.
- The MariaDB setup used `mysql_secure_installation`. MariaDB 10.5 and later use `mariadb-secure-installation`, with the old name retained only as a compatibility alias. Updated the command to the current MariaDB utility name.
- The MariaDB/MySQL configuration file path was listed generically as `/etc/my.cnf.d/server.cnf`. Red Hat documents `/etc/my.cnf.d/mariadb-server.cnf` for MariaDB and `/etc/my.cnf.d/mysql-server.cnf` for MySQL. Updated the paths.
- The PostgreSQL `pg_hba.conf` path was incomplete. Updated it to `/var/lib/pgsql/data/pg_hba.conf`.
- The PostgreSQL user creation command did not set a password, but the later `psql -h localhost -U myappuser` verification command uses TCP authentication and expects password-based access when configured that way. Changed `createuser myappuser` to `createuser --pwprompt myappuser`.

## Review Notes
The corrected article is technically valid as a database server setup guide, not as an automated backup guide. A future post that keeps the original backup-focused title should add actual `pg_dump` and `cron` steps, retention handling, restore verification, and backup storage guidance.
