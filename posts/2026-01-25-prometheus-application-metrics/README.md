# How to Configure Application Metrics with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Application Metrics, Instrumentation, Counters, Gauges, Histograms, Python, Go, Node.js, Observability

Description: A practical guide to instrumenting applications with Prometheus metrics. Learn how to choose the right metric types, implement custom metrics in Python, Go, and Node.js, and expose them for Prometheus scraping.

---

## Understanding Prometheus Metric Types

Prometheus supports four core metric types, each suited for different measurement scenarios:

- **Counter**: A cumulative value that only increases (e.g., total requests, errors)
- **Gauge**: A value that can go up or down (e.g., current memory usage, active connections)
- **Histogram**: Samples observations and counts them in configurable buckets (e.g., request latency)
- **Summary**: Similar to histogram but calculates quantiles client-side

Choosing the right type depends on what you want to measure and how you want to query it.

## Metric Naming Conventions

Follow Prometheus naming conventions for consistency:

```
# General format
<namespace>_<subsystem>_<name>_<unit>

# Examples
http_requests_total           # Counter: total HTTP requests
http_request_duration_seconds # Histogram: request latency
process_resident_memory_bytes # Gauge: memory usage
db_connections_active         # Gauge: active database connections
```

Key rules:
- Use snake_case
- Include the unit as a suffix (bytes, seconds, total)
- Use `_total` suffix for counters
- Keep names descriptive but concise

## Python Instrumentation

### Setting Up the Prometheus Client

```python
# requirements.txt
prometheus-client==0.19.0
flask==3.0.0
```

```python
# app.py - Flask application with Prometheus metrics
from flask import Flask, request
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST
)
import time
import psutil

app = Flask(__name__)

# Define metrics
# Counter: tracks total number of requests
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Histogram: tracks request duration distribution
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# Gauge: tracks current values
active_requests = Gauge(
    'http_active_requests',
    'Number of active HTTP requests'
)

# System metrics gauge
memory_usage_bytes = Gauge(
    'app_memory_usage_bytes',
    'Application memory usage in bytes'
)


def record_request_metrics(method, endpoint, status, duration):
    """Record metrics for a completed request."""
    http_requests_total.labels(
        method=method,
        endpoint=endpoint,
        status=status
    ).inc()

    http_request_duration_seconds.labels(
        method=method,
        endpoint=endpoint
    ).observe(duration)


@app.before_request
def before_request():
    """Track request start time and increment active requests."""
    request.start_time = time.time()
    active_requests.inc()


@app.after_request
def after_request(response):
    """Record metrics after request completes."""
    duration = time.time() - request.start_time
    active_requests.dec()

    record_request_metrics(
        method=request.method,
        endpoint=request.endpoint or 'unknown',
        status=response.status_code,
        duration=duration
    )

    return response


@app.route('/metrics')
def metrics():
    """Expose Prometheus metrics endpoint."""
    # Update memory gauge before returning metrics
    memory_usage_bytes.set(psutil.Process().memory_info().rss)
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}


@app.route('/api/users')
def get_users():
    """Example API endpoint."""
    # Simulate some work
    time.sleep(0.1)
    return {'users': ['alice', 'bob']}


@app.route('/api/orders', methods=['POST'])
def create_order():
    """Example API endpoint."""
    time.sleep(0.2)
    return {'order_id': '12345'}, 201


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### Creating Custom Business Metrics

```python
# business_metrics.py - Custom business-specific metrics
from prometheus_client import Counter, Gauge, Histogram

# Business metrics
orders_created_total = Counter(
    'orders_created_total',
    'Total orders created',
    ['payment_method', 'product_category']
)

order_value_dollars = Histogram(
    'order_value_dollars',
    'Order value in dollars',
    buckets=[10, 25, 50, 100, 250, 500, 1000, 2500]
)

inventory_items = Gauge(
    'inventory_items_count',
    'Current inventory count',
    ['product_id', 'warehouse']
)

users_online = Gauge(
    'users_online_total',
    'Number of users currently online'
)


def record_order(payment_method: str, category: str, value: float):
    """Record metrics when an order is created."""
    orders_created_total.labels(
        payment_method=payment_method,
        product_category=category
    ).inc()
    order_value_dollars.observe(value)


def update_inventory(product_id: str, warehouse: str, count: int):
    """Update inventory gauge."""
    inventory_items.labels(
        product_id=product_id,
        warehouse=warehouse
    ).set(count)
```

## Go Instrumentation

```go
// main.go - Go application with Prometheus metrics
package main

import (
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    // Counter for total requests
    httpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    // Histogram for request duration
    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0},
        },
        []string{"method", "endpoint"},
    )

    // Gauge for active connections
    activeConnections = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "http_active_connections",
            Help: "Number of active HTTP connections",
        },
    )

    // Summary for response sizes
    responseSize = promauto.NewSummaryVec(
        prometheus.SummaryOpts{
            Name:       "http_response_size_bytes",
            Help:       "HTTP response size in bytes",
            Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
        },
        []string{"endpoint"},
    )
)

// instrumentHandler wraps an HTTP handler with metrics
func instrumentHandler(endpoint string, handler http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        activeConnections.Inc()
        defer activeConnections.Dec()

        // Create response writer wrapper to capture status code
        wrapper := &responseWrapper{ResponseWriter: w, statusCode: 200}
        handler(wrapper, r)

        duration := time.Since(start).Seconds()

        httpRequestsTotal.WithLabelValues(
            r.Method,
            endpoint,
            http.StatusText(wrapper.statusCode),
        ).Inc()

        httpRequestDuration.WithLabelValues(
            r.Method,
            endpoint,
        ).Observe(duration)
    }
}

type responseWrapper struct {
    http.ResponseWriter
    statusCode int
}

func (w *responseWrapper) WriteHeader(code int) {
    w.statusCode = code
    w.ResponseWriter.WriteHeader(code)
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
    time.Sleep(100 * time.Millisecond) // Simulate work
    w.Write([]byte(`{"users": ["alice", "bob"]}`))
}

func handleOrders(w http.ResponseWriter, r *http.Request) {
    time.Sleep(200 * time.Millisecond) // Simulate work
    w.WriteHeader(http.StatusCreated)
    w.Write([]byte(`{"order_id": "12345"}`))
}

func main() {
    // Application endpoints
    http.HandleFunc("/api/users", instrumentHandler("/api/users", handleUsers))
    http.HandleFunc("/api/orders", instrumentHandler("/api/orders", handleOrders))

    // Prometheus metrics endpoint
    http.Handle("/metrics", promhttp.Handler())

    http.ListenAndServe(":8080", nil)
}
```

## Node.js Instrumentation

```javascript
// app.js - Express application with Prometheus metrics
const express = require('express');
const promClient = require('prom-client');

const app = express();

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
  registers: [register],
});

const activeRequests = new promClient.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  registers: [register],
});

// Business metrics
const ordersCreated = new promClient.Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['payment_method'],
  registers: [register],
});

// Middleware to track request metrics
app.use((req, res, next) => {
  const start = Date.now();
  activeRequests.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    activeRequests.dec();

    httpRequestsTotal.inc({
      method: req.method,
      endpoint: req.route?.path || req.path,
      status: res.statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        endpoint: req.route?.path || req.path,
      },
      duration
    );
  });

  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Application endpoints
app.get('/api/users', (req, res) => {
  setTimeout(() => {
    res.json({ users: ['alice', 'bob'] });
  }, 100);
});

app.post('/api/orders', (req, res) => {
  // Record business metric
  ordersCreated.inc({ payment_method: 'credit_card' });

  setTimeout(() => {
    res.status(201).json({ order_id: '12345' });
  }, 200);
});

app.listen(8080, () => {
  console.log('Server running on port 8080');
});
```

## Prometheus Scrape Configuration

Configure Prometheus to scrape your application:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'my-application'
    static_configs:
      - targets: ['app:8080']
    metrics_path: /metrics
    scrape_interval: 15s
    scrape_timeout: 10s

  # For Kubernetes service discovery
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Only scrape pods with prometheus.io/scrape annotation
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      # Use custom metrics path if specified
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      # Use custom port if specified
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
```

## Architecture Overview

```mermaid
graph LR
    subgraph "Application"
        APP[Application Code]
        LIB[Prometheus Client Library]
        EP[/metrics Endpoint]
    end

    subgraph "Prometheus"
        SC[Scraper]
        TSDB[Time Series DB]
        QE[Query Engine]
    end

    subgraph "Visualization"
        GR[Grafana]
        AL[Alertmanager]
    end

    APP -->|increment/observe| LIB
    LIB -->|expose| EP
    SC -->|pull| EP
    SC -->|store| TSDB
    TSDB -->|query| QE
    QE -->|visualize| GR
    QE -->|alert| AL
```

## Best Practices

### 1. Use Appropriate Metric Types

```python
# Good: Counter for events that only increase
errors_total = Counter('errors_total', 'Total errors')

# Good: Gauge for current state
queue_size = Gauge('queue_size', 'Current queue size')

# Good: Histogram for latency distribution
request_duration = Histogram('request_duration_seconds', 'Request duration')
```

### 2. Limit Label Cardinality

```python
# Bad: High cardinality label (user_id can have millions of values)
requests = Counter('requests_total', 'Requests', ['user_id'])

# Good: Low cardinality labels
requests = Counter('requests_total', 'Requests', ['method', 'status'])
```

### 3. Initialize Labels

```python
# Initialize all label combinations to avoid missing metrics
http_requests_total.labels(method='GET', status='200')
http_requests_total.labels(method='GET', status='500')
http_requests_total.labels(method='POST', status='200')
http_requests_total.labels(method='POST', status='500')
```

### 4. Use Meaningful Bucket Boundaries

```python
# Align buckets with SLO thresholds
duration_histogram = Histogram(
    'http_request_duration_seconds',
    'Request duration',
    buckets=[
        0.010,  # 10ms
        0.050,  # 50ms
        0.100,  # 100ms - typical SLO threshold
        0.300,  # 300ms - degraded performance
        0.500,  # 500ms
        1.000,  # 1 second
        2.000,  # 2 seconds - timeout threshold
    ]
)
```

### 5. Document Your Metrics

```python
# Include clear help text
requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests processed. Excludes health check endpoints. '
    'Labels: method (HTTP method), status (response status code), '
    'endpoint (API endpoint path).',
    ['method', 'status', 'endpoint']
)
```

## Common Pitfalls to Avoid

1. **Using timestamps in labels**: Labels should be low cardinality
2. **Creating metrics dynamically**: Define all metrics at startup
3. **Missing error handling**: Ensure metrics code does not break the application
4. **Exposing sensitive data**: Never include PII in metric labels
5. **Over-instrumenting**: Focus on metrics that drive decisions

## Conclusion

Effective application instrumentation starts with understanding what to measure. Use counters for events, gauges for states, and histograms for distributions. Keep label cardinality low, follow naming conventions, and choose bucket boundaries that align with your SLOs. Well-designed metrics enable meaningful dashboards, reliable alerts, and data-driven optimization.
