# How to Monitor MySQL with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Prometheus, Grafana, Monitoring, Observability

Description: Set up MySQL monitoring with the mysqld_exporter for Prometheus and import pre-built Grafana dashboards for real-time performance visibility.

---

## Overview

Monitoring MySQL with Prometheus and Grafana involves three components:
1. `mysqld_exporter` - Exposes MySQL metrics in Prometheus format
2. Prometheus - Scrapes and stores time-series metrics
3. Grafana - Visualizes metrics with dashboards

## Installing mysqld_exporter

```bash
# Download the exporter
curl -LO https://github.com/prometheus/mysqld_exporter/releases/download/v0.15.1/mysqld_exporter-0.15.1.linux-amd64.tar.gz

tar xvf mysqld_exporter-0.15.1.linux-amd64.tar.gz
mv mysqld_exporter-0.15.1.linux-amd64/mysqld_exporter /usr/local/bin/
chmod +x /usr/local/bin/mysqld_exporter
```

## Creating the MySQL Monitoring User

```sql
CREATE USER 'exporter'@'127.0.0.1' IDENTIFIED BY 'ExporterPass123!' WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'127.0.0.1';
GRANT SELECT ON performance_schema.* TO 'exporter'@'127.0.0.1';
```

## Configuring mysqld_exporter

Create a credentials file:

```bash
cat > /etc/.mysqld_exporter.cnf << 'EOF'
[client]
user=exporter
password=ExporterPass123!
host=127.0.0.1
EOF
chmod 600 /etc/.mysqld_exporter.cnf
```

Create a systemd service:

```ini
# /etc/systemd/system/mysqld_exporter.service
[Unit]
Description=MySQL Prometheus Exporter
After=network.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/mysqld_exporter \
  --config.my-cnf=/etc/.mysqld_exporter.cnf \
  --collect.global_status \
  --collect.global_variables \
  --collect.info_schema.innodb_metrics \
  --collect.info_schema.processlist \
  --collect.perf_schema.eventsstatements \
  --collect.slave_status \
  --web.listen-address=:9104
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable mysqld_exporter
systemctl start mysqld_exporter
```

## Verifying the Exporter

```bash
curl http://localhost:9104/metrics | grep mysql_up
```

Expected output:

```text
mysql_up 1
```

## Configuring Prometheus to Scrape MySQL

Add the scrape config to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'mysql'
    static_configs:
      - targets:
          - '192.168.1.101:9104'
          - '192.168.1.102:9104'
        labels:
          env: 'production'
    scrape_interval: 15s
```

Reload Prometheus:

```bash
curl -X POST http://localhost:9090/-/reload
```

## Key Metrics to Monitor

Verify metrics are available in Prometheus:

```text
mysql_global_status_threads_connected
mysql_global_status_queries
mysql_global_status_slow_queries
mysql_global_status_innodb_buffer_pool_reads
mysql_global_status_innodb_buffer_pool_read_requests
mysql_global_variables_max_connections
mysql_slave_status_seconds_behind_master
```

## Importing a Grafana Dashboard

The most popular MySQL dashboard is Percona's MySQL Overview (ID: 7362).

1. In Grafana, go to Dashboards > Import
2. Enter dashboard ID `7362`
3. Select your Prometheus data source
4. Click Import

Alternatively, import from the MySQL Exporter Full dashboard (ID: 11323) for more detail.

## Creating a Custom Alert Rule

```yaml
# mysql_alerts.yml
groups:
  - name: mysql
    rules:
      - alert: MySQLDown
        expr: mysql_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MySQL instance is down"
          description: "MySQL on {{ $labels.instance }} has been down for 1 minute."

      - alert: MySQLTooManyConnections
        expr: mysql_global_status_threads_connected / mysql_global_variables_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MySQL connection usage above 80%"

      - alert: MySQLSlowQueriesHigh
        expr: rate(mysql_global_status_slow_queries[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MySQL slow query rate above 1/sec"
```

## Summary

MySQL monitoring with Prometheus requires installing `mysqld_exporter` alongside MySQL, creating a limited monitoring user, and adding the exporter as a scrape target in Prometheus. Pre-built Grafana dashboards (ID 7362 or 11323) provide immediate visibility into connections, query rates, InnoDB buffer pool usage, and replication lag, with custom alerting rules for critical thresholds.
