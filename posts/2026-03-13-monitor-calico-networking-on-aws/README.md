# Monitor Calico Networking on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, AWS, Cloud, Monitoring, Observability

Description: Set up comprehensive monitoring for Calico networking on AWS, including VPC flow logs, Felix metrics, and cross-AZ traffic visibility for Kubernetes clusters.

---

## Introduction

Monitoring Calico networking on AWS benefits from combining Calico's own telemetry with AWS-native monitoring capabilities. AWS VPC Flow Logs capture metadata for IP traffic at the VPC level - including ACCEPT and REJECT actions for traffic evaluated by VPC controls - while Calico's Felix metrics show endpoint, policy, and data plane health. Together, these sources give you visibility from the VPC network layer through to the pod-level policy layer.

On AWS, cross-AZ traffic patterns are particularly important to monitor because they directly affect cost (cross-AZ data transfer is billed) and latency. Tracking the ratio of same-AZ vs cross-AZ pod communication helps identify opportunities to improve pod placement.

## Prerequisites

- Calico installed on AWS with Felix metrics enabled
- VPC Flow Logs enabled for the cluster VPC
- Prometheus and Grafana deployed
- CloudWatch or a log aggregation system

## Step 1: Enable VPC Flow Logs

```bash
# Enable VPC flow logs to CloudWatch

aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-0123456789 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flow-logs/k8s-cluster \
  --deliver-logs-permission-arn arn:aws:iam::123456789:role/VPCFlowLogsRole
```

## Step 2: Enable Felix Prometheus Metrics

```bash
kubectl patch felixconfiguration default \
  --type=merge \
  --patch='{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'
```

## Step 3: Monitor Cross-AZ Traffic

```mermaid
graph TD
    A[Pod in AZ1] -->|Same AZ| B[Free traffic]
    A -->|Cross AZ| C[Billed traffic]
    D[VPC Flow Logs] --> E[CloudWatch Insights]
    E --> F[Cross-AZ traffic report]
    F --> G[Pod placement optimization]
```

Use CloudWatch Logs Insights to find high-volume pod or node traffic, then enrich the source and destination IPs with your node or pod IP-to-AZ inventory to classify same-AZ and cross-AZ flows:

```sql
fields @timestamp, srcAddr, dstAddr, bytes, action
| filter action = "ACCEPT"
| stats sum(bytes) as totalBytes by srcAddr, dstAddr
| sort totalBytes desc
| limit 20
```

## Step 4: Key Metrics Dashboard

Configure Grafana with Prometheus and AWS CloudWatch data sources:

```yaml
# Grafana panel queries
# Active Calico endpoints per node
felix_active_local_endpoints
```

Key metrics to track:

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| `felix_active_local_endpoints` | Prometheus | Sudden drop |
| `felix_int_dataplane_failures` | Prometheus | Any sustained increase |
| VPC flow log REJECT events | CloudWatch | > 50/min |
| Cross-AZ bytes | CloudWatch | Budget threshold |

## Step 5: CloudWatch Alarm for VPC Drops

```bash
aws logs put-metric-filter \
  --log-group-name /aws/vpc/flow-logs/k8s-cluster \
  --filter-name VPCRejectedFlowLogRecords \
  --filter-pattern '[version, account_id, interface_id, srcaddr, dstaddr, srcport, dstport, protocol, packets, bytes, start, end, action=REJECT, log_status]' \
  --metric-transformations metricName=RejectedFlowLogRecords,metricNamespace=Calico/VPCFlowLogs,metricValue=1

aws cloudwatch put-metric-alarm \
  --alarm-name "CalicoVPCRejectedFlowLogRecords" \
  --alarm-description "High number of rejected VPC flow log records in Calico cluster VPC" \
  --metric-name RejectedFlowLogRecords \
  --namespace Calico/VPCFlowLogs \
  --statistic Sum \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:calico-alerts
```

## Step 6: Node-Level Network Metrics

Monitor network throughput and error rates on nodes using the node exporter:

```yaml
# Prometheus alert for interface errors on nodes
- alert: NodeNetworkErrorsHigh
  expr: rate(node_network_transmit_errs_total[5m]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High network errors on {{ $labels.instance }} interface {{ $labels.device }}"
```

## Conclusion

Monitoring Calico on AWS combines Felix Prometheus metrics for endpoint, policy, and data plane health with AWS VPC Flow Logs for network-level traffic analysis. By tracking cross-AZ traffic volume, rejected VPC flows, and Felix endpoint health, you can maintain visibility into both the security posture and cost implications of your cluster's networking behavior. CloudWatch alarms for VPC-level rejects provide an early warning system independent of Calico's own monitoring.
