# How to Configure Readiness Probes That Check Downstream Service Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Microservices

Description: Implement readiness probes that verify downstream service availability, preventing traffic routing to pods that cannot fulfill requests due to dependency failures.

---

Readiness probes should check external dependencies like databases, caches, and downstream APIs. When dependencies fail, marking pods as not ready prevents users from hitting error responses. This guide shows you how to implement dependency checking in readiness probes effectively.

## Why Check Dependencies in Readiness

Unlike liveness probes that check if your application is alive, readiness probes verify your application can handle requests successfully. If your database is down, your API can't serve requests even though the process is running fine.

Checking dependencies in readiness probes prevents traffic routing to pods that would return errors anyway.

## Basic Dependency Checking

Check database connectivity:

```go
func readinessHandler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
    defer cancel()

    // Check database
    if err := db.PingContext(ctx); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Database unavailable"))
        return
    }

    // Check Redis
    if err := redisClient.Ping(ctx).Err(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Cache unavailable"))
        return
    }

    // Check downstream API
    if !checkDownstreamAPI(ctx) {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Downstream service unavailable"))
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Ready"))
}
```

Configure the readiness probe:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 2
  successThreshold: 1
```

## Checking Multiple Dependencies

Verify all critical dependencies:

```python
from flask import Flask, jsonify
import psycopg2
import redis
import requests

app = Flask(__name__)

class DependencyChecker:
    def __init__(self):
        self.timeout = 3

    def check_database(self):
        try:
            conn = psycopg2.connect(
                host="postgres",
                database="myapp",
                user="app",
                password="secret",
                connect_timeout=self.timeout
            )
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            conn.close()
            return True, None
        except Exception as e:
            return False, str(e)

    def check_redis(self):
        try:
            r = redis.Redis(
                host='redis',
                port=6379,
                socket_timeout=self.timeout
            )
            r.ping()
            return True, None
        except Exception as e:
            return False, str(e)

    def check_user_service(self):
        try:
            response = requests.get(
                'http://user-service:8080/health',
                timeout=self.timeout
            )
            if response.status_code == 200:
                return True, None
            return False, f"Status code: {response.status_code}"
        except Exception as e:
            return False, str(e)

    def check_payment_service(self):
        try:
            response = requests.get(
                'http://payment-service:8080/health',
                timeout=self.timeout
            )
            return response.status_code == 200, None
        except Exception as e:
            return False, str(e)

checker = DependencyChecker()

@app.route('/ready')
def readiness():
    checks = {
        'database': checker.check_database(),
        'redis': checker.check_redis(),
        'user_service': checker.check_user_service(),
        'payment_service': checker.check_payment_service()
    }

    failed = []
    for name, (success, error) in checks.items():
        if not success:
            failed.append(f"{name}: {error}")

    if failed:
        return jsonify({
            'ready': False,
            'failed_checks': failed
        }), 503

    return jsonify({'ready': True}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Caching Dependency Check Results

Avoid overwhelming dependencies with health checks:

```go
type CachedCheck struct {
    mu         sync.RWMutex
    lastCheck  time.Time
    lastResult bool
    cacheTTL   time.Duration
}

func (cc *CachedCheck) Check(checkFunc func() bool) bool {
    cc.mu.RLock()
    if time.Since(cc.lastCheck) < cc.cacheTTL {
        result := cc.lastResult
        cc.mu.RUnlock()
        return result
    }
    cc.mu.RUnlock()

    // Cache expired, perform actual check
    result := checkFunc()

    cc.mu.Lock()
    cc.lastCheck = time.Now()
    cc.lastResult = result
    cc.mu.Unlock()

    return result
}

var (
    dbCheck = &CachedCheck{cacheTTL: 5 * time.Second}
    apiCheck = &CachedCheck{cacheTTL: 10 * time.Second}
)

func readinessHandler(w http.ResponseWriter, r *http.Request) {
    dbOK := dbCheck.Check(func() bool {
        return db.Ping() == nil
    })

    apiOK := apiCheck.Check(func() bool {
        return checkDownstreamAPI()
    })

    if dbOK && apiOK {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Ready"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("Not ready"))
    }
}
```

## Partial Dependency Failures

Distinguish between critical and non-critical dependencies:

```go
type DependencyStatus struct {
    Critical    bool
    Available   bool
    Error       error
}

func checkAllDependencies() map[string]DependencyStatus {
    checks := make(map[string]DependencyStatus)

    // Critical: Must be available
    checks["database"] = DependencyStatus{
        Critical:  true,
        Available: checkDatabase(),
    }

    checks["cache"] = DependencyStatus{
        Critical:  true,
        Available: checkRedis(),
    }

    // Non-critical: Degraded functionality if unavailable
    checks["recommendations"] = DependencyStatus{
        Critical:  false,
        Available: checkRecommendationService(),
    }

    checks["analytics"] = DependencyStatus{
        Critical:  false,
        Available: checkAnalyticsService(),
    }

    return checks
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
    deps := checkAllDependencies()

    // Only fail if critical dependencies are down
    ready := true
    for name, status := range deps {
        if status.Critical && !status.Available {
            ready = false
            break
        }
    }

    if ready {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "ready":        true,
            "dependencies": deps,
        })
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "ready":        false,
            "dependencies": deps,
        })
    }
}
```

## Circuit Breaker Pattern

Prevent cascading failures:

```go
type CircuitBreaker struct {
    mu            sync.RWMutex
    failureCount  int
    lastFailure   time.Time
    state         string  // closed, open, half-open
    threshold     int
    resetTimeout  time.Duration
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    if cb.state == "open" {
        if time.Since(cb.lastFailure) > cb.resetTimeout {
            cb.state = "half-open"
        } else {
            return fmt.Errorf("circuit breaker open")
        }
    }

    err := fn()
    if err != nil {
        cb.failureCount++
        cb.lastFailure = time.Now()

        if cb.failureCount >= cb.threshold {
            cb.state = "open"
        }
        return err
    }

    cb.failureCount = 0
    cb.state = "closed"
    return nil
}

var paymentServiceCB = &CircuitBreaker{
    threshold:    5,
    resetTimeout: 30 * time.Second,
    state:        "closed",
}

func checkPaymentService() bool {
    err := paymentServiceCB.Call(func() error {
        resp, err := http.Get("http://payment-service/health")
        if err != nil || resp.StatusCode != 200 {
            return fmt.Errorf("unhealthy")
        }
        return nil
    })
    return err == nil
}
```

## Best Practices

```yaml
# DO: Check dependencies in readiness, not liveness
readinessProbe:
  httpGet:
    path: /ready  # Checks dependencies
livenessProbe:
  httpGet:
    path: /healthz  # Only checks application itself

# DO: Use appropriate timeouts
readinessProbe:
  timeoutSeconds: 5  # Allow time for dependency checks
  periodSeconds: 10

# DO: Cache results to avoid overwhelming dependencies
# Check every 5-10 seconds, not every readiness probe

# DON'T: Fail readiness for optional dependencies
# Only check critical services

# DO: Use circuit breakers
# Prevent cascading failures

# DON'T: Make deep dependency checks
# Check immediate dependencies only
```

## Conclusion

Readiness probes that check downstream dependencies prevent routing traffic to pods that cannot fulfill requests. Implement fast, cached dependency checks, distinguish between critical and optional dependencies, and use circuit breakers to prevent cascading failures. This approach maintains user experience even when parts of your infrastructure have issues.
