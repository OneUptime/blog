# How to Implement Readiness Probes to Control Traffic Routing to Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Readiness Probes

Description: Configure Kubernetes readiness probes to control when pods receive traffic, ensuring users only reach healthy backends and enabling zero-downtime deployments.

---

Readiness probes tell Kubernetes whether a container is ready to serve traffic. Unlike liveness probes that restart containers, readiness probes control whether the pod appears in service endpoints. A pod that fails readiness checks stays running but stops receiving requests until it becomes ready again.

This guide shows you how to use readiness probes to implement graceful startup, manage external dependencies, and achieve zero-downtime deployments.

## Understanding Readiness Probes

A readiness probe answers the question: "Is this container ready to handle requests?" When a readiness probe fails, Kubernetes removes the pod from service endpoints, directing traffic to other healthy pods instead.

The key difference from liveness probes is the action taken. Failed liveness probes trigger restarts, while failed readiness probes simply stop traffic. This makes readiness probes perfect for checking external dependencies that might be temporarily unavailable.

## Basic Readiness Probe Configuration

Configure an HTTP readiness probe:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
        httpHeaders:
        - name: X-Health-Check
          value: readiness
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
      successThreshold: 1
```

This configuration checks readiness every 5 seconds and removes the pod from service after 3 failures.

## Implementing Readiness Check Endpoints

Create a readiness endpoint that checks dependencies:

```go
// Go example
package main

import (
    "database/sql"
    "net/http"
    "time"
)

var db *sql.DB

func main() {
    // Initialize database connection
    db, _ = sql.Open("postgres", "connection-string")

    http.HandleFunc("/ready", readinessHandler)
    http.HandleFunc("/healthz", livenessHandler)
    http.ListenAndServe(":8080", nil)
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
    // Check database connection
    ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
    defer cancel()

    if err := db.PingContext(ctx); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Database unavailable"))
        return
    }

    // Check cache connection
    if !checkRedis() {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Cache unavailable"))
        return
    }

    // All dependencies healthy
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Ready"))
}

func livenessHandler(w http.ResponseWriter, r *http.Request) {
    // Liveness only checks if app itself is alive
    // Don't check dependencies here
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Alive"))
}
```

Notice how readiness checks external dependencies while liveness only checks the application itself.

## Readiness Checks for Database Dependencies

Verify database connectivity before accepting traffic:

```python
# Python Flask example
from flask import Flask, jsonify
import psycopg2
import redis
import time

app = Flask(__name__)

db_pool = None
redis_client = None

def init_dependencies():
    global db_pool, redis_client
    # Initialize database connection pool
    db_pool = psycopg2.pool.SimpleConnectionPool(
        1, 20,
        host="postgres",
        database="myapp",
        user="app",
        password="secret"
    )
    # Initialize Redis client
    redis_client = redis.Redis(host='redis', port=6379)

@app.route('/ready')
def readiness():
    checks = {}

    # Check database
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute('SELECT 1')
        cur.close()
        db_pool.putconn(conn)
        checks['database'] = 'healthy'
    except Exception as e:
        checks['database'] = f'unhealthy: {str(e)}'
        return jsonify(checks), 503

    # Check Redis
    try:
        redis_client.ping()
        checks['cache'] = 'healthy'
    except Exception as e:
        checks['cache'] = f'unhealthy: {str(e)}'
        return jsonify(checks), 503

    # All dependencies ready
    return jsonify(checks), 200

@app.route('/healthz')
def liveness():
    # Simple liveness check
    return jsonify({"status": "alive"}), 200

if __name__ == '__main__':
    init_dependencies()
    app.run(host='0.0.0.0', port=8080)
```

## Graceful Startup with Readiness Probes

Prevent traffic during application initialization:

```javascript
// Node.js Express example
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');

const app = express();
let isReady = false;

// Initialize connections asynchronously
async function initialize() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://mongo:27017/myapp');
    console.log('MongoDB connected');

    // Connect to Redis
    const redisClient = redis.createClient({
      url: 'redis://redis:6379'
    });
    await redisClient.connect();
    console.log('Redis connected');

    // Warm up caches
    await warmupCaches();
    console.log('Caches warmed up');

    // Load configuration
    await loadConfiguration();
    console.log('Configuration loaded');

    // Mark as ready
    isReady = true;
    console.log('Application ready to serve traffic');
  } catch (error) {
    console.error('Initialization failed:', error);
    isReady = false;
  }
}

app.get('/ready', (req, res) => {
  if (isReady) {
    res.status(200).send('Ready');
  } else {
    res.status(503).send('Not ready');
  }
});

app.get('/healthz', (req, res) => {
  // Always healthy if server is running
  res.status(200).send('Alive');
});

// Start initialization
initialize();

app.listen(8080, () => {
  console.log('Server started on port 8080');
});
```

The pod won't receive traffic until initialization completes.

## Readiness Probes for Zero-Downtime Deployments

Configure readiness probes to support rolling updates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Never allow all pods to be unavailable
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: api-server:v2
        ports:
        - containerPort: 8080

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 3
          failureThreshold: 2
          successThreshold: 1

        # Graceful shutdown
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

This configuration ensures at least one pod is always ready during updates.

## Checking Multiple Dependencies

Implement comprehensive readiness checks:

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    "time"
)

type HealthCheck struct {
    Name   string `json:"name"`
    Status string `json:"status"`
    Error  string `json:"error,omitempty"`
}

type ReadinessResponse struct {
    Ready  bool          `json:"ready"`
    Checks []HealthCheck `json:"checks"`
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    checks := []HealthCheck{
        checkDatabase(ctx),
        checkCache(ctx),
        checkMessageQueue(ctx),
        checkExternalAPI(ctx),
    }

    ready := true
    for _, check := range checks {
        if check.Status != "healthy" {
            ready = false
            break
        }
    }

    response := ReadinessResponse{
        Ready:  ready,
        Checks: checks,
    }

    w.Header().Set("Content-Type", "application/json")
    if ready {
        w.WriteHeader(http.StatusOK)
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
    }
    json.NewEncoder(w).Encode(response)
}

func checkDatabase(ctx context.Context) HealthCheck {
    check := HealthCheck{Name: "database", Status: "healthy"}
    if err := db.PingContext(ctx); err != nil {
        check.Status = "unhealthy"
        check.Error = err.Error()
    }
    return check
}

func checkCache(ctx context.Context) HealthCheck {
    check := HealthCheck{Name: "redis", Status: "healthy"}
    if err := redisClient.Ping(ctx).Err(); err != nil {
        check.Status = "unhealthy"
        check.Error = err.Error()
    }
    return check
}

func checkMessageQueue(ctx context.Context) HealthCheck {
    check := HealthCheck{Name: "rabbitmq", Status: "healthy"}
    // Check RabbitMQ connection
    if !mqConn.IsClosed() {
        check.Status = "unhealthy"
        check.Error = "connection closed"
    }
    return check
}

func checkExternalAPI(ctx context.Context) HealthCheck {
    check := HealthCheck{Name: "external_api", Status: "healthy"}
    // Quick health check to external service
    req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/health", nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil || resp.StatusCode != 200 {
        check.Status = "unhealthy"
        if err != nil {
            check.Error = err.Error()
        } else {
            check.Error = "unexpected status code"
        }
    }
    return check
}
```

## Readiness Probe Timing Configuration

Configure timing based on your application needs:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080

  # Start checking quickly after container starts
  initialDelaySeconds: 5

  # Check frequently to detect changes quickly
  periodSeconds: 3

  # Allow reasonable time for check to complete
  timeoutSeconds: 2

  # Remove from service after 2 consecutive failures
  failureThreshold: 2

  # Require 1 success to add back to service
  successThreshold: 1
```

Lower `failureThreshold` removes unhealthy pods faster, while higher values tolerate transient issues.

## Combining Startup, Readiness, and Liveness Probes

Use all three probe types together:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: complete-app
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080

    # Startup probe: protect slow-starting container
    startupProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 0
      periodSeconds: 5
      failureThreshold: 30  # 2.5 minutes max startup time

    # Liveness probe: restart if container becomes unresponsive
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 10
      timeoutSeconds: 3
      failureThreshold: 3

    # Readiness probe: control traffic based on dependencies
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
      timeoutSeconds: 2
      failureThreshold: 2
      successThreshold: 1
```

## Graceful Shutdown Handling

Mark pod as not ready during shutdown:

```go
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "sync/atomic"
    "syscall"
    "time"
)

var ready int32 = 1

func main() {
    http.HandleFunc("/ready", readinessHandler)

    server := &http.Server{Addr: ":8080"}

    // Handle shutdown signals
    go func() {
        sigChan := make(chan os.Signal, 1)
        signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)
        <-sigChan

        // Mark as not ready immediately
        atomic.StoreInt32(&ready, 0)

        // Wait for pod to be removed from service
        time.Sleep(15 * time.Second)

        // Graceful shutdown
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        server.Shutdown(ctx)
    }()

    server.ListenAndServe()
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
    if atomic.LoadInt32(&ready) == 1 {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Ready"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Shutting down"))
    }
}
```

This pattern ensures the pod stops receiving traffic before shutdown.

## Monitoring Readiness Status

Query readiness status with Prometheus:

```promql
# Pods not ready
kube_pod_status_ready{condition="false"}

# Count pods not ready by deployment
count by (namespace, deployment) (
  kube_pod_status_ready{condition="false"}
)

# Readiness probe failures
rate(prober_probe_total{probe_type="Readiness",result="failed"}[5m])

# Average time until pod becomes ready
avg by (pod) (
  kube_pod_status_ready_time - kube_pod_start_time
)
```

Create alerts for readiness issues:

```yaml
groups:
  - name: readiness
    rules:
      - alert: PodsNotReady
        expr: kube_pod_status_ready{condition="false"} > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} not ready"

      - alert: DeploymentNotReady
        expr: kube_deployment_status_replicas_available < kube_deployment_spec_replicas
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Deployment {{ $labels.deployment }} has unavailable replicas"
```

## Debugging Readiness Failures

Troubleshoot pods failing readiness checks:

```bash
# Check pod readiness status
kubectl get pods -o wide

# Describe pod to see probe failures
kubectl describe pod my-app-abc123

# Check readiness endpoint manually
kubectl port-forward my-app-abc123 8080:8080
curl http://localhost:8080/ready

# View probe configuration
kubectl get pod my-app-abc123 -o jsonpath='{.spec.containers[0].readinessProbe}'

# Check service endpoints
kubectl get endpoints my-service
```

## Best Practices

Follow these guidelines for effective readiness probes:

**DO check external dependencies:**
```yaml
# Check database, cache, message queues
readinessProbe:
  httpGet:
    path: /ready  # Checks all dependencies
    port: 8080
```

**DO fail fast for critical dependencies:**
```python
@app.route('/ready')
def readiness():
    # Fast timeout for critical checks
    if not check_database(timeout=2):
        return "Database unavailable", 503
    return "Ready", 200
```

**DON'T make readiness checks expensive:**
```python
# BAD: Don't run expensive queries
def readiness():
    db.execute("SELECT * FROM large_table")  # Too slow

# GOOD: Simple connectivity check
def readiness():
    db.execute("SELECT 1")  # Fast check
```

**DO return detailed status in responses:**
```json
{
  "ready": false,
  "checks": {
    "database": "healthy",
    "cache": "unhealthy: connection timeout",
    "api": "healthy"
  }
}
```

## Conclusion

Readiness probes are essential for production Kubernetes deployments. By checking external dependencies and controlling when pods receive traffic, they enable zero-downtime updates and graceful handling of temporary failures.

Configure readiness probes to check all critical dependencies, use appropriate timeouts and thresholds, and combine them with liveness and startup probes for comprehensive health checking. Monitor readiness status to identify issues quickly and ensure your services maintain high availability.
