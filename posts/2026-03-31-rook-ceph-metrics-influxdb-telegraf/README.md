# How to Set Up Ceph Metrics in InfluxDB/Telegraf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, InfluxDB, Telegraf, Monitoring

Description: Learn how to collect Ceph cluster metrics using Telegraf's Ceph input plugin and store them in InfluxDB for time-series analysis and visualization.

---

## Overview

Telegraf has a dedicated Ceph input plugin that directly queries the Ceph admin socket or uses the Ceph CLI to collect detailed performance metrics. Combined with InfluxDB and Grafana, this creates a powerful time-series monitoring stack for Ceph clusters.

## Step 1 - Install Telegraf

```bash
# Install Telegraf on a Ceph monitor or admin node
wget https://dl.influxdata.com/telegraf/releases/telegraf_1.29.0-1_amd64.deb
dpkg -i telegraf_1.29.0-1_amd64.deb

# Add the telegraf user to the ceph group
usermod -aG ceph telegraf

# Verify Telegraf can access Ceph sockets
ls /var/run/ceph/
```

## Step 2 - Configure the Ceph Input Plugin

```toml
# /etc/telegraf/telegraf.d/ceph.conf
[[inputs.ceph]]
  ## Ceph binary location
  ceph_binary = "/usr/bin/ceph"

  ## Ceph cluster configuration
  socket_dir = "/var/run/ceph"
  mon_prefix = "ceph-mon"
  osd_prefix = "ceph-osd"
  mds_prefix = "ceph-mds"
  rgw_prefix = "ceph-client"

  ## The pattern for ceph socket file names
  socket_suffix = "asok"

  ## Gather stats from per-socket connections
  gather_admin_socket_stats = true

  ## Gather stats from the cluster
  gather_cluster_stats = true
```

## Step 3 - Add Prometheus Input for Rook Clusters

For Rook-managed Ceph, use the Prometheus input plugin:

```toml
# /etc/telegraf/telegraf.d/ceph_prometheus.conf
[[inputs.prometheus]]
  urls = ["http://rook-ceph-mgr.rook-ceph.svc.cluster.local:9283/metrics"]
  metric_version = 2

  ## Filter to only Ceph metrics
  namepass = ["ceph_*"]

  ## Add cluster tag
  [inputs.prometheus.tags]
    cluster = "prod-ceph"
    environment = "production"
```

## Step 4 - Configure the InfluxDB Output

```toml
# /etc/telegraf/telegraf.d/influxdb_output.conf
[[outputs.influxdb_v2]]
  urls = ["http://influxdb.monitoring.svc.cluster.local:8086"]
  token = "${INFLUXDB_TOKEN}"
  organization = "my-org"
  bucket = "ceph-metrics"

  ## Timeout for HTTP messages
  timeout = "5s"

  ## Only send metrics that have a cluster tag
  [outputs.influxdb_v2.tagpass]
    cluster = ["*"]
```

Start and verify Telegraf:

```bash
systemctl enable --now telegraf
telegraf --test --config /etc/telegraf/telegraf.conf \
  --config-directory /etc/telegraf/telegraf.d/ 2>&1 | grep ceph | head -20
```

## Step 5 - Query Ceph Metrics in InfluxDB

Use Flux to query Ceph data in InfluxDB:

```javascript
// Health status over time
from(bucket: "ceph-metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "ceph_health_status")
  |> aggregateWindow(every: 5m, fn: mean)
  |> yield(name: "health")

// Pool utilization
from(bucket: "ceph-metrics")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "ceph_pool_bytes_used" or
                        r._measurement == "ceph_pool_max_avail")
  |> pivot(rowKey: ["_time", "pool_name"], columnKey: ["_measurement"], valueColumn: "_value")
  |> map(fn: (r) => ({ r with pct_used: r.ceph_pool_bytes_used / (r.ceph_pool_bytes_used + r.ceph_pool_max_avail) * 100.0 }))
```

## Step 6 - Set Up InfluxDB Alerts

```javascript
// InfluxDB alerting task - ceph_health_alert.flux
import "slack"

data = from(bucket: "ceph-metrics")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "ceph_health_status")
  |> last()
  |> filter(fn: (r) => r._value > 0)

data
  |> map(fn: (r) => ({r with
      _sent: slack.message(
          url: "https://hooks.slack.com/services/XXX/YYY/ZZZ",
          text: "Ceph health degraded: status=${string(v: r._value)}",
          color: "danger",
      )
  }))
```

## Summary

Telegraf's Ceph input plugin or Prometheus input provides comprehensive metric collection from Ceph clusters, which Telegraf stores in InfluxDB for time-series analysis. Flux queries offer powerful aggregation and alerting capabilities, enabling automated notifications when Ceph health degrades or pool capacity exceeds thresholds.
