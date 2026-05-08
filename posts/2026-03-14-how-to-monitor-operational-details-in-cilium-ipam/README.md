# Monitoring Cilium IPAM Operational Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, IPAM, Monitoring, Observability

Description: How to monitor Cilium IPAM operational metrics including IP allocation rates, pool utilization, and capacity trends for production clusters.

---

## Introduction

Monitoring Cilium IPAM gives you visibility into IP address allocation health, utilization trends, and potential exhaustion before it affects pod scheduling. IPAM issues are among the most impactful Cilium problems because they directly prevent pods from starting.

The key metrics to track are per-node IP utilization, allocation and release rates, operator reconciliation performance, and overall cluster IP capacity. Cilium's per-node operator IPAM metrics are available for AWS, AlibabaCloud, and Azure IPAM modes; for cluster-pool and Kubernetes host-scope modes, combine agent IPAM metrics with `CiliumNode` and Kubernetes `Node` data. These metrics help you plan capacity and detect issues proactively.

## Prerequisites

- Kubernetes cluster with Cilium installed
- Prometheus and Grafana deployed
- kubectl and Cilium CLI configured

## IPAM Metrics Collection

Enable metrics in Cilium:

```yaml
prometheus:
  enabled: true
  serviceMonitor:
    enabled: true
operator:
  prometheus:
    enabled: true
    serviceMonitor:
      enabled: true
```

Key IPAM metrics:

```promql
# Available IPs per node

cilium_operator_ipam_available_ips

# Used IPs per node
cilium_operator_ipam_used_ips

# IP allocation operations
rate(cilium_operator_ipam_ip_allocation_ops_total[5m])

# IP release operations
rate(cilium_operator_ipam_ip_release_ops_total[5m])

# Allocation failures
rate(cilium_operator_ipam_allocation_duration_seconds_count{status="failed"}[5m])

# Agent-reported IPAM capacity
cilium_ipam_capacity
```

## Custom IPAM Monitoring Script

```bash
#!/bin/bash
# monitor-ipam.sh

echo "=== Cilium IPAM Status ==="
echo "Date: $(date)"

kubectl get ciliumnodes -o json | jq -r '
  .items[] | {
    node: .metadata.name,
    used: (.status.ipam.used // {} | length),
    cidrs: (.spec.ipam.podCIDRs // [])
  } | "\(.node): \(.used) IPs used, CIDRs: \(.cidrs)"'

echo ""
echo "Total endpoints:"
kubectl get ciliumendpoints --all-namespaces --no-headers | wc -l
```

```mermaid
graph LR
    A[Cilium Agent] -->|IPAM Metrics| B[Prometheus]
    C[Cilium Operator] -->|Allocation Metrics| B
    B --> D[Grafana]
    D --> E[Utilization Dashboard]
    D --> F[Capacity Alerts]
```

## Alert Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-ipam-alerts
  namespace: monitoring
spec:
  groups:
    - name: cilium-ipam
      rules:
        - alert: CiliumIPAMNearExhaustion
          expr: cilium_operator_ipam_available_ips < 20
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.target_node }} has fewer than 20 IPs available"
        - alert: CiliumIPAMAllocationFailures
          expr: rate(cilium_operator_ipam_allocation_duration_seconds_count{status="failed"}[5m]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "IPAM allocation failures detected"
```

## Verification

```bash
cilium status | grep IPAM
kubectl port-forward -n kube-system svc/cilium-operator 9963:9963 &
curl -s http://localhost:9963/metrics | grep cilium_operator_ipam
kubectl port-forward -n kube-system svc/cilium-agent 9962:9962 &
curl -s http://localhost:9962/metrics | grep -E 'cilium_ipam|cilium_ip_addresses'
```

## Troubleshooting

- **IPAM metrics not appearing**: Ensure Prometheus metrics are enabled and ServiceMonitor is configured.
- **Utilization shows 100%**: Add capacity for your IPAM mode immediately. Pods will fail to schedule when Cilium cannot allocate pod IPs.
- **Allocation rate spikes**: Correlate with deployment events. Sudden spikes during scaling are normal.
- **Metrics lag**: Check Prometheus scrape interval and agent health.

## Conclusion

IPAM monitoring is critical for production Cilium clusters. Track per-node utilization, alert on low capacity, and monitor allocation rates to detect issues before they affect pod scheduling. Plan capacity expansions based on utilization trends rather than reacting to exhaustion events.
