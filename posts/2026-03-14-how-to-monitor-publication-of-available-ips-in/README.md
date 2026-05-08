# Monitoring IP Availability Publication in Cilium IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, IPAM, Monitoring, Networking

Description: How to monitor Cilium IPAM IP availability publication to ensure continuous and accurate reporting of available IP addresses per node.

---

## Introduction

Monitoring IP availability publication ensures that the data Cilium publishes about available IPs remains accurate and current. This is particularly important for clusters using autoscalers that rely on this data to make scaling decisions.

Key monitoring targets are publication frequency, data accuracy over time, and alerts when nodes report critically low IP availability.

## Prerequisites

- Kubernetes cluster with Cilium installed
- Prometheus and Grafana deployed
- kubectl and jq configured

## Metrics for IP Publication

These Prometheus metrics are emitted by `cilium-operator` for the AWS, Alibaba Cloud, and Azure IPAM plugins.

```promql
# Available IPs per node

cilium_operator_ipam_available_ips

# Used IPs per node
cilium_operator_ipam_used_ips

# IP allocation rate
rate(cilium_operator_ipam_ip_allocation_ops_total[5m])

# IP release rate
rate(cilium_operator_ipam_ip_release_ops_total[5m])
```

## Custom Monitoring Script

```bash
#!/bin/bash
# monitor-ip-publication.sh

echo "=== IP Publication Monitor ==="
echo "Timestamp: $(date -u)"

kubectl get ciliumnodes -o json | jq -r '.items[] |
  ((.spec.ipam.pool // {} | length) - (.status.ipam.used // {} | length)) as $avail |
  "\(.metadata.name): \($avail) IPs available, \((.status.ipam.used // {} | length)) used"'
```

```mermaid
graph LR
    A[CiliumNode CRs] --> B[Publication Data]
    B --> C[Prometheus Metrics]
    C --> D[Availability Dashboard]
    C --> E[Low IP Alerts]
    C --> F[Trend Analysis]
```

## Alert Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-ip-publication-alerts
  namespace: monitoring
spec:
  groups:
    - name: ip-publication
      rules:
        - alert: NodeIPsNearExhaustion
          expr: cilium_operator_ipam_available_ips < 5
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Node {{ $labels.target_node }} has fewer than 5 IPs available"
        - alert: IPAllocationFailureRate
          expr: rate(cilium_operator_ipam_allocation_duration_seconds_count{status!="success"}[5m]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "IP allocation failures for subnet {{ $labels.subnet_id }}"
```

## Verification

```bash
kubectl port-forward -n kube-system deployment/cilium-operator 9963:9963 &
curl -s http://localhost:9963/metrics | grep cilium_operator_ipam
cilium status
```

## Troubleshooting

- **Metrics not available**: Verify `operator.prometheus.enabled=true` in Cilium Helm values and confirm you are using a supported cloud IPAM plugin.
- **Available count seems stale**: Check agent health on that node.
- **Alerts too noisy**: Adjust thresholds based on your node capacity.

## Conclusion

Monitoring IP publication ensures accurate data flows to autoscalers and scheduling systems. Track available IPs, alert on low capacity, and correlate allocation rates with scaling events for a complete picture.
