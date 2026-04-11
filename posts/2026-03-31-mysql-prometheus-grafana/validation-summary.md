# Validation Summary: How to Set Up MySQL Monitoring with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (monitoring user creation, status variables, replication metrics)
- Prometheus mysqld_exporter v0.15.1 (installation, configuration, collector flags)
- Prometheus (scrape configuration, alerting rules, PromQL expressions)
- Grafana (dashboard import, Percona dashboard ID 7362)
- Alertmanager (architecture reference)
- systemd (service unit file for mysqld_exporter)

## Sources Consulted
- prometheus/mysqld_exporter README and releases — https://github.com/prometheus/mysqld_exporter
- Prometheus PromQL operators documentation — https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules documentation — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus configuration documentation — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- PromQL lexer source (lex.go) confirming case-insensitive keywords — https://github.com/prometheus/prometheus/blob/main/promql/parser/lex.go
- MySQL CREATE USER documentation — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL GRANT documentation — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- Grafana dashboard registry (IDs 7362, 6239, 11323) — https://grafana.com/grafana/dashboards/

## Issues Found
1. **Mermaid diagram label "scrape metrics" between MySQL and mysqld_exporter was inaccurate.** The term "scrape" is specific to Prometheus's HTTP pull mechanism (Prometheus scrapes the exporter's `/metrics` endpoint). The exporter does not "scrape" MySQL — it connects via SQL to collect metrics. Changed the arrow to `EXP -- "collect metrics" --> MySQL` to accurately reflect the relationship and avoid confusing the two distinct mechanisms.

## Review Notes
- The `GRANT SELECT ON performance_schema.*` statement is redundant since `SELECT ON *.*` already covers all schemas including performance_schema. Not harmful, just unnecessary.
- The `--collect.info_schema.userstats` and `--collect.info_schema.tablestats` flags require the `userstat` server variable (a Percona Server / MariaDB extension). On vanilla Oracle MySQL, these collectors will not produce metrics. The post does not note this caveat.
- The `OR` operator in the `MySQLReplicationNotRunning` alert rule is uppercase. While technically valid (PromQL keywords are case-insensitive per the lexer implementation), all official Prometheus documentation uses lowercase `or`. This is a style convention, not a bug.
- Dashboard ID 7362 (Percona MySQL Overview) is designed for Percona Monitoring and Management (PMM). It works largely with the standard mysqld_exporter but some panels may rely on Percona-specific metrics. Dashboards 6239 and 11323 are valid alternatives.
- mysqld_exporter v0.15.1 is a valid release. Newer versions may be available; the post's download URL and binary paths are correct for that version.
