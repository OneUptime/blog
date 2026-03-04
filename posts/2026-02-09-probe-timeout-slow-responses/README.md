# How to Configure Probe timeoutSeconds to Handle Slow Health Check Responses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Performance

Description: Set appropriate probe timeouts to accommodate slow health check responses while avoiding false positives, balancing responsiveness with stability across different application types.

---

The `timeoutSeconds` parameter specifies how long Kubernetes waits for a probe to complete before considering it failed. Setting it too low causes false failures when health checks occasionally run slow. Setting it too high delays failure detection. This guide shows you how to choose appropriate timeout values.

## Understanding timeoutSeconds

Kubernetes starts a health check and waits up to `timeoutSeconds` for a response:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  timeoutSeconds: 5      # Wait up to 5 seconds for response
  failureThreshold: 3
```

If the health check doesn't complete within 5 seconds, Kubernetes counts it as a failure.

## Default Timeouts and Common Values

Kubernetes default:

```yaml
timeoutSeconds: 1  # Very aggressive default!
```

Common production values:

```yaml
# Fast, lightweight checks
timeoutSeconds: 2

# Standard checks
timeoutSeconds: 5

# Checks that query databases
timeoutSeconds: 10

# Expensive checks
timeoutSeconds: 15
```

## Symptoms of Timeout Too Low

Watch for these signs:

```bash
# Check pod events
kubectl describe pod my-pod

# Look for timeout errors:
# Liveness probe failed: Get "http://10.0.0.1:8080/healthz": context deadline exceeded
# Readiness probe failed: timeout: failed to connect
```

Monitor probe failure rate:

```promql
# High failure rate may indicate timeout issues
rate(prober_probe_total{result="failed"}[5m]) > 0.1
```

## Setting Timeouts for Different Probe Types

Configure based on what the probe checks:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080

    # Liveness: Simple check, short timeout
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 10
      timeoutSeconds: 3      # Quick response expected
      failureThreshold: 3

    # Readiness: Checks dependencies, longer timeout
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
      timeoutSeconds: 5      # Allows for dependency checks
      failureThreshold: 2

    # Startup: May do expensive initialization checks
    startupProbe:
      httpGet:
        path: /startup
        port: 8080
      periodSeconds: 10
      timeoutSeconds: 10     # Generous for initialization
      failureThreshold: 30
```

## Timeout for Database Health Checks

Database queries need appropriate timeouts:

```go
func healthHandler(w http.ResponseWriter, r *http.Request) {
    // Set timeout shorter than Kubernetes timeout
    ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
    defer cancel()

    if err := db.PingContext(ctx); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Database unavailable"))
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Healthy"))
}
```

Configure probe with longer timeout:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 10
  timeoutSeconds: 5        # > application timeout (4s)
  failureThreshold: 2
```

## Implementing Timeout Handling in Health Checks

Add timeouts to all external calls:

```python
from flask import Flask
import psycopg2
import redis
import requests

app = Flask(__name__)

@app.route('/ready')
def readiness():
    timeout = 3  # Internal timeout

    # Check database with timeout
    try:
        conn = psycopg2.connect(
            host="postgres",
            database="myapp",
            user="app",
            password="secret",
            connect_timeout=timeout
        )
        conn.close()
    except Exception as e:
        return f"Database check failed: {e}", 503

    # Check Redis with timeout
    try:
        r = redis.Redis(
            host='redis',
            port=6379,
            socket_timeout=timeout
        )
        r.ping()
    except Exception as e:
        return f"Redis check failed: {e}", 503

    # Check downstream service with timeout
    try:
        response = requests.get(
            'http://downstream-service/health',
            timeout=timeout
        )
        if response.status_code != 200:
            return f"Downstream unhealthy", 503
    except Exception as e:
        return f"Downstream check failed: {e}", 503

    return "Ready", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Configure probe:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  timeoutSeconds: 5       # > internal timeout (3s)
  periodSeconds: 10
```

## Handling Slow TCP Probes

TCP probes need shorter timeouts:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database
spec:
  containers:
  - name: postgres
    image: postgres:15
    ports:
    - containerPort: 5432

    livenessProbe:
      tcpSocket:
        port: 5432
      periodSeconds: 10
      timeoutSeconds: 3    # TCP should connect quickly
      failureThreshold: 3
```

TCP connection attempts either succeed immediately or fail. Long timeouts usually indicate network issues.

## Timeout for Exec Probes

Exec probes run commands that may take time:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: my-app:latest

    readinessProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - |
          psql -h postgres -U app -c "SELECT 1" &&
          redis-cli -h redis ping
      periodSeconds: 10
      timeoutSeconds: 10     # Multiple commands need time
      failureThreshold: 2
```

Ensure script completes within timeout:

```bash
#!/bin/bash
# health-check.sh

set -e
export TIMEOUT=8  # Less than Kubernetes timeout

# All checks with timeout
timeout $TIMEOUT psql -h postgres -U app -c "SELECT 1"
timeout $TIMEOUT redis-cli -h redis ping
timeout $TIMEOUT curl -sf http://downstream/health

echo "All checks passed"
exit 0
```

## Monitoring Probe Timeouts

Track timeout frequency:

```promql
# Probe timeout rate
rate(prober_probe_total{result="timeout"}[5m])

# Probe duration distribution
histogram_quantile(0.99,
  rate(prober_probe_duration_seconds_bucket[5m])
)

# Probes exceeding timeout
sum(prober_probe_duration_seconds > 5) by (pod, probe_type)
```

Alert on excessive timeouts:

```yaml
groups:
  - name: probe_timeouts
    rules:
      - alert: HighProbeTimeoutRate
        expr: |
          rate(prober_probe_total{result="timeout"}[5m]) > 0.1
        for: 10m
        annotations:
          summary: "Probe timeouts for {{ $labels.pod }}"
          description: "Consider increasing timeoutSeconds or optimizing health check"
```

## Adjusting for Network Latency

Account for network delays:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: remote-service-client
spec:
  containers:
  - name: app
    image: my-app:latest

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 10
      # Longer timeout for remote dependency checks
      timeoutSeconds: 10
      failureThreshold: 2
```

Optimize by checking locally when possible:

```go
// Instead of calling remote service in health check
func readinessHandler(w http.ResponseWriter, r *http.Request) {
    // Check local connection pool status
    if downstreamPool.Stats().OpenConnections > 0 {
        w.WriteHeader(http.StatusOK)
        return
    }
    w.WriteHeader(http.StatusServiceUnavailable)
}
```

## Best Practices

```yaml
# DO: Set timeout > expected response time
# If health check takes 2s, use timeout 5s
timeoutSeconds: 5

# DO: Make application timeout < probe timeout
# App timeout: 3s
# Probe timeout: 5s

# DON'T: Use very long timeouts
# BAD
timeoutSeconds: 60

# GOOD
timeoutSeconds: 10

# DO: Match timeout to check complexity
# Simple check
livenessProbe:
  timeoutSeconds: 3

# Complex check with multiple dependencies
readinessProbe:
  timeoutSeconds: 10

# DON'T: Use default timeout without testing
# Default (1s) is often too short

# DO: Test under load
# Health checks may slow down under high traffic
```

## Testing Timeout Configuration

Simulate slow responses:

```go
// Test endpoint that simulates slow health check
func slowHealthHandler(w http.ResponseWriter, r *http.Request) {
    // Simulate slow response
    delay := r.URL.Query().Get("delay")
    if delay != "" {
        if d, err := time.ParseDuration(delay); err == nil {
            time.Sleep(d)
        }
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
```

Test different delays:

```bash
# Test 3 second delay (should pass with 5s timeout)
curl "http://pod:8080/health?delay=3s"

# Test 6 second delay (should timeout with 5s timeout)
curl "http://pod:8080/health?delay=6s"
```

## Conclusion

Proper timeout configuration prevents false failures from slow health check responses while maintaining fast failure detection. Set timeouts higher than expected response time, implement application-level timeouts that are shorter than probe timeouts, and monitor probe duration to identify when timeouts need adjustment. Always test timeout configuration under production-like load conditions.
