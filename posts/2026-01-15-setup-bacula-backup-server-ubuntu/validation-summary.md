# Validation Summary: How to Set Up Bacula Backup Server on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu 22.04 LTS and 24.04 LTS
- Bacula Director, Storage Daemon, File Daemon, Catalog, and bconsole
- PostgreSQL and MariaDB/MySQL catalog backends
- Baculum web interface
- Apache, PHP, UFW, systemd, cron
- Prometheus/Grafana monitoring with a Bacula exporter

## Sources Consulted
- Ubuntu Server documentation: How to install and configure Bacula - https://ubuntu.com/server/docs/how-to/backups/install-bacula/
- Ubuntu Server documentation: Install and configure PostgreSQL - https://ubuntu.com/server/docs/how-to/databases/install-postgresql/
- Local Ubuntu 24.04 package metadata for `bacula-director-pgsql`, `bacula-director-mysql`, `bacula-sd`, `bacula-client`, `bacula-console`, and `postgresql`
- Extracted Ubuntu 24.04 Bacula package helper scripts and default configs from `bacula-common`, `bacula-director`, and `bacula-director-pgsql`
- Bacula 15.0.x manual: Configuring the Director - https://www.bacula.org/15.0.x-manuals/en/main/Configuring_Director.html
- Bacula 15.0.x manual: Data Spooling - https://www.bacula.org/15.0.x-manuals/en/main/Data_Spooling.html
- Bacula 15.0.x manual: Basic Volume Management - https://www.bacula.org/15.0.x-manuals/en/main/Basic_Volume_Management.html
- Baculum installation documentation - https://baculum.app/doc/brief/installation.html
- funbox Bacula Prometheus exporter README - https://github.com/funbox/bacula_exporter

## Issues Found
- Corrected Ubuntu Bacula package names. The PostgreSQL setup now installs `bacula-director-pgsql` and `bacula-sd`; the MariaDB/MySQL variant now uses `bacula-sd` instead of the obsolete/nonexistent `bacula-sd-mysql` package on Ubuntu 24.04.
- Added a note that `dbconfig-common` can create the Bacula catalog automatically. The manual PostgreSQL setup now uses Bacula's packaged helper scripts with `db_name`, `db_user`, and `db_password` environment variables so the scripts do not run with placeholder defaults.
- Replaced hard-coded PostgreSQL 14 paths with `SHOW hba_file` and wildcard log paths so the instructions work on Ubuntu 22.04 and 24.04.
- Updated PostgreSQL authentication examples from `md5` to `scram-sha-256`, matching current Ubuntu/PostgreSQL defaults.
- Removed the invalid `dbdriver = "postgresql"` Catalog directive and aligned database address/port directives with Bacula's generated configuration style.
- Fixed the Director `QueryFile` path from `/etc/bacula/query.sql` to `/etc/bacula/scripts/query.sql`.
- Corrected the FileSet `onefs` explanation and value, and fixed the inaccurate `noatime` comment.
- Changed the Director Storage `Address` from `localhost` to `bacula-server` so remote File Daemons receive a usable Storage Daemon address.
- Corrected Bacula job spooling syntax from `SpoolSize` to `Spool Size`.
- Fixed the every-four-hours schedule example by using explicit `daily at HH:MM` entries instead of invalid/misleading `hourly at 4:00` style entries.
- Replaced deprecated `apt-key` Baculum repository setup with a `signed-by` keyring command, and corrected the repository caveat because the documented Baculum 11 Ubuntu repository lists `focal`; the previous `jammy` URL returned 404.
- Added missing Baculum dependencies `apache2-utils` and `php-ldap`.
- Corrected Baculum API bconsole configuration to use a dedicated restricted console config file instead of a nonexistent `configure add console` bconsole command.
- Replaced the dead `marcusva/bacula_exporter` release download URL with the documented `funbox/bacula_exporter` build, config format, and `-c` CLI flag.
- Fixed `sudo bconsole -c "messages"` to pipe the `messages` command into `bconsole`; `-c` is for selecting a bconsole config file.

## Review Notes
The post is technically relevant and useful after correction. Baculum packaging remains version-sensitive: the current Baculum documentation consulted lists Ubuntu 20.04 package repository examples, so users on Ubuntu 22.04 or 24.04 should verify current Baculum package support before using the optional Baculum repository commands.
