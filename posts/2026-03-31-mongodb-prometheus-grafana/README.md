# How to Set Up MongoDB Monitoring with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Prometheus, Grafana, Monitoring, Observability, Operation

Description: A step-by-step guide to monitoring MongoDB with Prometheus and Grafana, covering mongodb_exporter setup, key metrics, alerting rules, and dashboard configuration.

---

## Monitoring Architecture

Prometheus scrapes metrics from a mongodb_exporter sidecar that connects to MongoDB and translates `serverStatus()` and other commands into Prometheus format. Grafana visualizes the metrics and provides dashboards.

```mermaid
flowchart LR
    MongoDB -->|serverStatus, replSetStatus| Exporter[mongodb_exporter]
    Exporter -->|/metrics HTTP| Prometheus
    Prometheus --> Grafana[Grafana Dashboard]
    Prometheus --> AlertManager[Alertmanager]
    AlertManager --> PagerDuty[PagerDuty / Slack]
```

## Installing mongodb_exporter

The Percona MongoDB Exporter is the most feature-complete option. Install it via binary:

```bash
curl -LO https://github.com/percona/mongodb_exporter/releases/download/v0.40.0/mongodb_exporter-0.40.0.linux-amd64.tar.gz
tar xzf mongodb_exporter-0.40.0.linux-amd64.tar.gz
sudo mv mongodb_exporter /usr/local/bin/
```

Run the exporter pointing to your MongoDB instance:

```bash
mongodb_exporter \
  --mongodb.uri="mongodb://exporterUser:password@127.0.0.1:27017/?authSource=admin" \
  --web.listen-address=":9216" \
  --collect-all \
  --compatible-mode
```

## Creating a MongoDB Exporter User

The exporter needs a read-only user with monitoring privileges:

```javascript
use admin

db.createUser({
  user: "exporterUser",
  pwd: passwordPrompt(),
  roles: [
    { role: "clusterMonitor", db: "admin" },
    { role: "read", db: "local" }
  ]
})
```

## Running as a systemd Service

Create `/etc/systemd/system/mongodb_exporter.service`:

```text
[Unit]
Description=MongoDB Exporter for Prometheus
After=network.target mongod.service

[Service]
User=mongodb
EnvironmentFile=/etc/default/mongodb_exporter
ExecStart=/usr/local/bin/mongodb_exporter \
    --mongodb.uri=${MONGODB_URI} \
    --web.listen-address=:9216 \
    --collect-all \
    --compatible-mode
Restart=always

[Install]
WantedBy=multi-user.target
```

Create `/etc/default/mongodb_exporter`:

```bash
MONGODB_URI=mongodb://exporterUser:password@127.0.0.1:27017/?authSource=admin
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mongodb_exporter
```

## Configuring Prometheus Scrape

Add a scrape job to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: mongodb
    static_configs:
      - targets:
          - "localhost:9216"
        labels:
          instance: mongodb-primary
          environment: production
    scrape_interval: 30s
    scrape_timeout: 10s
```

Reload Prometheus:

```bash
curl -X POST http://localhost:9090/-/reload
```

Verify the target is up at `http://localhost:9090/targets`.

## Key Prometheus Metrics

After the exporter is running, these are the most important metrics to query:

Connection usage rate:

```text
mongodb_connections{state="current"} / (mongodb_connections{state="current"} + mongodb_connections{state="available"})
```

Operation rate (queries per second over 5 minutes):

```text
rate(mongodb_op_counters_total{type="query"}[5m])
```

WiredTiger cache utilization:

```text
mongodb_wiredtiger_cache_bytes{type="currently in cache"} / mongodb_wiredtiger_cache_bytes{type="maximum bytes configured"}
```

Replication lag in seconds:

```text
mongodb_mongod_replset_member_replication_lag
```

Page faults per second:

```text
rate(mongodb_extra_info_page_faults_total[5m])
```

## Prometheus Alerting Rules

Create `mongodb_alerts.yaml`:

```yaml
groups:
  - name: mongodb
    rules:
      - alert: MongoDBDown
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB instance down"
          description: "MongoDB on {{ $labels.instance }} has been down for more than 1 minute."

      - alert: MongoDBHighConnections
        expr: >
          mongodb_connections{state="current"} /
          (mongodb_connections{state="current"} + mongodb_connections{state="available"}) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB connection usage above 80%"
          description: "{{ $labels.instance }} connection usage is {{ $value | humanizePercentage }}."

      - alert: MongoDBHighReplicationLag
        expr: mongodb_mongod_replset_member_replication_lag > 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB replication lag above 60 seconds"
          description: "Member {{ $labels.member_id }} has {{ $value }}s replication lag."

      - alert: MongoDBLowCacheHitRatio
        expr: >
          1 - (rate(mongodb_wiredtiger_cache_pages_read_into_cache_total[5m]) /
          rate(mongodb_wiredtiger_cache_pages_requested_from_the_cache_total[5m])) < 0.95
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB WiredTiger cache hit ratio below 95%"
          description: "Cache hit ratio is {{ $value | humanizePercentage }} on {{ $labels.instance }}."
```

Reference in `prometheus.yml`:

```yaml
rule_files:
  - /etc/prometheus/mongodb_alerts.yaml
```

## Setting Up Grafana Dashboard

Import the official MongoDB dashboard from Grafana.com. Dashboard ID `2583` (Percona MongoDB) or `7353` (MongoDB Overview) works well.

Via Grafana UI:
1. Go to Dashboards - Import.
2. Enter dashboard ID `2583`.
3. Select your Prometheus data source.
4. Click Import.

Alternatively, provision the dashboard via code. Create `/etc/grafana/provisioning/dashboards/mongodb.yaml`:

```yaml
apiVersion: 1
providers:
  - name: MongoDB
    orgId: 1
    folder: MongoDB
    type: file
    options:
      path: /var/lib/grafana/dashboards/mongodb
```

## Docker Compose Setup

For a complete local monitoring stack:

```yaml
version: "3.8"

services:
  mongodb:
    image: mongo:7.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secretpassword
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db

  mongodb-exporter:
    image: percona/mongodb_exporter:0.40
    command:
      - "--mongodb.uri=mongodb://admin:secretpassword@mongodb:27017/?authSource=admin"
      - "--collect-all"
      - "--compatible-mode"
    ports:
      - "9216:9216"
    depends_on:
      - mongodb

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./mongodb_alerts.yaml:/etc/prometheus/mongodb_alerts.yaml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: grafanapassword
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  mongodb-data:
  grafana-data:
```

## Best Practices

- Scrape mongodb_exporter every 30 seconds; more frequent scraping adds overhead without much benefit.
- Create the exporter user with `clusterMonitor` role only - never use the admin user.
- Set up alerts for: instance down, connections above 80%, replication lag above 60s, cache hit ratio below 95%.
- Store Prometheus data for at least 30 days to identify trends and capacity planning.
- Use Grafana annotations to mark deployments so you can correlate metric changes with code releases.

## Summary

Monitoring MongoDB with Prometheus and Grafana requires the mongodb_exporter to scrape MongoDB metrics, a Prometheus scrape config, alerting rules for critical conditions, and a Grafana dashboard for visualization. Create a dedicated exporter user with `clusterMonitor` role, alert on connections, replication lag, and cache hit ratio, and import a pre-built Grafana dashboard to get operational visibility quickly.
