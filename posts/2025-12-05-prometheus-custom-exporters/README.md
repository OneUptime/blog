# How to Build Custom Exporters for Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Exporters, Custom Metrics, Go, Python, Monitoring, Observability

Description: Learn how to build custom Prometheus exporters to expose metrics from applications and systems that do not have native Prometheus support.

---

Not every system exposes Prometheus-compatible metrics natively. Custom exporters bridge this gap by translating metrics from various sources into Prometheus format. This guide shows you how to build exporters in Go and Python.

## Exporter Architecture

```mermaid
graph LR
    subgraph External System
        DB[(Database)]
        API[REST API]
        LOG[Log Files]
    end

    subgraph Custom Exporter
        C[Collector]
        M[Metrics Registry]
        H[HTTP Server]
    end

    P[Prometheus]

    DB --> C
    API --> C
    LOG --> C
    C --> M
    M --> H
    H --> P
```

## Exporter Design Principles

1. **Expose metrics on /metrics endpoint** - Standard convention
2. **Include a health check** - Helps with monitoring the exporter itself
3. **Use appropriate metric types** - Counter, Gauge, Histogram, Summary
4. **Follow naming conventions** - `namespace_subsystem_name_unit`
5. **Include useful labels** - But avoid high cardinality

## Building an Exporter in Go

### Basic Structure

```go
package main

import (
    "log"
    "net/http"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// Collector implements prometheus.Collector interface
type MyCollector struct {
    upMetric         *prometheus.Desc
    requestsMetric   *prometheus.Desc
    latencyMetric    *prometheus.Desc
}

func NewMyCollector() *MyCollector {
    return &MyCollector{
        upMetric: prometheus.NewDesc(
            "myservice_up",
            "Whether the service is up",
            []string{"instance"},
            nil,
        ),
        requestsMetric: prometheus.NewDesc(
            "myservice_requests_total",
            "Total number of requests",
            []string{"instance", "method", "status"},
            nil,
        ),
        latencyMetric: prometheus.NewDesc(
            "myservice_request_duration_seconds",
            "Request latency in seconds",
            []string{"instance", "method"},
            nil,
        ),
    }
}

// Describe sends metric descriptions to the channel
func (c *MyCollector) Describe(ch chan<- *prometheus.Desc) {
    ch <- c.upMetric
    ch <- c.requestsMetric
    ch <- c.latencyMetric
}

// Collect fetches metrics and sends them to the channel
func (c *MyCollector) Collect(ch chan<- prometheus.Metric) {
    // Fetch data from your source
    instances := fetchInstances()

    for _, inst := range instances {
        // Up metric (gauge)
        ch <- prometheus.MustNewConstMetric(
            c.upMetric,
            prometheus.GaugeValue,
            float64(inst.IsUp),
            inst.Name,
        )

        // Requests metric (counter)
        for method, counts := range inst.RequestCounts {
            for status, count := range counts {
                ch <- prometheus.MustNewConstMetric(
                    c.requestsMetric,
                    prometheus.CounterValue,
                    float64(count),
                    inst.Name, method, status,
                )
            }
        }
    }
}

func main() {
    collector := NewMyCollector()
    prometheus.MustRegister(collector)

    http.Handle("/metrics", promhttp.Handler())
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })

    log.Println("Starting exporter on :9090")
    log.Fatal(http.ListenAndServe(":9090", nil))
}
```

### Complete Database Exporter Example

```go
package main

import (
    "database/sql"
    "log"
    "net/http"
    "time"

    _ "github.com/lib/pq"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

type PostgresCollector struct {
    db *sql.DB

    connectionCount     *prometheus.Desc
    activeQueries       *prometheus.Desc
    databaseSize        *prometheus.Desc
    tableRowCount       *prometheus.Desc
    replicationLag      *prometheus.Desc
    scrapeSuccess       *prometheus.Desc
    scrapeDuration      *prometheus.Desc
}

func NewPostgresCollector(dsn string) (*PostgresCollector, error) {
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, err
    }

    return &PostgresCollector{
        db: db,
        connectionCount: prometheus.NewDesc(
            "postgres_connections_total",
            "Number of database connections",
            []string{"state"},
            nil,
        ),
        activeQueries: prometheus.NewDesc(
            "postgres_active_queries",
            "Number of currently active queries",
            []string{"database"},
            nil,
        ),
        databaseSize: prometheus.NewDesc(
            "postgres_database_size_bytes",
            "Database size in bytes",
            []string{"database"},
            nil,
        ),
        tableRowCount: prometheus.NewDesc(
            "postgres_table_rows_total",
            "Estimated number of rows in table",
            []string{"database", "schema", "table"},
            nil,
        ),
        replicationLag: prometheus.NewDesc(
            "postgres_replication_lag_seconds",
            "Replication lag in seconds",
            []string{"client_addr"},
            nil,
        ),
        scrapeSuccess: prometheus.NewDesc(
            "postgres_exporter_scrape_success",
            "Whether the scrape was successful",
            nil,
            nil,
        ),
        scrapeDuration: prometheus.NewDesc(
            "postgres_exporter_scrape_duration_seconds",
            "Duration of the scrape",
            nil,
            nil,
        ),
    }, nil
}

func (c *PostgresCollector) Describe(ch chan<- *prometheus.Desc) {
    ch <- c.connectionCount
    ch <- c.activeQueries
    ch <- c.databaseSize
    ch <- c.tableRowCount
    ch <- c.replicationLag
    ch <- c.scrapeSuccess
    ch <- c.scrapeDuration
}

func (c *PostgresCollector) Collect(ch chan<- prometheus.Metric) {
    start := time.Now()
    success := 1.0

    // Collect connection stats
    if err := c.collectConnections(ch); err != nil {
        log.Printf("Error collecting connections: %v", err)
        success = 0
    }

    // Collect database sizes
    if err := c.collectDatabaseSizes(ch); err != nil {
        log.Printf("Error collecting database sizes: %v", err)
        success = 0
    }

    // Collect active queries
    if err := c.collectActiveQueries(ch); err != nil {
        log.Printf("Error collecting active queries: %v", err)
        success = 0
    }

    // Report scrape metrics
    ch <- prometheus.MustNewConstMetric(
        c.scrapeSuccess,
        prometheus.GaugeValue,
        success,
    )
    ch <- prometheus.MustNewConstMetric(
        c.scrapeDuration,
        prometheus.GaugeValue,
        time.Since(start).Seconds(),
    )
}

func (c *PostgresCollector) collectConnections(ch chan<- prometheus.Metric) error {
    query := `
        SELECT state, count(*)
        FROM pg_stat_activity
        WHERE state IS NOT NULL
        GROUP BY state
    `
    rows, err := c.db.Query(query)
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var state string
        var count int64
        if err := rows.Scan(&state, &count); err != nil {
            return err
        }
        ch <- prometheus.MustNewConstMetric(
            c.connectionCount,
            prometheus.GaugeValue,
            float64(count),
            state,
        )
    }
    return rows.Err()
}

func (c *PostgresCollector) collectDatabaseSizes(ch chan<- prometheus.Metric) error {
    query := `
        SELECT datname, pg_database_size(datname)
        FROM pg_database
        WHERE datistemplate = false
    `
    rows, err := c.db.Query(query)
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var dbName string
        var size int64
        if err := rows.Scan(&dbName, &size); err != nil {
            return err
        }
        ch <- prometheus.MustNewConstMetric(
            c.databaseSize,
            prometheus.GaugeValue,
            float64(size),
            dbName,
        )
    }
    return rows.Err()
}

func (c *PostgresCollector) collectActiveQueries(ch chan<- prometheus.Metric) error {
    query := `
        SELECT datname, count(*)
        FROM pg_stat_activity
        WHERE state = 'active'
        GROUP BY datname
    `
    rows, err := c.db.Query(query)
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var dbName string
        var count int64
        if err := rows.Scan(&dbName, &count); err != nil {
            return err
        }
        ch <- prometheus.MustNewConstMetric(
            c.activeQueries,
            prometheus.GaugeValue,
            float64(count),
            dbName,
        )
    }
    return rows.Err()
}

func main() {
    dsn := "postgres://user:password@localhost:5432/postgres?sslmode=disable"

    collector, err := NewPostgresCollector(dsn)
    if err != nil {
        log.Fatalf("Failed to create collector: %v", err)
    }

    prometheus.MustRegister(collector)

    http.Handle("/metrics", promhttp.Handler())
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    log.Println("Starting postgres exporter on :9187")
    log.Fatal(http.ListenAndServe(":9187", nil))
}
```

## Building an Exporter in Python

### Basic Structure

```python
from prometheus_client import start_http_server, Gauge, Counter, Histogram, REGISTRY
from prometheus_client.core import GaugeMetricFamily, CounterMetricFamily, REGISTRY
import time
import requests

class MyCollector:
    def __init__(self, api_url):
        self.api_url = api_url

    def collect(self):
        # Gauge metric
        up_metric = GaugeMetricFamily(
            'myservice_up',
            'Whether the service is up',
            labels=['instance']
        )

        # Counter metric
        requests_metric = CounterMetricFamily(
            'myservice_requests_total',
            'Total number of requests',
            labels=['instance', 'method', 'status']
        )

        try:
            response = requests.get(f"{self.api_url}/stats", timeout=5)
            data = response.json()

            for instance in data['instances']:
                up_metric.add_metric(
                    [instance['name']],
                    1 if instance['healthy'] else 0
                )

                for method, counts in instance['requests'].items():
                    for status, count in counts.items():
                        requests_metric.add_metric(
                            [instance['name'], method, status],
                            count
                        )

        except Exception as e:
            print(f"Error collecting metrics: {e}")

        yield up_metric
        yield requests_metric

if __name__ == '__main__':
    REGISTRY.register(MyCollector('http://myservice:8080'))
    start_http_server(9090)
    print("Exporter running on :9090")
    while True:
        time.sleep(1)
```

### Complete API Exporter Example

```python
#!/usr/bin/env python3
import time
import requests
import argparse
from prometheus_client import start_http_server
from prometheus_client.core import (
    GaugeMetricFamily,
    CounterMetricFamily,
    HistogramMetricFamily,
    REGISTRY
)

class APICollector:
    def __init__(self, api_base_url, api_key=None):
        self.api_base_url = api_base_url
        self.headers = {'Authorization': f'Bearer {api_key}'} if api_key else {}

    def collect(self):
        # Scrape metrics
        scrape_start = time.time()
        scrape_success = True

        try:
            metrics = self._fetch_metrics()
        except Exception as e:
            print(f"Failed to fetch metrics: {e}")
            scrape_success = False
            metrics = {}

        scrape_duration = time.time() - scrape_start

        # Yield scrape metadata
        scrape_success_metric = GaugeMetricFamily(
            'api_exporter_scrape_success',
            'Whether the last scrape was successful'
        )
        scrape_success_metric.add_metric([], 1 if scrape_success else 0)
        yield scrape_success_metric

        scrape_duration_metric = GaugeMetricFamily(
            'api_exporter_scrape_duration_seconds',
            'Duration of the last scrape'
        )
        scrape_duration_metric.add_metric([], scrape_duration)
        yield scrape_duration_metric

        if not scrape_success:
            return

        # Service health
        health_metric = GaugeMetricFamily(
            'api_service_healthy',
            'Whether the service is healthy',
            labels=['service', 'region']
        )
        for service in metrics.get('services', []):
            health_metric.add_metric(
                [service['name'], service['region']],
                1 if service['healthy'] else 0
            )
        yield health_metric

        # Request counts
        requests_metric = CounterMetricFamily(
            'api_requests_total',
            'Total API requests',
            labels=['endpoint', 'method', 'status_code']
        )
        for endpoint in metrics.get('endpoints', []):
            for status, count in endpoint.get('status_counts', {}).items():
                requests_metric.add_metric(
                    [endpoint['path'], endpoint['method'], str(status)],
                    count
                )
        yield requests_metric

        # Response time histogram
        latency_metric = HistogramMetricFamily(
            'api_request_duration_seconds',
            'Request duration histogram',
            labels=['endpoint']
        )
        for endpoint in metrics.get('endpoints', []):
            if 'latency_histogram' in endpoint:
                hist = endpoint['latency_histogram']
                latency_metric.add_metric(
                    [endpoint['path']],
                    buckets=list(zip(hist['bounds'], hist['counts'])),
                    sum_value=hist['sum'],
                    gsum_value=hist['count']
                )
        yield latency_metric

        # Active connections
        connections_metric = GaugeMetricFamily(
            'api_active_connections',
            'Number of active connections',
            labels=['pool']
        )
        for pool in metrics.get('connection_pools', []):
            connections_metric.add_metric(
                [pool['name']],
                pool['active']
            )
        yield connections_metric

        # Queue depth
        queue_metric = GaugeMetricFamily(
            'api_queue_depth',
            'Number of items in queue',
            labels=['queue']
        )
        for queue in metrics.get('queues', []):
            queue_metric.add_metric(
                [queue['name']],
                queue['depth']
            )
        yield queue_metric

    def _fetch_metrics(self):
        response = requests.get(
            f"{self.api_base_url}/internal/metrics",
            headers=self.headers,
            timeout=10
        )
        response.raise_for_status()
        return response.json()

def main():
    parser = argparse.ArgumentParser(description='API Metrics Exporter')
    parser.add_argument('--api-url', required=True, help='Base URL of the API')
    parser.add_argument('--api-key', help='API key for authentication')
    parser.add_argument('--port', type=int, default=9090, help='Exporter port')
    args = parser.parse_args()

    REGISTRY.register(APICollector(args.api_url, args.api_key))
    start_http_server(args.port)
    print(f"API exporter running on :{args.port}")

    while True:
        time.sleep(1)

if __name__ == '__main__':
    main()
```

## Dockerfile for Exporter

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY exporter.py .

EXPOSE 9090

CMD ["python", "exporter.py", "--api-url", "http://api:8080"]
```

```
# requirements.txt
prometheus-client==0.19.0
requests==2.31.0
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: custom-exporter
  template:
    metadata:
      labels:
        app: custom-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
        - name: exporter
          image: myregistry/custom-exporter:latest
          ports:
            - containerPort: 9090
          env:
            - name: API_URL
              value: "http://myservice:8080"
            - name: API_KEY
              valueFrom:
                secretKeyRef:
                  name: api-credentials
                  key: api-key
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
          livenessProbe:
            httpGet:
              path: /health
              port: 9090
            initialDelaySeconds: 5
          readinessProbe:
            httpGet:
              path: /health
              port: 9090
---
apiVersion: v1
kind: Service
metadata:
  name: custom-exporter
  namespace: monitoring
spec:
  selector:
    app: custom-exporter
  ports:
    - port: 9090
      targetPort: 9090
```

## Testing Your Exporter

```bash
# Start the exporter
./exporter --api-url http://localhost:8080

# Test metrics endpoint
curl http://localhost:9090/metrics

# Verify specific metrics
curl -s http://localhost:9090/metrics | grep myservice_up

# Check health endpoint
curl http://localhost:9090/health
```

## Best Practices

1. **Include scrape metadata**: Always expose scrape success and duration
2. **Handle errors gracefully**: Do not crash on temporary failures
3. **Set timeouts**: Prevent hanging connections
4. **Use connection pooling**: For database exporters
5. **Document your metrics**: Include HELP and TYPE annotations

## Conclusion

Custom exporters let you monitor any system with Prometheus. Follow the collector pattern, expose standard metric types, and include operational metadata for debugging. Start simple and iterate based on what metrics prove useful. OneUptime can ingest metrics from any Prometheus-compatible exporter, providing unified observability alongside logs and traces.
