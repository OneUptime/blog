# How to Monitor MongoDB Replica Set Health with Custom Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Monitoring, Custom Metric, Prometheus

Description: Build custom metrics for MongoDB replica set health using rs.status(), a Prometheus push gateway, and Grafana dashboards for replication monitoring.

---

## Introduction

The built-in MongoDB Exporter captures most replica set signals, but certain health indicators require custom collection - such as per-member sync progress, oplog window size, and election history. This guide shows how to build a custom metrics collector that queries `rs.status()` and exposes data for Prometheus to scrape.

## Reading Replica Set Status

The foundation is `rs.status()`, which exposes all member states:

```javascript
// In mongosh
const status = rs.status()
status.members.forEach(member => {
  print(`${member.name}: state=${member.stateStr}, health=${member.health}`)
  if (member.optime) {
    print(`  Optime: ${member.optime.ts}`)
  }
  if (member.optimeDate) {
    print(`  Lag: ${(new Date() - member.optimeDate) / 1000}s`)
  }
})
```

## Custom Python Collector

```python
#!/usr/bin/env python3
# custom_mongo_collector.py
import os
import time
from pymongo import MongoClient
from prometheus_client import start_http_server, Gauge, CollectorRegistry

registry = CollectorRegistry()

member_health = Gauge(
    "mongodb_rs_member_health",
    "Replica set member health (1=healthy)",
    ["member", "state"],
    registry=registry
)
replication_lag = Gauge(
    "mongodb_rs_replication_lag_seconds",
    "Replication lag in seconds per secondary",
    ["member"],
    registry=registry
)
oplog_window = Gauge(
    "mongodb_rs_oplog_window_seconds",
    "Oplog window size in seconds on the primary",
    registry=registry
)

def collect_rs_metrics(client):
    try:
        db = client.admin
        status = db.command("replSetGetStatus")
        primary_optime = None

        for member in status["members"]:
            name = member["name"]
            state = member["stateStr"]
            health = member.get("health", 0)
            member_health.labels(member=name, state=state).set(health)

            if state == "PRIMARY":
                primary_optime = member.get("optimeDate")

        for member in status["members"]:
            if member["stateStr"] == "SECONDARY":
                sec_optime = member.get("optimeDate")
                if primary_optime and sec_optime:
                    lag = (primary_optime - sec_optime).total_seconds()
                    replication_lag.labels(member=member["name"]).set(max(0, lag))

        # Collect oplog window
        local_db = client.local
        first = local_db.oplog.rs.find_one(sort=[("$natural", 1)])
        last = local_db.oplog.rs.find_one(sort=[("$natural", -1)])
        if first and last:
            window = last["ts"].time - first["ts"].time
            oplog_window.set(window)

    except Exception as e:
        print(f"Error collecting metrics: {e}")

def main():
    client = MongoClient(os.environ["MONGODB_URI"])
    start_http_server(9399, registry=registry)
    print("Custom collector running on :9399")

    while True:
        collect_rs_metrics(client)
        time.sleep(30)

if __name__ == "__main__":
    main()
```

## Prometheus Configuration

```yaml
scrape_configs:
  - job_name: "mongodb_custom"
    static_configs:
      - targets: ["localhost:9399"]
    scrape_interval: 30s
```

## Grafana Dashboard Panels

```promql
# Panel 1: Member health status
mongodb_rs_member_health

# Panel 2: Replication lag over time
mongodb_rs_replication_lag_seconds

# Panel 3: Oplog window (hours)
mongodb_rs_oplog_window_seconds / 3600
```

## Alerting on Oplog Window Shrinkage

```yaml
- alert: MongoDBOplogWindowSmall
  expr: mongodb_rs_oplog_window_seconds < 3600
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "MongoDB oplog window is less than 1 hour - resync window is shrinking"
```

## Summary

Custom replica set health metrics fill the gaps left by standard exporters, particularly for per-member replication lag and oplog window tracking. The Python collector pattern using `prometheus_client` is lightweight and easily containerized. Focus alerting on oplog window size (critical if it drops below your backup window) and per-secondary lag (any secondary lagging over 30 seconds warrants investigation).
