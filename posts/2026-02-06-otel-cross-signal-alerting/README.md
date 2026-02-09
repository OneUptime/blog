# How to Set Up Cross-Signal Alerting: Trigger Alerts When Metric Anomalies Correlate with Error Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Alerting, Cross-Signal, Metrics, Error Traces

Description: Set up cross-signal alerting that triggers when metric anomalies correlate with error traces for smarter incident detection.

Single-signal alerts are noisy. A latency spike alone might be a one-off blip. An increase in error traces alone might be a transient dependency hiccup. But when both happen at the same time for the same service, you almost certainly have a real problem. Cross-signal alerting correlates multiple signals before firing, reducing false positives and giving on-call engineers more context in the alert itself.

## The Idea: Compound Alert Conditions

Instead of alerting on `p99 latency > 2s`, you alert on `p99 latency > 2s AND error trace rate > 5% AND error logs contain "timeout"`. Each condition alone might not warrant paging someone at 3am, but all three together strongly indicate a genuine issue.

## Setting Up the Metric Pipeline

First, make sure your metric pipeline generates the signals you need for alerting. Use the Span Metrics Connector to derive RED metrics from traces:

```yaml
# collector-config.yaml
connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - name: http.request.method
      - name: http.response.status_code
      - name: http.route
    namespace: "span"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/traces, spanmetrics]
    metrics:
      receivers: [otlp, spanmetrics]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

## Prometheus Alerting Rules

Define compound alerting rules in Prometheus or Mimir that check multiple conditions:

```yaml
# alerting-rules.yaml
groups:
  - name: cross_signal_alerts
    interval: 30s
    rules:
      # Alert when latency spikes AND error rate increases together
      - alert: ServiceDegradation
        expr: |
          (
            histogram_quantile(0.99,
              sum(rate(span_duration_seconds_bucket{span_kind="SPAN_KIND_SERVER"}[5m])) by (le, service_name)
            ) > 2
          )
          and on (service_name)
          (
            sum(rate(span_calls_total{status_code="STATUS_CODE_ERROR"}[5m])) by (service_name)
            /
            sum(rate(span_calls_total[5m])) by (service_name)
            > 0.05
          )
        for: 5m
        labels:
          severity: critical
          signal_type: cross_signal
        annotations:
          summary: "{{ $labels.service_name }} has both high latency and elevated errors"
          description: |
            Service {{ $labels.service_name }} has p99 latency above 2 seconds
            AND error rate above 5% for the last 5 minutes.
            This indicates a real service degradation, not just a latency blip.
          dashboard: "https://grafana.example.com/d/svc-overview?var-service={{ $labels.service_name }}"
          runbook: "https://wiki.example.com/runbooks/service-degradation"

      # Alert when error rate spikes AND specific error types appear in traces
      - alert: UpstreamDependencyFailure
        expr: |
          (
            sum(rate(span_calls_total{
              status_code="STATUS_CODE_ERROR",
              span_kind="SPAN_KIND_CLIENT"
            }[5m])) by (service_name, peer_service)
            /
            sum(rate(span_calls_total{
              span_kind="SPAN_KIND_CLIENT"
            }[5m])) by (service_name, peer_service)
            > 0.1
          )
          and on (service_name)
          (
            histogram_quantile(0.99,
              sum(rate(span_duration_seconds_bucket{span_kind="SPAN_KIND_SERVER"}[5m])) by (le, service_name)
            ) > 1
          )
        for: 3m
        labels:
          severity: warning
          signal_type: cross_signal
        annotations:
          summary: "{{ $labels.service_name }} failing calls to {{ $labels.peer_service }}"
```

## Adding Log Signal to Alerts

Use Loki's alerting capabilities to include log patterns in your alert conditions. In Grafana, create a multi-datasource alert:

```yaml
# Grafana alerting rule (provisioned via YAML)
apiVersion: 1
groups:
  - orgId: 1
    name: cross_signal_alerts
    folder: Observability
    interval: 1m
    rules:
      - uid: svc-degradation-with-logs
        title: "Service Degradation with Error Logs"
        condition: C
        data:
          # Query A: Latency from Mimir
          - refId: A
            datasourceUid: mimir
            model:
              expr: |
                histogram_quantile(0.99,
                  sum(rate(http_server_request_duration_seconds_bucket{service_name="checkout-service"}[5m])) by (le)
                )
              instant: true

          # Query B: Error log count from Loki
          - refId: B
            datasourceUid: loki
            model:
              expr: |
                sum(count_over_time(
                  {service_name="checkout-service"} |= "ERROR" [5m]
                ))
              instant: true

          # Condition C: Both thresholds must be exceeded
          - refId: C
            datasourceUid: "-100"
            model:
              type: classic_conditions
              conditions:
                - evaluator:
                    type: gt
                    params: [2]
                  query:
                    params: [A]
                - evaluator:
                    type: gt
                    params: [50]
                  query:
                    params: [B]
              reducer:
                type: last
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Checkout service has high latency AND elevated error logs"
```

## Enriching Alerts with Trace Links

When an alert fires, include a link to relevant traces so the on-call engineer can start investigating immediately:

```yaml
# Alert template with trace link
annotations:
  summary: "{{ $labels.service_name }} degradation detected"
  trace_search: |
    https://grafana.example.com/explore?left={"datasource":"tempo","queries":[{
      "query":"{resource.service.name=\"{{ $labels.service_name }}\" && status=error && duration > 2s}",
      "queryType":"traceql"
    }]}
  log_search: |
    https://grafana.example.com/explore?left={"datasource":"loki","queries":[{
      "expr":"{service_name=\"{{ $labels.service_name }}\"} |= \"ERROR\""
    }]}
```

## Alert Routing by Signal Combination

Route alerts differently based on which signals are correlated:

```yaml
# Alertmanager config
route:
  receiver: default
  routes:
    # Cross-signal alerts get highest priority
    - match:
        signal_type: cross_signal
        severity: critical
      receiver: pagerduty-oncall
      continue: false

    # Single-signal latency alerts go to Slack first
    - match:
        alertname: HighLatency
      receiver: slack-sre
      continue: true
```

## The Investigation Flow

When a cross-signal alert fires, the on-call engineer gets:

1. The alert with context about which signals are correlated
2. A direct link to a trace search showing error traces during the alert window
3. A direct link to a log search filtered to the same service and time range
4. A dashboard link showing the metric overview

This is a complete investigation starting point, not just a metric threshold breach with no context.

## Wrapping Up

Cross-signal alerting reduces noise by requiring multiple signals to agree before paging someone. It provides richer context in alerts by including links to traces and logs. And it catches real incidents that single-signal alerts might miss or might fire too aggressively for. Set up your Span Metrics Connector to derive metrics from traces, write compound Prometheus rules, and configure your alert templates to include trace and log search links. The on-call experience improves immediately.
