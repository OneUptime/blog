# How to Implement API Gateway Observability with Prometheus and Distributed Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, Prometheus, Observability

Description: Learn how to implement comprehensive observability for API gateways using Prometheus metrics and distributed tracing with Jaeger or Zipkin, enabling deep insights into API performance and reliability.

---

API gateways sit at the critical path of all API traffic, making them ideal observation points for system health. Implementing comprehensive observability through metrics, logging, and tracing enables teams to detect issues early, diagnose problems quickly, and optimize performance. Prometheus provides time-series metrics, while distributed tracing reveals request flows across microservices.

## Understanding API Gateway Observability

Three pillars of observability apply to API gateways:

**Metrics** - Quantitative measurements like request rates, latencies, and error rates. Prometheus scrapes and stores these time-series metrics.

**Logs** - Event records of requests, errors, and state changes. Structured logging enables efficient querying and analysis.

**Traces** - End-to-end request flows showing spans across services. Distributed tracing identifies bottlenecks and failures in request paths.

Together, these provide complete visibility into gateway and backend behavior.

## Deploying Prometheus for Gateway Metrics

Deploy Prometheus using the Prometheus Operator:

```bash
# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

## Configuring Kong Prometheus Plugin

Enable Prometheus metrics in Kong:

```yaml
# kong-prometheus-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: prometheus
  annotations:
    kubernetes.io/ingress.class: kong
  labels:
    global: "true"
config:
  per_consumer: true
  status_code_metrics: true
  latency_metrics: true
  bandwidth_metrics: true
  upstream_health_metrics: true
plugin: prometheus
```

Expose metrics endpoint:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kong-metrics
  namespace: kong
  labels:
    app: kong
spec:
  selector:
    app: kong
  ports:
  - name: metrics
    port: 8100
    targetPort: 8100
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kong-metrics
  namespace: kong
spec:
  selector:
    matchLabels:
      app: kong
  endpoints:
  - port: metrics
    interval: 15s
```

## Ambassador Prometheus Metrics

Ambassador exposes Envoy metrics automatically:

```yaml
# ambassador-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ambassador-metrics
  namespace: ambassador
spec:
  selector:
    matchLabels:
      service: ambassador-admin
  endpoints:
  - port: admin
    path: /metrics
    interval: 15s
```

## APISIX Prometheus Integration

Enable APISIX Prometheus plugin:

```yaml
# apisix-prometheus-plugin.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixClusterConfig
metadata:
  name: default
spec:
  monitoring:
    prometheus:
      enable: true
      prefer_name: true
---
apiVersion: v1
kind: Service
metadata:
  name: apisix-metrics
  namespace: apisix
  labels:
    app: apisix
spec:
  selector:
    app: apisix
  ports:
  - name: metrics
    port: 9091
    targetPort: 9091
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: apisix-metrics
  namespace: apisix
spec:
  selector:
    matchLabels:
      app: apisix
  endpoints:
  - port: metrics
    path: /apisix/prometheus/metrics
    interval: 15s
```

## Key Metrics to Monitor

Essential API gateway metrics:

```promql
# Request rate
sum(rate(http_requests_total[5m])) by (service)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) /
sum(rate(http_requests_total[5m])) by (service)

# Latency percentiles
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)

histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)

# Upstream health
avg(upstream_health_check_success) by (upstream)

# Active connections
sum(kong_nginx_connections_total{state="active"})

# Request size
histogram_quantile(0.95,
  sum(rate(request_size_bytes_bucket[5m])) by (le)
)

# Response size
histogram_quantile(0.95,
  sum(rate(response_size_bytes_bucket[5m])) by (le)
)
```

## Creating Grafana Dashboards

Import or create dashboards for visualization:

```yaml
# grafana-dashboard-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-gateway-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  api-gateway.json: |
    {
      "dashboard": {
        "title": "API Gateway Overview",
        "panels": [
          {
            "title": "Request Rate",
            "targets": [
              {
                "expr": "sum(rate(http_requests_total[5m])) by (service)"
              }
            ]
          },
          {
            "title": "Error Rate",
            "targets": [
              {
                "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
              }
            ]
          },
          {
            "title": "Latency (p95)",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
              }
            ]
          }
        ]
      }
    }
```

## Implementing Distributed Tracing with Jaeger

Deploy Jaeger for tracing:

```bash
# Install Jaeger operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.50.0/jaeger-operator.yaml -n observability

# Create Jaeger instance
cat <<EOF | kubectl apply -f -
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
  namespace: observability
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch:9200
EOF
```

## Configuring Kong for Tracing

Enable Zipkin plugin in Kong:

```yaml
# kong-zipkin-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: zipkin-tracing
  labels:
    global: "true"
config:
  http_endpoint: http://jaeger-collector.observability.svc.cluster.local:9411/api/v2/spans
  sample_ratio: 1.0
  include_credential: true
  traceid_byte_count: 16
  header_type: preserve
  default_service_name: kong-gateway
  default_header_type: b3
plugin: zipkin
```

## Ambassador OpenTelemetry Integration

Configure Ambassador for OpenTelemetry:

```yaml
# ambassador-tracing.yaml
apiVersion: getambassador.io/v3alpha1
kind: TracingService
metadata:
  name: tracing
  namespace: ambassador
spec:
  service: jaeger-collector.observability:9411
  driver: zipkin
  config:
    collector_endpoint: /api/v2/spans
    collector_endpoint_version: HTTP_JSON
    trace_id_128bit: true
    shared_span_context: true
  sampling:
    overall: 100
```

## APISIX Tracing Configuration

Enable tracing in APISIX:

```yaml
# apisix-tracing-plugin.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: traced-api
  namespace: default
spec:
  http:
  - name: api-route
    match:
      paths:
      - /api/*
    plugins:
    - name: zipkin
      enable: true
      config:
        endpoint: http://jaeger-collector.observability.svc.cluster.local:9411/api/v2/spans
        sample_ratio: 1.0
        service_name: apisix-gateway
        span_version: 2
    backends:
    - serviceName: backend-service
      servicePort: 8080
```

## Analyzing Traces in Jaeger

Query traces via Jaeger UI:

```bash
# Port-forward to Jaeger UI
kubectl port-forward -n observability svc/jaeger-query 16686:16686

# Access UI at http://localhost:16686
```

Search traces by:
- Service name
- Operation name
- Tags (HTTP status, user ID, etc.)
- Duration thresholds
- Time range

## Setting Up Alerts

Create Prometheus alert rules:

```yaml
# api-gateway-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-gateway-alerts
  namespace: monitoring
spec:
  groups:
  - name: gateway
    interval: 30s
    rules:
    - alert: HighErrorRate
      expr: |
        sum(rate(http_requests_total{status=~"5.."}[5m])) /
        sum(rate(http_requests_total[5m])) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value | humanizePercentage }}"

    - alert: HighLatency
      expr: |
        histogram_quantile(0.95,
          sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
        ) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High latency detected"
        description: "P95 latency is {{ $value }}s"

    - alert: GatewayDown
      expr: up{job="kong-metrics"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Gateway is down"
        description: "Gateway {{ $labels.instance }} is not responding"

    - alert: UpstreamUnhealthy
      expr: upstream_health_check_success < 0.8
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Upstream health degraded"
        description: "Upstream {{ $labels.upstream }} health is {{ $value }}"
```

## Integrating with Alertmanager

Configure alert routing:

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-config
  namespace: monitoring
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m

    route:
      group_by: ['alertname', 'cluster']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'slack'
      routes:
      - match:
          severity: critical
        receiver: pagerduty

    receivers:
    - name: 'slack'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#api-alerts'
        title: 'API Gateway Alert'

    - name: 'pagerduty'
      pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

## Custom Metrics with Statsd

Emit custom metrics from gateways:

```lua
-- Kong custom metrics
local statsd = require "kong.plugins.statsd"

-- Increment custom counter
statsd:counter("api.custom_metric", 1, {
  tags = {"service:user-api", "env:prod"}
})

-- Record timing
local start_time = ngx.now()
-- ... perform operation ...
local duration = ngx.now() - start_time
statsd:timing("api.operation_duration", duration * 1000)
```

## SLO Monitoring

Define and track Service Level Objectives:

```yaml
# slo-recording-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-slo-rules
  namespace: monitoring
spec:
  groups:
  - name: slo
    interval: 30s
    rules:
    # Availability SLO: 99.9%
    - record: slo:availability:ratio
      expr: |
        sum(rate(http_requests_total{status!~"5.."}[5m])) /
        sum(rate(http_requests_total[5m]))

    # Latency SLO: 95% of requests under 500ms
    - record: slo:latency:ratio
      expr: |
        histogram_quantile(0.95,
          sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
        ) < 0.5

    # Error budget remaining
    - record: slo:error_budget:remaining
      expr: |
        1 - (
          (1 - slo:availability:ratio) /
          (1 - 0.999)
        )
```

## Best Practices

**Monitor golden signals** - Focus on latency, traffic, errors, and saturation.

**Set meaningful SLOs** - Define service level objectives based on user experience.

**Use percentiles not averages** - P95 and P99 latencies reveal tail behavior.

**Implement distributed tracing** - Trace spans across gateway and backends for end-to-end visibility.

**Alert on symptoms not causes** - Alert on user-facing issues rather than internal metrics.

**Maintain alert hygiene** - Regularly review and tune alerts to prevent fatigue.

**Use dashboards for exploration** - Reserve alerts for actionable issues requiring immediate response.

**Tag metrics appropriately** - Use consistent labels for filtering and aggregation.

## Conclusion

Comprehensive observability transforms API gateways from black boxes into transparent, measurable components. By combining Prometheus metrics for quantitative analysis, structured logging for event details, and distributed tracing for request flows, teams gain deep insights into gateway and backend behavior. This visibility enables proactive issue detection, rapid troubleshooting, and data-driven optimization. When implemented with clear SLOs and actionable alerts, gateway observability becomes a foundation for reliable, high-performance API infrastructure that meets user expectations and business requirements.
