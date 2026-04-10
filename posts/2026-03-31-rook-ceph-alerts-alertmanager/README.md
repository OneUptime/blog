# How to Set Up Ceph Alerts with Prometheus AlertManager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Alerting, Prometheus, Alertmanager

Description: Configure PrometheusRule resources and AlertManager routing for Rook-Ceph to receive alerts for cluster health issues, OSD failures, and capacity thresholds.

---

## How Ceph Alerting Works in Rook

Rook-Ceph ships with a set of pre-defined PrometheusRules that cover the most critical Ceph failure scenarios. When Prometheus evaluates these rules and detects a problem, it sends an alert to AlertManager, which routes the alert to your notification channel (Slack, PagerDuty, email, etc.).

```mermaid
graph TD
    A[Ceph Metrics - port 9283] --> B[Prometheus]
    B --> C{Evaluate PrometheusRules}
    C -- Rule fires --> D[AlertManager]
    D --> E[Routing Rules]
    E --> F[Slack]
    E --> G[PagerDuty]
    E --> H[Email]
    E --> I[OpsGenie]
```

## Built-in Rook-Ceph Alert Rules

Rook includes pre-built PrometheusRules. Enable them in the rook-ceph-cluster Helm chart:

```yaml
# values-cluster.yaml
monitoring:
  enabled: true
  createPrometheusRules: true
  prometheusRule:
    labels:
      release: kube-prometheus-stack
```

Or apply the rules manually from the Rook repository:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/prometheus-ceph-rules.yaml
```

## Key Pre-Built Alert Rules

The Rook project includes alerts for these conditions:

| Alert Name | Severity | Condition |
|-----------|----------|-----------|
| CephHealthError | critical | `ceph_health_status == 2` |
| CephHealthWarning | warning | `ceph_health_status == 1` |
| CephOSDDown | warning | Any OSD is down for 5 minutes |
| CephOSDDiskUnavailable | critical | OSD disk unavailable |
| CephCapacityUsageCritical | critical | >85% capacity used |
| CephCapacityUsageWarning | warning | >75% capacity used |
| CephPGsDegraded | warning | Degraded PGs exist for >5 min |
| CephMonDown | critical | Monitor is down |
| CephMonQuorumAtRisk | critical | Only one monitor left |
| CephMdsMissingReplicas | warning | MDS has no standby |

## Custom PrometheusRule

Create additional alert rules specific to your environment:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rook-ceph-custom-alerts
  namespace: rook-ceph
  labels:
    # Must match the label selector of your Prometheus
    release: kube-prometheus-stack
spec:
  groups:
    - name: ceph.capacity.rules
      rules:
        - alert: CephCapacityWarning
          expr: |
            ceph_cluster_total_used_raw_bytes / ceph_cluster_total_bytes > 0.70
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Ceph cluster capacity above 70%"
            description: >
              Ceph cluster is using {{ humanizePercentage $value }}
              of total capacity. Consider adding more OSDs.

        - alert: CephCapacityCritical
          expr: |
            ceph_cluster_total_used_raw_bytes / ceph_cluster_total_bytes > 0.85
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Ceph cluster capacity above 85% - immediate action required"
            description: >
              Ceph cluster has reached {{ humanizePercentage $value }} capacity.
              Add OSDs immediately to avoid cluster becoming full.

    - name: ceph.osd.rules
      rules:
        - alert: CephOSDHighLatency
          expr: |
            avg(ceph_osd_apply_latency_ms) > 200
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Ceph OSD average apply latency exceeds 200ms"
            description: >
              Average OSD apply latency is {{ $value }}ms.
              Check OSD disk health and I/O queue depth.

        - alert: CephOSDsDown
          expr: |
            count(ceph_osd_up == 0) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "{{ $value }} Ceph OSD(s) are down"
            description: >
              {{ $value }} OSD(s) are in the down state for more than 5 minutes.
              Data may be at risk if multiple OSDs in the same failure domain are down.

    - name: ceph.pg.rules
      rules:
        - alert: CephPGDegraded
          expr: |
            ceph_pg_degraded > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Ceph has {{ $value }} degraded placement groups"
            description: >
              {{ $value }} placement groups are in a degraded state.
              Data is not fully replicated. Check OSD status.
```

## Configuring AlertManager

Configure AlertManager to route Ceph alerts to Slack. Update the AlertManager ConfigMap or Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-kube-prometheus-stack-alertmanager
  namespace: monitoring
type: Opaque
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
      slack_api_url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"

    route:
      receiver: "default"
      group_by: ["alertname", "namespace"]
      group_wait: 10s
      group_interval: 5m
      repeat_interval: 1h
      routes:
        # Critical Ceph alerts go to the on-call channel immediately
        - matchers:
            - alertname =~ "Ceph.*"
            - severity = "critical"
          receiver: "ceph-critical"
          group_wait: 0s
          repeat_interval: 15m
        # Warning Ceph alerts go to general monitoring channel
        - matchers:
            - alertname =~ "Ceph.*"
            - severity = "warning"
          receiver: "ceph-warning"

    receivers:
      - name: "default"
        slack_configs:
          - channel: "#alerts-general"
            title: "Alert: {{ .GroupLabels.alertname }}"
            text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"

      - name: "ceph-critical"
        slack_configs:
          - channel: "#alerts-critical"
            title: "CRITICAL: {{ .GroupLabels.alertname }}"
            text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"
            color: "#FF0000"

      - name: "ceph-warning"
        slack_configs:
          - channel: "#alerts-storage"
            title: "WARNING: {{ .GroupLabels.alertname }}"
            text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"
            color: "#FFA500"
```

```bash
kubectl apply -f alertmanager-config.yaml
```

## Testing Alert Rules

Trigger a test alert by temporarily forcing a condition. From the toolbox, set the OSD out flag on one OSD:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd out 0
```

Wait a few minutes, then check if the alert fired in Prometheus at `http://localhost:9090/alerts`. Undo the change:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd in 0
```

## Summary

Setting up Ceph alerting involves three layers: enabling the Prometheus metrics endpoint in Rook, applying PrometheusRule resources that define alert conditions, and configuring AlertManager routing to send notifications to your team. Rook ships with production-ready alert rules covering cluster health, OSD failures, capacity thresholds, and PG degradation. Supplement these with custom rules for latency, capacity warning thresholds appropriate to your SLA, and any application-specific concerns. Test alert rules by temporarily forcing failure conditions and verifying notifications arrive at the right channels.
