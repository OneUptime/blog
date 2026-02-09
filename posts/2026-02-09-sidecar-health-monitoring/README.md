# How to Use Sidecar Containers for Application Health Monitoring and Reporting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar, Monitoring

Description: Learn how to implement sidecar containers that monitor application health, collect metrics, and report status to external monitoring systems without modifying application code.

---

Application health monitoring is essential for maintaining service reliability, but embedding monitoring logic directly in your application creates tight coupling and complexity. Sidecar containers provide an elegant solution by handling health checks, metrics collection, and status reporting independently from your core application logic.

This pattern allows you to standardize monitoring across heterogeneous applications, update monitoring logic without rebuilding app containers, and implement sophisticated health checking that goes beyond simple HTTP endpoint polling.

## Understanding Sidecar-Based Health Monitoring

Traditional Kubernetes health checks are limited to basic HTTP, TCP, or command execution probes. While these work for simple scenarios, complex applications often need deeper health validation, custom logic, or integration with external monitoring systems.

Sidecar health monitors run continuously alongside your application, performing sophisticated checks like database connectivity validation, queue depth monitoring, or custom business logic validation. They can aggregate multiple signals and make intelligent decisions about application health.

The sidecar pattern also enables standardized monitoring across different application types. Whether you're running Python, Go, Java, or Node.js applications, the same monitoring sidecar can handle health reporting consistently.

## Basic Health Monitoring Sidecar

Let's start with a simple sidecar that monitors application health and exposes metrics.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: health-monitor-config
  namespace: default
data:
  monitor.py: |
    #!/usr/bin/env python3
    import requests
    import time
    import sys
    from prometheus_client import start_http_server, Gauge, Counter

    # Prometheus metrics
    health_status = Gauge('app_health_status', 'Application health status (1=healthy, 0=unhealthy)')
    health_check_total = Counter('app_health_check_total', 'Total number of health checks performed')
    health_check_failures = Counter('app_health_check_failures', 'Number of failed health checks')
    response_time = Gauge('app_health_check_response_time_seconds', 'Health check response time')

    APP_URL = "http://localhost:8080/health"
    CHECK_INTERVAL = 10
    UNHEALTHY_THRESHOLD = 3

    consecutive_failures = 0

    def check_health():
        global consecutive_failures

        try:
            start = time.time()
            response = requests.get(APP_URL, timeout=5)
            duration = time.time() - start

            response_time.set(duration)
            health_check_total.inc()

            if response.status_code == 200:
                data = response.json()

                # Check additional health indicators
                if data.get('database') == 'connected' and data.get('cache') == 'available':
                    health_status.set(1)
                    consecutive_failures = 0
                    print(f"Health check passed (response time: {duration:.3f}s)")
                    return True
                else:
                    print(f"Health check failed: unhealthy dependencies")
                    consecutive_failures += 1
                    health_check_failures.inc()
            else:
                print(f"Health check failed: HTTP {response.status_code}")
                consecutive_failures += 1
                health_check_failures.inc()

        except Exception as e:
            print(f"Health check failed: {str(e)}")
            consecutive_failures += 1
            health_check_failures.inc()

        if consecutive_failures >= UNHEALTHY_THRESHOLD:
            health_status.set(0)
            print(f"Application unhealthy after {consecutive_failures} consecutive failures")

        return False

    if __name__ == '__main__':
        # Start Prometheus metrics server
        start_http_server(9090)
        print("Health monitor started, exposing metrics on :9090")

        while True:
            check_health()
            time.sleep(CHECK_INTERVAL)
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitored-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: monitored-app
  template:
    metadata:
      labels:
        app: monitored-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      # Main application
      - name: app
        image: myorg/web-app:v1.0.0
        ports:
        - containerPort: 8080
          name: http
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      # Health monitoring sidecar
      - name: health-monitor
        image: python:3.11-slim
        command:
        - sh
        - -c
        - |
          pip install requests prometheus-client --quiet
          python /config/monitor.py
        ports:
        - containerPort: 9090
          name: metrics
        volumeMounts:
        - name: monitor-config
          mountPath: /config
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /metrics
            port: 9090
          initialDelaySeconds: 10
          periodSeconds: 10

      volumes:
      - name: monitor-config
        configMap:
          name: health-monitor-config
          defaultMode: 0755
```

This sidecar performs continuous health monitoring, tracks response times, and exposes Prometheus metrics. It implements smarter logic than Kubernetes' built-in probes by checking multiple health indicators.

## Advanced Multi-Dimensional Health Checking

Complex applications have multiple components that need individual monitoring. This example shows a sidecar that checks database, cache, message queue, and external API health.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: comprehensive-health-monitor
  namespace: default
data:
  health-checker.go: |
    package main

    import (
        "context"
        "database/sql"
        "encoding/json"
        "fmt"
        "log"
        "net/http"
        "os"
        "time"

        "github.com/go-redis/redis/v8"
        _ "github.com/lib/pq"
        "github.com/prometheus/client_golang/prometheus"
        "github.com/prometheus/client_golang/prometheus/promhttp"
    )

    var (
        healthStatus = prometheus.NewGaugeVec(
            prometheus.GaugeOpts{
                Name: "component_health_status",
                Help: "Health status of application components",
            },
            []string{"component"},
        )

        checkDuration = prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Name: "health_check_duration_seconds",
                Help: "Duration of health checks",
            },
            []string{"component"},
        )
    )

    type HealthChecker struct {
        db          *sql.DB
        redis       *redis.Client
        queueURL    string
        externalAPI string
    }

    func (h *HealthChecker) checkDatabase(ctx context.Context) bool {
        start := time.Now()
        defer func() {
            checkDuration.WithLabelValues("database").Observe(time.Since(start).Seconds())
        }()

        ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
        defer cancel()

        if err := h.db.PingContext(ctx); err != nil {
            log.Printf("Database health check failed: %v", err)
            healthStatus.WithLabelValues("database").Set(0)
            return false
        }

        // Check if we can execute queries
        var count int
        err := h.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM pg_stat_activity").Scan(&count)
        if err != nil {
            log.Printf("Database query failed: %v", err)
            healthStatus.WithLabelValues("database").Set(0)
            return false
        }

        healthStatus.WithLabelValues("database").Set(1)
        return true
    }

    func (h *HealthChecker) checkRedis(ctx context.Context) bool {
        start := time.Now()
        defer func() {
            checkDuration.WithLabelValues("redis").Observe(time.Since(start).Seconds())
        }()

        ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
        defer cancel()

        if err := h.redis.Ping(ctx).Err(); err != nil {
            log.Printf("Redis health check failed: %v", err)
            healthStatus.WithLabelValues("redis").Set(0)
            return false
        }

        // Test set/get operation
        testKey := "health-check-test"
        if err := h.redis.Set(ctx, testKey, "ok", 10*time.Second).Err(); err != nil {
            log.Printf("Redis write failed: %v", err)
            healthStatus.WithLabelValues("redis").Set(0)
            return false
        }

        healthStatus.WithLabelValues("redis").Set(1)
        return true
    }

    func (h *HealthChecker) checkMessageQueue(ctx context.Context) bool {
        start := time.Now()
        defer func() {
            checkDuration.WithLabelValues("queue").Observe(time.Since(start).Seconds())
        }()

        client := &http.Client{Timeout: 5 * time.Second}
        req, _ := http.NewRequestWithContext(ctx, "GET", h.queueURL+"/health", nil)

        resp, err := client.Do(req)
        if err != nil {
            log.Printf("Queue health check failed: %v", err)
            healthStatus.WithLabelValues("queue").Set(0)
            return false
        }
        defer resp.Body.Close()

        if resp.StatusCode != 200 {
            log.Printf("Queue unhealthy: status %d", resp.StatusCode)
            healthStatus.WithLabelValues("queue").Set(0)
            return false
        }

        healthStatus.WithLabelValues("queue").Set(1)
        return true
    }

    func (h *HealthChecker) checkExternalAPI(ctx context.Context) bool {
        start := time.Now()
        defer func() {
            checkDuration.WithLabelValues("external_api").Observe(time.Since(start).Seconds())
        }()

        client := &http.Client{Timeout: 10 * time.Second}
        req, _ := http.NewRequestWithContext(ctx, "GET", h.externalAPI+"/status", nil)

        resp, err := client.Do(req)
        if err != nil {
            log.Printf("External API health check failed: %v", err)
            healthStatus.WithLabelValues("external_api").Set(0)
            return false
        }
        defer resp.Body.Close()

        if resp.StatusCode != 200 {
            healthStatus.WithLabelValues("external_api").Set(0)
            return false
        }

        healthStatus.WithLabelValues("external_api").Set(1)
        return true
    }

    func (h *HealthChecker) runChecks() {
        ctx := context.Background()

        h.checkDatabase(ctx)
        h.checkRedis(ctx)
        h.checkMessageQueue(ctx)
        h.checkExternalAPI(ctx)
    }

    func main() {
        prometheus.MustRegister(healthStatus)
        prometheus.MustRegister(checkDuration)

        // Initialize connections
        db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
        if err != nil {
            log.Fatalf("Failed to connect to database: %v", err)
        }

        redisClient := redis.NewClient(&redis.Options{
            Addr: os.Getenv("REDIS_ADDR"),
        })

        checker := &HealthChecker{
            db:          db,
            redis:       redisClient,
            queueURL:    os.Getenv("QUEUE_URL"),
            externalAPI: os.Getenv("EXTERNAL_API_URL"),
        }

        // Start metrics server
        http.Handle("/metrics", promhttp.Handler())
        go http.ListenAndServe(":9090", nil)

        // Run health checks periodically
        ticker := time.NewTicker(15 * time.Second)
        for range ticker.C {
            checker.runChecks()
        }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: comprehensive-monitored-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: comprehensive-app
  template:
    metadata:
      labels:
        app: comprehensive-app
    spec:
      containers:
      - name: app
        image: myorg/complex-app:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_ADDR
          value: "redis.default.svc.cluster.local:6379"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"

      - name: health-monitor
        image: golang:1.21-alpine
        command:
        - sh
        - -c
        - |
          apk add --no-cache git
          cd /app
          go mod init health-checker
          go get github.com/go-redis/redis/v8
          go get github.com/lib/pq
          go get github.com/prometheus/client_golang/prometheus
          go get github.com/prometheus/client_golang/prometheus/promhttp
          go run /config/health-checker.go
        ports:
        - containerPort: 9090
          name: metrics
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_ADDR
          value: "redis.default.svc.cluster.local:6379"
        - name: QUEUE_URL
          value: "http://rabbitmq.default.svc.cluster.local:15672"
        - name: EXTERNAL_API_URL
          value: "https://api.external-service.com"
        volumeMounts:
        - name: monitor-config
          mountPath: /config
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

      volumes:
      - name: monitor-config
        configMap:
          name: comprehensive-health-monitor
```

This sidecar performs comprehensive health checks across multiple components, providing granular visibility into application dependencies.

## Integration with External Monitoring Systems

Sidecars can report health status to external monitoring platforms like Datadog, New Relic, or custom systems.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: external-reporter-config
  namespace: default
data:
  reporter.sh: |
    #!/bin/sh
    set -e

    APP_HEALTH_URL="http://localhost:8080/health"
    DATADOG_API_URL="https://api.datadoghq.com/api/v1/series"
    CHECK_INTERVAL=30

    while true; do
      # Check application health
      if response=$(curl -s -w "%{http_code}" -o /tmp/health.json "$APP_HEALTH_URL"); then
        http_code=$(tail -n1 <<< "$response")

        if [ "$http_code" = "200" ]; then
          health_value=1
          status="healthy"
        else
          health_value=0
          status="unhealthy"
        fi
      else
        health_value=0
        status="error"
      fi

      # Send to Datadog
      timestamp=$(date +%s)
      payload=$(cat <<EOF
    {
      "series": [
        {
          "metric": "custom.app.health_status",
          "points": [[$timestamp, $health_value]],
          "type": "gauge",
          "host": "${POD_NAME}",
          "tags": [
            "app:${APP_NAME}",
            "namespace:${POD_NAMESPACE}",
            "environment:${ENVIRONMENT}"
          ]
        }
      ]
    }
    EOF
    )

      curl -X POST "$DATADOG_API_URL" \
        -H "Content-Type: application/json" \
        -H "DD-API-KEY: ${DATADOG_API_KEY}" \
        -d "$payload"

      echo "Reported health status: $status (value: $health_value)"

      sleep $CHECK_INTERVAL
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: externally-monitored-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: externally-monitored
  template:
    metadata:
      labels:
        app: externally-monitored
    spec:
      containers:
      - name: app
        image: myorg/app:v1.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      - name: health-reporter
        image: alpine:3.18
        command:
        - sh
        - /config/reporter.sh
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: APP_NAME
          value: "externally-monitored-app"
        - name: ENVIRONMENT
          value: "production"
        - name: DATADOG_API_KEY
          valueFrom:
            secretKeyRef:
              name: datadog-credentials
              key: api-key
        volumeMounts:
        - name: reporter-config
          mountPath: /config
        resources:
          requests:
            memory: "32Mi"
            cpu: "25m"
          limits:
            memory: "64Mi"
            cpu: "50m"

      volumes:
      - name: reporter-config
        configMap:
          name: external-reporter-config
          defaultMode: 0755
```

This sidecar continuously checks application health and reports metrics to Datadog, enabling centralized monitoring across your infrastructure.

## Custom Business Logic Health Checks

Sometimes health depends on business-specific conditions like queue depth, pending jobs, or data freshness.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: business-health-monitor
  namespace: default
data:
  business-health.py: |
    #!/usr/bin/env python3
    import psycopg2
    import redis
    import time
    from datetime import datetime, timedelta
    from prometheus_client import start_http_server, Gauge

    # Metrics
    queue_depth = Gauge('business_queue_depth', 'Number of pending jobs in queue')
    data_freshness = Gauge('business_data_freshness_seconds', 'Age of most recent data')
    processing_rate = Gauge('business_processing_rate', 'Jobs processed per minute')
    overall_health = Gauge('business_health_score', 'Overall business health score 0-100')

    def check_queue_depth(redis_client):
        try:
            depth = redis_client.llen('job_queue')
            queue_depth.set(depth)

            # Unhealthy if queue backing up
            if depth > 10000:
                return 0
            elif depth > 5000:
                return 50
            else:
                return 100
        except Exception as e:
            print(f"Queue check failed: {e}")
            return 0

    def check_data_freshness(db_conn):
        try:
            cursor = db_conn.cursor()
            cursor.execute("SELECT MAX(updated_at) FROM critical_data")
            last_update = cursor.fetchone()[0]

            if last_update:
                age = (datetime.now() - last_update).total_seconds()
                data_freshness.set(age)

                # Data should be updated at least every 5 minutes
                if age > 300:
                    return 0
                elif age > 180:
                    return 50
                else:
                    return 100
            else:
                return 0
        except Exception as e:
            print(f"Freshness check failed: {e}")
            return 0

    def check_processing_rate(redis_client):
        try:
            rate = int(redis_client.get('jobs_processed_last_minute') or 0)
            processing_rate.set(rate)

            # Expect at least 100 jobs/minute
            if rate < 50:
                return 0
            elif rate < 100:
                return 50
            else:
                return 100
        except Exception as e:
            print(f"Rate check failed: {e}")
            return 0

    def main():
        start_http_server(9090)

        db = psycopg2.connect(
            host="postgres.default.svc.cluster.local",
            database="production",
            user="app",
            password="password"
        )

        r = redis.Redis(host='redis.default.svc.cluster.local', port=6379)

        while True:
            queue_score = check_queue_depth(r)
            freshness_score = check_data_freshness(db)
            rate_score = check_processing_rate(r)

            # Calculate weighted health score
            health_score = (queue_score * 0.4 + freshness_score * 0.3 + rate_score * 0.3)
            overall_health.set(health_score)

            print(f"Health score: {health_score:.1f} (queue:{queue_score}, fresh:{freshness_score}, rate:{rate_score})")

            time.sleep(30)

    if __name__ == '__main__':
        main()
```

This monitor implements custom business logic to determine application health based on operational metrics rather than just technical availability.

## Conclusion

Sidecar containers provide a powerful pattern for implementing sophisticated application health monitoring without modifying your core application code. Whether you need simple health checks, multi-dimensional dependency monitoring, integration with external monitoring systems, or custom business logic validation, sidecars handle these concerns independently. This separation enables standardized monitoring across heterogeneous applications, simplifies updates to monitoring logic, and provides richer health signals than basic Kubernetes probes alone.
