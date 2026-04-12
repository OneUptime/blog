# Validation Summary: How to Monitor MySQL with Percona Monitoring and Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Percona Monitoring and Management (PMM) 2.x
- Docker
- Grafana
- Prometheus
- Performance Schema
- PMM Query Analytics (QAN)

## Sources Consulted
- Percona PMM 2 documentation: https://docs.percona.com/percona-monitoring-and-management/
- Percona PMM Client MySQL setup: https://docs.percona.com/percona-monitoring-and-management/setting-up/client/mysql.html
- Percona software repositories installation: https://docs.percona.com/percona-software-repositories/installing.html
- Docker Hub percona/pmm-server: https://hub.docker.com/r/percona/pmm-server
- MySQL Performance Schema reference: https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html

## Issues Found
1. **Incorrect Percona release package URL for Debian/Ubuntu**: The install command used `$(lsb_release -sc)` (distro codename) in the `.deb` filename, e.g., `percona-release_latest.focal_all.deb`. Current Percona documentation uses a `generic` package that works across all supported distributions. Changed `percona-release_latest.$(lsb_release -sc)_all.deb` to `percona-release_latest.generic_all.deb` in both the `wget` and `dpkg` commands.

## Review Notes
- The MySQL user grants include the `SUPER` privilege, which is deprecated in MySQL 8.0+ in favor of more granular dynamic privileges like `BACKUP_ADMIN`. The command still works in MySQL 8.0 (deprecated, not removed) and is correct for MySQL 5.7. A future update could note the version-specific difference.
- The `curl` command for the advisors API does not include the `-k` flag, which would be needed if the PMM server uses a self-signed TLS certificate (the default). This is a practical consideration rather than a syntax error.
- The Docker deployment uses `percona/pmm-server:2` which pins to the PMM 2.x line. This is correct and recommended for stability.
- The architecture diagram is simplified but accurately represents the PMM client-server model.
