# How to Monitor ClickHouse with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Prometheus, Grafana, Monitoring, Observability, Metric

Description: Learn how to set up end-to-end ClickHouse monitoring with Prometheus and Grafana, including the clickhouse-exporter, key metrics to track, and dashboard configuration.

---

ClickHouse exposes rich metrics through its HTTP interface and system tables. By combining the `clickhouse-exporter` with Prometheus and Grafana, you get a complete visibility stack: metric scraping, storage, alerting, and visualization. This guide walks through the full setup from installing the exporter to building dashboards.

## Architecture Overview

```text
ClickHouse (port 8123/9000)
       |
       v
clickhouse-exporter (port 9116)
       |
       v
Prometheus (port 9090)
       |
       v
Grafana (port 3000)
```

## Installing the ClickHouse Exporter

The `clickhouse-exporter` reads from `system.metrics`, `system.events`, and `system.asynchronous_metrics` and converts them into the Prometheus exposition format.

```bash
# Download the latest release
wget https://github.com/ClickHouse/clickhouse_exporter/releases/latest/download/clickhouse_exporter-linux-amd64.tar.gz

# Extract
tar -xzf clickhouse_exporter-linux-amd64.tar.gz
sudo mv clickhouse_exporter /usr/local/bin/

# Verify installation
clickhouse_exporter --version
```

Create a systemd service for the exporter:

```bash
sudo tee /etc/systemd/system/clickhouse_exporter.service > /dev/null <<'EOF'
[Unit]
Description=ClickHouse Prometheus Exporter
After=network.target clickhouse-server.service

[Service]
User=clickhouse
EnvironmentFile=/etc/clickhouse-exporter/env
ExecStart=/usr/local/bin/clickhouse_exporter \
  -scrape_uri=http://localhost:8123/ \
  -telemetry.address=:9116 \
  -telemetry.endpoint=/metrics
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Create the environment file with credentials:

```bash
sudo mkdir -p /etc/clickhouse-exporter
sudo tee /etc/clickhouse-exporter/env > /dev/null <<'EOF'
CLICKHOUSE_USER=monitoring
CLICKHOUSE_PASSWORD=your_secure_password
EOF
sudo chmod 600 /etc/clickhouse-exporter/env
```

Create the monitoring user in ClickHouse:

```sql
CREATE USER monitoring IDENTIFIED WITH sha256_password BY 'your_secure_password';
GRANT SELECT ON system.* TO monitoring;
```

Start the exporter:

```bash
sudo systemctl daemon-reload
sudo systemctl enable clickhouse_exporter
sudo systemctl start clickhouse_exporter

# Verify metrics are exposed
curl -s http://localhost:9116/metrics | head -30
```

## Configuring Prometheus

Add a scrape job for ClickHouse to your Prometheus configuration:

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: clickhouse
    static_configs:
      - targets:
          - clickhouse-node-1:9116
          - clickhouse-node-2:9116
          - clickhouse-node-3:9116
    relabel_configs:
      - source_labels: [__address__]
        regex: '([^:]+):.*'
        target_label: instance
        replacement: '$1'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
```

Reload Prometheus:

```bash
sudo systemctl reload prometheus

# Confirm targets are UP
curl -s http://localhost:9090/api/v1/targets | \
  python3 -c "import sys,json; [print(t['labels']['instance'], t['health']) for t in json.load(sys.stdin)['data']['activeTargets']]"
```

## Key ClickHouse Metrics

Verify the most important metrics are being collected:

```bash
# Query count
curl -sg 'http://localhost:9090/api/v1/query?query=ClickHouseMetrics_Query' | python3 -m json.tool

# Connections
curl -sg 'http://localhost:9090/api/v1/query?query=ClickHouseMetrics_TCPConnection' | python3 -m json.tool

# Merge operations in progress
curl -sg 'http://localhost:9090/api/v1/query?query=ClickHouseMetrics_Merge' | python3 -m json.tool
```

The metrics exposed by the exporter correspond directly to ClickHouse system tables:

```sql
-- Current live metric values
SELECT metric, value, description
FROM system.metrics
ORDER BY metric
LIMIT 30;

-- Cumulative event counters since server start
SELECT event, value, description
FROM system.events
ORDER BY event
LIMIT 30;

-- Asynchronous background metrics
SELECT metric, value
FROM system.asynchronous_metrics
WHERE metric LIKE '%Memory%'
   OR metric LIKE '%Disk%'
ORDER BY metric;
```

## Setting Up Grafana

Install Grafana and add Prometheus as a data source:

```bash
# Add Grafana GPG key and repository
sudo apt-get install -y apt-transport-https software-properties-common wget
sudo mkdir -p /etc/apt/keyrings
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

# Install
sudo apt-get update
sudo apt-get install -y grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

Add Prometheus as a data source via the Grafana API:

```bash
curl -X POST http://admin:admin@localhost:3000/api/datasources \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://localhost:9090",
    "access": "proxy",
    "isDefault": true
  }'
```

## Building a ClickHouse Dashboard

Use the Grafana dashboard-as-code approach with a JSON model. Key panels to include:

**QPS (Queries Per Second):**

```text
rate(ClickHouseProfileEvents_Query[1m])
```

**Active connections:**

```text
ClickHouseMetrics_TCPConnection + ClickHouseMetrics_HTTPConnection
```

**Memory in use:**

```text
ClickHouseMetrics_MemoryTracking / 1024 / 1024 / 1024
```

**Read throughput:**

```text
rate(ClickHouseProfileEvents_ReadCompressedBytes[1m]) / 1024 / 1024
```

**Merge backlog:**

```text
ClickHouseMetrics_Merge
```

**Replication lag (seconds):**

```text
ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay
```

Import the official ClickHouse Grafana dashboard (ID 14192) as a starting point:

```bash
# Fetch the dashboard JSON from grafana.com
DASHBOARD_JSON=$(curl -s https://grafana.com/api/dashboards/14192/revisions/latest/download)

# Import it into Grafana
curl -X POST http://admin:admin@localhost:3000/api/dashboards/import \
  -H 'Content-Type: application/json' \
  -d "{
    \"dashboard\": $DASHBOARD_JSON,
    \"inputs\": [{\"name\": \"DS_PROMETHEUS\", \"type\": \"datasource\", \"pluginId\": \"prometheus\", \"value\": \"Prometheus\"}],
    \"folderId\": 0,
    \"overwrite\": true
  }"
```

## Verifying the Full Pipeline

Run an end-to-end check to confirm metrics flow from ClickHouse through to Grafana:

```bash
# 1. Generate some ClickHouse activity
clickhouse-client --query "SELECT count() FROM system.tables"
clickhouse-client --query "SELECT sleep(1)"

# 2. Check exporter exposes the events
curl -s http://localhost:9116/metrics | grep ClickHouseProfileEvents_Query

# 3. Confirm Prometheus has ingested them
curl -sg 'http://localhost:9090/api/v1/query?query=ClickHouseProfileEvents_Query_total' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['result'])"

# 4. Verify Grafana data source is healthy
curl -s http://admin:admin@localhost:3000/api/datasources/proxy/1/api/v1/query?query=up | python3 -m json.tool
```

## Summary

Monitoring ClickHouse with Prometheus and Grafana involves four steps: deploying the `clickhouse-exporter` to translate ClickHouse internal metrics into Prometheus format, configuring Prometheus scrape jobs to ingest them on a regular interval, building Grafana dashboards with panels for QPS, memory, connections, merges, and replication lag, and verifying the pipeline end-to-end with live queries. Once in place, this stack gives you a real-time view of ClickHouse health with the full power of PromQL for ad hoc analysis.
