# How to Configure Telemetry Aggregation in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Aggregation, Observability, Prometheus

Description: A practical guide to configuring telemetry aggregation in Istio to reduce data volume while keeping meaningful observability insights.

---

When you run Istio at any reasonable scale, the raw telemetry output from Envoy sidecars can get overwhelming fast. Every single request generates metrics, and if you have hundreds of services talking to each other thousands of times per second, that raw data becomes a firehose. Aggregation is how you turn that firehose into something useful and manageable.

The idea is straightforward: instead of storing every individual data point, you combine related data points into summaries. You lose some granularity but gain the ability to actually query and dashboard your data without everything grinding to a halt.

## How Istio Telemetry Works Under the Hood

Envoy proxies in Istio collect telemetry at the request level. Each proxy maintains counters, histograms, and gauges locally. Prometheus scrapes these proxies periodically (usually every 15 seconds) and stores the data.

The problem starts when you have many unique combinations of labels. A metric like `istio_requests_total` carries labels for source workload, destination workload, response code, request protocol, and more. Multiply all those combinations and you get what is called high cardinality.

Check what metrics your Envoy proxies are currently exposing:

```bash
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  curl -s localhost:15090/stats/prometheus | head -50
```

Count the total number of time series:

```bash
kubectl exec -n your-namespace deploy/your-app -c istio-proxy -- \
  curl -s localhost:15090/stats/prometheus | grep -c "^istio_"
```

## Configuring Metric Aggregation at the Proxy Level

Istio lets you control which metrics are generated and which labels they carry. This is effectively aggregation at the source, which is the most efficient approach since data that never gets generated does not need to be stored or transmitted.

Use the Telemetry API to customize metric generation:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: metric-aggregation
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            request_protocol:
              operation: REMOVE
            response_flags:
              operation: REMOVE
            connection_security_policy:
              operation: REMOVE
        - match:
            metric: REQUEST_DURATION
          tagOverrides:
            request_protocol:
              operation: REMOVE
            response_flags:
              operation: REMOVE
```

By removing labels you do not use in dashboards or alerts, you reduce the number of unique time series. Each label you remove can cut cardinality significantly.

## Disabling Redundant Client-Side Metrics

Istio generates metrics on both the client side and the server side. In most cases, server-side metrics give you everything you need. Disabling client-side metrics effectively aggregates two data streams into one.

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: server-only-metrics
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT
          disabled: true
        - match:
            metric: REQUEST_DURATION
            mode: CLIENT
          disabled: true
        - match:
            metric: REQUEST_SIZE
            mode: CLIENT
          disabled: true
        - match:
            metric: RESPONSE_SIZE
            mode: CLIENT
          disabled: true
```

This alone can cut your Istio metric volume by about 50%.

## Setting Up Prometheus Recording Rules for Aggregation

Even after reducing what Envoy generates, you probably want to pre-aggregate metrics within Prometheus. Recording rules compute new time series from existing ones, and you can then query the pre-computed results instead of running expensive queries on raw data.

Create a PrometheusRule resource:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-aggregation-rules
  namespace: monitoring
spec:
  groups:
    - name: istio-request-aggregation
      interval: 30s
      rules:
        - record: namespace:istio_requests_total:rate5m
          expr: |
            sum(rate(istio_requests_total[5m])) by (
              destination_service_namespace,
              destination_service_name,
              response_code
            )
        - record: namespace:istio_request_duration_milliseconds:p50
          expr: |
            histogram_quantile(0.50,
              sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (
                destination_service_name,
                le
              )
            )
        - record: namespace:istio_request_duration_milliseconds:p99
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (
                destination_service_name,
                le
              )
            )
    - name: istio-error-aggregation
      interval: 30s
      rules:
        - record: namespace:istio_requests_errors:rate5m
          expr: |
            sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (
              destination_service_namespace,
              destination_service_name
            )
        - record: namespace:istio_requests_error_ratio:rate5m
          expr: |
            namespace:istio_requests_errors:rate5m
            /
            namespace:istio_requests_total:rate5m
```

## Aggregating Trace Data

Traces are even more expensive to store than metrics. Sampling is the main aggregation technique for traces. Instead of sending every trace, you send a percentage.

Configure trace sampling in Istio:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: trace-sampling
  namespace: istio-system
spec:
  tracing:
    - randomSamplingPercentage: 1.0
```

A 1% sampling rate means you keep 1 out of every 100 traces. For high-traffic services, this is usually plenty to identify patterns and outliers.

For smarter sampling, you can use tail-based sampling with OpenTelemetry Collector:

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
    processors:
      tail_sampling:
        decision_wait: 10s
        policies:
          - name: errors-policy
            type: status_code
            status_code:
              status_codes:
                - ERROR
          - name: slow-traces
            type: latency
            latency:
              threshold_ms: 1000
          - name: low-rate-sampling
            type: probabilistic
            probabilistic:
              sampling_percentage: 5
    exporters:
      otlp:
        endpoint: tempo:4317
        tls:
          insecure: true
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [tail_sampling]
          exporters: [otlp]
```

This keeps all error traces and slow traces while sampling normal traces at 5%.

## Aggregating Access Logs

Access logs are the biggest storage consumer if you leave them enabled for everything. Aggregate by filtering what gets logged:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: log-aggregation
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || connection.duration > duration('5s')"
```

This logs only errors and slow connections, which are the logs you actually look at when debugging.

## Using OpenTelemetry Collector as an Aggregation Layer

For more sophisticated aggregation, deploy the OpenTelemetry Collector as an intermediary:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          ports:
            - containerPort: 4317
            - containerPort: 8889
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol-contrib
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

## Verifying Your Aggregation Setup

After configuring aggregation, verify that the changes took effect:

```bash
# Check active time series count in Prometheus
curl -s http://prometheus:9090/api/v1/status/tsdb | jq '.data.seriesCountByMetricName[:10]'

# Compare before and after
curl -s http://prometheus:9090/api/v1/query?query=count({__name__=~"istio_.*"})
```

Monitor the memory usage of your Prometheus instance to confirm the reduction:

```bash
kubectl top pods -n monitoring -l app.kubernetes.io/name=prometheus
```

## Wrapping Up

Telemetry aggregation is not about losing visibility. It is about being intentional with what you collect and how you store it. Start by removing labels and metrics you never query. Then set up recording rules for the aggregated views you actually use in dashboards. Finally, use sampling for traces and filtering for logs. The result is a telemetry pipeline that is cheaper to run and faster to query, without sacrificing the ability to debug real production issues.
