# How to Use the MongoDB Exporter for Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Prometheus, Exporter, Monitoring, Metric

Description: Deploy and configure the Percona MongoDB Exporter to expose MongoDB metrics for Prometheus scraping with key metrics and alerting rules.

---

## Introduction

The Percona `mongodb_exporter` is the de facto tool for exposing MongoDB metrics in Prometheus format. It collects data on connections, operations, replica set state, WiredTiger cache, and more. This guide covers installation, configuration, and the most valuable metrics to monitor.

## Installing the Exporter

### Via Docker

```bash
docker run -d \
  --name mongodb-exporter \
  -p 9216:9216 \
  percona/mongodb_exporter:0.40 \
  --mongodb.uri="mongodb://monitor:monitorPass@localhost:27017/admin" \
  --collect-all
```

### Via Binary

```bash
wget https://github.com/percona/mongodb_exporter/releases/download/v0.40.0/mongodb_exporter-0.40.0.linux-amd64.tar.gz
tar xzf mongodb_exporter-0.40.0.linux-amd64.tar.gz
sudo mv mongodb_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/mongodb-exporter.service <<EOF
[Unit]
Description=MongoDB Exporter
After=network.target

[Service]
User=nobody
ExecStart=/usr/local/bin/mongodb_exporter \
  --mongodb.uri=mongodb://monitor:monitorPass@localhost:27017/admin \
  --collect-all \
  --web.listen-address=:9216
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now mongodb-exporter
```

## Creating a Monitor User

```javascript
use admin
db.createUser({
  user: "monitor",
  pwd: "monitorPass",
  roles: [
    { role: "clusterMonitor", db: "admin" },
    { role: "read", db: "local" }
  ]
})
```

## Prometheus Scrape Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "mongodb"
    static_configs:
      - targets: ["localhost:9216"]
    scrape_interval: 30s
    scrape_timeout: 10s
```

## Key Metrics Reference

```text
# Connection metrics
mongodb_connections{state="current"}         - Active connections
mongodb_connections{state="available"}       - Available connections

# Throughput metrics
mongodb_opcounters_total{type="insert"}      - Insert operations/sec
mongodb_opcounters_total{type="query"}       - Query operations/sec
mongodb_opcounters_total{type="update"}      - Update operations/sec
mongodb_opcounters_total{type="delete"}      - Delete operations/sec

# Memory metrics
mongodb_mem_resident_mb                      - Resident memory (MB)
mongodb_mem_virtual_mb                       - Virtual memory (MB)

# Replication metrics
mongodb_replset_member_health               - Member health (1=healthy)
mongodb_replset_oplog_head_timestamp        - Latest oplog entry timestamp
mongodb_replset_oplog_tail_timestamp        - Oldest oplog entry timestamp

# WiredTiger cache
mongodb_wiredtiger_cache_bytes_currently_in_cache - Cache used
mongodb_wiredtiger_cache_maximum_bytes_configured  - Cache limit
```

## Alerting Rules

```yaml
# mongodb-alerts.yaml
groups:
  - name: mongodb
    rules:
      - alert: MongoDBDown
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB exporter cannot connect"

      - alert: MongoDBHighConnections
        expr: mongodb_connections{state="current"} > 800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB connections above 800"

      - alert: MongoDBOplogWindowSmall
        expr: (mongodb_replset_oplog_head_timestamp - mongodb_replset_oplog_tail_timestamp) < 3600
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB oplog window is less than 1 hour"
```

## Summary

The Percona MongoDB Exporter provides comprehensive metrics with minimal setup. Create a dedicated monitor user with `clusterMonitor` and `read` roles, enable `--collect-all` for full coverage, and configure Prometheus to scrape on a 30-second interval. Focus alerting on connection saturation, replication lag, and WiredTiger cache fill percentage as the highest-signal indicators of MongoDB health issues.
