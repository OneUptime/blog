# Validation Summary: How to Install PostgreSQL on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- PostgreSQL
- Ubuntu Linux
- APT package management
- PostgreSQL APT Repository (PGDG)
- systemd
- UFW
- PostgreSQL client tools and SQL role/database commands

## Sources Consulted
- PostgreSQL official Ubuntu download and APT repository instructions: https://www.postgresql.org/download/linux/ubuntu/
- PostgreSQL `pg_hba.conf` authentication documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL connection settings documentation: https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL resource configuration documentation: https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL `CREATE USER` documentation: https://www.postgresql.org/docs/current/sql-createuser.html
- PostgreSQL `GRANT` documentation: https://www.postgresql.org/docs/current/sql-grant.html
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- Ubuntu Server PostgreSQL installation documentation: https://ubuntu.com/server/docs/how-to/databases/install-postgresql/
- Ubuntu manpage for `createuser`: https://manpages.ubuntu.com/manpages/jammy/man1/createuser.1.html
- Ubuntu manpage for `pg_lsclusters`: https://manpages.ubuntu.com/manpages/trusty/man1/pg_lsclusters.1.html
- Ubuntu manpage for `pg_ctlcluster`: https://manpages.ubuntu.com/manpages/focal/man1/pg_ctlcluster.1.html

## Issues Found
- The prerequisites listed Ubuntu 20.04 LTS without qualification. As of the review date, PostgreSQL's official APT repository lists currently supported Ubuntu releases and does not include focal/20.04. Updated the prerequisite to Ubuntu 22.04 or 24.04 LTS and added a note that 20.04 is in extended security maintenance and is no longer supported by the current PostgreSQL APT repository.
- The PostgreSQL APT repository setup used an older `/etc/apt/sources.list.d/pgdg.list` entry with a dearmored key in `/usr/share/keyrings`. Replaced it with the current official `.sources` file approach using `/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc`, HTTPS, and the Ubuntu codename from `/etc/os-release`.

## Review Notes
The remaining commands and configuration examples are technically valid for Ubuntu-packaged PostgreSQL installations, with the expected version-number adjustments for systems not running PostgreSQL 16. The memory tuning values are examples and should be adjusted for actual workload and available RAM before production use.
