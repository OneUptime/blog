# How to Set Up Trace-Based Alerting with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Tracing, Alerting, Observability, Monitoring

Description: How to set up alerts based on distributed trace data from Istio, including span metrics, error detection, and latency threshold alerting.

---

Most alerting in Kubernetes environments is metrics-based - you watch error rates, latency percentiles, and resource utilization through Prometheus. But there are failure modes that metrics miss. A request that fails at the third service in a chain shows up as an error in the origin service's metrics, but the metrics don't tell you which downstream service caused the failure. Trace-based alerting fills this gap by triggering alerts from patterns found in distributed trace data.

## Why Alert on Traces?

Metrics-based alerting works well for broad patterns ("error rate exceeds 5%"), but trace-based alerting catches specific patterns:

- A particular downstream dependency started failing
- A specific API endpoint is slow, even though overall p99 is fine
- Errors correlate with a specific tenant or request attribute
- A new deployment introduced regressions visible only in trace spans

## Approach 1: Span Metrics via OpenTelemetry Collector

The most practical approach is converting trace data into Prometheus metrics, then alerting on those metrics with your existing alerting tools.

Deploy an OTel Collector that generates metrics from spans:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    connectors:
      spanmetrics:
        histogram:
          explicit:
            buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s, 10s]
        dimensions:
          - name: http.method
          - name: http.status_code
          - name: upstream_cluster
          - name: response_flags
        dimensions_cache_size: 10000
        aggregation_temporality: AGGREGATION_TEMPORALITY_CUMULATIVE

    processors:
      batch:
        timeout: 5s

    exporters:
      otlp:
        endpoint: jaeger-collector.observability:4317
        tls:
          insecure: true
      prometheus:
        endpoint: 0.0.0.0:8889
        resource_to_telemetry_conversion:
          enabled: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          exporters: [spanmetrics, otlp]
        metrics/spanmetrics:
          receivers: [spanmetrics]
          processors: [batch]
          exporters: [prometheus]
```

This collector receives traces from Istio, forwards them to Jaeger for storage, and simultaneously generates Prometheus metrics from the span data.

Configure Prometheus to scrape the collector:

```yaml
# prometheus-config addition
scrape_configs:
  - job_name: otel-spanmetrics
    scrape_interval: 15s
    static_configs:
      - targets: ['otel-collector.observability:8889']
```

## Creating Prometheus Alert Rules from Span Metrics

Now create alerting rules based on the span-derived metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: trace-based-alerts
  namespace: observability
spec:
  groups:
    - name: trace-alerts
      rules:
        # Alert when a specific downstream service starts failing
        - alert: DownstreamServiceErrors
          expr: |
            sum(rate(traces_spanmetrics_calls_total{
              status_code="STATUS_CODE_ERROR",
              upstream_cluster=~"outbound.*"
            }[5m])) by (service_name, upstream_cluster) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Service {{ $labels.service_name }} has errors calling {{ $labels.upstream_cluster }}"
            description: "Error rate to downstream service exceeds threshold"

        # Alert on high latency for specific endpoints
        - alert: EndpointHighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(traces_spanmetrics_duration_bucket{
                http_method="POST",
                span_kind="SPAN_KIND_SERVER"
              }[5m])) by (le, service_name)
            ) > 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Service {{ $labels.service_name }} p99 latency exceeds 2s"

        # Alert on unusual response flag patterns
        - alert: CircuitBreakerTriggered
          expr: |
            sum(rate(traces_spanmetrics_calls_total{
              response_flags="UO"
            }[5m])) by (service_name) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Circuit breaker triggered for {{ $labels.service_name }}"
```

## Approach 2: Grafana Tempo Alerting

If you're using Grafana Tempo, you can use Tempo's metrics generator to create alerts:

```yaml
# Tempo configuration
metrics_generator:
  registry:
    external_labels:
      source: tempo
  storage:
    path: /tmp/tempo/generator/wal
    remote_write:
      - url: http://prometheus.observability:9090/api/v1/write
  processor:
    service_graphs:
      enable_client_server_prefix: true
      dimensions:
        - service.namespace
    span_metrics:
      dimensions:
        - http.method
        - http.status_code
        - http.route
```

Then alert on the generated metrics:

```yaml
groups:
  - name: tempo-trace-alerts
    rules:
      - alert: ServiceGraphHighErrorRate
        expr: |
          sum(rate(traces_service_graph_request_failed_total[5m])) by (client, server)
          /
          sum(rate(traces_service_graph_request_total[5m])) by (client, server)
          > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate between {{ $labels.client }} and {{ $labels.server }}"
```

## Approach 3: Jaeger Alerts via Prometheus

If you're using Jaeger, you can query its API periodically and create custom metrics:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: trace-alert-checker
  namespace: observability
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: checker
              image: curlimages/curl:8.5.0
              command:
                - /bin/sh
                - -c
                - |
                  # Check for recent error traces
                  ERRORS=$(curl -s "http://jaeger-query:16686/api/traces?service=payment-service&tags=error%3Dtrue&limit=10&lookback=5m" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('data',[])))")

                  if [ "$ERRORS" -gt "5" ]; then
                    # Send alert to alertmanager or webhook
                    curl -X POST http://alertmanager:9093/api/v1/alerts \
                      -H "Content-Type: application/json" \
                      -d "[{\"labels\":{\"alertname\":\"HighErrorTraces\",\"service\":\"payment-service\",\"severity\":\"warning\"},\"annotations\":{\"summary\":\"$ERRORS error traces in last 5 minutes\"}}]"
                  fi
          restartPolicy: OnFailure
```

## Approach 4: SkyWalking Built-in Alerting

If you're using Apache SkyWalking with Istio, it has built-in alerting that works directly on trace data:

```yaml
# SkyWalking alarm-settings.yml
rules:
  # Alert on service response time
  service_resp_time_rule:
    metrics-name: service_resp_time
    op: ">"
    threshold: 1000
    period: 5
    count: 3
    message: "Response time above 1s for 3 consecutive checks"

  # Alert on service success rate
  service_sla_rule:
    metrics-name: service_sla
    op: "<"
    threshold: 9000
    period: 5
    count: 5
    message: "Success rate below 90% for 5 consecutive checks"

  # Alert on specific endpoint latency
  endpoint_resp_time_rule:
    metrics-name: endpoint_resp_time
    op: ">"
    threshold: 2000
    period: 5
    count: 3
    message: "Endpoint response time above 2s"

  # Alert on relation metrics (service-to-service)
  service_relation_resp_time_rule:
    metrics-name: service_relation_client_resp_time
    op: ">"
    threshold: 3000
    period: 5
    count: 3
    message: "Cross-service call latency above 3s"

webhooks:
  - http://alertmanager.observability:9093/api/v1/alerts
```

## Setting Up Notification Channels

Route trace-based alerts through Alertmanager:

```yaml
# alertmanager-config.yml
route:
  receiver: default
  routes:
    - match:
        alertname: DownstreamServiceErrors
      receiver: on-call-team
      continue: true
    - match:
        alertname: CircuitBreakerTriggered
      receiver: platform-team
      group_wait: 30s
      repeat_interval: 5m

receivers:
  - name: default
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
  - name: on-call-team
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
  - name: platform-team
    slack_configs:
      - channel: '#platform-alerts'
```

## Alert Design Best Practices

When building trace-based alerts:

**Include trace IDs in alert annotations.** When someone gets paged, they should be able to jump directly to a relevant trace:

```yaml
annotations:
  summary: "High error rate for {{ $labels.service_name }}"
  trace_search: "http://jaeger.internal/search?service={{ $labels.service_name }}&tags=error%3Dtrue&lookback=15m"
```

**Alert on patterns, not individual traces.** A single error trace isn't worth an alert. Look for sustained patterns over time windows.

**Use different severities for different patterns:**
- Circuit breaker triggered = critical (service is degraded)
- Elevated error rate to downstream = warning (might be transient)
- Latency increase = info (might be load-related)

**Avoid alerting on sampled data at low rates.** If you're only sampling 1% of traces, the metrics derived from those traces are noisy. Either use a higher sampling rate for alert-worthy services or base alerts on Istio's native metrics (which capture 100% of requests) instead.

## Verifying Your Alerts

Test that alerts fire correctly:

```bash
# Generate error traffic
for i in $(seq 1 100); do
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/status/500
done

# Check Prometheus for span metrics
kubectl port-forward svc/prometheus -n observability 9090:9090
# Query: traces_spanmetrics_calls_total{status_code="STATUS_CODE_ERROR"}

# Check active alerts
curl -s http://localhost:9090/api/v1/alerts | python3 -m json.tool
```

## Summary

Trace-based alerting adds a layer of insight that metrics alone can't provide, particularly around downstream dependency failures and specific endpoint issues. The most practical approach is generating Prometheus metrics from spans using the OpenTelemetry Collector's spanmetrics connector, then using standard Prometheus alerting rules. If you're using SkyWalking, take advantage of its built-in alerting engine. Whatever approach you choose, make sure to include trace search links in your alert annotations so responders can jump directly to the relevant trace data.
