# How to Set Up MySQL Alerting Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Alerting, Prometheus, Monitoring, Rule

Description: Define Prometheus alerting rules for MySQL to get notified when connections, replication lag, query rate, and InnoDB metrics cross critical thresholds.

---

## Why Define Alerting Rules for MySQL

Reactive monitoring - checking dashboards after a user complains - leads to long outages. Alerting rules evaluate metrics continuously and fire notifications when conditions are met, enabling your team to act before users notice a problem. Prometheus alert rules for MySQL work alongside the MySQL Exporter to cover the most critical failure modes.

## Prerequisites

This guide assumes the MySQL Exporter is already running and scraping into Prometheus. See the Prometheus documentation for installation steps.

## Prometheus Alert Rules File

Create `/etc/prometheus/rules/mysql.rules.yml`:

```yaml
groups:
  - name: mysql
    rules:
      - alert: MySQLDown
        expr: mysql_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MySQL instance {{ $labels.instance }} is down"
          description: "MySQL has been unreachable for more than 1 minute."

      - alert: MySQLTooManyConnections
        expr: >
          mysql_global_status_threads_connected /
          mysql_global_variables_max_connections > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "MySQL connections over 80% on {{ $labels.instance }}"

      - alert: MySQLHighQPS
        expr: rate(mysql_global_status_queries[5m]) > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MySQL QPS above 10000 on {{ $labels.instance }}"

      - alert: MySQLSlowQueriesHigh
        expr: rate(mysql_global_status_slow_queries[5m]) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MySQL slow query rate above 5/s on {{ $labels.instance }}"

      - alert: MySQLReplicationLagHigh
        expr: mysql_slave_status_seconds_behind_master > 30
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "MySQL replication lag on {{ $labels.instance }} is {{ $value }}s"

      - alert: MySQLReplicationSQLThreadDown
        expr: mysql_slave_status_slave_sql_running == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MySQL replication SQL thread stopped on {{ $labels.instance }}"

      - alert: MySQLInnoDBBufferPoolLowFree
        expr: >
          mysql_global_status_innodb_buffer_pool_pages_free /
          mysql_global_status_innodb_buffer_pool_pages_total < 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "InnoDB buffer pool free pages below 5% on {{ $labels.instance }}"
```

## Loading the Rules in Prometheus

Reference the file in `/etc/prometheus/prometheus.yml`:

```yaml
rule_files:
  - /etc/prometheus/rules/mysql.rules.yml
```

Reload Prometheus:

```bash
sudo systemctl reload prometheus
# or send SIGHUP
curl -X POST http://localhost:9090/-/reload
```

## Verifying Rules Are Loaded

```bash
curl http://localhost:9090/api/v1/rules | python3 -m json.tool | grep '"name"'
```

Visit `http://<prometheus>:9090/alerts` to see the rule states.

## Routing Alerts with Alertmanager

In `alertmanager.yml`, route critical MySQL alerts to PagerDuty and warnings to Slack:

```yaml
route:
  routes:
    - match:
        severity: critical
        job: mysql
      receiver: pagerduty
    - match:
        severity: warning
        job: mysql
      receiver: slack-mysql
```

## Summary

Prometheus alerting rules for MySQL should cover availability (`mysql_up`), connection saturation, slow query rate, replication lag, replication thread state, and InnoDB buffer pool pressure. Use the `for` clause to avoid false alarms from momentary spikes, and route critical alerts to an on-call system while sending warnings to a Slack channel for less urgent review.
