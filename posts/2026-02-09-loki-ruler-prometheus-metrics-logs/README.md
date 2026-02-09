# How to Use Loki Ruler to Generate Prometheus Metrics from Kubernetes Log Patterns

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
        store: boltdb-shipper
        object_store: filesystem
        schema: v11
        index:
          prefix: index_
          period: 24h

    storage_config:
      boltdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
        shared_store: filesystem
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

    # Remote write to Prometheus
    limits_config:
      ruler_remote_write_disabled: false

    ruler:
      wal:
        dir: /loki/ruler-wal
      remote_write:
        enabled: true
        client:
          url: http://prometheus.monitoring.svc.cluster.local:9090/api/v1/write
          queue_config:
            capacity: 10000
            max_shards: 10
            min_shards: 1
            max_samples_per_send: 5000
            batch_send_deadline: 5s
            min_backoff: 30ms
            max_backoff: 100ms
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
          - record: http_requests_total
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
                  | status_code=~".+" [5m])
              )

          # Track error rate
          - record: http_error_rate
            expr: |
              sum by (namespace, pod) (
                rate({job="kubernetes-pods"}
                  | json
                  | status_code=~"5.." [5m])
              )

          # Calculate average response time from logs
          - record: http_response_time_avg
            expr: |
              sum by (namespace, pod) (
                sum_over_time({job="kubernetes-pods"}
                  | json
                  | unwrap duration_ms [5m])
              ) /
              sum by (namespace, pod) (
                count_over_time({job="kubernetes-pods"}
                  | json
                  | duration_ms > 0 [5m])
              )

          # Track slow requests (>1s)
          - record: http_slow_requests_total
            expr: |
              sum by (namespace, pod) (
                count_over_time({job="kubernetes-pods"}
                  | json
                  | duration_ms > 1000 [1m])
              )

      - name: application_errors
        interval: 1m
        rules:
          # Count errors by type
          - record: application_errors_total
            expr: |
              sum by (namespace, pod, error_type) (
                count_over_time({job="kubernetes-pods", level="error"}
                  | json
                  | error_type=~".+" [1m])
              )

          # Track exception count
          - record: application_exceptions_total
            expr: |
              sum by (namespace, pod, exception_class) (
                count_over_time({job="kubernetes-pods"}
                  | logfmt
                  | exception_class=~".+Exception" [1m])
              )

      - name: business_metrics
        interval: 1m
        rules:
          # Track successful orders
          - record: orders_completed_total
            expr: |
              sum by (namespace) (
                count_over_time({namespace="ecommerce", app="order-service"}
                  | json
                  | message="Order completed" [1m])
              )

          # Track failed payments
          - record: payments_failed_total
            expr: |
              sum by (namespace, reason) (
                count_over_time({namespace="ecommerce", app="payment-service"}
                  | json
                  | status="failed"
                  | reason=~".+" [1m])
              )

          # Calculate order value from logs
          - record: orders_total_value
            expr: |
              sum by (namespace) (
                sum_over_time({namespace="ecommerce", app="order-service"}
                  | json
                  | message="Order completed"
                  | unwrap amount [1m])
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
        configMap:
          name: loki-recording-rules
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
                    | unwrap duration_ms [5m])
                ) /
                sum by (namespace, pod) (
                  count_over_time({job="kubernetes-pods"}
                    | json
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
      - record: user_signups_total
        expr: |
          sum by (source) (
            count_over_time({namespace="production", app="auth-service"}
              | json
              | event="user_signup" [1m])
          )

      # Track product views
      - record: product_views_total
        expr: |
          sum by (category) (
            count_over_time({namespace="production", app="catalog-service"}
              | json
              | event="product_viewed"
              | category=~".+" [1m])
          )

      # Calculate conversion rate
      - record: checkout_conversion_rate
        expr: |
          (
            sum(rate({namespace="production", app="order-service"} | json | event="order_placed" [5m]))
            /
            sum(rate({namespace="production", app="catalog-service"} | json | event="add_to_cart" [5m]))
          ) * 100

      # Track cart abandonment
      - record: cart_abandonment_total
        expr: |
          sum(
            count_over_time({namespace="production", app="cart-service"}
              | json
              | event="cart_abandoned" [1m])
          )

      # Monitor search performance
      - record: search_zero_results_rate
        expr: |
          (
            sum(rate({namespace="production", app="search-service"} | json | results_count="0" [5m]))
            /
            sum(rate({namespace="production", app="search-service"} | json | event="search" [5m]))
          ) * 100
```

## Querying Generated Metrics in Prometheus

Once metrics are generated, query them in Prometheus:

```promql
# View HTTP request rate
rate(http_requests_total[5m])

# Error rate percentage
(
  rate(http_error_rate[5m])
  /
  rate(http_requests_rate[5m])
) * 100

# P95 response time (if you tracked percentiles)
histogram_quantile(0.95, http_response_time_avg)

# Business metric: Orders per minute
rate(orders_completed_total[1m]) * 60
```

## Monitoring Ruler Performance

Track Ruler health and performance:

```promql
# Ruler evaluation duration
loki_ruler_evaluation_duration_seconds

# Failed rule evaluations
rate(loki_ruler_evaluation_failures_total[5m])

# Number of active rules
loki_ruler_rules

# Remote write failures
rate(loki_ruler_wal_corruptions_total[5m])
```

## Visualizing Log-Derived Metrics in Grafana

Create Grafana dashboards using the generated metrics:

```yaml
# Dashboard panel example
panels:
  - title: "HTTP Request Rate"
    targets:
      - expr: sum(rate(http_requests_total[5m])) by (namespace)

  - title: "Error Rate by Pod"
    targets:
      - expr: sum(rate(application_errors_total[5m])) by (pod)

  - title: "Average Response Time"
    targets:
      - expr: http_response_time_avg

  - title: "Business Metrics - Orders"
    targets:
      - expr: rate(orders_completed_total[1m]) * 60
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
