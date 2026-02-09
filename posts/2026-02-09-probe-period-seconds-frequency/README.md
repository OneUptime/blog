# How to Use Probe periodSeconds to Control Health Check Frequency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Performance

Description: Configure probe periodSeconds to balance fast failure detection with resource usage, choosing appropriate health check intervals based on application characteristics and SLA requirements.

---

The `periodSeconds` parameter controls how often Kubernetes runs health checks. Setting it too low wastes resources and can overload your application. Setting it too high delays failure detection. This guide shows you how to choose the right interval for your workloads.

## Understanding periodSeconds

After the initial delay, Kubernetes runs probes at `periodSeconds` intervals:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10        # Check every 10 seconds
  failureThreshold: 3
```

Timeline:
- 30s: First check
- 40s: Second check
- 50s: Third check
- And so on every 10 seconds

## Default Values and Common Patterns

Kubernetes defaults:

```yaml
# Default values (if not specified)
periodSeconds: 10
timeoutSeconds: 1
failureThreshold: 3
successThreshold: 1
```

Common patterns:

```yaml
# Aggressive checking (fast failure detection)
livenessProbe:
  periodSeconds: 5
  failureThreshold: 2

# Conservative checking (resource efficient)
livenessProbe:
  periodSeconds: 30
  failureThreshold: 2

# Readiness (frequent, catches issues quickly)
readinessProbe:
  periodSeconds: 5
  failureThreshold: 2
```

## Choosing periodSeconds for Liveness Probes

Consider your recovery time objective:

```yaml
# Critical service: Fast detection (1 minute to restart)
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  failureThreshold: 3
  # Time to restart: 10s * 3 = 30s detection + restart time

# Standard service: Balanced (2 minutes to restart)
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 20
  failureThreshold: 3
  # Time to restart: 20s * 3 = 60s detection + restart time

# Background worker: Tolerant (5 minutes to restart)
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 60
  failureThreshold: 3
  # Time to restart: 60s * 3 = 180s detection + restart time
```

## Choosing periodSeconds for Readiness Probes

Readiness checks should be more frequent:

```yaml
# User-facing API: Very responsive
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 3          # Check every 3 seconds
  failureThreshold: 2       # Remove after 6 seconds
  successThreshold: 1       # Add back after 3 seconds

# Internal service: Moderate frequency
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 2
  successThreshold: 1

# Batch processor: Less frequent
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 15
  failureThreshold: 2
  successThreshold: 2
```

## Impact of Probe Frequency

Calculate resource usage:

```yaml
# Example deployment
replicas: 100
periodSeconds: 5

# Health checks per minute per pod: 60 / 5 = 12
# Total checks per minute: 100 * 12 = 1,200
# Total checks per hour: 1,200 * 60 = 72,000

# With periodSeconds: 30
# Checks per minute per pod: 60 / 30 = 2
# Total checks per minute: 100 * 2 = 200
# Total checks per hour: 200 * 60 = 12,000
```

Higher frequency means more:
- Network traffic
- CPU usage for health check processing
- Database connections (if checking DB)
- Logs generated

## Adjusting for Expensive Health Checks

If health checks are expensive, increase interval:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-expensive-checks
spec:
  containers:
  - name: app
    image: my-app:latest

    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      # Expensive check, run less frequently
      periodSeconds: 30
      timeoutSeconds: 10
      failureThreshold: 2

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      # Also expensive, but readiness needs frequency
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
```

Optimize the health check itself:

```go
// Cache expensive checks
var (
    lastCheck      time.Time
    lastResult     bool
    cacheDuration  = 5 * time.Second
    mu             sync.RWMutex
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
    mu.RLock()
    if time.Since(lastCheck) < cacheDuration {
        if lastResult {
            w.WriteHeader(http.StatusOK)
        } else {
            w.WriteHeader(http.StatusServiceUnavailable)
        }
        mu.RUnlock()
        return
    }
    mu.RUnlock()

    // Perform expensive check
    healthy := performExpensiveCheck()

    mu.Lock()
    lastCheck = time.Now()
    lastResult = healthy
    mu.Unlock()

    if healthy {
        w.WriteHeader(http.StatusOK)
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
    }
}
```

## Different Frequencies for Different Environments

Production needs balance:

```yaml
# production-deployment.yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 10     # Balanced
  failureThreshold: 3
```

Development can be more frequent:

```yaml
# dev-deployment.yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 3      # Fast feedback
  failureThreshold: 2
```

## Monitoring Probe Overhead

Track health check resource usage:

```promql
# Probe execution rate
rate(prober_probe_total[5m])

# Probe latency
histogram_quantile(0.95,
  rate(prober_probe_duration_seconds_bucket[5m])
)

# Total probe time per pod
sum by (pod) (
  rate(prober_probe_duration_seconds_sum[5m])
)
```

Create alerts for slow probes:

```yaml
groups:
  - name: probe_performance
    rules:
      - alert: SlowHealthChecks
        expr: |
          histogram_quantile(0.95,
            rate(prober_probe_duration_seconds_bucket[5m])
          ) > 1
        for: 10m
        annotations:
          summary: "Health checks taking too long"
          description: "Consider increasing periodSeconds or optimizing checks"
```

## Best Practices

```yaml
# DO: Use faster readiness than liveness
livenessProbe:
  periodSeconds: 15
readinessProbe:
  periodSeconds: 5

# DO: Consider SLA requirements
# 99.9% uptime = 43 minutes downtime/month
# Fast detection helps meet SLA

# DON'T: Check too frequently
# BAD
periodSeconds: 1  # Excessive for most cases

# DO: Scale period with failureThreshold
# Fast period = low threshold
periodSeconds: 5
failureThreshold: 2

# Slow period = higher threshold
periodSeconds: 30
failureThreshold: 3

# DO: Increase period for large deployments
# 1000 pods with periodSeconds: 5
# = 12,000 checks/minute
# Consider periodSeconds: 10 or 15
```

## Conclusion

Choosing the right `periodSeconds` balances failure detection speed with resource efficiency. Use more frequent checks for user-facing services and critical components, less frequent checks for background workers and large-scale deployments. Always monitor probe overhead and adjust based on actual resource usage and SLA requirements.
