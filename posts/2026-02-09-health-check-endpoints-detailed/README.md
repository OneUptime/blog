# How to Implement Health Check Endpoints That Return Detailed Status Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, API Design

Description: Design comprehensive health check endpoints that return detailed status information about dependencies, resources, and system state to improve debugging and monitoring capabilities.

---

Basic health check endpoints return a simple 200 or 503 status code. While this works for Kubernetes probes, it provides limited information when debugging issues. Detailed health check endpoints return structured data about system state, dependency health, and resource availability, making troubleshooting much faster.

This guide shows you how to design informative health check endpoints that work with Kubernetes while providing valuable debugging information.

## Basic vs Detailed Health Check Endpoints

Compare simple and detailed approaches:

```go
// Simple health check
func healthHandler(w http.ResponseWriter, r *http.Request) {
    if isHealthy() {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Unhealthy"))
    }
}

// Detailed health check
type HealthCheck struct {
    Status  string            `json:"status"`
    Checks  map[string]Check  `json:"checks"`
    Version string            `json:"version"`
    Uptime  int64             `json:"uptime"`
}

type Check struct {
    Status    string                 `json:"status"`
    Message   string                 `json:"message,omitempty"`
    Duration  string                 `json:"duration"`
    Details   map[string]interface{} `json:"details,omitempty"`
}

func detailedHealthHandler(w http.ResponseWriter, r *http.Request) {
    checks := performHealthChecks()

    overall := "healthy"
    for _, check := range checks.Checks {
        if check.Status != "healthy" {
            overall = "unhealthy"
            break
        }
    }

    checks.Status = overall
    checks.Version = version
    checks.Uptime = time.Since(startTime).Seconds()

    statusCode := http.StatusOK
    if overall != "healthy" {
        statusCode = http.StatusServiceUnavailable
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(checks)
}
```

## Implementing Detailed Health Checks in Go

Create a comprehensive health check system:

```go
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "net/http"
    "time"
)

type HealthChecker struct {
    db          *sql.DB
    redisClient *redis.Client
    startTime   time.Time
    version     string
}

type HealthResponse struct {
    Status    string                `json:"status"`
    Timestamp time.Time             `json:"timestamp"`
    Version   string                `json:"version"`
    Uptime    string                `json:"uptime"`
    Checks    map[string]CheckResult `json:"checks"`
}

type CheckResult struct {
    Status   string                 `json:"status"`
    Duration string                 `json:"duration"`
    Message  string                 `json:"message,omitempty"`
    Error    string                 `json:"error,omitempty"`
    Details  map[string]interface{} `json:"details,omitempty"`
}

func (hc *HealthChecker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
    defer cancel()

    response := HealthResponse{
        Timestamp: time.Now(),
        Version:   hc.version,
        Uptime:    time.Since(hc.startTime).String(),
        Checks:    make(map[string]CheckResult),
    }

    // Run all health checks
    response.Checks["database"] = hc.checkDatabase(ctx)
    response.Checks["redis"] = hc.checkRedis(ctx)
    response.Checks["disk"] = hc.checkDisk(ctx)
    response.Checks["memory"] = hc.checkMemory(ctx)

    // Determine overall status
    response.Status = "healthy"
    for _, check := range response.Checks {
        if check.Status != "healthy" {
            response.Status = "unhealthy"
            break
        }
    }

    // Set HTTP status code
    statusCode := http.StatusOK
    if response.Status != "healthy" {
        statusCode = http.StatusServiceUnavailable
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(response)
}

func (hc *HealthChecker) checkDatabase(ctx context.Context) CheckResult {
    start := time.Now()
    result := CheckResult{Status: "healthy"}

    if err := hc.db.PingContext(ctx); err != nil {
        result.Status = "unhealthy"
        result.Error = err.Error()
        result.Duration = time.Since(start).String()
        return result
    }

    // Check connection pool stats
    stats := hc.db.Stats()
    result.Details = map[string]interface{}{
        "open_connections": stats.OpenConnections,
        "in_use":          stats.InUse,
        "idle":            stats.Idle,
        "wait_count":      stats.WaitCount,
        "wait_duration":   stats.WaitDuration.String(),
    }

    result.Duration = time.Since(start).String()
    return result
}

func (hc *HealthChecker) checkRedis(ctx context.Context) CheckResult {
    start := time.Now()
    result := CheckResult{Status: "healthy"}

    pong, err := hc.redisClient.Ping(ctx).Result()
    if err != nil || pong != "PONG" {
        result.Status = "unhealthy"
        if err != nil {
            result.Error = err.Error()
        } else {
            result.Message = "Unexpected response from Redis"
        }
        result.Duration = time.Since(start).String()
        return result
    }

    // Get Redis info
    info, _ := hc.redisClient.Info(ctx, "stats").Result()
    result.Details = map[string]interface{}{
        "connected": true,
        "info":      info,
    }

    result.Duration = time.Since(start).String()
    return result
}

func (hc *HealthChecker) checkDisk(ctx context.Context) CheckResult {
    start := time.Now()
    result := CheckResult{Status: "healthy"}

    var stat syscall.Statfs_t
    if err := syscall.Statfs("/data", &stat); err != nil {
        result.Status = "unhealthy"
        result.Error = err.Error()
        result.Duration = time.Since(start).String()
        return result
    }

    available := stat.Bavail * uint64(stat.Bsize)
    total := stat.Blocks * uint64(stat.Bsize)
    usedPercent := float64(total-available) / float64(total) * 100

    result.Details = map[string]interface{}{
        "total_bytes":     total,
        "available_bytes": available,
        "used_percent":    usedPercent,
    }

    if usedPercent > 90 {
        result.Status = "unhealthy"
        result.Message = "Disk usage above 90%"
    } else if usedPercent > 80 {
        result.Status = "degraded"
        result.Message = "Disk usage above 80%"
    }

    result.Duration = time.Since(start).String()
    return result
}

func (hc *HealthChecker) checkMemory(ctx context.Context) CheckResult {
    start := time.Now()
    result := CheckResult{Status: "healthy"}

    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    usedMB := float64(m.Alloc) / 1024 / 1024
    totalMB := float64(m.Sys) / 1024 / 1024

    result.Details = map[string]interface{}{
        "alloc_mb":       usedMB,
        "total_mb":       totalMB,
        "num_gc":         m.NumGC,
        "goroutines":     runtime.NumGoroutine(),
    }

    if usedMB > 1024 {  // > 1GB
        result.Status = "degraded"
        result.Message = "Memory usage high"
    }

    result.Duration = time.Since(start).String()
    return result
}
```

## Python Flask Implementation

Implement detailed health checks in Python:

```python
from flask import Flask, jsonify
import time
import psutil
import redis
import psycopg2
from datetime import datetime, timedelta

app = Flask(__name__)
start_time = time.time()

class HealthChecker:
    def __init__(self):
        self.start_time = time.time()
        self.version = "1.0.0"

    def check_all(self):
        checks = {}
        checks['database'] = self.check_database()
        checks['redis'] = self.check_redis()
        checks['disk'] = self.check_disk()
        checks['memory'] = self.check_memory()

        overall_status = 'healthy'
        for check in checks.values():
            if check['status'] != 'healthy':
                overall_status = 'unhealthy'
                break

        return {
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat(),
            'version': self.version,
            'uptime_seconds': int(time.time() - self.start_time),
            'checks': checks
        }

    def check_database(self):
        start = time.time()
        try:
            conn = psycopg2.connect(
                host="postgres",
                database="myapp",
                user="app",
                password="secret",
                connect_timeout=3
            )
            cursor = conn.cursor()
            cursor.execute("SELECT 1")

            # Get connection info
            cursor.execute("SELECT count(*) FROM pg_stat_activity")
            active_connections = cursor.fetchone()[0]

            conn.close()

            return {
                'status': 'healthy',
                'duration_ms': int((time.time() - start) * 1000),
                'details': {
                    'active_connections': active_connections,
                    'responsive': True
                }
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'duration_ms': int((time.time() - start) * 1000),
                'error': str(e)
            }

    def check_redis(self):
        start = time.time()
        try:
            r = redis.Redis(host='redis', port=6379, socket_timeout=3)
            r.ping()

            info = r.info('stats')

            return {
                'status': 'healthy',
                'duration_ms': int((time.time() - start) * 1000),
                'details': {
                    'total_commands': info['total_commands_processed'],
                    'connected_clients': info.get('connected_clients', 0)
                }
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'duration_ms': int((time.time() - start) * 1000),
                'error': str(e)
            }

    def check_disk(self):
        start = time.time()
        try:
            disk = psutil.disk_usage('/data')
            percent_used = disk.percent

            status = 'healthy'
            message = None

            if percent_used > 90:
                status = 'unhealthy'
                message = 'Disk usage critical'
            elif percent_used > 80:
                status = 'degraded'
                message = 'Disk usage high'

            return {
                'status': status,
                'duration_ms': int((time.time() - start) * 1000),
                'message': message,
                'details': {
                    'total_gb': round(disk.total / (1024**3), 2),
                    'used_gb': round(disk.used / (1024**3), 2),
                    'free_gb': round(disk.free / (1024**3), 2),
                    'percent_used': percent_used
                }
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'duration_ms': int((time.time() - start) * 1000),
                'error': str(e)
            }

    def check_memory(self):
        start = time.time()
        try:
            mem = psutil.virtual_memory()
            percent_used = mem.percent

            status = 'healthy'
            message = None

            if percent_used > 90:
                status = 'degraded'
                message = 'Memory usage high'

            return {
                'status': status,
                'duration_ms': int((time.time() - start) * 1000),
                'message': message,
                'details': {
                    'total_mb': round(mem.total / (1024**2), 2),
                    'available_mb': round(mem.available / (1024**2), 2),
                    'percent_used': percent_used
                }
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'duration_ms': int((time.time() - start) * 1000),
                'error': str(e)
            }

health_checker = HealthChecker()

@app.route('/health')
def health():
    result = health_checker.check_all()
    status_code = 200 if result['status'] == 'healthy' else 503
    return jsonify(result), status_code

@app.route('/healthz')
def healthz():
    # Simple endpoint for Kubernetes
    result = health_checker.check_all()
    if result['status'] == 'healthy':
        return 'OK', 200
    return 'Unhealthy', 503

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Example Response Format

A detailed health check might return:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-09T10:30:15Z",
  "version": "1.2.3",
  "uptime_seconds": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "duration_ms": 15,
      "details": {
        "open_connections": 25,
        "in_use": 10,
        "idle": 15
      }
    },
    "redis": {
      "status": "healthy",
      "duration_ms": 3,
      "details": {
        "connected": true,
        "total_commands": 150000
      }
    },
    "disk": {
      "status": "degraded",
      "duration_ms": 2,
      "message": "Disk usage high",
      "details": {
        "total_gb": 100,
        "used_gb": 85,
        "free_gb": 15,
        "percent_used": 85
      }
    },
    "memory": {
      "status": "healthy",
      "duration_ms": 1,
      "details": {
        "alloc_mb": 512,
        "total_mb": 2048,
        "num_gc": 150,
        "goroutines": 45
      }
    }
  }
}
```

## Using Detailed Health Checks with Kubernetes

Configure probes to use detailed endpoints:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-detailed-health
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080

    # Simple check for liveness
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 10

    # Detailed check for readiness
    readinessProbe:
      httpGet:
        path: /health
        port: 8080
      periodSeconds: 5
```

## Adding Custom Metrics to Health Checks

Include application-specific metrics:

```go
func (hc *HealthChecker) checkApplication(ctx context.Context) CheckResult {
    start := time.Now()
    result := CheckResult{Status: "healthy"}

    // Check queue depth
    queueDepth := getQueueDepth()
    requestRate := getRequestRate()
    errorRate := getErrorRate()

    result.Details = map[string]interface{}{
        "queue_depth":          queueDepth,
        "requests_per_second":  requestRate,
        "error_rate_percent":   errorRate,
        "active_connections":   getActiveConnections(),
    }

    if queueDepth > 10000 {
        result.Status = "degraded"
        result.Message = "Queue depth high"
    }

    if errorRate > 5.0 {
        result.Status = "unhealthy"
        result.Message = "Error rate too high"
    }

    result.Duration = time.Since(start).String()
    return result
}
```

## Conclusion

Detailed health check endpoints dramatically improve debugging and monitoring capabilities while maintaining compatibility with Kubernetes probes. By returning structured information about dependencies, resources, and application state, you enable faster troubleshooting and better observability.

Implement separate simple and detailed endpoints, include timing information for each check, provide actionable error messages, and expose relevant metrics that help diagnose issues. Your operations team will thank you when troubleshooting production incidents.
