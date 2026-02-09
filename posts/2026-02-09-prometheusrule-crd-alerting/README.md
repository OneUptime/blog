# How to Use PrometheusRule CRD to Define Recording and Alerting Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, PrometheusRule, Alerting, Monitoring

Description: Learn how to create and manage Prometheus recording and alerting rules using the PrometheusRule Custom Resource Definition in Kubernetes.

---

The PrometheusRule CRD allows you to define Prometheus alerting and recording rules as Kubernetes resources. Instead of managing rules in ConfigMaps or static files, PrometheusRule provides a declarative, version-controlled approach. The Prometheus Operator automatically loads these rules into Prometheus, enabling dynamic rule management alongside your application deployments.

## Understanding PrometheusRule

PrometheusRule combines two types of rules:
- **Recording rules** precompute frequently used or computationally expensive queries and store the results as new time series
- **Alerting rules** evaluate conditions and fire alerts when thresholds are breached

Both rule types use PromQL (Prometheus Query Language) to define expressions. The Operator watches for PrometheusRule resources and automatically updates Prometheus configuration when rules change.

## Basic Alerting Rule

Here's a simple PrometheusRule that alerts when pod memory usage is high:

```yaml
# basic-alert-rule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pod-memory-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack  # Must match Prometheus ruleSelector
spec:
  groups:
    - name: pod-memory
      interval: 30s  # How often to evaluate rules
      rules:
        - alert: HighPodMemoryUsage
          expr: |
            container_memory_usage_bytes{container!=""}
            / container_spec_memory_limit_bytes{container!=""}
            > 0.8
          for: 5m  # Alert must be active for 5 minutes
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "Pod {{ $labels.pod }} memory usage is high"
            description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is using {{ $value | humanizePercentage }} of its memory limit."
```

Apply the rule:

```bash
kubectl apply -f basic-alert-rule.yaml
```

## Alert Rule Components

Each alerting rule has several key components:

- **alert**: The name of the alert (must be unique within the group)
- **expr**: PromQL expression that defines when to fire the alert
- **for**: Optional duration the condition must be true before firing
- **labels**: Additional labels attached to the alert
- **annotations**: Human-readable information about the alert

## Common Alerting Rules

### High CPU Usage

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cpu-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: cpu-monitoring
      interval: 30s
      rules:
        - alert: HighCPUUsage
          expr: |
            rate(container_cpu_usage_seconds_total{container!=""}[5m]) > 0.8
          for: 10m
          labels:
            severity: warning
            component: compute
          annotations:
            summary: "High CPU usage detected"
            description: "Container {{ $labels.container }} in pod {{ $labels.pod }} has CPU usage above 80% for 10 minutes."
            dashboard: "https://grafana.example.com/d/cpu-dashboard"

        - alert: CriticalCPUUsage
          expr: |
            rate(container_cpu_usage_seconds_total{container!=""}[5m]) > 0.95
          for: 5m
          labels:
            severity: critical
            component: compute
          annotations:
            summary: "Critical CPU usage detected"
            description: "Container {{ $labels.container }} in pod {{ $labels.pod }} has CPU usage above 95%."
            runbook: "https://runbooks.example.com/high-cpu"
```

### Pod Availability

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: availability-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: pod-availability
      interval: 30s
      rules:
        - alert: PodNotReady
          expr: |
            kube_pod_status_phase{phase!="Running"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.pod }} is not running"
            description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has been in {{ $labels.phase }} phase for 5 minutes."

        - alert: PodRestartingFrequently
          expr: |
            rate(kube_pod_container_status_restarts_total[1h]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.pod }} is restarting frequently"
            description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has restarted {{ $value }} times in the last hour."

        - alert: DeploymentReplicasMismatch
          expr: |
            kube_deployment_spec_replicas != kube_deployment_status_replicas_available
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "Deployment {{ $labels.deployment }} has mismatched replicas"
            description: "Deployment {{ $labels.deployment }} in namespace {{ $labels.namespace }} has {{ $value }} replicas available but expects more."
```

### Application Performance

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: application-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: http-performance
      interval: 30s
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{status=~"5.."}[5m])) by (service, namespace)
            / sum(rate(http_requests_total[5m])) by (service, namespace)
            > 0.05
          for: 5m
          labels:
            severity: critical
            type: performance
          annotations:
            summary: "High error rate on {{ $labels.service }}"
            description: "Service {{ $labels.service }} in namespace {{ $labels.namespace }} has error rate of {{ $value | humanizePercentage }}."

        - alert: HighLatency
          expr: |
            histogram_quantile(0.95,
              sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service, namespace)
            ) > 1
          for: 10m
          labels:
            severity: warning
            type: performance
          annotations:
            summary: "High latency on {{ $labels.service }}"
            description: "95th percentile latency for {{ $labels.service }} is {{ $value }}s."
```

## Recording Rules

Recording rules precompute complex queries to improve performance:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: recording-rules
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: request-rates
      interval: 30s
      rules:
        # Record per-service request rate
        - record: service:http_requests:rate5m
          expr: |
            sum(rate(http_requests_total[5m])) by (service, namespace)

        # Record per-service error rate
        - record: service:http_errors:rate5m
          expr: |
            sum(rate(http_requests_total{status=~"5.."}[5m])) by (service, namespace)

        # Record per-service success rate percentage
        - record: service:http_success_rate:percentage
          expr: |
            (
              sum(rate(http_requests_total{status!~"5.."}[5m])) by (service, namespace)
              / sum(rate(http_requests_total[5m])) by (service, namespace)
            ) * 100

    - name: resource-aggregations
      interval: 60s
      rules:
        # Record total CPU usage by namespace
        - record: namespace:container_cpu_usage:sum
          expr: |
            sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace)

        # Record total memory usage by namespace
        - record: namespace:container_memory_usage:sum
          expr: |
            sum(container_memory_usage_bytes) by (namespace)

        # Record pod count by namespace
        - record: namespace:pod_count:sum
          expr: |
            count(kube_pod_info) by (namespace)
```

Use recording rules in alerts for better performance:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: alerts-using-recordings
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: high-level-alerts
      interval: 30s
      rules:
        - alert: ServiceHighErrorRate
          expr: |
            service:http_errors:rate5m / service:http_requests:rate5m > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Service {{ $labels.service }} has high error rate"
            description: "Error rate is {{ $value | humanizePercentage }}."
```

## Advanced Rule Patterns

### Multi-Window Multi-Burn Rate Alerts

Implement SLO-based alerting:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: slo-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: slo-burn-rate
      interval: 30s
      rules:
        # Fast burn rate (2% error budget in 1 hour)
        - alert: SLOFastBurn
          expr: |
            (
              sum(rate(http_requests_total{status=~"5.."}[1h]))
              / sum(rate(http_requests_total[1h]))
              > (1 - 0.995) * 14.4
            )
            and
            (
              sum(rate(http_requests_total{status=~"5.."}[5m]))
              / sum(rate(http_requests_total[5m]))
              > (1 - 0.995) * 14.4
            )
          for: 2m
          labels:
            severity: critical
            slo: availability
          annotations:
            summary: "Fast SLO burn rate detected"
            description: "Error rate is consuming error budget at 14.4x rate."

        # Slow burn rate (10% error budget in 6 hours)
        - alert: SLOSlowBurn
          expr: |
            (
              sum(rate(http_requests_total{status=~"5.."}[6h]))
              / sum(rate(http_requests_total[6h]))
              > (1 - 0.995) * 6
            )
            and
            (
              sum(rate(http_requests_total{status=~"5.."}[30m]))
              / sum(rate(http_requests_total[30m]))
              > (1 - 0.995) * 6
            )
          for: 15m
          labels:
            severity: warning
            slo: availability
          annotations:
            summary: "Slow SLO burn rate detected"
            description: "Error rate is consuming error budget at 6x rate."
```

### Alerting on Absent Metrics

Alert when expected metrics disappear:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: absent-metric-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: metric-presence
      interval: 30s
      rules:
        - alert: MetricsMissing
          expr: |
            absent(up{job="my-application"})
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Metrics from my-application are missing"
            description: "No metrics have been received from my-application for 5 minutes."

        - alert: CriticalMetricMissing
          expr: |
            absent(http_requests_total{service="payment-service"})
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Payment service metrics missing"
            description: "Critical payment service metrics are not being reported."
```

## Rule Testing and Validation

Before deploying rules, validate them using promtool:

```bash
# Extract the rule groups to a file
kubectl get prometheusrule pod-memory-alerts -n monitoring -o jsonpath='{.spec}' > rules.yaml

# Validate with promtool (requires Prometheus installed locally)
promtool check rules rules.yaml
```

Test expressions in Prometheus UI:

```bash
# Port forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &

# Open http://localhost:9090 and test queries in the Graph tab
```

## Verifying Rules Are Loaded

Check if Prometheus loaded your rules:

```bash
# List all PrometheusRules
kubectl get prometheusrule -A

# Check rule details
kubectl describe prometheusrule pod-memory-alerts -n monitoring
```

Query Prometheus API for loaded rules:

```bash
# Get all rules
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.type == "alerting") | .name'

# Check specific rule group
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name == "pod-memory")'
```

Check active alerts:

```bash
# Get currently firing alerts
curl -s http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | {alert: .labels.alertname, state: .state}'
```

## Troubleshooting PrometheusRule Issues

### Rules Not Loaded

Verify the PrometheusRule has the correct label:

```bash
kubectl get prometheusrule pod-memory-alerts -n monitoring -o jsonpath='{.metadata.labels}'
```

Check Prometheus rule selector:

```bash
kubectl get prometheus -n monitoring -o yaml | grep -A 5 ruleSelector
```

Check Prometheus Operator logs:

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus-operator | grep -i rule
```

### Invalid PromQL Expressions

Check Prometheus logs for syntax errors:

```bash
PROM_POD=$(kubectl get pod -n monitoring -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n monitoring $PROM_POD | grep -i "error.*rule"
```

### Alerts Not Firing

Evaluate the expression manually in Prometheus UI to check if it returns results. Verify the `for` duration is not too long. Check Alertmanager is properly configured and receiving alerts.

## Best Practices

1. Use meaningful alert names that describe the problem, not the metric
2. Include runbook URLs in annotations for faster incident response
3. Set appropriate `for` durations to avoid alert flapping
4. Use recording rules for complex queries used in multiple alerts
5. Add context to annotations using label values (pod name, namespace, etc.)
6. Test rules in non-production before deploying to production
7. Version control PrometheusRules alongside application code
8. Use severity labels consistently across all alerts
9. Group related rules together logically
10. Document the meaning and expected action for each alert

## Conclusion

PrometheusRule CRD brings Kubernetes-native management to Prometheus alerting and recording rules. By defining rules as custom resources, you can version control, review, and deploy them alongside your applications. Recording rules optimize query performance while alerting rules provide proactive notification of issues. Master PrometheusRule to build comprehensive, maintainable monitoring for your Kubernetes infrastructure.
