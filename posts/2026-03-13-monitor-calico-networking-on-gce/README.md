# Monitor Calico Networking on Google Compute Engine

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, GCE, Google Cloud, Monitoring, Observability

Description: Set up comprehensive monitoring for Calico networking on GCE using GCP VPC Flow Logs, Cloud Monitoring, and Felix metrics for end-to-end visibility into Kubernetes pod networking.

---

## Introduction

Monitoring Calico on GCE combines GCP's native network observability tools with Calico's own metrics. GCP VPC Flow Logs provide sampled, aggregated visibility into traffic flows at the VPC layer, while Firewall Rules Logging can record allowed and denied firewall connections. Cloud Monitoring can alert on network anomalies. Felix metrics, exposed via Prometheus, show the health of policy enforcement at the pod level.

GCE-specific monitoring should also track VPC route table health - as the number of nodes grows, ensuring that all pod CIDR routes remain present is critical for cluster stability.

## Prerequisites

- Calico on GCE with Felix metrics enabled
- GCP VPC Flow Logs enabled on subnets
- Prometheus and Grafana deployed
- Google Cloud SDK access

## Step 1: Enable VPC Flow Logs

```bash
# Enable flow logs on the worker subnet

gcloud compute networks subnets update k8s-workers-subnet \
  --region us-central1 \
  --enable-flow-logs \
  --logging-flow-sampling 0.5 \
  --logging-metadata include-all
```

## Step 2: Enable Felix Prometheus Metrics

```bash
kubectl patch felixconfiguration default \
  --type=merge \
  --patch='{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'
```

## Step 3: Monitor VPC Route Health

Create a Cloud Monitoring check that verifies VPC routes exist for all active nodes:

```bash
#!/bin/bash
# check-vpc-routes.sh - Run as Cloud Functions scheduled job or CronJob

EXPECTED_ROUTES=$(kubectl get nodes \
  -o jsonpath='{range .items[*]}{.spec.podCIDR}{"\n"}{end}' | \
  sed '/^$/d' | sort -u)

ACTUAL_ROUTES=$(gcloud compute routes list \
  --filter="nextHopInstance:*" \
  --format="value(destRange)" | sort -u)

MISSING_ROUTES=$(comm -23 <(printf "%s\n" "$EXPECTED_ROUTES") <(printf "%s\n" "$ACTUAL_ROUTES"))

if [ -n "$MISSING_ROUTES" ]; then
  echo "ALERT: Missing VPC routes for pod CIDRs:"
  echo "$MISSING_ROUTES"
  exit 1
fi
```

## Step 4: Cloud Monitoring Alerts

```mermaid
graph TD
    A[GCP VPC Flow Logs] --> B[Cloud Logging]
    B --> C[Log-based Metrics]
    C --> D[Cloud Monitoring]
    D --> E{Alert Conditions}
    E --> F[High denied firewall connections]
    E --> G[Unusual cross-zone traffic]
    F --> H[PagerDuty / Email]
    G --> H
```

Create a log-based metric for denied firewall connections. This requires logging to be enabled on the relevant VPC firewall rules:

```bash
gcloud logging metrics create calico_vpc_denied_connections \
  --description="Denied firewall connections in the Calico cluster VPC" \
  --log-filter='jsonPayload.disposition="DENIED"'
```

## Step 5: Prometheus Alerts for GCE

```yaml
groups:
  - name: calico-gce
    rules:
      - alert: CalicoGCEEndpointDrop
        expr: |
          delta(felix_active_local_endpoints[5m]) < -2
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Calico endpoints decreased on GCE node {{ $labels.node }}"

      - alert: CalicoGCEFelixRestarts
        expr: |
          increase(felix_resyncs_started[15m]) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Felix on {{ $labels.node }} is resyncing frequently"
```

## Step 6: Dashboard Metrics

Key metrics for a GCE Calico Grafana dashboard:

| Panel | Metric | Visualization |
|-------|--------|--------------|
| Active Endpoints | `felix_active_local_endpoints` | Time series |
| Dataplane Failures | `increase(felix_int_dataplane_failures[5m])` | Time series |
| IPAM Usage | Custom from `calicoctl ipam show` | Gauge |
| VPC Route Count | Custom script | Single stat |

## Conclusion

Monitoring Calico on GCE combines VPC Flow Log analysis for network-layer visibility with Felix Prometheus metrics for policy enforcement health. GCE-specific monitoring must also track VPC static route count to detect drift when nodes are added or removed. By alerting on route mismatches, denied firewall connections, and frequent Felix resyncs, you can catch GCE-specific Calico issues before they escalate to cluster-wide connectivity problems.
