# How to Monitor QoS Metrics in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, QoS, Monitoring, Metric

Description: Learn how to monitor QoS effectiveness in Ceph by tracking throttled operations, queue depths, latency histograms, and per-client I/O rates.

---

## QoS Monitoring Goals

Effective QoS monitoring helps you answer:
- Are clients hitting their limits?
- Are reservations being honored?
- Is recovery competing with client I/O?
- Where is latency being introduced?

## Monitoring OSD Operation Queues

The mClock scheduler exposes queue statistics through the admin socket:

```bash
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -A3 "mclock\|queue"
```

Key metrics to watch:

```bash
# Check for operations waiting in queue (filter mclock counters)
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -A5 "mclock"

# Check op latency percentiles
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
d = json.load(sys.stdin)
lat = d.get('osd', {}).get('op_latency', {})
print(f'op latency avg: {lat.get(\"avgtime\", \"N/A\")}')
print(f'op latency sum: {lat.get(\"sum\", \"N/A\")}')
"
```

## Tracking RBD QoS Throttle Events

Monitor how often RBD QoS throttling fires on specific images:

```bash
rbd perf image iostat --pool mypool
```

Check per-image watchers and lock status:

```bash
rbd status mypool/vm-disk
```

For detailed throttle statistics via the admin socket:

```bash
ceph daemon client.1234 perf dump | python3 -m json.tool | grep -i throttle
```

## Prometheus Metrics for QoS

Ceph exposes QoS-relevant metrics through its built-in Prometheus endpoint:

```text
# OSD operation queue depth
ceph_osd_op_wip

# Operation latency
ceph_osd_op_latency_sum
ceph_osd_op_latency_count

# Recovery vs client ops
ceph_osd_recovery_ops
ceph_osd_op_r
ceph_osd_op_w
```

Set up Prometheus scraping:

```yaml
scrape_configs:
  - job_name: 'ceph'
    static_configs:
      - targets: ['ceph-mgr:9283']
    metrics_path: /metrics
```

## Grafana QoS Dashboard Queries

Create panels to visualize QoS enforcement:

```text
# Client IOPS per OSD (reads + writes)
rate(ceph_osd_op_r[5m]) + rate(ceph_osd_op_w[5m])

# Recovery IOPS
rate(ceph_osd_recovery_ops[5m])

# Client vs recovery ratio
(rate(ceph_osd_op_r[5m]) + rate(ceph_osd_op_w[5m])) / (rate(ceph_osd_op_r[5m]) + rate(ceph_osd_op_w[5m]) + rate(ceph_osd_recovery_ops[5m]))

# OSD latency p99
histogram_quantile(0.99, rate(ceph_osd_op_latency_bucket[5m]))
```

## Alerting on QoS Violations

Configure alerts when QoS limits are consistently reached:

```yaml
groups:
  - name: ceph_qos
    rules:
      - alert: CephHighOSDLatency
        expr: rate(ceph_osd_op_latency_sum[5m]) / rate(ceph_osd_op_latency_count[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High OSD operation latency"
          description: "OSD {{ $labels.osd }} average latency is above 50ms"
      - alert: CephRecoveryThrottled
        expr: rate(ceph_osd_recovery_ops[5m]) < 10
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Recovery is heavily throttled"
```

## Checking mClock Profile Effectiveness

Compare OSD latency before and after applying mClock profiles:

```bash
# Before change - record baseline
ceph osd perf | sort -k3 -rn | head -10 > /tmp/qos-before.txt

# Apply high_client_ops profile
ceph config set osd osd_mclock_profile high_client_ops

# After change - compare
sleep 60
ceph osd perf | sort -k3 -rn | head -10 > /tmp/qos-after.txt
diff /tmp/qos-before.txt /tmp/qos-after.txt
```

## Summary

Monitoring QoS metrics in Ceph requires combining OSD queue depth statistics, RBD throttle counters, and Prometheus metrics into a comprehensive view. Setting up Grafana dashboards that show client vs recovery IOPS ratios, OSD latency percentiles, and throttle event rates allows rapid detection of QoS configuration issues and provides feedback for tuning reservation and limit values.
