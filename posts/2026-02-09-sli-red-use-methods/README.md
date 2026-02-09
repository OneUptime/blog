# How to Implement Kubernetes Service Level Indicators Using RED and USE Methods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, SLI, Monitoring

Description: Learn how to implement comprehensive Service Level Indicators for Kubernetes applications using RED and USE methodologies to track service health and resource utilization.

---

Service Level Indicators (SLIs) quantify service reliability and performance. The RED method focuses on request-based metrics (Rate, Errors, Duration) while USE covers resource metrics (Utilization, Saturation, Errors). Together, they provide complete visibility into service health. This guide shows you how to implement both methodologies for Kubernetes workloads.

## Understanding RED Method Metrics

The RED method tracks three key dimensions for request-driven services: request rate, error rate, and request duration.

```yaml
# Prometheus configuration for RED metrics
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-red-config
  namespace: monitoring
data:
  red-rules.yaml: |
    groups:
    - name: red_method_slis
      interval: 30s
      rules:
      # Request Rate (requests per second)
      - record: service:http_requests:rate5m
        expr: |
          sum(rate(http_requests_total[5m])) by (service, namespace)

      # Error Rate (percentage of requests that fail)
      - record: service:http_requests:error_rate5m
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service, namespace)
          /
          sum(rate(http_requests_total[5m])) by (service, namespace)

      # Duration (request latency percentiles)
      - record: service:http_request_duration:p50
        expr: |
          histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, namespace, le))

      - record: service:http_request_duration:p95
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, namespace, le))

      - record: service:http_request_duration:p99
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, namespace, le))
```

These recording rules precompute RED metrics for efficient querying and alerting.

## Instrumenting Applications for RED Metrics

Add instrumentation to application code to expose RED metrics.

```go
// Go application with RED method instrumentation
package main

import (
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // Request Rate metric
    httpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    // Request Duration metric (histogram for percentiles)
    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
        },
        []string{"method", "endpoint"},
    )
)

// Middleware to track RED metrics
func redMetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Wrap response writer to capture status code
        wrapper := &statusRecorder{ResponseWriter: w, statusCode: 200}

        // Call next handler
        next.ServeHTTP(wrapper, r)

        // Record metrics
        duration := time.Since(start).Seconds()
        status := http.StatusText(wrapper.statusCode)

        // Increment request counter
        httpRequestsTotal.WithLabelValues(
            r.Method,
            r.URL.Path,
            status,
        ).Inc()

        // Record request duration
        httpRequestDuration.WithLabelValues(
            r.Method,
            r.URL.Path,
        ).Observe(duration)
    })
}

type statusRecorder struct {
    http.ResponseWriter
    statusCode int
}

func (r *statusRecorder) WriteHeader(code int) {
    r.statusCode = code
    r.ResponseWriter.WriteHeader(code)
}

func main() {
    // Application endpoints
    mux := http.NewServeMux()
    mux.HandleFunc("/api/users", handleUsers)
    mux.HandleFunc("/api/orders", handleOrders)
    mux.HandleFunc("/health", handleHealth)

    // Metrics endpoint
    mux.Handle("/metrics", promhttp.Handler())

    // Wrap with RED metrics middleware
    handler := redMetricsMiddleware(mux)

    // Start server
    http.ListenAndServe(":8080", handler)
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
    // Simulate processing time
    time.Sleep(time.Millisecond * 50)
    w.Write([]byte("User list"))
}

func handleOrders(w http.ResponseWriter, r *http.Request) {
    // Simulate occasional errors
    if time.Now().Unix()%10 == 0 {
        w.WriteHeader(http.StatusInternalServerError)
        w.Write([]byte("Order service temporarily unavailable"))
        return
    }
    time.Sleep(time.Millisecond * 100)
    w.Write([]byte("Order list"))
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("OK"))
}
```

This instrumentation automatically tracks all three RED metrics for every HTTP endpoint.

## Implementing USE Method Metrics

The USE method monitors resource utilization, saturation, and errors for infrastructure components.

```yaml
# Prometheus configuration for USE metrics
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-use-config
  namespace: monitoring
data:
  use-rules.yaml: |
    groups:
    - name: use_method_slis
      interval: 30s
      rules:
      # CPU Utilization (percentage of CPU used)
      - record: node:cpu:utilization
        expr: |
          1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance)

      - record: pod:cpu:utilization
        expr: |
          sum(rate(container_cpu_usage_seconds_total[5m])) by (pod, namespace) /
          sum(container_spec_cpu_quota / container_spec_cpu_period) by (pod, namespace)

      # CPU Saturation (run queue length)
      - record: node:cpu:saturation
        expr: |
          node_load1 / count(node_cpu_seconds_total{mode="idle"}) by (instance)

      # Memory Utilization
      - record: node:memory:utilization
        expr: |
          1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)

      - record: pod:memory:utilization
        expr: |
          container_memory_working_set_bytes /
          container_spec_memory_limit_bytes

      # Memory Saturation (paging activity)
      - record: node:memory:saturation
        expr: |
          rate(node_vmstat_pgmajfault[5m])

      # Disk Utilization
      - record: node:disk:utilization
        expr: |
          1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)

      # Disk Saturation (I/O wait time)
      - record: node:disk:saturation
        expr: |
          rate(node_disk_io_time_seconds_total[5m])

      # Network Utilization
      - record: node:network:utilization_receive
        expr: |
          rate(node_network_receive_bytes_total[5m])

      - record: node:network:utilization_transmit
        expr: |
          rate(node_network_transmit_bytes_total[5m])

      # Network Saturation (dropped packets)
      - record: node:network:saturation
        expr: |
          rate(node_network_receive_drop_total[5m]) +
          rate(node_network_transmit_drop_total[5m])

      # Network Errors
      - record: node:network:errors
        expr: |
          rate(node_network_receive_errs_total[5m]) +
          rate(node_network_transmit_errs_total[5m])
```

These metrics provide comprehensive visibility into resource health across the cluster.

## Creating SLI Dashboards

Build Grafana dashboards that visualize RED and USE metrics together.

```json
{
  "dashboard": {
    "title": "Service SLIs - RED and USE Methods",
    "panels": [
      {
        "title": "Request Rate (RED)",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(service:http_requests:rate5m) by (service)",
            "legendFormat": "{{ service }}"
          }
        ]
      },
      {
        "title": "Error Rate (RED)",
        "type": "graph",
        "targets": [
          {
            "expr": "service:http_requests:error_rate5m * 100",
            "legendFormat": "{{ service }} error %"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [5],
                "type": "gt"
              },
              "query": {
                "params": ["A", "5m", "now"]
              }
            }
          ]
        }
      },
      {
        "title": "Request Duration P95 (RED)",
        "type": "graph",
        "targets": [
          {
            "expr": "service:http_request_duration:p95",
            "legendFormat": "{{ service }} p95"
          }
        ]
      },
      {
        "title": "CPU Utilization (USE)",
        "type": "graph",
        "targets": [
          {
            "expr": "node:cpu:utilization * 100",
            "legendFormat": "{{ instance }}"
          }
        ]
      },
      {
        "title": "CPU Saturation (USE)",
        "type": "graph",
        "targets": [
          {
            "expr": "node:cpu:saturation",
            "legendFormat": "{{ instance }} load ratio"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [1.5],
                "type": "gt"
              }
            }
          ]
        }
      },
      {
        "title": "Memory Utilization (USE)",
        "type": "graph",
        "targets": [
          {
            "expr": "pod:memory:utilization * 100",
            "legendFormat": "{{ namespace }}/{{ pod }}"
          }
        ]
      }
    ]
  }
}
```

This dashboard provides a complete view of service health from both application and infrastructure perspectives.

## Defining SLI-Based Alerts

Create alerts that fire when SLIs violate defined thresholds.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sli-alerts
  namespace: monitoring
spec:
  groups:
  - name: red_method_alerts
    interval: 30s
    rules:
    # Alert on high error rate
    - alert: HighErrorRate
      expr: service:http_requests:error_rate5m > 0.05
      for: 5m
      labels:
        severity: critical
        method: RED
      annotations:
        summary: "Service {{ $labels.service }} has high error rate"
        description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

    # Alert on high latency
    - alert: HighRequestLatency
      expr: service:http_request_duration:p95 > 1.0
      for: 5m
      labels:
        severity: warning
        method: RED
      annotations:
        summary: "Service {{ $labels.service }} has high latency"
        description: "P95 latency is {{ $value }}s (threshold: 1s)"

    # Alert on traffic drop
    - alert: TrafficDropped
      expr: |
        (
          sum(service:http_requests:rate5m) by (service)
          /
          sum(service:http_requests:rate5m offset 1h) by (service)
        ) < 0.5
      for: 10m
      labels:
        severity: warning
        method: RED
      annotations:
        summary: "Service {{ $labels.service }} traffic dropped significantly"
        description: "Current traffic is {{ $value | humanizePercentage }} of 1 hour ago"

  - name: use_method_alerts
    interval: 30s
    rules:
    # Alert on high CPU utilization
    - alert: HighCPUUtilization
      expr: node:cpu:utilization > 0.85
      for: 10m
      labels:
        severity: warning
        method: USE
      annotations:
        summary: "Node {{ $labels.instance }} has high CPU utilization"
        description: "CPU utilization is {{ $value | humanizePercentage }}"

    # Alert on CPU saturation
    - alert: CPUSaturation
      expr: node:cpu:saturation > 2.0
      for: 5m
      labels:
        severity: critical
        method: USE
      annotations:
        summary: "Node {{ $labels.instance }} CPU is saturated"
        description: "Load ratio is {{ $value }} (threshold: 2.0)"

    # Alert on memory pressure
    - alert: MemoryPressure
      expr: node:memory:utilization > 0.90
      for: 5m
      labels:
        severity: warning
        method: USE
      annotations:
        summary: "Node {{ $labels.instance }} has memory pressure"
        description: "Memory utilization is {{ $value | humanizePercentage }}"

    # Alert on disk saturation
    - alert: DiskSaturation
      expr: node:disk:saturation > 0.80
      for: 10m
      labels:
        severity: warning
        method: USE
      annotations:
        summary: "Node {{ $labels.instance }} disk is saturated"
        description: "Disk I/O wait time is high"

    # Alert on network errors
    - alert: NetworkErrors
      expr: node:network:errors > 10
      for: 5m
      labels:
        severity: critical
        method: USE
      annotations:
        summary: "Node {{ $labels.instance }} experiencing network errors"
        description: "{{ $value }} network errors per second"
```

These alerts provide proactive notification when services or infrastructure deviate from healthy states.

## Implementing SLI Tracking in CI/CD

Integrate SLI validation into deployment pipelines to catch regressions early.

```yaml
# GitLab CI pipeline with SLI validation
stages:
  - deploy
  - validate_slis
  - rollback

deploy_production:
  stage: deploy
  script:
    - kubectl apply -f k8s/production/
    - kubectl rollout status deployment/my-service -n production
  only:
    - main

validate_red_metrics:
  stage: validate_slis
  script:
    - |
      # Wait for metrics to stabilize
      sleep 120

      # Check error rate
      ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=service:http_requests:error_rate5m{service='my-service'}" | jq -r '.data.result[0].value[1]')
      if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
        echo "ERROR: Error rate $ERROR_RATE exceeds threshold 0.05"
        exit 1
      fi

      # Check P95 latency
      LATENCY=$(curl -s "http://prometheus:9090/api/v1/query?query=service:http_request_duration:p95{service='my-service'}" | jq -r '.data.result[0].value[1]')
      if (( $(echo "$LATENCY > 1.0" | bc -l) )); then
        echo "ERROR: P95 latency $LATENCY exceeds threshold 1.0s"
        exit 1
      fi

      echo "RED metrics validation passed"

validate_use_metrics:
  stage: validate_slis
  script:
    - |
      # Check pod CPU utilization
      CPU_UTIL=$(curl -s "http://prometheus:9090/api/v1/query?query=pod:cpu:utilization{pod=~'my-service-.*'}" | jq -r '.data.result[0].value[1]')
      if (( $(echo "$CPU_UTIL > 0.80" | bc -l) )); then
        echo "WARNING: CPU utilization $CPU_UTIL approaching limit"
      fi

      # Check pod memory utilization
      MEM_UTIL=$(curl -s "http://prometheus:9090/api/v1/query?query=pod:memory:utilization{pod=~'my-service-.*'}" | jq -r '.data.result[0].value[1]')
      if (( $(echo "$MEM_UTIL > 0.85" | bc -l) )); then
        echo "WARNING: Memory utilization $MEM_UTIL approaching limit"
      fi

      echo "USE metrics validation passed"

rollback_on_failure:
  stage: rollback
  script:
    - kubectl rollout undo deployment/my-service -n production
  when: on_failure
  only:
    - main
```

This pipeline automatically validates SLIs after deployment and rolls back if metrics violate thresholds.

## Conclusion

Implementing Service Level Indicators using RED and USE methods provides comprehensive visibility into Kubernetes service health. The RED method tracks request rate, error rate, and request duration for application-level monitoring, revealing user-facing service quality. The USE method monitors utilization, saturation, and errors for infrastructure resources, identifying capacity and performance bottlenecks. Instrument applications to expose RED metrics through middleware and libraries. Configure Prometheus to collect and aggregate both RED and USE metrics with recording rules. Create dashboards that visualize both methodologies together for complete service health visibility. Set up alerts based on SLI thresholds to catch issues proactively. Integrate SLI validation into CI/CD pipelines to prevent regressions. Together, RED and USE methods provide the metrics foundation for effective SLOs and error budgets.
