# Validation Summary: How to Set Up the MySQL Exporter for Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (user creation, grants, performance_schema)
- Prometheus mysqld_exporter (v0.15.1)
- Prometheus (scrape configuration, PromQL queries)
- systemd (service unit file)
- Linux (wget, tar, file permissions)

## Sources Consulted
- prometheus/mysqld_exporter GitHub repository (https://github.com/prometheus/mysqld_exporter)
- mysqld_exporter README and collector documentation (https://github.com/prometheus/mysqld_exporter/blob/main/README.md)
- mysqld_exporter GitHub releases page (https://github.com/prometheus/mysqld_exporter/releases)
- MySQL GRANT statement documentation (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- MySQL CREATE USER documentation (https://dev.mysql.com/doc/refman/8.0/en/create-user.html)
- Prometheus scrape configuration documentation (https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)

## Issues Found

### 1. Missing `chown` on credentials file (functional bug)
- **What was wrong:** The credentials file `/etc/mysqld_exporter/.my.cnf` was created using `sudo tee` (owned by root:root) and set to `chmod 600` (owner-only read/write). However, the systemd service runs as `User=prometheus`, meaning the exporter process would fail to read the credentials file at startup due to a permission denied error.
- **What was changed:** Added `sudo chown prometheus:prometheus /etc/mysqld_exporter/.my.cnf` before the `chmod 600` line in the credentials file section.
- **Why:** Without this fix, following the tutorial as written would result in the exporter failing to start or failing to connect to MySQL.

### 2. Misleading "latest release" claim (accuracy)
- **What was wrong:** The text said "Download the latest release from GitHub:" but linked to v0.15.1, which is not the latest version. Newer versions (v0.16.0+) have been released with MySQL 8.4 replica syntax support and other improvements.
- **What was changed:** Changed "Download the latest release from GitHub:" to "Download a release from GitHub:" to avoid implying v0.15.1 is the most current version.
- **Why:** Readers visiting the page at different times would be misled into thinking v0.15.1 is the latest. The tutorial remains valid with v0.15.1 since all flags and features used are supported in that version.

## Review Notes
- The `GRANT SELECT ON performance_schema.*` statement on line 20 is technically redundant since `SELECT ON *.*` already covers all schemas including performance_schema. However, this is a common defensive pattern in tutorials and not incorrect.
- The `FLUSH PRIVILEGES;` statement is not strictly necessary after GRANT statements in MySQL 5.7+, but it is harmless and commonly included.
- The `relabel_configs` section in the Prometheus scrape config is redundant since Prometheus already sets the `instance` label to `__address__` by default. Not incorrect, but unnecessary.
- Some collector flags specified (`--collect.global_status`, `--collect.global_variables`) are enabled by default in mysqld_exporter and don't need to be explicitly specified. Being explicit is fine for clarity.
- The `--collect.slave_status` flag uses MySQL's older "slave" terminology. MySQL 8.0.22+ renamed `SHOW SLAVE STATUS` to `SHOW REPLICA STATUS`, and mysqld_exporter v0.16.0+ added support for the new syntax. For MySQL 8.4+, users should consider upgrading to a newer exporter version.
- All SQL syntax, collector flags, metric names, PromQL queries, and systemd service configuration are technically correct and verified against official sources.
