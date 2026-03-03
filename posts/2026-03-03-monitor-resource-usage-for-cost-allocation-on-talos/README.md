# How to Monitor Resource Usage for Cost Allocation on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Resource Monitoring, Cost Allocation, Kubernetes, FinOps, Prometheus

Description: Learn how to track and allocate Kubernetes resource costs across teams and projects on Talos Linux using monitoring and labeling strategies.

---

When multiple teams share a Kubernetes cluster, figuring out who is using what and how much it costs becomes a real challenge. Without proper resource monitoring and cost allocation, you end up in a situation where everyone blames everyone else for the cloud bill, and nobody takes responsibility for optimization. On Talos Linux clusters, the good news is that the operating system overhead is minimal and predictable, which makes workload-level cost attribution more accurate.

This guide covers how to set up resource monitoring and cost allocation on Talos Linux so you can give each team visibility into their spending.

## Why Cost Allocation Matters

Cost allocation is not just about splitting the bill fairly. It drives behavior changes that reduce costs:

- Teams that see their resource costs are more likely to optimize
- Finance teams can plan budgets more accurately
- Engineering leadership can make informed decisions about platform investments
- Overprovisioned workloads become visible and actionable

## Setting Up the Foundation: Labels and Namespaces

The basis of cost allocation is consistent labeling. Establish a labeling convention that every team must follow:

```yaml
# Required labels for all workloads
metadata:
  labels:
    # Business context
    app.kubernetes.io/name: "payment-service"
    app.kubernetes.io/part-of: "checkout-platform"
    # Cost allocation
    cost-center: "engineering-payments"
    team: "payments"
    environment: "production"
    # Technical context
    app.kubernetes.io/component: "api"
    app.kubernetes.io/managed-by: "helm"
```

Enforce these labels with a Kyverno policy:

```yaml
# require-cost-labels.yaml
# Ensures all deployments have cost allocation labels
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-cost-labels
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-cost-labels
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - DaemonSet
      validate:
        message: >
          All workloads must have cost-center, team, and
          environment labels for cost allocation.
        pattern:
          metadata:
            labels:
              cost-center: "?*"
              team: "?*"
              environment: "?*"
          spec:
            template:
              metadata:
                labels:
                  cost-center: "?*"
                  team: "?*"
                  environment: "?*"
```

## Deploying Prometheus for Resource Metrics

Prometheus is the backbone of resource monitoring on Kubernetes. Deploy it with the kube-prometheus-stack:

```bash
# Install the Prometheus stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi
```

## Creating Cost Allocation Recording Rules

Set up recording rules that aggregate resource usage by your cost allocation labels:

```yaml
# cost-allocation-rules.yaml
# Prometheus recording rules for cost tracking by team
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-allocation-rules
  namespace: monitoring
spec:
  groups:
    - name: cost.allocation
      interval: 5m
      rules:
        # CPU usage by team (in cores)
        - record: team:container_cpu_usage_seconds:rate5m
          expr: >
            sum by (label_team) (
              rate(container_cpu_usage_seconds_total{
                container!="",
                container!="POD"
              }[5m])
              * on(namespace, pod) group_left(label_team)
              kube_pod_labels{label_team!=""}
            )

        # Memory usage by team (in bytes)
        - record: team:container_memory_working_set_bytes:sum
          expr: >
            sum by (label_team) (
              container_memory_working_set_bytes{
                container!="",
                container!="POD"
              }
              * on(namespace, pod) group_left(label_team)
              kube_pod_labels{label_team!=""}
            )

        # CPU requests by team (what they reserved)
        - record: team:kube_pod_container_resource_requests_cpu:sum
          expr: >
            sum by (label_team) (
              kube_pod_container_resource_requests{resource="cpu"}
              * on(namespace, pod) group_left(label_team)
              kube_pod_labels{label_team!=""}
            )

        # Memory requests by team
        - record: team:kube_pod_container_resource_requests_memory:sum
          expr: >
            sum by (label_team) (
              kube_pod_container_resource_requests{resource="memory"}
              * on(namespace, pod) group_left(label_team)
              kube_pod_labels{label_team!=""}
            )

        # CPU efficiency by team (actual vs requested)
        - record: team:cpu_efficiency:ratio
          expr: >
            team:container_cpu_usage_seconds:rate5m
            / team:kube_pod_container_resource_requests_cpu:sum

        # Namespace-level CPU cost (in core-hours per day)
        - record: namespace:cpu_core_hours:rate1d
          expr: >
            sum by (namespace) (
              rate(container_cpu_usage_seconds_total{
                container!="", container!="POD"
              }[1d])
            ) * 24
```

## Building Cost Allocation Dashboards

Create a Grafana dashboard that shows cost breakdown by team:

```json
{
  "dashboard": {
    "title": "Cost Allocation by Team",
    "panels": [
      {
        "title": "CPU Usage by Team (cores)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "team:container_cpu_usage_seconds:rate5m",
            "legendFormat": "{{label_team}}"
          }
        ]
      },
      {
        "title": "Memory Usage by Team (GB)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "team:container_memory_working_set_bytes:sum / 1024 / 1024 / 1024",
            "legendFormat": "{{label_team}}"
          }
        ]
      },
      {
        "title": "CPU Efficiency by Team",
        "type": "gauge",
        "targets": [
          {
            "expr": "team:cpu_efficiency:ratio",
            "legendFormat": "{{label_team}}"
          }
        ]
      }
    ]
  }
}
```

## Calculating Dollar Costs

To translate resource usage into dollar amounts, you need to know your per-unit cost. Here is a simple approach:

```yaml
# cost-calculation-rules.yaml
# Translate resource metrics into dollar amounts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-calculation-rules
  namespace: monitoring
spec:
  groups:
    - name: cost.dollars
      interval: 1h
      rules:
        # Assuming $0.04/core-hour and $0.005/GB-hour
        # Adjust these rates based on your actual cloud costs

        # Hourly CPU cost by team
        - record: team:cpu_cost_per_hour:dollars
          expr: >
            team:container_cpu_usage_seconds:rate5m * 0.04

        # Hourly memory cost by team
        - record: team:memory_cost_per_hour:dollars
          expr: >
            (team:container_memory_working_set_bytes:sum
             / 1024 / 1024 / 1024) * 0.005

        # Total hourly cost by team
        - record: team:total_cost_per_hour:dollars
          expr: >
            team:cpu_cost_per_hour:dollars
            + team:memory_cost_per_hour:dollars
```

## Generating Cost Reports

Create a script that generates monthly cost reports from Prometheus:

```bash
#!/bin/bash
# generate-cost-report.sh
# Generates a monthly cost allocation report from Prometheus

PROMETHEUS_URL="http://prometheus.monitoring.svc.cluster.local:9090"
END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_TIME=$(date -u -d "-30 days" +"%Y-%m-%dT%H:%M:%SZ")

# Query average hourly cost by team over the last 30 days
curl -s "${PROMETHEUS_URL}/api/v1/query" \
  --data-urlencode "query=avg_over_time(team:total_cost_per_hour:dollars[30d]) * 730" \
  | jq -r '
    .data.result[] |
    "\(.metric.label_team)\t$\(.value[1] | tonumber | . * 100 | round / 100)"
  ' | sort -t$'\t' -k2 -rn | column -t -s$'\t'
```

## Setting Up Budget Alerts

Create alerts when teams exceed their allocated budgets:

```yaml
# budget-alerts.yaml
# Alert when team spending exceeds thresholds
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: budget-alerts
  namespace: monitoring
spec:
  groups:
    - name: cost.budgets
      rules:
        - alert: TeamOverBudget
          expr: >
            team:total_cost_per_hour:dollars * 730 > 5000
          for: 24h
          labels:
            severity: warning
          annotations:
            summary: "Team {{ $labels.label_team }} is projected to exceed monthly budget"
            description: >
              Projected monthly cost: ${{ $value | printf "%.2f" }}.
              Budget threshold: $5,000.

        - alert: HighResourceWaste
          expr: >
            team:cpu_efficiency:ratio < 0.2
          for: 7d
          labels:
            severity: info
          annotations:
            summary: "Team {{ $labels.label_team }} has low CPU efficiency"
            description: >
              CPU efficiency is {{ $value | printf "%.1f" }}%.
              Resources are significantly over-provisioned.
```

## Talos-Specific Considerations

On Talos Linux, the system overhead is consistent and small. This makes cost allocation more fair because you are not attributing significant OS overhead unevenly across teams. However, you should still account for shared infrastructure:

```yaml
# Allocate shared costs proportionally
# Shared costs include: control plane, monitoring, ingress, DNS
# Distribute based on each team's share of total resource requests

- record: team:shared_cost_allocation:ratio
  expr: >
    team:kube_pod_container_resource_requests_cpu:sum
    / ignoring(label_team) group_left()
    sum(team:kube_pod_container_resource_requests_cpu:sum)
```

## Summary

Effective cost allocation on Talos Linux clusters requires consistent labeling, comprehensive monitoring, and clear reporting. Start by enforcing cost allocation labels on all workloads, then build Prometheus recording rules that aggregate usage by team. Translate raw resource metrics into dollar amounts using your actual cloud pricing, and set up dashboards and budget alerts to give each team visibility into their spending. The minimal and predictable overhead of Talos Linux makes these calculations more accurate than on traditional distributions, giving you confidence that the numbers reflect actual workload costs rather than system overhead.
