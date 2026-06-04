# Use Loki Ruler to Generate Prometheus Metrics from Kubernetes Log Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Loki, Prometheus, Kubernetes

Description: Learn how to use Loki Ruler to extract metrics from log patterns and expose them as Prometheus metrics for comprehensive Kubernetes monitoring and alerting.

---

Logs contain valuable metrics that often go untapped. While traditional metrics collection requires instrumenting applications, Loki Ruler can extract metrics directly from log patterns, creating time-series data from unstructured logs. This capability is especially powerful for legacy applications that lack proper instrumentation or for tracking business metrics embedded in application logs.

This guide demonstrates how to use Loki Ruler to generate Prometheus metrics from Kubernetes log patterns.

## Understanding Loki Ruler

Loki Ruler evaluates LogQL expressions periodically and can:

- Generate recording rules that create new metrics from logs
- Create alert rules based on log patterns
- Export metrics to Prometheus via remote write
- Track patterns that don't have explicit instrumentation

The Ruler runs as a component in Loki's microservices mode or as part of the single binary deployment.

## Configuring Loki Ruler

Enable Ruler in your Loki configuration:

Prometheus must also be started with `--web.enable-remote-write-receiver` so it can accept samples at `/api/v1/write`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: logging
data:
  loki.yaml: |
    auth_enabled: false

    server:
      http_listen_port: 3100

    ingester:
      lifecycler:
        ring:
          kvstore:
            store: inmemory
          replication_factor: 1
      chunk_idle_period: 5m

    schema_config:
      configs:
      - from: 2024-01-01
        store: tsdb
        object_store: filesystem
        schema: v13
        index:
          prefix: index_
          period: 24h

    storage_config:
      tsdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
      filesystem:
        directory: /loki/chunks

    # Ruler configuration
    ruler:
      storage:
        type: local
        local:
          directory: /loki/rules
      rule_path: /loki/rules-temp
      alertmanager_url: http://alertmanager.monitoring.svc.cluster.local:9093
      ring:
        kvstore:
          store: inmemory
      enable_api: true
      enable_alertmanager_v2: true
      wal:
        dir: /loki/ruler-wal
      remote_write:
        enabled: true
        clients:
          prometheus:
            url: http://prometheus.monitoring.svc.cluster.local:9090/api/v1/write
            queue_config:
              capacity: 10000
              max_shards: 10
              min_shards: 1
              max_samples_per_send: 5000
              batch_send_deadline: 5s
              min_backoff: 30ms
              max_backoff: 100ms

    # Remote write to Prometheus
    limits_config:
      ruler_remote_write_disabled: false
```

## Creating Recording Rules

Define recording rules that extract metrics from logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-recording-rules
  namespace: logging
data:
  recording-rules.yaml: |
    groups:
      - name: http_metrics_from_logs
        interval: 1m
        rules:
          # Count HTTP requests by status code
          - record: http_requests_count_1m
            expr: |
              sum by (namespace, pod, status_code) (
                count_over_time({job="kubernetes-pods"}
                  | json
                  | __error__=""
                  | status_code=~".+" [1m])
              )

          # Calculate request rate
          - record: http_requests_rate
            expr: |
              sum by (namespace, pod) (
                rate({job="kubernetes-pods"}
                  | json
                  | __error__=""
                  | status_code=~".+" [5m])
              )

          # Track error rate
          - record: http_error_rate
            expr: |
              sum by (namespace, pod) (
                rate({job="kubernetes-pods"}
                  | json
                  | __error__=""
                  | status_code=~"5.." [5m])
              )

          # Calculate average response time from logs
          - record: http_response_time_avg
            expr: |
              sum by (namespace, pod) (
                sum_over_time({job="kubernetes-pods"}
                  | json
                  | unwrap duration_ms
                  | __error__="" [5m])
              ) /
              sum by (namespace, pod) (
                count_over_time({job="kubernetes-pods"}
                  | json
                  | __error__=""
                  | duration_ms > 0 [5m])
              )

          # Track slow requests (>1s)
          - record: http_slow_requests_count_1m
            expr: |
              sum by (namespace, pod) (
                count_over_time({job="kubernetes-pods"}
                  | json
                  | __error__=""
                  | duration_ms > 1000 [1m])
              )

      - name: application_errors
        interval: 1m
        rules:
          # Count errors by type
          - record: application_errors_count_1m
            expr: |
              sum by (namespace, pod, error_type) (
                count_over_time({job="kubernetes-pods", level="error"}
                  | json
                  | __error__=""
                  | error_type=~".+" [1m])
              )

          # Track exception count
          - record: application_exceptions_count_1m
            expr: |
              sum by (namespace, pod, exception_class) (
                count_over_time({job="kubernetes-pods"}
                  | logfmt
                  | __error__=""
                  | exception_class=~".+Exception" [1m])
              )

      - name: business_metrics
        interval: 1m
        rules:
          # Track successful orders
          - record: orders_completed_count_1m
            expr: |
              sum by (namespace) (
                count_over_time({namespace="ecommerce", app="order-service"}
                  | json
                  | __error__=""
                  | message="Order completed" [1m])
              )

          # Track failed payments
          - record: payments_failed_count_1m
            expr: |
              sum by (namespace, reason) (
                count_over_time({namespace="ecommerce", app="payment-service"}
                  | json
                  | __error__=""
                  | status="failed"
                  | reason=~".+" [1m])
              )

          # Calculate order value from logs
          - record: orders_value_sum_1m
            expr: |
              sum by (namespace) (
                sum_over_time({namespace="ecommerce", app="order-service"}
                  | json
                  | message="Order completed"
                  | unwrap amount
                  | __error__="" [1m])
              )
```

## Deploying Rules to Loki

Create the rules ConfigMap and mount it to Loki:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki
  namespace: logging
spec:
  serviceName: loki
  replicas: 1
  selector:
    matchLabels:
      app: loki
  template:
    metadata:
      labels:
        app: loki
    spec:
      containers:
      - name: loki
        image: grafana/loki:2.9.0
        args:
        - -config.file=/etc/loki/loki.yaml
        ports:
        - containerPort: 3100
          name: http
        volumeMounts:
        - name: config
          mountPath: /etc/loki
        - name: storage
          mountPath: /loki
        - name: rules
          mountPath: /loki/rules
      volumes:
      - name: config
        configMap:
          name: loki-config
      - name: rules
        projected:
          sources:
          - configMap:
              name: loki-recording-rules
              items:
              - key: recording-rules.yaml
                path: fake/recording-rules.yaml
          - configMap:
              name: loki-alert-rules
              optional: true
              items:
              - key: alert-rules.yaml
                path: fake/alert-rules.yaml
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 10Gi
```

## Creating Alert Rules

Define alert rules based on log patterns:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-alert-rules
  namespace: logging
data:
  alert-rules.yaml: |
    groups:
      - name: log_based_alerts
        interval: 1m
        rules:
          # Alert on high error rate
          - alert: HighErrorRate
            expr: |
              sum by (namespace, pod) (
                rate({job="kubernetes-pods", level="error"} [5m])
              ) > 0.1
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High error rate in {{ $labels.namespace }}/{{ $labels.pod }}"
              description: "Error rate is {{ $value | printf \"%.2f\" }} errors/sec"

          # Alert on database connection failures
          - alert: DatabaseConnectionFailures
            expr: |
              sum by (namespace, pod) (
                count_over_time({job="kubernetes-pods"}
                  | json
                  | __error__=""
                  | message=~"(?i).*database.*connection.*failed.*" [5m])
              ) > 5
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "Database connection failures in {{ $labels.namespace }}"

          # Alert on OOM kills detected in logs
          - alert: OOMKillDetected
            expr: |
              count_over_time({job="kubernetes-pods"}
                | json
                | __error__=""
                | message=~"(?i).*out of memory.*|.*oom.*killed.*" [5m]) > 0
            labels:
              severity: critical
            annotations:
              summary: "OOM kill detected in pod {{ $labels.pod }}"

          # Alert on slow API responses
          - alert: SlowAPIResponses
            expr: |
              (
                sum by (namespace, pod) (
                  sum_over_time({job="kubernetes-pods"}
                    | json
                    | unwrap duration_ms
                    | __error__="" [5m])
                ) /
                sum by (namespace, pod) (
                  count_over_time({job="kubernetes-pods"}
                    | json
                    | __error__=""
                    | duration_ms > 0 [5m])
                )
              ) > 2000
            for: 10m
            labels:
              severity: warning
            annotations:
              summary: "Slow API responses in {{ $labels.namespace }}/{{ $labels.pod }}"
              description: "Average response time: {{ $value | printf \"%.0f\" }}ms"

          # Alert on authentication failures
          - alert: HighAuthenticationFailureRate
            expr: |
              sum by (namespace) (
                rate({job="kubernetes-pods"}
                  | json
                  | __error__=""
                  | message=~"(?i).*authentication.*failed.*|.*login.*failed.*" [5m])
              ) > 0.5
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High authentication failure rate in {{ $labels.namespace }}"
```

## Extracting Business Metrics

Create metrics for business KPIs:

```yaml
groups:
  - name: ecommerce_metrics
    interval: 30s
    rules:
      # Track user signups
      - record: user_signups_count_1m
        expr: |
          sum by (source) (
            count_over_time({namespace="production", app="auth-service"}
              | json
              | __error__=""
              | event="user_signup" [1m])
          )

      # Track product views
      - record: product_views_count_1m
        expr: |
          sum by (category) (
            count_over_time({namespace="production", app="catalog-service"}
              | json
              | __error__=""
              | event="product_viewed"
              | category=~".+" [1m])
          )

      # Calculate conversion rate
      - record: checkout_conversion_rate
        expr: |
          (
            sum(rate({namespace="production", app="order-service"} | json | __error__="" | event="order_placed" [5m]))
            /
            sum(rate({namespace="production", app="catalog-service"} | json | __error__="" | event="add_to_cart" [5m]))
          ) * 100

      # Track cart abandonment
      - record: cart_abandonment_count_1m
        expr: |
          sum(
            count_over_time({namespace="production", app="cart-service"}
              | json
              | __error__=""
              | event="cart_abandoned" [1m])
          )

      # Monitor search performance
      - record: search_zero_results_rate
        expr: |
          (
            sum(rate({namespace="production", app="search-service"} | json | __error__="" | results_count="0" [5m]))
            /
            sum(rate({namespace="production", app="search-service"} | json | __error__="" | event="search" [5m]))
          ) * 100
```

## Querying Generated Metrics in Prometheus

Once metrics are generated, query them in Prometheus:

```promql
# View HTTP request rate

http_requests_rate

# Error rate percentage
(
  http_error_rate
  /
  http_requests_rate
) * 100

# Average response time
http_response_time_avg

# Business metric: Orders per minute
orders_completed_count_1m
```

## Monitoring Ruler Performance

Track Ruler health and performance:

```promql
# Ruler WAL appender readiness
loki_ruler_wal_appender_ready

# Remote write failed samples
rate(loki_ruler_wal_prometheus_remote_storage_samples_failed_total[5m])

# Remote write lag
loki_ruler_wal_prometheus_remote_storage_highest_timestamp_in_seconds
  - loki_ruler_wal_prometheus_remote_storage_queue_highest_sent_timestamp_seconds

# WAL repair failures
rate(loki_ruler_wal_corruptions_repair_failed_total[5m])
```

## Visualizing Log-Derived Metrics in Grafana

Create Grafana dashboards using the generated metrics:

```yaml
# Dashboard panel example
panels:
  - title: "HTTP Request Rate"
    targets:
      - expr: sum(http_requests_rate) by (namespace)

  - title: "Error Rate by Pod"
    targets:
      - expr: sum(application_errors_count_1m) by (pod)

  - title: "Average Response Time"
    targets:
      - expr: http_response_time_avg

  - title: "Business Metrics - Orders"
    targets:
      - expr: orders_completed_count_1m
```

## Best Practices

1. **Keep expressions simple**: Complex LogQL expressions can be resource-intensive
2. **Use appropriate intervals**: Match evaluation intervals to data freshness needs
3. **Add labels strategically**: Balance granularity with cardinality
4. **Test rules in Explore**: Validate LogQL before deploying rules
5. **Monitor Ruler resources**: Ensure adequate CPU and memory
6. **Use recording rules for complex calculations**: Pre-compute expensive queries
7. **Set appropriate retention**: Configure Prometheus retention for log-derived metrics

## Common Use Cases

**Application Performance**:
- Request latency percentiles
- Error rates and types
- Database query performance

**Security Monitoring**:
- Failed login attempts
- Unauthorized access attempts
- Suspicious activity patterns

**Business Intelligence**:
- User behavior metrics
- Feature usage tracking
- Conversion funnels

**Infrastructure Health**:
- Resource exhaustion patterns
- Service dependencies
- Degradation indicators

## Conclusion

Loki Ruler bridges the gap between logs and metrics, enabling you to extract valuable time-series data from unstructured logs. This capability is particularly useful for applications that lack proper instrumentation or for tracking business metrics embedded in logs. Start with simple recording rules, monitor their performance, and gradually expand to more complex metrics as needed. The combination of Loki's log aggregation and Prometheus's metrics capabilities creates a powerful observability platform.
