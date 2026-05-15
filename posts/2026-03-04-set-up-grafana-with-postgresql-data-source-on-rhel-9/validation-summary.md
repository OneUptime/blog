# Validation Summary: How to Set Up Grafana with PostgreSQL Data Source on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Grafana
- PostgreSQL
- systemd
- RPM/DNF package management
- Grafana provisioning YAML

## Sources Consulted
- Grafana documentation: Install Grafana on RHEL or Fedora - https://grafana.com/docs/grafana/latest/setup-grafana/installation/redhat-rhel-fedora/
- Grafana documentation: Start the Grafana server - https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/
- Grafana documentation: PostgreSQL data source - https://grafana.com/docs/grafana/latest/datasources/postgres/
- Grafana documentation: Configure the PostgreSQL data source - https://grafana.com/docs/grafana/latest/datasources/postgres/configure/
- Grafana documentation: Provision Grafana - https://grafana.com/docs/grafana/latest/administration/provisioning/
- Red Hat documentation: Configuring and using database servers in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index

## Issues Found
- The original post used placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>`, which would not work for Grafana on RHEL. Replaced them with the correct Grafana RPM repository setup, package installation, and `grafana-server` systemd commands.
- The original post did not include an actual Grafana installation step despite saying the guide covered installation. Added the official RPM repository installation flow for RHEL/Fedora using `rpm --import`, `/etc/yum.repos.d/grafana.repo`, and `dnf install grafana`.
- The original post did not configure a PostgreSQL data source. Added a Grafana provisioning YAML example using the built-in `postgres` data source type and the documented `secureJsonData` and `jsonData` fields. The example uses `postgresVersion: 1300` because PostgreSQL 13 is the initial PostgreSQL version provided for RHEL 9.
- The original troubleshooting commands used generic package and service placeholders. Updated them to use `grafana-server` and `rpm -q grafana`.

## Review Notes
The corrected post uses Grafana OSS from the official RPM repository. Grafana Enterprise is also available from the same repository as `grafana-enterprise`, but the post now consistently documents the OSS package.
