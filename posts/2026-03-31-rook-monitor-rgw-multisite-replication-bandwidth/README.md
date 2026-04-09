# How to Monitor RGW Multisite Replication Bandwidth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Multisite, Monitoring, Bandwidth, Replication, Kubernetes

Description: Learn how to measure and monitor the network bandwidth consumed by Ceph RGW multisite data replication between zones.

---

## Overview

Ceph RGW multisite replication consumes network bandwidth proportional to the rate of object writes. Monitoring replication bandwidth helps you understand cross-datacenter costs, tune sync concurrency, and detect replication bottlenecks. This guide covers built-in tools and external monitoring methods.

## Understanding Replication Traffic

RGW multisite sync works over HTTP/HTTPS. The secondary zone's sync agent fetches objects from the source zone's RGW endpoint. Replication bandwidth is therefore the sum of all object data transferred during sync operations.

## Using the Admin API to Check Sync Performance

Query the sync performance counters via the admin socket:

```bash
ceph daemon /var/run/ceph/ceph-client.rgw.*.asok perf dump
```

Or use `ceph tell` to reach the RGW daemon:

```bash
ceph tell rgw.<instance-id> perf dump
```

Look for the `data-sync-from-<zone>` sections in the output, which contain counters like `fetch`, `fetch_bytes`, `poll_latency`, and `fetch_errors`.

## Monitoring with ceph-mgr Dashboard

Enable the dashboard module if not already enabled:

```bash
ceph mgr module enable dashboard
```

Navigate to the RGW section to view active sync status and per-zone replication stats. The dashboard provides visual bandwidth charts for sync operations.

## Network-Level Monitoring with iftop

On the RGW host, use `iftop` to watch live bandwidth to/from zone endpoints:

```bash
iftop -i eth0 -f "dst host zone1-rgw.example.com"
```

For periodic snapshots:

```bash
#!/bin/bash
while true; do
  echo "=== $(date) ==="
  ss -s | grep -E "TCP|estab"
  netstat -i | grep eth0
  sleep 30
done
```

## Prometheus and Grafana Integration

Ceph exposes Prometheus metrics. Add the Prometheus module:

```bash
ceph mgr module enable prometheus
```

Scrape the metrics endpoint:

```yaml
# prometheus.yml scrape config
scrape_configs:
  - job_name: ceph
    static_configs:
      - targets:
          - "ceph-mgr.example.com:9283"
```

Key metrics to track in Grafana:

```promql
# RGW bytes received via PUT operations (includes sync writes on secondary zone)
rate(ceph_rgw_put_b[5m])

# RGW bytes sent via GET operations (includes sync reads on primary zone)
rate(ceph_rgw_get_b[5m])
```

## Tracking Inter-Zone Bandwidth Costs

If zones are in different cloud regions, track egress costs. Create a daily bandwidth report:

```bash
#!/bin/bash
# Run on zone2 - measures bytes fetched from zone1
METRIC=$(ceph daemon /var/run/ceph/ceph-client.rgw.*.asok perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
for section, counters in data.items():
    if 'sync' in section:
        for name, value in counters.items():
            if 'bytes' in name:
                print(section, name, value)
")
echo "$(date): $METRIC" >> /var/log/rgw_sync_bandwidth.log
```

## Setting Sync Bandwidth Limits

To cap replication bandwidth and prevent it from overwhelming the WAN link:

```bash
# Reduce sync parallelism to indirectly limit bandwidth consumption
ceph config set client.rgw rgw_data_sync_concurrency 5
```

Alternatively, use Linux traffic control to shape outbound RGW traffic:

```bash
tc qdisc add dev eth0 root tbf rate 100mbit burst 15k latency 50ms
```

## Summary

Monitoring RGW multisite replication bandwidth combines admin API performance counters, Prometheus metrics via ceph-mgr, and network-level tools like iftop. Grafana dashboards with Prometheus queries provide ongoing visibility into sync throughput and latency. When bandwidth must be controlled, reducing sync concurrency or using Linux traffic shaping prevents replication from saturating WAN links.
