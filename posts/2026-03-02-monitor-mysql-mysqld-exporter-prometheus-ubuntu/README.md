# How to Monitor MySQL with mysqld_exporter and Prometheus on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MySQL, Prometheus, Monitoring, Database

Description: Complete guide to setting up MySQL monitoring with mysqld_exporter and Prometheus on Ubuntu, including key metrics, alerting rules, and Grafana dashboards.

---

Monitoring MySQL effectively means understanding not just whether it is running, but how it is running - query throughput, connection pool saturation, replication lag, innodb buffer pool hit rates, and slow queries. The mysqld_exporter from the Prometheus ecosystem exposes hundreds of MySQL metrics in Prometheus format, making them easy to visualize and alert on.

## Prerequisites

This guide assumes Prometheus is already installed. If not, set it up first on port 9090. MySQL should be running on the same server or a reachable host.

## Installing mysqld_exporter

```bash
# Download mysqld_exporter
EXPORTER_VERSION="0.15.1"
cd /tmp
wget "https://github.com/prometheus/mysqld_exporter/releases/download/v${EXPORTER_VERSION}/mysqld_exporter-${EXPORTER_VERSION}.linux-amd64.tar.gz"

# Verify checksum (compare with official release page)
sha256sum "mysqld_exporter-${EXPORTER_VERSION}.linux-amd64.tar.gz"

# Extract and install
tar xzf "mysqld_exporter-${EXPORTER_VERSION}.linux-amd64.tar.gz"
sudo cp "mysqld_exporter-${EXPORTER_VERSION}.linux-amd64/mysqld_exporter" /usr/local/bin/

# Create dedicated user
sudo useradd --no-create-home --shell /bin/false mysqld_exporter
sudo chown mysqld_exporter:mysqld_exporter /usr/local/bin/mysqld_exporter
```

## Creating a MySQL User for Monitoring

The exporter needs a MySQL user with read-only access to performance schema and status tables:

```bash
# Connect to MySQL as root
sudo mysql -u root -p

# Create monitoring user with required privileges
# These grants are for read-only monitoring - no write access
CREATE USER 'exporter'@'localhost' IDENTIFIED BY 'exporterpassword' WITH MAX_USER_CONNECTIONS 3;

GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'localhost';

-- Performance Schema access for detailed metrics
GRANT SELECT ON performance_schema.* TO 'exporter'@'localhost';

-- For MySQL 8.0+ replication monitoring
-- GRANT REPLICATION SLAVE ON *.* TO 'exporter'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

## Configuring the Exporter

Store credentials in a configuration file rather than command-line arguments:

```bash
# Create credential file
sudo tee /etc/.mysqld_exporter.cnf << 'EOF'
[client]
user=exporter
password=exporterpassword
host=localhost
port=3306
EOF

# Secure the credential file
sudo chown mysqld_exporter:mysqld_exporter /etc/.mysqld_exporter.cnf
sudo chmod 400 /etc/.mysqld_exporter.cnf
```

## Creating the Systemd Service

```bash
sudo tee /etc/systemd/system/mysqld_exporter.service << 'EOF'
[Unit]
Description=Prometheus MySQL Exporter
Documentation=https://github.com/prometheus/mysqld_exporter
After=network-online.target mysql.service

[Service]
User=mysqld_exporter
Group=mysqld_exporter
Type=simple
ExecStart=/usr/local/bin/mysqld_exporter \
    --config.my-cnf=/etc/.mysqld_exporter.cnf \
    --web.listen-address=0.0.0.0:9104 \
    --collect.global_status \
    --collect.global_variables \
    --collect.info_schema.processlist \
    --collect.info_schema.innodb_metrics \
    --collect.info_schema.innodb_tablespaces \
    --collect.info_schema.innodb_cmp \
    --collect.info_schema.innodb_cmpmem \
    --collect.info_schema.query_response_time \
    --collect.perf_schema.eventsstatements \
    --collect.perf_schema.eventsstatementssum \
    --collect.perf_schema.eventswaits \
    --collect.perf_schema.file_events \
    --collect.perf_schema.indexiowaits \
    --collect.perf_schema.tableiowaits \
    --collect.perf_schema.tablelocks \
    --collect.slave_status \
    --collect.engine_innodb_status \
    --collect.info_schema.tables

Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the exporter
sudo systemctl daemon-reload
sudo systemctl enable --now mysqld_exporter

# Verify it is running
sudo systemctl status mysqld_exporter
ss -tlnp | grep 9104

# Test metrics endpoint
curl -s http://localhost:9104/metrics | head -50
```

## Adding to Prometheus Configuration

```bash
# Add to /etc/prometheus/prometheus.yml
sudo tee -a /etc/prometheus/prometheus.yml << 'EOF'

  # MySQL monitoring
  - job_name: 'mysql'
    static_configs:
      - targets:
          - 'localhost:9104'
        labels:
          instance: 'mysql-primary'
          environment: 'production'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
EOF

# Reload Prometheus
sudo systemctl reload prometheus
# Or using the lifecycle API
curl -X POST http://localhost:9090/-/reload
```

## Key MySQL Metrics to Monitor

Once data is flowing, these are the most important metrics to watch:

```promql
# ===== Throughput =====

# Queries per second
rate(mysql_global_status_queries[5m])

# Questions per second (user queries only, excludes internal)
rate(mysql_global_status_questions[5m])

# Slow queries per second
rate(mysql_global_status_slow_queries[5m])

# ===== Connections =====

# Current open connections
mysql_global_status_threads_connected

# Maximum connections ever seen
mysql_global_status_max_used_connections

# Connection utilization percentage
mysql_global_status_threads_connected /
mysql_global_variables_max_connections * 100

# ===== InnoDB Buffer Pool =====

# Buffer pool hit rate (should be > 99%)
(rate(mysql_global_status_innodb_buffer_pool_read_requests[5m]) -
 rate(mysql_global_status_innodb_buffer_pool_reads[5m])) /
rate(mysql_global_status_innodb_buffer_pool_read_requests[5m]) * 100

# Buffer pool utilization
(mysql_global_status_innodb_buffer_pool_pages_total -
 mysql_global_status_innodb_buffer_pool_pages_free) /
mysql_global_status_innodb_buffer_pool_pages_total * 100

# ===== Replication (if replica) =====

# Seconds behind primary
mysql_slave_status_seconds_behind_master

# Replication running
mysql_slave_status_slave_sql_running
mysql_slave_status_slave_io_running

# ===== Table Locks =====

# Table lock wait rate
rate(mysql_global_status_table_locks_waited[5m])

# Lock immediate vs waited ratio
rate(mysql_global_status_table_locks_immediate[5m]) /
(rate(mysql_global_status_table_locks_immediate[5m]) +
 rate(mysql_global_status_table_locks_waited[5m]))

# ===== Network =====

# Bytes received per second
rate(mysql_global_status_bytes_received[5m])

# Bytes sent per second
rate(mysql_global_status_bytes_sent[5m])
```

## Prometheus Alerting Rules for MySQL

```bash
sudo tee /etc/prometheus/rules/mysql_alerts.yml << 'EOF'
groups:
  - name: mysql_alerts
    rules:
      # MySQL is down
      - alert: MySQLDown
        expr: mysql_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MySQL is down on {{ $labels.instance }}"
          description: "MySQL has been unreachable for 1 minute"

      # Too many connections
      - alert: MySQLTooManyConnections
        expr: >
          mysql_global_status_threads_connected /
          mysql_global_variables_max_connections * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MySQL connection usage high on {{ $labels.instance }}"
          description: "Connection pool at {{ $value | printf \"%.0f\" }}%"

      # Low InnoDB buffer pool hit rate
      - alert: MySQLInnoDBBufferPoolLowHitRate
        expr: >
          (rate(mysql_global_status_innodb_buffer_pool_read_requests[5m]) -
           rate(mysql_global_status_innodb_buffer_pool_reads[5m])) /
          rate(mysql_global_status_innodb_buffer_pool_read_requests[5m]) * 100 < 95
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "MySQL InnoDB buffer pool hit rate low on {{ $labels.instance }}"
          description: "Buffer pool hit rate is {{ $value | printf \"%.1f\" }}%"

      # High slow query rate
      - alert: MySQLHighSlowQueryRate
        expr: rate(mysql_global_status_slow_queries[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High slow query rate on {{ $labels.instance }}"
          description: "{{ $value | printf \"%.2f\" }} slow queries/second"

      # Replication lag
      - alert: MySQLReplicationLag
        expr: mysql_slave_status_seconds_behind_master > 60
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "MySQL replication lag on {{ $labels.instance }}"
          description: "Replication is {{ $value | printf \"%.0f\" }} seconds behind"

      # Replication stopped
      - alert: MySQLReplicationStopped
        expr: mysql_slave_status_slave_sql_running == 0 or mysql_slave_status_slave_io_running == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MySQL replication stopped on {{ $labels.instance }}"
          description: "Replication thread has stopped"
EOF

# Validate rules
sudo -u prometheus promtool check rules /etc/prometheus/rules/mysql_alerts.yml

# Add to prometheus.yml if not already there
# rule_files:
#   - "rules/*.yml"

sudo systemctl reload prometheus
```

## Importing a Grafana Dashboard

Import the official MySQL Overview dashboard from Grafana:

```bash
# Import dashboard ID 7362 (MySQL Overview) via API
GRAFANA_TOKEN="your-grafana-api-token"

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GRAFANA_TOKEN}" \
  http://localhost:3000/api/dashboards/import \
  -d '{
    "gnetId": 7362,
    "overwrite": true,
    "inputs": [{
      "name": "DS_PROMETHEUS",
      "type": "datasource",
      "pluginId": "prometheus",
      "value": "Prometheus"
    }]
  }'
```

Or import manually: Grafana > Dashboards > Import > enter `7362` > select Prometheus datasource.

## Enabling Performance Schema

For the most detailed metrics, ensure Performance Schema is enabled:

```bash
# Check if Performance Schema is enabled
sudo mysql -u root -p -e "SHOW VARIABLES LIKE 'performance_schema';"

# Enable in MySQL configuration if needed
sudo tee -a /etc/mysql/mysql.conf.d/mysqld.cnf << 'EOF'
[mysqld]
# Enable Performance Schema
performance_schema = ON
performance_schema_events_statements_history_size = 50
performance_schema_events_stages_history_size = 50
performance_schema_events_waits_history_size = 50
EOF

sudo systemctl restart mysql
```

## Troubleshooting

```bash
# Check if the exporter is collecting metrics
curl -s http://localhost:9104/metrics | grep "mysql_up"
# Should output: mysql_up 1

# Check for authentication issues in exporter logs
sudo journalctl -u mysqld_exporter -n 50

# Verify MySQL user permissions
sudo mysql -u exporter -pexporterpassword -e "SHOW STATUS LIKE 'Uptime';"

# Check Prometheus is scraping the target
# In Prometheus web UI: Status > Targets > Look for mysql job

# Test the specific metrics
curl -s "http://localhost:9104/metrics" | grep mysql_global_status_queries
```

The combination of mysqld_exporter, Prometheus, and Grafana gives you complete visibility into MySQL's internal state. The buffer pool hit rate, connection saturation, and replication lag metrics are the three most important to watch in production - they surface the most common causes of MySQL performance problems before they escalate into outages.
