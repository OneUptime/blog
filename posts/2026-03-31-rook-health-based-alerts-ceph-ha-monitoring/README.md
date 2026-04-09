# How to Set Up Health-Based Alerts for Ceph HA Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Alerting, Prometheus, High Availability

Description: Configure health-based Prometheus alerts for Ceph HA clusters to detect OSD failures, monitor quorum loss, and track cluster degradation in Rook.

---

Proactive alerting is critical for maintaining Ceph high availability. Rook exposes Ceph metrics through a built-in Prometheus exporter, enabling rich alerting rules that fire before issues escalate.

## Enable Ceph Metrics in Rook

Ensure monitoring is enabled in the `CephCluster` resource:

```yaml
spec:
  monitoring:
    enabled: true
```

Verify the metrics endpoint is reachable:

```bash
kubectl -n rook-ceph get svc rook-ceph-mgr
curl http://<mgr-ip>:9283/metrics | head -20
```

## Core HA Alert Rules

Deploy these Prometheus alert rules as a `PrometheusRule` resource:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-ha-alerts
  namespace: rook-ceph
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: ceph-ha
    rules:
    - alert: CephHealthError
      expr: ceph_health_status == 2
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Ceph cluster is in ERROR state"

    - alert: CephHealthWarning
      expr: ceph_health_status == 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Ceph cluster is in WARNING state"

    - alert: CephOSDDown
      expr: count(ceph_osd_up == 0) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "{{ $value }} Ceph OSD(s) are down"

    - alert: CephMonQuorumAtRisk
      expr: count(ceph_mon_quorum_status == 1) < 2
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Ceph monitor quorum is at risk"

    - alert: CephPGDegraded
      expr: ceph_pg_degraded > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "{{ $value }} Ceph placement groups are degraded"
```

Apply with:

```bash
kubectl apply -f ceph-ha-alerts.yaml
```

## Disk Space Alerts

Add storage capacity alerts to prevent OSDs from filling up:

```yaml
- alert: CephOSDNearFull
  expr: (ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) * 100 > 75
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "OSD {{ $labels.ceph_daemon }} utilization is {{ $value | humanize }}%"

- alert: CephOSDFull
  expr: (ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) * 100 > 85
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "OSD {{ $labels.ceph_daemon }} is nearly full at {{ $value | humanize }}%"
```

## Verify Alerts in Grafana

Import the official Ceph Grafana dashboards using dashboard ID `2842` for a cluster overview. Confirm alerts appear in the Alertmanager UI:

```bash
kubectl -n monitoring port-forward svc/alertmanager-main 9093
```

## Summary

Deploying Prometheus alert rules for Ceph health status, OSD availability, monitor quorum, and disk utilization gives operations teams early warning before HA is compromised. Rook's built-in metrics exporter makes this straightforward - enabling monitoring in the CephCluster spec is the only prerequisite.
