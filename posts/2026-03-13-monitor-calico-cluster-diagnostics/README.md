# How to Monitor Calico Cluster Diagnostics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Diagnostic, Monitoring

Description: Monitor Calico cluster health using Prometheus alerts on TigeraStatus conditions, IPAM utilization thresholds, and kube-controllers sync lag to detect cluster-wide issues before they impact...

---

## Introduction

Monitoring cluster-wide Calico health requires tracking TigeraStatus conditions in Prometheus, alerting on IPAM utilization before exhaustion, and detecting kube-controllers availability issues. These cluster-level signals complement per-node Felix metrics to provide complete Calico observability.

## Prometheus Rules for Cluster Health

This example assumes TigeraStatus conditions are exported from kube-state-metrics custom resource state metrics as `tigerastatus_condition`.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-cluster-health-alerts
  namespace: calico-system
spec:
  groups:
    - name: calico.cluster
      rules:
        # TigeraStatus degradation
        - alert: CalicoTigeraStatusDegraded
          expr: |
            tigerastatus_condition{type="Available",status="true"} == 0
            or tigerastatus_condition{type="Degraded",status="true"} == 1
          for: 5m
          annotations:
            summary: "Calico component {{ $labels.name }} is degraded or not Available"

        # IPAM utilization high
        - alert: CalicoIPAMHighUtilization
          expr: |
            sum(ipam_allocations_in_use) / sum(ipam_ippool_size) > 0.85
          for: 10m
          annotations:
            summary: "Calico IPAM utilization above 85%"

        # kube-controllers metrics target down
        - alert: CalicoKubeControllersDown
          expr: |
            up{job=~"calico-kube-controllers.*|kube-controllers-metrics.*"} == 0
          for: 5m
          annotations:
            summary: "calico-kube-controllers metrics target is down"

        # calico-typha replicas below desired
        - alert: CalicoTyphaBelowDesired
          expr: |
            kube_deployment_status_replicas_available{deployment="calico-typha"}
            < kube_deployment_spec_replicas{deployment="calico-typha"}
          for: 5m
          annotations:
            summary: "calico-typha is below desired replica count"
```

## IPAM Utilization Tracking

```bash
#!/bin/bash
# Export IPAM utilization from calicoctl ipam show as simple textfile metrics.
while true; do
  calicoctl ipam show 2>/dev/null | awk -F'|' '
    $2 ~ /IP Pool/ {
      cidr=$3
      used=$5
      gsub(/^[ \t]+|[ \t]+$/, "", cidr)
      sub(/^.*\(/, "", used)
      sub(/%\).*$/, "", used)
      print "calico_ipam_utilization_percent{ippool=\"" cidr "\"} " used
    }'
  sleep 60
done
```

## Monitoring Architecture

```mermaid
flowchart LR
    A[TigeraStatus conditions] -->|kube-state-metrics custom resource metrics| B[Prometheus]
    C[Felix metrics :9091] --> B
    D[kube-state-metrics custom resource metrics] --> B
    B --> E[Grafana cluster overview]
    B --> F[Alertmanager]
    F -->|TigeraStatus degraded| G[PagerDuty P2]
    F -->|IPAM >85%| H[Slack warning]
    F -->|IPAM >95%| I[PagerDuty P1]
```

## Grafana Cluster Overview Dashboard

```json
{
  "title": "Calico Cluster Health Overview",
  "panels": [
    {
      "title": "TigeraStatus Available",
      "type": "stat",
      "targets": [{"expr": "sum(tigerastatus_condition{type=\"Available\",status=\"true\"})"}]
    },
    {
      "title": "IPAM Utilization",
      "type": "gauge",
      "targets": [{"expr": "sum(ipam_allocations_in_use) / sum(ipam_ippool_size) * 100"}],
      "thresholds": [{"color": "green", "value": 0}, {"color": "yellow", "value": 75}, {"color": "red", "value": 90}]
    }
  ]
}
```

## Conclusion

Cluster-level Calico monitoring requires three critical alerts: TigeraStatus degradation (immediate P2), IPAM utilization above 85% (warning) and 95% (P1), and kube-controllers availability. The IPAM utilization alert is the most operationally valuable because IPAM exhaustion silently prevents new pods from scheduling, and by the time engineers notice, the cluster may be at 100%.
