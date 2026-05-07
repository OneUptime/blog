# How to Create Custom Prometheus Rules in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus

Description: Learn how to create custom Prometheus recording and alerting rules in Rancher for efficient metric computation and alerting.

Prometheus rules come in two types: recording rules that pre-compute frequently used or expensive queries, and alerting rules that trigger notifications based on conditions. Rancher supports both through the PrometheusRule custom resource. This guide covers creating, managing, and troubleshooting custom rules.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Cluster admin permissions.
- Basic understanding of PromQL.

## Understanding PrometheusRule Resources

In Rancher's Prometheus Operator deployment, rules are defined as `PrometheusRule` Kubernetes custom resources. The Prometheus Operator watches for these resources and automatically loads them into Prometheus.

Prometheus selects `PrometheusRule` resources according to the Prometheus configuration's `ruleSelector`. In the current Rancher `rancher-monitoring` chart, `ruleSelector: {}` selects all `PrometheusRule` resources in namespaces matched by `ruleNamespaceSelector`, so extra labels are not required unless you have customized the selector. If you have customized it, add labels that match your `ruleSelector`.

## Step 1: Create a Recording Rule

Recording rules pre-compute expensive PromQL expressions and save the results as new time series. This is useful for dashboard queries that would otherwise be slow.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: custom-recording-rules
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: custom-node-recording-rules
      interval: 30s
      rules:
        - record: node:cpu_usage:percent
          expr: |
            100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

        - record: node:memory_usage:percent
          expr: |
            (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

        - record: namespace:cpu_usage:sum
          expr: |
            sum by (namespace) (rate(container_cpu_usage_seconds_total{container!=""}[5m]))

        - record: namespace:memory_usage:sum_bytes
          expr: |
            sum by (namespace) (container_memory_working_set_bytes{container!=""})
```

Apply the recording rules:

```bash
kubectl apply -f custom-recording-rules.yaml
```

## Step 2: Create Alerting Rules

Alerting rules evaluate PromQL expressions and fire alerts when conditions are met:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: custom-alerting-rules
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: custom-infrastructure-alerts
      rules:
        - alert: NodeDiskSpaceLow
          expr: |
            (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.15
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Low disk space on {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} has less than 15% free disk space on root filesystem. Available: {{ $value | humanizePercentage }}"

        - alert: NodeDiskSpaceCritical
          expr: |
            (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Critical disk space on {{ $labels.instance }}"
            description: "Node {{ $labels.instance }} has less than 5% free disk space."

    - name: custom-application-alerts
      rules:
        - alert: HighRequestLatency
          expr: |
            histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)) > 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High request latency on {{ $labels.service }}"
            description: "99th percentile latency is {{ $value }}s for service {{ $labels.service }}."

        - alert: DeploymentReplicasMismatch
          expr: |
            kube_deployment_spec_replicas != kube_deployment_status_replicas_available
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Deployment {{ $labels.namespace }}/{{ $labels.deployment }} replica mismatch"
            description: "Deployment expects {{ $value }} replicas, but the available replica count does not match."
```

## Step 3: Create Rules via the Rancher UI

1. Navigate to your cluster in Rancher.
2. Go to **Monitoring > Advanced > Prometheus Rules**.
3. Click **Create**.
4. Enter a **Group Name**.
5. Add either alerting rules or recording rules to the group using the form builder.
6. Click **Create** to apply.

## Step 4: Organize Rules into Logical Groups

Group related rules together for better organization:

```yaml
spec:
  groups:
    - name: sla-rules
      interval: 30s
      rules:
        - record: sla:availability:ratio
          expr: |
            1 - (
              sum(rate(http_requests_total{status=~"5.."}[30m]))
              /
              sum(rate(http_requests_total[30m]))
            )

        - record: sla:latency_p99:seconds
          expr: |
            histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

    - name: capacity-rules
      interval: 60s
      rules:
        - record: cluster:cpu_usage:ratio
          expr: |
            sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) / sum(machine_cpu_cores)

        - record: cluster:memory_usage:ratio
          expr: |
            1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)
```

## Step 5: Use Recording Rules in Alerts

Recording rules can be referenced by alerting rules for more efficient evaluation:

```yaml
spec:
  groups:
    - name: capacity-recording
      rules:
        - record: cluster:cpu_usage:ratio
          expr: |
            sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) / sum(machine_cpu_cores)

    - name: capacity-alerts
      rules:
        - alert: ClusterCPUHigh
          expr: cluster:cpu_usage:ratio > 0.85
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Cluster CPU usage above 85%"
```

## Step 6: Verify Rules are Loaded

Check that Prometheus has picked up your rules:

```bash
# List all PrometheusRule resources

kubectl get prometheusrules -n cattle-monitoring-system

# Check Prometheus configuration
kubectl port-forward -n cattle-monitoring-system service/rancher-monitoring-prometheus 9090:9090
```

Open `http://localhost:9090/rules` in your browser to see all loaded rule groups.

You can also check for configuration errors in the Prometheus logs:

```bash
kubectl logs -n cattle-monitoring-system pod/prometheus-rancher-monitoring-prometheus-0 -c prometheus | grep -i "rule"
```

## Step 7: Debug Rule Evaluation

If a rule is not working as expected, test the PromQL expression directly in the Prometheus UI:

1. Open the Prometheus UI.
2. Go to the **Graph** tab.
3. Paste your PromQL expression and click **Execute**.
4. Verify the results match your expectations.

For alerting rules, check the **Alerts** tab to see the current state (inactive, pending, or firing).

## Step 8: Set Rule Evaluation Intervals

Each rule group can have its own evaluation interval:

```yaml
spec:
  groups:
    - name: fast-rules
      interval: 15s
      rules:
        - alert: HighErrorRate
          expr: rate(http_errors_total[1m]) > 10
          for: 2m

    - name: slow-rules
      interval: 120s
      rules:
        - record: daily:request_count:sum
          expr: sum(increase(http_requests_total[24h]))
```

Use shorter intervals for time-sensitive alerts and longer intervals for recording rules that aggregate over longer periods.

## Common Recording Rule Patterns

```yaml
# Request rate per service
- record: service:http_requests:rate5m
  expr: sum by (service) (rate(http_requests_total[5m]))

# Error rate per service
- record: service:http_errors:ratio
  expr: |
    sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
    /
    sum by (service) (rate(http_requests_total[5m]))

# Pod count per namespace
- record: namespace:pod_count:sum
  expr: count by (namespace) (kube_pod_info)

# Container restarts over 1 hour
- record: namespace:container_restarts:increase1h
  expr: sum by (namespace) (increase(kube_pod_container_status_restarts_total[1h]))
```

## Summary

Custom Prometheus rules in Rancher are created as PrometheusRule custom resources. Recording rules pre-compute expensive queries for faster dashboard loading, while alerting rules automate incident detection. Ensure your rules are created in a namespace selected by Prometheus and, if you customized `ruleSelector`, that their labels match it. Verify they load correctly through the Prometheus UI.
