# How to Create Alerting Rules for Dapr Component Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alerting, Monitoring, Observability, Kubernetes

Description: Learn how to define Prometheus alerting rules that fire when Dapr components fail, covering state stores, pub/sub brokers, and bindings.

---

Dapr components are the building blocks of your microservices: state stores, pub/sub brokers, secret stores, and bindings. When any of these fail, services lose functionality silently unless you have alerting in place. Prometheus alerting rules give you proactive notification before users notice problems.

## Understanding Dapr Component Metrics

Dapr exposes component health through runtime counters and operation-level counters. Key metrics to watch:

- `dapr_runtime_component_init_fail_total` - counts component initialization failures
- `dapr_component_state_count` - state store operation counts with `operation` and `success` labels
- `dapr_component_pubsub_egress_count` - pub/sub publish attempts

Enable Prometheus scraping in your Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
  namespace: default
spec:
  metrics:
    enabled: true
    port: 9090
```

## Writing Component Failure Alerting Rules

Create a PrometheusRule resource for Kubernetes deployments:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-component-alerts
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
    - name: dapr.component.failures
      interval: 30s
      rules:
        - alert: DaprComponentInitFailure
          expr: increase(dapr_runtime_component_init_fail_total[5m]) > 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr component failed to initialize"
            description: "Component {{ $labels.component }} in app {{ $labels.app_id }} failed to initialize."

        - alert: DaprStateStoreErrors
          expr: |
            rate(dapr_component_state_count{success="false"}[5m]) > 0.05
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Dapr state store error rate elevated"
            description: "State store {{ $labels.component }} has >5% error rate over last 5 minutes."

        - alert: DaprPubSubPublishFailures
          expr: |
            rate(dapr_component_pubsub_egress_count{success="false"}[5m]) > 0.1
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Dapr pub/sub publish failures elevated"
            description: "Topic {{ $labels.topic }} on component {{ $labels.component }} has high publish failure rate."
```

## Alerting for Binding Failures

Input and output bindings need separate monitoring. Add rules for binding operation failures:

```yaml
        - alert: DaprBindingTriggerError
          expr: |
            rate(dapr_component_input_binding_count{success="false"}[5m]) > 0.05
          for: 3m
          labels:
            severity: warning
          annotations:
            summary: "Dapr input binding trigger failures"
            description: "Input binding {{ $labels.component }} triggering errors at elevated rate."

        - alert: DaprOutputBindingError
          expr: |
            rate(dapr_component_output_binding_count{success="false"}[5m]) > 0.05
          for: 3m
          labels:
            severity: warning
          annotations:
            summary: "Dapr output binding send failures"
            description: "Output binding {{ $labels.component }} sending errors at elevated rate."
```

## Testing Your Alerting Rules

Validate rules before deploying using `promtool`:

```bash
promtool check rules dapr-component-alerts.yaml
```

Simulate a failure by scaling down a Redis state store and watching alerts fire:

```bash
kubectl scale deployment redis --replicas=0 -n default
# Watch alerts in Prometheus UI or Alertmanager
kubectl port-forward svc/prometheus-operated 9090:9090 -n monitoring
```

Review active alerts via the Alertmanager API:

```bash
curl http://localhost:9093/api/v2/alerts | jq '.[].labels'
```

## Summary

Dapr component alerting rules use Prometheus metrics to detect failures in state stores, pub/sub brokers, and bindings before they cascade. Defining tiered severity levels (warning vs critical) with appropriate `for` durations reduces alert noise while ensuring genuine failures are caught quickly.
