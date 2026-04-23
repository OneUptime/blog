# How to Monitor Multi-Cluster Health from Rancher Dashboard - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Dashboard, Multi-Cluster

Description: Build a comprehensive multi-cluster health monitoring setup in Rancher using the built-in dashboard, Prometheus, Grafana, and custom alerting to maintain visibility across all clusters.

## Introduction

With Rancher managing dozens or hundreds of clusters, having a reliable health dashboard is essential for on-call engineers and platform teams. Rancher provides a built-in cluster summary view, and when combined with Prometheus, Grafana, and alerting, it becomes a powerful multi-cluster observability platform. This guide builds a complete, production-ready multi-cluster health monitoring solution.

## Step 1: Use Rancher's Built-In Dashboard

The Rancher home dashboard provides an at-a-glance view of all clusters:

1. Navigate to **☰ → Home**.
2. The **Cluster Summary** shows:
   - Cluster status (Active/Unavailable)
   - Kubernetes version
   - Node count and health
   - CPU and memory utilization
3. Click any cluster name to drill into its specific metrics.

```bash
# Check cluster states via API

curl -sk \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "https://rancher.example.com/v3/clusters?limit=-1" \
  | jq '.data[] | {
      name: .name,
      state: .state,
      version: (.version | if type == "object" then .gitVersion else . end)
    }'
```

## Step 2: Install Rancher Monitoring on All Clusters

```bash
# Install via Fleet - apply to all clusters
cat << 'EOF' | kubectl apply -f -
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: monitoring-stack
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/cluster-config
  branch: main
  paths:
    - monitoring/
  targets:
    - clusterSelector: {}   # All clusters
EOF
```

```yaml
# monitoring/fleet.yaml
defaultNamespace: cattle-monitoring-system
helm:
  repo: https://charts.rancher.io
  chart: rancher-monitoring
  releaseName: rancher-monitoring
  values:
    prometheus:
      prometheusSpec:
        retention: 7d
        storageSpec:
          volumeClaimTemplate:
            spec:
              resources:
                requests:
                  storage: 50Gi
    grafana:
      enabled: true
      adminPassword: ChangeMeNow!
```

## Step 3: Configure Centralized Metrics Collection

```yaml
# Configure Prometheus federation for cross-cluster metrics (on the management cluster)
# prometheus-federation.yaml

# Additional scrape config for the central Prometheus
- job_name: 'cluster-federation'
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
      # Essential cluster health metrics only
      - 'up'
      - 'kube_node_status_condition'
      - 'kube_pod_status_phase'
      - 'container_cpu_usage_seconds_total'
      - 'container_memory_working_set_bytes'
      - 'kube_deployment_status_replicas_unavailable'
      - 'kube_daemonset_status_number_unavailable'
      - 'etcd_server_has_leader'
  static_configs:
    # Targets must be reachable from the central Prometheus.
    - targets:
        - 'cluster-1-prometheus.example.com:9090'
      labels:
        cluster: cluster-1
        datacenter: us-east
    - targets:
        - 'cluster-2-prometheus.example.com:9090'
      labels:
        cluster: cluster-2
        datacenter: us-west
```

## Step 4: Define Grafana Panels for a Multi-Cluster Health Dashboard

```json
{
  "title": "Multi-Cluster Health Overview",
  "uid": "multi-cluster-health",
  "panels": [
    {
      "title": "Cluster Status",
      "type": "stat",
      "gridPos": {"h": 4, "w": 24, "x": 0, "y": 0},
      "targets": [{
        "expr": "max(up{job='kube-state-metrics'}) by (cluster)",
        "legendFormat": "{{cluster}}"
      }],
      "options": {"reduceOptions": {"calcs": ["lastNotNull"]}}
    },
    {
      "title": "Nodes Not Ready",
      "type": "table",
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4},
      "targets": [{
        "expr": "kube_node_status_condition{condition='Ready',status='false'} == 1",
        "legendFormat": "{{cluster}} / {{node}}"
      }]
    },
    {
      "title": "CPU Usage % by Cluster",
      "type": "timeseries",
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4},
      "targets": [{
        "expr": "100 * sum(rate(container_cpu_usage_seconds_total{container!=''}[5m])) by (cluster) / sum(kube_node_status_capacity{resource='cpu'}) by (cluster)",
        "legendFormat": "{{cluster}}"
      }]
    },
    {
      "title": "Failed Pods by Cluster",
      "type": "timeseries",
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 12},
      "targets": [{
        "expr": "sum(kube_pod_status_phase{phase=~'Failed|Unknown'}) by (cluster, namespace)",
        "legendFormat": "{{cluster}} / {{namespace}}"
      }]
    },
    {
      "title": "etcd Health (self-managed clusters)",
      "type": "stat",
      "gridPos": {"h": 4, "w": 12, "x": 12, "y": 12},
      "targets": [{
        "expr": "min(etcd_server_has_leader) by (cluster)",
        "legendFormat": "{{cluster}}"
      }],
      "options": {
        "colorMode": "background",
        "thresholds": {"steps": [{"color": "red", "value": 0}, {"color": "green", "value": 1}]}
      }
    }
  ]
}
```

## Step 5: Configure Multi-Cluster Alerts

```yaml
# PrometheusRule for critical multi-cluster alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: multi-cluster-critical-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: cluster-health
      interval: 30s
      rules:
        # Alert if any cluster is down (no metrics from it)
        - alert: ClusterDown
          expr: max by (cluster) (up{job="kube-state-metrics"}) == 0
          for: 2m
          labels:
            severity: critical
            page: "true"
          annotations:
            summary: "Cluster {{ $labels.cluster }} is unreachable"
            description: "No metrics have been received from {{ $labels.cluster }} for 2 minutes"

        # Alert on high percentage of NotReady nodes
        - alert: ClusterNodeAvailabilityLow
          expr: |
            (sum(kube_node_status_condition{condition="Ready",status="true"}) by (cluster)
            / count(kube_node_info) by (cluster)) < 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Less than 80% of nodes Ready in {{ $labels.cluster }}"

        # Alert if a self-managed cluster's etcd loses leader
        - alert: EtcdHasNoLeader
          expr: min by (cluster) (etcd_server_has_leader) == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "etcd in {{ $labels.cluster }} has no leader"

        # Alert on deployment unavailability
        - alert: DeploymentReplicasUnavailable
          expr: kube_deployment_status_replicas_unavailable > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Deployment {{ $labels.namespace }}/{{ $labels.deployment }} in {{ $labels.cluster }} has unavailable replicas"
```

## Step 6: Configure Alert Routing

```yaml
# Alertmanager configuration for multi-cluster alerting
route:
  receiver: slack-warnings
  group_by: ['cluster', 'alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  routes:
    # Critical alerts go to PagerDuty
    - matchers:
        - severity="critical"
      receiver: pagerduty-critical

    # Warning alerts go to Slack
    - matchers:
        - severity="warning"
      receiver: slack-warnings

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - routing_key: <pagerduty-integration-key>
        description: '{{ .GroupLabels.cluster }}: {{ .CommonAnnotations.summary }}'

  - name: slack-warnings
    slack_configs:
      - api_url: <slack-webhook-url>
        channel: '#k8s-alerts'
        text: '{{ range .Alerts }}*{{ .Annotations.summary }}*\n{{ .Annotations.description }}\n{{ end }}'
```

## Step 7: Automate Health Reports

```bash
#!/usr/bin/env bash
# cluster-health-report.sh - Daily health report across all clusters

RANCHER_URL="https://rancher.example.com"
TOKEN="${RANCHER_TOKEN}"

echo "=== Multi-Cluster Health Report: $(date) ==="

# Get all clusters and their states
curl -sk \
  -H "Authorization: Bearer ${TOKEN}" \
  "${RANCHER_URL}/v3/clusters?limit=-1" \
  | jq -r '.data[] | "\(.name)\t\(.state)\t\((.version | if type == \"object\" then .gitVersion else . end) // \"unknown\")\tNodes: \(.nodeCount // \"unknown\")"' \
  | column -t

echo ""
echo "=== Clusters with Issues ==="
curl -sk \
  -H "Authorization: Bearer ${TOKEN}" \
  "${RANCHER_URL}/v3/clusters?limit=-1" \
  | jq -r '.data[] | select(.state != "active") | "\(.name): \(.state) - \(.conditions[-1].message // "no message")"'
```

## Conclusion

A comprehensive multi-cluster health monitoring setup in Rancher combines the built-in dashboard for quick overviews, Prometheus and Grafana for deep metric analysis, and Alertmanager for proactive notifications. By federating metrics to a central Prometheus and creating cross-cluster Grafana dashboards, your platform team gains unified visibility into the health of your entire Kubernetes estate, enabling faster incident response and proactive capacity planning.
