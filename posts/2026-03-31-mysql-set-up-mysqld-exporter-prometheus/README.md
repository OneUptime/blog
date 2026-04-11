# How to Set Up the MySQL Exporter for Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Prometheus, Monitoring, Exporter, Observability

Description: Learn how to install and configure the mysqld_exporter to expose MySQL metrics for Prometheus scraping, including user setup, configuration, and metric verification.

---

The `mysqld_exporter` is the official Prometheus exporter for MySQL. It exposes hundreds of MySQL metrics including query throughput, connection counts, InnoDB statistics, and replication lag, all in Prometheus format.

## Creating a MySQL User for the Exporter

The exporter needs read access to MySQL system tables. Create a dedicated user:

```sql
CREATE USER 'exporter'@'localhost' IDENTIFIED BY 'strong_password' WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'localhost';
GRANT SELECT ON performance_schema.* TO 'exporter'@'localhost';
FLUSH PRIVILEGES;
```

## Installing mysqld_exporter

Download a release from GitHub:

```bash
# Download the binary
wget https://github.com/prometheus/mysqld_exporter/releases/download/v0.15.1/mysqld_exporter-0.15.1.linux-amd64.tar.gz
tar -xvf mysqld_exporter-0.15.1.linux-amd64.tar.gz
sudo mv mysqld_exporter-0.15.1.linux-amd64/mysqld_exporter /usr/local/bin/
```

## Configuring the MySQL Credentials File

Create a credentials file for the exporter:

```bash
sudo mkdir -p /etc/mysqld_exporter
sudo tee /etc/mysqld_exporter/.my.cnf <<EOF
[client]
user=exporter
password=strong_password
host=127.0.0.1
port=3306
EOF
sudo chown prometheus:prometheus /etc/mysqld_exporter/.my.cnf
sudo chmod 600 /etc/mysqld_exporter/.my.cnf
```

## Creating a systemd Service

```bash
sudo tee /etc/systemd/system/mysqld_exporter.service <<EOF
[Unit]
Description=Prometheus MySQL Exporter
After=network.target mysql.service

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/mysqld_exporter \
  --config.my-cnf=/etc/mysqld_exporter/.my.cnf \
  --collect.global_status \
  --collect.global_variables \
  --collect.info_schema.innodb_metrics \
  --collect.info_schema.processlist \
  --collect.info_schema.tables \
  --collect.perf_schema.eventsstatements \
  --collect.slave_status \
  --web.listen-address=0.0.0.0:9104
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mysqld_exporter
sudo systemctl start mysqld_exporter
```

## Verifying the Exporter is Running

```bash
# Check service status
systemctl status mysqld_exporter

# Verify metrics endpoint is accessible
curl -s http://localhost:9104/metrics | head -40
```

You should see output like:

```text
# HELP mysql_global_status_connections Total number of connections
# TYPE mysql_global_status_connections counter
mysql_global_status_connections 1234
# HELP mysql_global_status_threads_connected Current number of open connections
# TYPE mysql_global_status_threads_connected gauge
mysql_global_status_threads_connected 42
```

## Configuring Prometheus to Scrape the Exporter

Add the exporter as a scrape target in `/etc/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'mysql'
    static_configs:
      - targets: ['localhost:9104']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

Reload Prometheus:

```bash
systemctl reload prometheus
```

## Key Metrics to Watch

Once scraping is active, these are the most important metrics:

```text
mysql_global_status_threads_connected       # Active connections
mysql_global_status_slow_queries            # Slow query count
mysql_global_status_innodb_buffer_pool_reads # Buffer pool disk reads
mysql_slave_status_seconds_behind_master    # Replication lag
mysql_global_variables_max_connections      # Max connections setting
```

Query them in Prometheus:

```text
rate(mysql_global_status_queries[5m])
mysql_global_status_threads_connected / mysql_global_variables_max_connections * 100
```

## Summary

The `mysqld_exporter` exposes MySQL internals as Prometheus metrics with minimal setup. Create a dedicated MySQL user with the required grants, configure the credentials file, and run the exporter as a systemd service on port 9104. Add it as a Prometheus scrape target, then build Grafana dashboards using metrics like `mysql_global_status_threads_connected` and `mysql_global_status_slow_queries` to monitor MySQL health.
