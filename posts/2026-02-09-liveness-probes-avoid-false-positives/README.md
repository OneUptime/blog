# How to Configure Kubernetes Liveness Probes That Avoid False Positive Pod Restarts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Liveness Probes, Health Checks, Reliability

Description: Design liveness probes that accurately detect unrecoverable failures without triggering false positive restarts that degrade service availability and create cascading failures.

---

Liveness probes protect your applications by restarting pods that have entered unrecoverable states. However, poorly configured liveness probes cause more problems than they solve. False positive restarts kill healthy pods, creating cascading failures and degrading availability instead of improving it.

The challenge is distinguishing between temporary degradation that will self-recover and permanent failures requiring restart. Liveness probes that trigger too aggressively restart pods experiencing temporary load spikes or dependency issues. Probes that trigger too slowly allow truly failed pods to remain in service, impacting users.

Understanding what constitutes an unrecoverable failure and designing probes that detect only these conditions prevents false positive restarts while maintaining the safety net liveness probes provide.

## Understanding Liveness vs Readiness Probes

Many liveness probe problems stem from using them when readiness probes are more appropriate. Liveness probes answer "Is the application running?" while readiness probes answer "Can the application serve traffic?"

Liveness probe failures cause pod restarts. Use them only for detecting truly stuck states like deadlocks, memory exhaustion, or corrupted application state. These are conditions where restart is the only recovery path.

Readiness probe failures remove pods from service endpoints without restarting them. Use these for temporary conditions like database connectivity issues, cache warming, or high load. These conditions often self-recover.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: api-service:v1.0.0
        ports:
        - containerPort: 8080
        # Liveness: detect truly broken states
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        # Readiness: detect temporary unavailability
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

The liveness probe checks `/healthz` which returns 200 only when the application core is functional. The readiness probe checks `/ready` which returns 200 only when the application can serve requests, including dependency availability.

## Designing Effective Liveness Probe Endpoints

The liveness probe endpoint should verify only core application functionality without testing dependencies or complex operations. Testing dependencies in liveness probes causes restarts when external services fail, which does not help recovery.

Bad liveness probe endpoint:

```go
// Don't do this - tests dependencies
func livenessHandler(w http.ResponseWriter, r *http.Request) {
    // BAD: Database connection test in liveness
    if err := db.Ping(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    // BAD: External API test in liveness
    if err := externalAPI.Check(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    w.WriteHeader(http.StatusOK)
}
```

This endpoint causes restarts when the database or external API are unavailable, even though the application itself is healthy. Restarting the pod does not fix external dependency problems.

Good liveness probe endpoint:

```go
// Good - tests only core application health
func livenessHandler(w http.ResponseWriter, r *http.Request) {
    // Check if application can respond
    // Check critical internal state only
    if app.IsDeadlocked() || app.IsOutOfMemory() {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    w.WriteHeader(http.StatusOK)
}

// Separate readiness endpoint for dependencies
func readinessHandler(w http.ResponseWriter, r *http.Request) {
    // Check database connection
    if err := db.Ping(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    // Check if cache is warmed
    if !cache.IsReady() {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    w.WriteHeader(http.StatusOK)
}
```

The liveness endpoint checks only internal application state. Dependency checks belong in the readiness endpoint where failures remove the pod from service without restarting it.

## Configuring Appropriate Timing Parameters

Liveness probe timing parameters determine how quickly Kubernetes detects failures and how tolerant it is of slow responses. Conservative settings prevent false positives while aggressive settings reduce time to recovery.

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 60    # Wait for application startup
  periodSeconds: 10          # Check every 10 seconds
  timeoutSeconds: 5          # Probe times out after 5 seconds
  failureThreshold: 3        # Fail after 3 consecutive failures
  successThreshold: 1        # Success after 1 successful probe
```

`initialDelaySeconds` must exceed worst-case startup time. If your application takes 45 seconds to start, set this to at least 60 seconds. Too short causes restarts during legitimate startup.

`periodSeconds` controls check frequency. Ten seconds balances rapid failure detection with probe overhead. Lower values create more load, higher values delay failure detection.

`timeoutSeconds` sets the response deadline. Applications under heavy load may respond slowly. Five seconds accommodates typical load while catching hung processes.

`failureThreshold` requires consecutive failures before taking action. Three failures means 30 seconds of continuous unavailability (with 10 second periods) before restart. This filters transient issues while catching persistent problems.

For slow-starting applications, use startup probes instead of large initialDelaySeconds:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 30  # Allow up to 300 seconds for startup
```

Startup probes disable liveness checks until the application is running, preventing premature restarts without affecting steady-state liveness detection.

## Handling High Load Without False Restarts

Applications under heavy load may respond slowly to health checks. Liveness probes must distinguish between slow responses due to legitimate load and actual failures.

Implement health check endpoints that bypass normal request processing:

```go
type HealthChecker struct {
    lastCheck time.Time
    status    int
    mu        sync.RWMutex
}

func (hc *HealthChecker) BackgroundCheck(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            // Perform health check asynchronously
            status := hc.checkHealth()
            hc.mu.Lock()
            hc.status = status
            hc.lastCheck = time.Now()
            hc.mu.Unlock()
        }
    }
}

func (hc *HealthChecker) checkHealth() int {
    // Check critical systems
    if memoryUsage() > 0.95 {
        return http.StatusServiceUnavailable
    }

    if deadlockDetected() {
        return http.StatusServiceUnavailable
    }

    return http.StatusOK
}

func (hc *HealthChecker) Handler(w http.ResponseWriter, r *http.Request) {
    hc.mu.RLock()
    defer hc.mu.RUnlock()

    // Return cached health status immediately
    w.WriteHeader(hc.status)
}
```

This pattern performs health checks in the background and caches results. The probe endpoint returns immediately with cached status, avoiding slow responses during high load.

Configure probes with appropriate resource overhead:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-load-service
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          periodSeconds: 15      # Less frequent checks
          timeoutSeconds: 10     # Generous timeout
          failureThreshold: 5    # More tolerant of slow responses
```

Increasing timeouts and failure thresholds accommodates load-related slowness while still catching genuine failures.

## Avoiding Cascade Failures from Liveness Probes

Aggressive liveness probes can trigger cascade failures where pod restarts cause load spikes that trigger more restarts. This creates a death spiral where the cluster cannot stabilize.

Prevent cascades by configuring appropriate PodDisruptionBudgets:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-service
```

PDBs prevent Kubernetes from restarting too many pods simultaneously, even during liveness probe failures. This limits blast radius and allows healthy pods to continue serving while failed pods restart.

Implement circuit breakers in health check endpoints:

```go
type CircuitBreakerHealth struct {
    failures     int
    lastFailure  time.Time
    tripped      bool
    mu           sync.Mutex
}

func (cb *CircuitBreakerHealth) Handler(w http.ResponseWriter, r *http.Request) {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    // If circuit is tripped, automatically succeed for a period
    if cb.tripped && time.Since(cb.lastFailure) < 2*time.Minute {
        w.WriteHeader(http.StatusOK)
        return
    }

    // Perform actual health check
    if healthy := cb.checkActualHealth(); healthy {
        cb.failures = 0
        cb.tripped = false
        w.WriteHeader(http.StatusOK)
        return
    }

    cb.failures++
    cb.lastFailure = time.Now()

    // Trip circuit breaker after repeated failures
    if cb.failures >= 3 {
        cb.tripped = true
        // Return healthy to prevent restart during investigation
        w.WriteHeader(http.StatusOK)
        return
    }

    w.WriteHeader(http.StatusServiceUnavailable)
}
```

This pattern prevents endless restart loops by temporarily passing health checks after repeated failures, giving operators time to investigate without continuous restarts.

## Monitoring Liveness Probe Behavior

Track liveness probe restarts to identify configuration problems:

```promql
# Rate of liveness-triggered restarts
rate(kube_pod_container_status_restarts_total[5m])

# Pods restarting frequently due to liveness probes
kube_pod_container_status_restarts_total > 5

# Average time between restarts
time() - kube_pod_start_time{} < 300
```

Create alerts for excessive restarts:

```yaml
groups:
- name: liveness-alerts
  rules:
  - alert: HighPodRestartRate
    expr: rate(kube_pod_container_status_restarts_total[15m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod {{ $labels.pod }} restarting frequently"
      description: "Restart rate is {{ $value }} per second"

  - alert: PodCrashLoop
    expr: |
      kube_pod_container_status_restarts_total > 5
      and
      time() - kube_pod_start_time{} < 600
    labels:
      severity: critical
    annotations:
      summary: "Pod {{ $labels.pod }} in crash loop"
```

Review restart patterns:

```bash
# Check restart counts across deployments
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name) \(.status.containerStatuses[0].restartCount)"' | \
  awk '$3 > 0' | sort -k3 -rn

# View recent restart events
kubectl get events --all-namespaces --field-selector reason=Unhealthy --sort-by='.lastTimestamp'
```

Liveness probes are essential for recovering from unrecoverable failures, but they must be configured carefully to avoid creating new problems. By designing probes that check only core application health, using appropriate timing parameters, and monitoring restart behavior, you build reliable self-healing systems that restart when necessary without false positive restarts that degrade availability.
