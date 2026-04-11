# Validation Summary: What Is Percona Monitoring and Management (PMM) for MySQL

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- MySQL
- Percona Monitoring and Management (PMM) 2
- Docker
- VictoriaMetrics
- Grafana
- Query Analytics (QAN)

## Sources Consulted
- Percona PMM 2 Architecture documentation: https://docs.percona.com/percona-monitoring-and-management/2/details/architecture.html
- Percona VictoriaMetrics in PMM documentation: https://docs.percona.com/percona-monitoring-and-management/2/details/victoria-metrics.html
- Percona PMM 2 Docker Setup: https://docs.percona.com/percona-monitoring-and-management/2/setting-up/server/docker.html
- Percona PMM 2 Client Setup: https://docs.percona.com/percona-monitoring-and-management/2/setting-up/client/index.html
- Percona PMM 2 MySQL Client Setup: https://docs.percona.com/percona-monitoring-and-management/2/setting-up/client/mysql.html
- pmm-admin command reference: https://docs.percona.com/percona-monitoring-and-management/2/details/commands/pmm-admin.html
- Percona blog on Prometheus to VictoriaMetrics migration: https://www.percona.com/blog/percona-monitoring-and-management-migration-from-prometheus-to-victoriametrics-faq/

## Issues Found

1. **Prometheus incorrectly listed as metrics storage backend (3 locations)**
   - **What was wrong:** The post referred to "Prometheus metrics storage" in the Overview section, showed "Prometheus" in the architecture diagram, and mentioned "Prometheus-based metrics collection" in the Summary. PMM 2 replaced Prometheus with VictoriaMetrics as its time-series database starting in PMM 2.12.0.
   - **What was changed:** Replaced all three references with "VictoriaMetrics" (lines 16, 24, and 121).
   - **Why:** VictoriaMetrics has been the metrics storage backend in PMM 2 since version 2.12.0. While PMM still uses Prometheus-compatible exporters for data collection, the storage layer is VictoriaMetrics.

2. **Architecture diagram showed `pt-mongodb-summary` on a MySQL host**
   - **What was wrong:** The architecture diagram listed `pt-mongodb-summary` as a component on the MySQL host. `pt-mongodb-summary` is a Percona Toolkit command for MongoDB, not a PMM exporter, and has no place on a MySQL host.
   - **What was changed:** Replaced `pt-mongodb-summary` with `node_exporter` in the architecture diagram.
   - **Why:** On a MySQL host, PMM Client runs `mysqld_exporter` (for MySQL metrics) and `node_exporter` (for OS-level system metrics). These are the correct components for a MySQL-focused architecture diagram.

## Review Notes
- PMM 2 reached end-of-life on October 31, 2025. Since this post is dated March 2026, PMM 3 is the current version. The post could be updated to target PMM 3 in the future, though the core concepts remain similar.
- The Docker `docker run` command does not include a data volume (`-v pmm-data:/srv`), which means PMM data would not persist across container restarts. This is not technically wrong for a quick start example but would be important for production use.
- The MySQL GRANT statements include `SELECT, UPDATE, DELETE, DROP ON performance_schema.*` which is more permissive than the official PMM documentation's minimum requirements. This won't cause errors but grants more privileges than necessary.
- For MySQL 8.0+, the official docs also recommend granting `BACKUP_ADMIN` to the PMM user, which the post does not mention. This is version-specific and the post doesn't target a specific MySQL version.
- In MySQL 8.0.26+, `log_slow_slave_statements` was deprecated in favor of `log_slow_replica_statements`. Both still work, but the newer name is preferred for MySQL 8.0.26+.
