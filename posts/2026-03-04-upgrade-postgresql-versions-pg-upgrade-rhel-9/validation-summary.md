# Validation Summary: How to Upgrade PostgreSQL Versions on RHEL 9 Using pg_upgrade

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- PostgreSQL 13, PostgreSQL 15, and PostgreSQL 16
- pg_upgrade
- postgresql-setup
- DNF module streams
- systemd
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and using database servers", PostgreSQL installation and migration sections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool", switching to a later module stream: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- PostgreSQL 16 documentation, pg_upgrade: https://www.postgresql.org/docs/16/pgupgrade.html
- PostgreSQL 16 documentation, vacuumdb: https://www.postgresql.org/docs/16/app-vacuumdb.html
- firewalld documentation, firewall-cmd permanent changes and reload behavior: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post used `dnf module install postgresql:16/server` as the PostgreSQL 16 example without distinguishing fresh target installation from switching an already-enabled RHEL 9 PostgreSQL module stream. Red Hat's DNF documentation requires `dnf module switch-to <module:stream/profile>` when moving an installed component to a later module stream. I updated Step 1 to keep `dnf module install postgresql:16/server` for fresh targets and added `dnf module switch-to postgresql:16/server` for upgrades from an earlier RHEL 9 PostgreSQL stream.

## Review Notes
- The RHEL 9 PostgreSQL migration documentation confirms the `postgresql-server` and `postgresql-upgrade` packages, default `/var/lib/pgsql/data` data directory, `postgresql-setup --upgrade`, `data-old` configuration handling, and `systemctl` service commands used in the post.
- The `vacuumdb --all --analyze-in-stages` command is valid for PostgreSQL 15 or later in the RHEL procedure and is also a documented PostgreSQL utility option.
- The firewalld commands use valid permanent configuration and reload syntax.
