# Validation Summary: How to Set Up MySQL Monitoring with Percona Monitoring and Management (PMM)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0+)
- Percona Monitoring and Management (PMM) 2.x
- Docker
- VictoriaMetrics (PMM metrics storage)
- Grafana (PMM dashboards)
- Performance Schema
- Slow Query Log

## Sources Consulted
- Percona PMM 2 Documentation — VictoriaMetrics details: https://docs.percona.com/percona-monitoring-and-management/2/details/victoria-metrics.html
- Percona PMM 2 MySQL Client Setup (privileges): https://docs.percona.com/percona-monitoring-and-management/2/setting-up/client/mysql.html
- Percona PMM 3 MySQL Privileges reference: https://docs.percona.com/percona-monitoring-and-management/3/install-pmm/install-pmm-client/connect-database/mysql/mysql.html
- Percona PMM 2 Docker Server Setup: https://docs.percona.com/percona-monitoring-and-management/2/setting-up/server/docker.html
- Percona PMM 2 Client Installation: https://docs.percona.com/percona-monitoring-and-management/2/setting-up/client/index.html
- Percona Prometheus to VictoriaMetrics Migration FAQ: https://www.percona.com/blog/percona-monitoring-and-management-migration-from-prometheus-to-victoriametrics-faq/

## Issues Found

### 1. PMM 2 metrics backend incorrectly listed as Prometheus
- **What was wrong:** The post stated PMM Server runs "Grafana, Prometheus, and Percona-specific dashboards" and the mermaid diagram labeled the server as "Prometheus + Grafana + QAN". PMM 2 switched from Prometheus to VictoriaMetrics as its metrics storage backend in version 2.12.0.
- **What was changed:** Replaced "Prometheus" with "VictoriaMetrics" in the PMM Server description (line 15), the mermaid diagram (line 23), and the summary paragraph (line 216).
- **Why:** The `percona/pmm-server:2` Docker image uses VictoriaMetrics, not Prometheus. Stating otherwise is factually incorrect for any current PMM 2 installation.

### 2. MySQL monitoring user privileges mixed incompatible version-specific grants
- **What was wrong:** The GRANT statement included both `SUPER` and `BACKUP_ADMIN` together. `SUPER` is not recommended by Percona's official PMM documentation for any MySQL version. `BACKUP_ADMIN` is a MySQL 8.0+ privilege that does not exist in MySQL 5.7, so the combined statement would fail on MySQL 5.7.
- **What was changed:** Removed `SUPER` from the GRANT statement, kept `BACKUP_ADMIN` for MySQL 8.0+, and added a commented-out alternative for MySQL 5.7 (which omits `BACKUP_ADMIN`).
- **Why:** Per Percona's official documentation, the recommended privileges are `SELECT, PROCESS, REPLICATION CLIENT, RELOAD, BACKUP_ADMIN` for MySQL 8.0+ and `SELECT, PROCESS, REPLICATION CLIENT, RELOAD` for MySQL 5.7. `SUPER` is not part of either recommendation.

## Review Notes
- The Docker command maps both ports 80 and 443. Percona's primary documentation recommends mapping only port 443 since PMM Client requires TLS. Mapping port 80 is not wrong but is less secure. Left as-is since it still works.
- The `percona-release setup pmm2-client` command may not be the currently recommended installation approach. Recent Percona docs show installing `percona-release` and then directly running `apt install pmm2-client` without a separate setup/enable step. Left as-is since the command still functions.
- Dashboard names (e.g., "MySQL InnoDB Metrics", "MySQL Table Statistics") may not exactly match current PMM 2 UI labels, which have been renamed in recent versions (e.g., "MySQL InnoDB Details", "MySQL Table Details"). Left as-is since they are recognizable.
