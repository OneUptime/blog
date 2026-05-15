# Validation Summary: How to Install and Configure TimescaleDB on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- PostgreSQL 16
- TimescaleDB
- DNF/Yum RPM repositories
- systemd

## Sources Consulted
- Tiger Data documentation: Install TimescaleDB on Linux: https://www.tigerdata.com/docs/self-hosted/latest/install/installation-linux
- Tiger Data documentation: TimescaleDB tuning tool: https://www.tigerdata.com/docs/self-hosted/latest/configuration/timescaledb-tune
- TimescaleDB tuning tool README/source: https://github.com/timescale/timescaledb-tune
- Packagecloud TimescaleDB RPM repository/package instructions: https://packagecloud.io/timescale/timescaledb/packages/el/9/timescaledb-2-postgresql-16-2.26.4-0.el9.x86_64.rpm
- PostgreSQL Red Hat family downloads: https://www.postgresql.org/download/linux/redhat/
- Red Hat Enterprise Linux 9 database server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers

## Issues Found
- The installation command used a placeholder package name instead of installing PostgreSQL and the TimescaleDB RPM package. Replaced it with PGDG repository setup, built-in PostgreSQL module disablement, the TimescaleDB packagecloud repository, and installation of `postgresql16-server`, `postgresql16-contrib`, and `timescaledb-2-postgresql-16`.
- The service configuration section used placeholder paths and service names. Replaced them with PostgreSQL 16 initialization, `timescaledb-tune` using explicit PostgreSQL version and configuration path flags, the PGDG data directory path `/var/lib/pgsql/16/data/`, and the `postgresql-16` systemd service.
- The verification section only checked a placeholder service. Added commands to create a test database, run `CREATE EXTENSION IF NOT EXISTS timescaledb;`, and verify the installed extension with `\dx timescaledb`.
- The troubleshooting section used placeholder package and service names. Replaced them with `postgresql-16`, an RPM query for PostgreSQL/TimescaleDB packages, and a note about `shared_preload_libraries = 'timescaledb'`.

## Review Notes
The article now targets PostgreSQL 16 on RHEL 9 using PGDG-style package names because current TimescaleDB RPMs for PostgreSQL 16 depend on `postgresql16` and `postgresql16-server` packages. RHEL 9 also provides PostgreSQL 16 through Red Hat modules, but those packages use different service and setup conventions than the PGDG packages used by the TimescaleDB RPM package.
