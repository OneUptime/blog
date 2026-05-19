# Validation Summary: How to Configure Osquery for Security Analytics on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- osquery and osqueryd
- osquery SQL tables and query packs
- osquery file integrity monitoring
- Filebeat filestream input
- Kafka logger plugin

## Sources Consulted
- osquery configuration documentation: https://osquery.readthedocs.io/en/stable/deployment/configuration/
- osquery file integrity monitoring documentation: https://osquery.readthedocs.io/en/5.9.0/deployment/file-integrity-monitoring/
- osquery command-line flags documentation: https://osquery.readthedocs.io/en/latest/installation/cli-flags/
- osquery GitHub releases API and release assets: https://api.github.com/repos/osquery/osquery/releases/latest
- osquery source table specifications for `file`, `file_events`, `processes`, `process_open_sockets`, `listening_ports`, `users`, `last`, `sudoers`, `authorized_keys`, `crontab`, `deb_packages`, and `suid_bin`: https://github.com/osquery/osquery/tree/5.23.0/specs
- osquery Kafka logger source flags: https://github.com/osquery/osquery/blob/5.23.0/plugins/logger/kafka_producer.cpp

## Issues Found
- The Ubuntu installation commands used deprecated `apt-key` repository setup. Updated them to install the osquery key under `/etc/apt/keyrings` and configure the repository with `signed-by`.
- The direct `.deb` example pinned `OSQUERY_VERSION="5.12.1"` while saying to get the latest release. Updated it to `5.23.0`, the latest GitHub release found during validation.
- The `file` table examples selected and filtered on a non-existent `permissions` column. osquery's `file` table uses `mode`, so the world-writable directory example now selects `mode`.
- The broad `file` table examples lacked a required `path` or `directory` constraint. Replaced the SUID example with the `suid_bin` table and constrained the world-writable directory query to common writable paths.
- The `deb_packages` examples and scheduled query used a non-existent `install_time` column. Replaced those examples with valid `name`, `version`, `arch`, and `status` fields.
- The scheduled `suid_bin` query selected non-existent `uid` and `gid` columns. Updated it to use `username` and `groupname`.
- The FIM configuration enabled events but did not enable the `file_events` publisher. Added `enable_file_events` to the osqueryd options.

## Review Notes
- The post is technically relevant and remains valid as an osquery security analytics guide after the fixes.
- The local environment did not have `osqueryi` installed, so query validation was performed against official osquery documentation, source table specifications, and release metadata.
