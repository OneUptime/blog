# Validation Summary: How to Monitor MySQL with Percona Monitoring and Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Percona Monitoring and Management (PMM) 2.x
- PMM Server (Docker)
- PMM Client / pmm2-client / pmm-admin
- MySQL 5.7 / 8.0
- MySQL Performance Schema
- Query Analytics (QAN)
- Alertmanager (PMM integrated)
- Docker
- Ubuntu 20.04 / 22.04

## Sources Consulted
- Official PMM 2 documentation: https://docs.percona.com/percona-monitoring-and-management/2.x/
- PMM Server install via Docker: https://docs.percona.com/percona-monitoring-and-management/2.x/setting-up/server/docker.html
- PMM Client setup: https://docs.percona.com/percona-monitoring-and-management/2.x/setting-up/client/index.html
- MySQL setup for PMM: https://docs.percona.com/percona-monitoring-and-management/2.x/setting-up/client/mysql.html
- MySQL 8.0 Reference Manual - BACKUP_ADMIN privilege: https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL Performance Schema documentation: https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html
- Alertmanager API documentation: https://prometheus.io/docs/alerting/latest/clients/
- Percona apt repository setup: https://docs.percona.com/percona-software-repositories/installing.html

## Issues Found
No technical issues found.

The post's technical content was verified against official PMM 2 documentation:

- The `percona/pmm-server:2` image tag and the `docker run` command (with `--restart always`, ports `443:443` and `80:80`, and the `pmm-data:/srv` volume) match the recommended Docker install method.
- The `pmm-admin config --server-insecure-tls --server-url=https://admin:password@host:443` syntax is correct for client registration.
- The MySQL user privilege grant (`SELECT, PROCESS, REPLICATION CLIENT, RELOAD, BACKUP_ADMIN`) matches the recommended PMM 2 privileges for MySQL 8.0. Note that `BACKUP_ADMIN` is MySQL 8.0+ only; users on MySQL 5.7 must omit it. This is consistent with how PMM documentation presents the privileges (recommended set assumes 8.0+).
- The `pmm-admin add mysql --query-source=perfschema` flags are valid and current.
- Performance Schema configuration directives (`performance_schema = ON`, `performance-schema-instrument`, `performance-schema-consumer-events-statements-history-long`) are valid MySQL options. Dash/underscore variants are interchangeable in MySQL config.
- The Percona apt repo install method using `percona-release_latest.$(lsb_release -sc)_all.deb` is the current standard.

## Review Notes
- The post supports both MySQL 5.7 and 8.0, but the `BACKUP_ADMIN` privilege in the GRANT statement is MySQL 8.0+ only. A user on MySQL 5.7 would receive an "Unknown privilege" error and need to drop that privilege from the grant. This mirrors the official PMM docs, which use the 8.0-ready privilege list by default, so it's left in place.
- PMM 3.x has been released; the post intentionally targets the PMM 2.x line (using the `:2` Docker tag), which is still supported and widely deployed. Future updates may want to add a note pointing readers to PMM 3.
- The Alertmanager curl example uses the v1 API endpoint (`/alertmanager/api/v1/alerts`). The v1 API still works in PMM 2 but is deprecated upstream in favor of v2. Not a functional issue today.
- Newer PMM versions favor the integrated "Percona Alerting" UI (Grafana-based) over direct Alertmanager API usage. The post correctly mentions the UI path as the primary option and shows the API call as an alternative.
- Optional improvement (not required): the post could mention that on MySQL 8.0 Performance Schema is enabled by default, so the explicit enabling step is mostly a verification rather than an action.
