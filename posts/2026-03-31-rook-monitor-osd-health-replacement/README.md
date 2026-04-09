# How to Monitor OSD Health and Replacement Needs in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Monitoring, Health, Kubernetes

Description: Learn how to proactively monitor OSD health in Rook-Ceph using SMART data, Ceph metrics, Prometheus alerts, and predictive failure indicators to plan timely replacements.

---

## Why Proactive OSD Monitoring Matters

Reactive disk replacement - replacing disks only after they fail - puts cluster redundancy at risk. Proactive monitoring using SMART data and Ceph performance metrics allows planned replacements before failures occur.

## Step 1: Monitor OSD Status with Ceph Commands

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

Watch for OSDs that:
- Frequently go `down` and recover
- Have significantly higher latency than peers
- Show unusual utilization compared to identical disks

## Step 2: Check OSD Latency Trends

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd perf
```

Output includes `commit_latency_ms` and `apply_latency_ms` per OSD. Establish baselines and alert on deviation.

## Step 3: Enable SMART Monitoring via Node Exporter

SMART monitoring in node-exporter uses the textfile collector. A script such as `smartmon.sh` from the [node-exporter-textfile-collector-scripts](https://github.com/prometheus-community/node-exporter-textfile-collector-scripts) project runs via cron on each node to collect SMART data and write `.prom` files to a textfile directory. Deploy the node-exporter configured to read those files:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
spec:
  template:
    spec:
      containers:
      - name: node-exporter
        args:
        - --collector.textfile.directory=/var/lib/node-exporter/textfile
        - --path.rootfs=/host
        securityContext:
          privileged: true
        volumeMounts:
        - name: textfile
          mountPath: /var/lib/node-exporter/textfile
          readOnly: true
        - name: dev
          mountPath: /dev
      volumes:
      - name: textfile
        hostPath:
          path: /var/lib/node-exporter/textfile
      - name: dev
        hostPath:
          path: /dev
```

Key SMART metrics to monitor (exposed by the smartmon script via labels on `smartmon_attr_raw_value`):
- `smartmon_attr_raw_value{attr_name="Reallocated_Sector_Ct"}` - sectors moved due to read errors
- `smartmon_attr_raw_value{attr_name="Offline_Uncorrectable"}` - permanent errors
- `smartmon_attr_raw_value{attr_name="Wear_Leveling_Count"}` - SSD wear indicator

## Step 4: Prometheus Alerts for OSD Health

```yaml
groups:
- name: ceph-osd-health
  rules:
  - alert: CephOSDDown
    expr: ceph_osd_up == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Ceph OSD {{ $labels.ceph_daemon }} is down"

  - alert: CephOSDHighLatency
    expr: ceph_osd_commit_latency_ms > 100
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} commit latency > 100ms"

  - alert: CephOSDNearFull
    expr: (ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) * 100 > 85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} is {{ $value }}% full"
```

## Step 5: Identify Replacement Candidates

Run a weekly review script:

```bash
#!/bin/bash
echo "=== OSD Replacement Candidates ==="
echo "High latency OSDs:"
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf | awk 'NR>1 && $2 > 50 {print "OSD", $1, "commit_latency:", $2, "ms"}'

echo "Over-utilized OSDs:"
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df --format json | jq -r '.nodes[] | select(.utilization > 80) | "OSD \(.id) utilization: \(.utilization)%"'
```

## Summary

Proactive OSD health monitoring in Rook combines Ceph's built-in metrics, SMART disk data, and Prometheus alerting to identify failing or degraded disks before they cause cluster health issues. Establishing latency baselines and scheduling regular reviews enables planned rather than emergency replacements.
