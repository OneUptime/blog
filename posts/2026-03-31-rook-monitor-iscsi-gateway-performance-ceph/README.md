# How to Monitor iSCSI Gateway Performance in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, iSCSI, Monitoring, Performance

Description: Learn how to monitor Ceph iSCSI gateway performance including throughput, latency, connection counts, and RBD I/O metrics.

---

## Monitoring Layers for iSCSI Gateways

Ceph iSCSI gateway performance monitoring spans multiple layers:
- Linux kernel TCP/iSCSI statistics
- LIO target statistics
- Ceph RBD I/O metrics
- System resource utilization (CPU, memory, network)

## Checking Active iSCSI Sessions

View all connected initiator sessions:

```bash
targetcli ls /iscsi
```

Get a count of active sessions on the gateway:

```bash
targetcli sessions list 2>/dev/null | wc -l
```

Or via the API:

```bash
curl -s http://localhost:5000/api/clients | python3 -m json.tool | grep -c "connected"
```

## LIO Target Statistics

The Linux IO target exposes per-LUN statistics through sysfs:

```bash
for lun_dir in /sys/kernel/config/target/iscsi/*/tpgt_1/lun/lun_*; do
  lun=$(basename $lun_dir)
  stats_dir="$lun_dir/statistics/scsi_tgt_port"
  if [ -d "$stats_dir" ]; then
    read_bytes=$(cat "$stats_dir/read_mbytes" 2>/dev/null || echo 0)
    write_bytes=$(cat "$stats_dir/write_mbytes" 2>/dev/null || echo 0)
    echo "$lun: read=${read_bytes}MB write=${write_bytes}MB"
  fi
done
```

## Monitoring RBD I/O with rbd perf

Check RBD I/O statistics for iSCSI-mapped images:

```bash
rbd perf image iostat --pool iscsi
```

Example output:

```text
NAME       WR       RD  WR_BYTES  RD_BYTES     WR_LAT   RD_LAT
vol1      120        5   61440B   2560B    0.5ms   0.3ms
```

Sort by write latency during continuous monitoring:

```bash
rbd perf image iostat --pool iscsi --sort-by write-latency
```

## System Resource Monitoring

Monitor CPU usage on the gateway nodes:

```bash
# Watch CPU with focus on kernel threads
top -d1 -H -p $(pgrep -d, -f "iscsi\|target")
```

Monitor network throughput on the iSCSI interface:

```bash
sar -n DEV 1 30 | grep eth1
```

Or with nload:

```bash
nload eth1
```

## Prometheus Metrics for iSCSI

The `node_exporter` collects network and disk statistics that include iSCSI traffic. Add custom metrics using the textfile collector:

```bash
cat > /usr/local/bin/iscsi-metrics.sh << 'EOF'
#!/bin/bash
SESSIONS=$(targetcli sessions list 2>/dev/null | wc -l)
echo "# HELP iscsi_active_sessions Number of active iSCSI sessions"
echo "# TYPE iscsi_active_sessions gauge"
echo "iscsi_active_sessions $SESSIONS"
EOF
chmod +x /usr/local/bin/iscsi-metrics.sh
```

Set up a cron job to update the textfile:

```bash
echo "* * * * * root /usr/local/bin/iscsi-metrics.sh > /var/lib/node_exporter/textfile_collector/iscsi.prom" \
  >> /etc/cron.d/iscsi-metrics
```

## Grafana Dashboard for iSCSI

Create a Grafana panel to visualize iSCSI throughput using PromQL:

```text
rate(node_network_receive_bytes_total{device="eth1"}[5m]) * 8
```

For RBD latency from Ceph's built-in metrics:

```text
ceph_rbd_write_latency_sum / ceph_rbd_write_latency_count
```

## Summary

Monitoring Ceph iSCSI gateway performance requires combining LIO sysfs statistics, RBD I/O metrics from `rbd perf`, and system-level network throughput data. Integrating these sources into Prometheus and Grafana provides a unified view that helps identify bottlenecks at the gateway, network, or Ceph storage layer before they impact applications.
