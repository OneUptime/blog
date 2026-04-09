# How to Monitor Client Performance Metrics in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Performance, Client, Metric

Description: Monitor Ceph client-side performance metrics including IOPS, throughput, and latency using built-in Ceph tools and Prometheus/Grafana dashboards.

---

Understanding client-side performance metrics helps identify bottlenecks, diagnose slow I/O, and validate that storage is meeting application SLOs. Ceph exposes client metrics through multiple interfaces.

## Using rbd perf

For RBD clients, `rbd perf` provides real-time per-image statistics:

```bash
# Watch IOPS and throughput for all images
rbd perf image iostat

# Filter by pool
rbd perf image iostat --pool mypool

# JSON output for scripting
rbd perf image iostat --format json
```

Output includes: read IOPS, write IOPS, read bytes/sec, write bytes/sec, and latency.

## Using the Admin Socket

Each client daemon exposes an admin socket with performance counters:

```bash
# List available sockets
ls /var/run/ceph/

# Query a specific client's performance counters
ceph daemon /var/run/ceph/ceph-client.myapp.asok perf dump

# Watch specific counters
ceph daemon /var/run/ceph/ceph-client.myapp.asok perf schema
```

## Ceph Manager Client Metrics

The Ceph Manager collects client I/O statistics per pool:

```bash
# Per-pool I/O stats
ceph osd pool stats

# Detailed stats for a specific pool
ceph osd pool stats mypool
```

Example output:

```text
pool mypool id 3
  client io 245 MiB/s rd, 12 MiB/s wr, 1.23k op/s rd, 512 op/s wr
```

## Prometheus Metrics via MGR Module

Enable the Prometheus MGR module:

```bash
ceph mgr module enable prometheus
```

Client metrics are exposed at:

```yaml
http://<mgr-host>:9283/metrics
```

Key metrics to monitor:

```text
ceph_osd_op_r_latency_sum
ceph_osd_op_w_latency_sum
ceph_pool_rd_bytes
ceph_pool_wr_bytes
```

## Grafana Dashboard

Import the official Ceph Grafana dashboards (IDs 2842 and 5336) for visualizing client metrics. Key panels include:

- Pool throughput (read/write bytes/sec)
- Pool IOPS (read/write ops/sec)
- Average client latency
- Active client sessions

## Checking Client Sessions on OSDs

```bash
# View client sessions on a specific OSD
ceph tell osd.0 dump_ops_in_flight

# Show long-running operations
ceph tell osd.* ops
```

## Correlating Client and Cluster Metrics

```bash
# Watch cluster-level write amplification
watch -n2 "ceph osd stat && ceph df"

# Check if slowness is from network or OSD
ceph tell osd.0 perf dump | jq '.osd.op_latency'
```

## Summary

Ceph provides multiple layers of client performance visibility: `rbd perf image iostat` for real-time per-image stats, admin socket perf counters for per-client details, pool-level stats via `ceph osd pool stats`, and Prometheus metrics for integration with Grafana. Combining these tools lets you trace a performance issue from the application layer down to specific OSDs.
