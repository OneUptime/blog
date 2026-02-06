# How to Use the OpenTelemetry Filter Processor to Drop Low-Value Health Check Telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Filter Processor, Health Checks, Cost Optimization

Description: Configure the OpenTelemetry Collector filter processor to drop health check spans, metrics, and logs that inflate storage costs without adding value.

Health check endpoints are the single noisiest source of telemetry in most systems. Kubernetes liveness probes hit `/healthz` every 10 seconds. Load balancers ping `/health` constantly. Uptime monitors poll `/ping` from multiple regions. Each of these generates traces, metrics, and log entries that nobody ever queries.

In a cluster with 100 pods, each receiving health checks every 10 seconds, that is 864,000 health check spans per day - per pod. Multiply across your fleet and you are looking at tens of millions of useless spans drowning out the data you actually care about.

The OpenTelemetry Collector's filter processor lets you drop this noise before it reaches your backend.

## The Filter Processor Basics

The filter processor evaluates telemetry against conditions you define. Data matching the conditions is either included or excluded from the pipeline. It uses the OpenTelemetry Transformation Language (OTTL) for expressing conditions.

To use the filter processor, add it to your Collector config in the `processors` section and reference it in your pipeline.

## Filtering Health Check Traces

The most common pattern is filtering by HTTP route or URL path. Health check endpoints follow predictable naming conventions.

This configuration drops all spans from common health check endpoints:

```yaml
# health-check-filter.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Drop spans that match health check patterns
  filter/health_traces:
    error_mode: ignore
    traces:
      span:
        # Drop spans where the HTTP route is a known health check path
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/ready"'
        - 'attributes["http.route"] == "/readyz"'
        - 'attributes["http.route"] == "/ping"'
        - 'attributes["http.route"] == "/livez"'
        # Also match URL-based attributes (some instrumentations use http.url)
        - 'IsMatch(attributes["http.url"], ".*/health(z)?$")'
        - 'IsMatch(attributes["http.url"], ".*/ready(z)?$")'
        - 'IsMatch(attributes["http.url"], ".*/ping$")'

  batch:
    timeout: 10s
    send_batch_size: 512

exporters:
  otlphttp:
    endpoint: https://backend:4318

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/health_traces, batch]
      exporters: [otlphttp]
```

The `error_mode: ignore` setting tells the processor to skip (pass through) any spans that cause evaluation errors rather than dropping the entire batch. This is important because not every span will have an `http.route` attribute.

## Filtering Health Check Metrics

Health check endpoints also generate HTTP server metrics. These inflate your metric cardinality with routes that do not represent real user traffic.

This processor filters out metrics data points tagged with health check routes:

```yaml
processors:
  filter/health_metrics:
    error_mode: ignore
    metrics:
      datapoint:
        # Drop metric data points from health check endpoints
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/ready"'
        - 'attributes["http.route"] == "/readyz"'
        - 'attributes["http.route"] == "/ping"'
        - 'attributes["http.route"] == "/livez"'
```

## Filtering Health Check Logs

If your services log every incoming request (which many frameworks do by default), health checks generate enormous log volumes.

This processor drops log entries that contain health check paths in their body or attributes:

```yaml
processors:
  filter/health_logs:
    error_mode: ignore
    logs:
      log_record:
        # Drop logs from health check endpoints based on attributes
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/ready"'
        - 'attributes["http.route"] == "/ping"'
        # Also catch unstructured logs that mention health check paths
        - 'IsMatch(body, ".*GET /health.*")'
        - 'IsMatch(body, ".*GET /ping.*")'
```

## Complete Pipeline Configuration

Here is the full Collector config with health check filtering applied to all three signal types:

```yaml
# complete-health-filter-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Memory limiter should always be first
  memory_limiter:
    check_interval: 5s
    limit_mib: 1024

  filter/health_traces:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/ready"'
        - 'attributes["http.route"] == "/readyz"'
        - 'attributes["http.route"] == "/ping"'
        - 'attributes["http.route"] == "/livez"'

  filter/health_metrics:
    error_mode: ignore
    metrics:
      datapoint:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/ready"'
        - 'attributes["http.route"] == "/readyz"'
        - 'attributes["http.route"] == "/ping"'

  filter/health_logs:
    error_mode: ignore
    logs:
      log_record:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/healthz"'
        - 'IsMatch(body, ".*GET /health(z)?\\s.*")'

  batch:
    timeout: 10s
    send_batch_size: 512

exporters:
  otlphttp:
    endpoint: https://backend:4318

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, filter/health_traces, batch]
      exporters: [otlphttp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, filter/health_metrics, batch]
      exporters: [otlphttp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, filter/health_logs, batch]
      exporters: [otlphttp]
```

## Verifying the Filter Works

After deploying the filter, verify it is dropping the expected data. The Collector exposes internal metrics that show processor activity.

Check these Prometheus metrics from the Collector's telemetry endpoint (default port 8888):

```
# Number of spans dropped by the filter processor
otelcol_processor_filter_spans_filtered

# Number of metric data points dropped
otelcol_processor_filter_datapoints_filtered

# Number of log records dropped
otelcol_processor_filter_logs_filtered
```

You can also compare before and after volumes in your backend. Run a query counting spans by route before enabling the filter, then check again after:

```sql
-- Run this before and after enabling the filter
SELECT
    attributes['http.route'] AS route,
    count() AS span_count
FROM otel_traces
WHERE Timestamp > now() - INTERVAL 1 HOUR
GROUP BY route
ORDER BY span_count DESC
LIMIT 20;
```

Health check routes should disappear from the results entirely after the filter is active.

## When NOT to Filter Health Checks

There are cases where health check telemetry is valuable:

- **During initial rollout** of a new service, health check failures indicate deployment issues. Keep health check telemetry for new services for the first week.
- **For health check services themselves** - if you have a dedicated uptime monitoring service, its outgoing health check spans are the primary signal, not noise.
- **When debugging probe failures** - if Kubernetes is restarting pods due to failed liveness probes, you need that telemetry.

A pragmatic approach is to filter health checks by default but provide a mechanism to temporarily disable the filter for specific services when needed. You can do this with an attribute-based exception:

```yaml
processors:
  filter/health_traces:
    error_mode: ignore
    traces:
      span:
        # Drop health checks UNLESS the service has opted out of filtering
        - 'attributes["http.route"] == "/health" and resource.attributes["otel.health_filter.enabled"] != "false"'
```

Services that need their health check telemetry can set the `otel.health_filter.enabled` resource attribute to `false` to bypass the filter.

Dropping health check telemetry is one of the highest-impact, lowest-risk optimizations you can make to your observability pipeline. It reduces noise, cuts costs, and makes your actual data easier to find.
