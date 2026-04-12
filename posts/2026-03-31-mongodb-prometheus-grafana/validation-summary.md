# Validation Summary: How to Set Up MongoDB Monitoring with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Percona mongodb_exporter v0.40.0
- Prometheus (scrape config, alerting rules)
- Grafana (dashboard import and provisioning)
- Alertmanager
- Docker Compose
- systemd

## Sources Consulted
- Percona mongodb_exporter GitHub repository (https://github.com/percona/mongodb_exporter) — verified flags (`--compatible-mode`, `--collect-all`, `--mongodb.uri`, `--web.listen-address`), default port (9216), metric naming conventions, and v1 compatibility layer source (`exporter/v1_compatibility.go`)
- Percona mongodb_exporter v0.40.0 release assets — confirmed download URL pattern
- Prometheus documentation for scrape_configs, alerting rules syntax, and rule_files configuration
- Grafana dashboard provisioning documentation
- MongoDB documentation for `clusterMonitor` role and `db.createUser()`

## Issues Found

### 1. Missing `--compatible-mode` flag (all exporter commands)
**What was wrong:** The post installs Percona mongodb_exporter v0.40.0 but uses old-style metric names throughout (e.g., `mongodb_connections`, `mongodb_op_counters_total`, `mongodb_wiredtiger_cache_bytes`). Starting from v0.20, the Percona exporter uses new-style metric names by default (e.g., `mongodb_ss_connections`, `mongodb_ss_opcounters`). Without `--compatible-mode`, the old-style metric names referenced in the PromQL queries and alerting rules would not exist.

**What was changed:** Added `--compatible-mode` flag to the CLI run command, the systemd service ExecStart, and the Docker Compose exporter command.

**Why:** The `--compatible-mode` flag enables the exporter to expose old-style metric names alongside the new ones, making all the PromQL queries, alerting rules, and community Grafana dashboards in the post work correctly.

### 2. Incorrect replication lag metric name
**What was wrong:** The post used `mongodb_replset_member_replication_lag` (missing `_mongod_` segment). The correct metric name in compatible mode is `mongodb_mongod_replset_member_replication_lag`.

**What was changed:** Updated the metric name to `mongodb_mongod_replset_member_replication_lag` in both the Key Metrics section and the alerting rules.

**Why:** The compatible-mode replset collector uses the `mongodb_mongod_replset_` prefix. The metric name without `_mongod_` does not exist in the exporter output.

## Review Notes
- The Prometheus reload endpoint (`curl -X POST http://localhost:9090/-/reload`) requires Prometheus to be started with `--web.enable-lifecycle` flag. The post does not mention this prerequisite. Readers may encounter a 403 error without it.
- The Docker Compose `version: "3.8"` field is ignored by Docker Compose V2 and is deprecated. It is not an error but is unnecessary for modern Docker Compose.
- The Grafana dashboard IDs (2583, 7353) are community-maintained and may change or be superseded over time. Readers should verify current availability on grafana.com.
- The cache hit ratio alert formula is mathematically correct but could produce NaN when there are zero cache page requests, which would cause the alert not to fire. This is generally acceptable behavior.
