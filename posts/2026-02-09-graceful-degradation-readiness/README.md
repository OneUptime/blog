# How to Implement Graceful Degradation with Readiness Probe Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Graceful Degradation, Readiness Probes, Resilience, High Availability

Description: Learn how to implement graceful degradation strategies that work with Kubernetes readiness probes, allowing your applications to continue serving traffic with reduced functionality when dependencies fail.

---

When a dependency fails, the typical Kubernetes response is to mark your pod as not ready and remove it from service. But what if your application can still provide value with reduced functionality? Graceful degradation lets you continue serving traffic even when non-critical dependencies are unavailable.

This approach maximizes availability while protecting system health. Rather than failing completely, your application adapts to operate in a degraded mode, serving cached data, read-only operations, or core features while reporting its degraded state.

## Understanding Graceful Degradation vs Complete Failure

Traditional readiness probes use binary logic. Either all dependencies are healthy and you're ready, or something failed and you're not ready. This works well for critical dependencies but is too rigid for complex applications with multiple optional features.

Graceful degradation introduces nuance. Your application reports ready even when some non-critical services are down, but it adjusts its behavior accordingly. Users get a degraded experience rather than no service at all.

The key is distinguishing between critical and non-critical dependencies in your readiness logic.

## Implementing Tiered Readiness Checks

Let's build an application that implements graceful degradation with tiered health checks:

```go
// health/checker.go
package health

import (
    "context"
    "net/http"
    "sync"
    "time"
)

// DependencyStatus tracks individual dependency health
type DependencyStatus struct {
    Name      string
    Healthy   bool
    Critical  bool
    Message   string
    LastCheck time.Time
}

// HealthChecker manages application health with graceful degradation
type HealthChecker struct {
    mu           sync.RWMutex
    dependencies map[string]*DependencyStatus
    degraded     bool
}

func NewHealthChecker() *HealthChecker {
    return &HealthChecker{
        dependencies: make(map[string]*DependencyStatus),
        degraded:     false,
    }
}

// RegisterDependency adds a dependency to track
func (h *HealthChecker) RegisterDependency(name string, critical bool) {
    h.mu.Lock()
    defer h.mu.Unlock()

    h.dependencies[name] = &DependencyStatus{
        Name:      name,
        Critical:  critical,
        Healthy:   false,
        Message:   "Not yet checked",
        LastCheck: time.Time{},
    }
}

// UpdateDependencyStatus updates the health status of a dependency
func (h *HealthChecker) UpdateDependencyStatus(name string, healthy bool, message string) {
    h.mu.Lock()
    defer h.mu.Unlock()

    if dep, exists := h.dependencies[name]; exists {
        dep.Healthy = healthy
        dep.Message = message
        dep.LastCheck = time.Now()
    }

    // Determine if we're in degraded mode
    h.updateDegradedState()
}

func (h *HealthChecker) updateDegradedState() {
    // Check if any non-critical dependencies are unhealthy
    degraded := false
    for _, dep := range h.dependencies {
        if !dep.Critical && !dep.Healthy {
            degraded = true
            break
        }
    }
    h.degraded = degraded
}

// CheckLiveness returns liveness status (always healthy unless critical failure)
func (h *HealthChecker) CheckLiveness() (bool, map[string]interface{}) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    // Liveness only checks for unrecoverable failures
    // Not affected by dependency health
    return true, map[string]interface{}{
        "status": "alive",
        "time":   time.Now(),
    }
}

// CheckReadiness returns readiness with graceful degradation
func (h *HealthChecker) CheckReadiness() (bool, map[string]interface{}) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    // Check all critical dependencies
    allCriticalHealthy := true
    criticalFailures := []string{}

    for _, dep := range h.dependencies {
        if dep.Critical && !dep.Healthy {
            allCriticalHealthy = false
            criticalFailures = append(criticalFailures, dep.Name)
        }
    }

    // Build status response
    status := map[string]interface{}{
        "ready":    allCriticalHealthy,
        "degraded": h.degraded,
        "time":     time.Now(),
    }

    // Include dependency details
    deps := make(map[string]interface{})
    for _, dep := range h.dependencies {
        deps[dep.Name] = map[string]interface{}{
            "healthy":  dep.Healthy,
            "critical": dep.Critical,
            "message":  dep.Message,
            "checked":  dep.LastCheck,
        }
    }
    status["dependencies"] = deps

    if !allCriticalHealthy {
        status["critical_failures"] = criticalFailures
    }

    // Ready if all critical dependencies are healthy
    // Even if in degraded mode (non-critical deps down)
    return allCriticalHealthy, status
}

// IsDegraded returns whether system is in degraded mode
func (h *HealthChecker) IsDegraded() bool {
    h.mu.RLock()
    defer h.mu.RUnlock()
    return h.degraded
}

// DependencyChecker defines interface for checking dependencies
type DependencyChecker interface {
    Check(ctx context.Context) error
}

// DatabaseChecker checks database connectivity
type DatabaseChecker struct {
    // DB connection would go here
}

func (d *DatabaseChecker) Check(ctx context.Context) error {
    // Implement actual database check
    // Example: SELECT 1
    return nil
}

// CacheChecker checks cache (Redis/Memcached) connectivity
type CacheChecker struct {
    // Cache client would go here
}

func (c *CacheChecker) Check(ctx context.Context) error {
    // Implement actual cache check
    // Example: PING command
    return nil
}

// ExternalAPIChecker checks external API availability
type ExternalAPIChecker struct {
    URL string
}

func (e *ExternalAPIChecker) Check(ctx context.Context) error {
    req, err := http.NewRequestWithContext(ctx, "GET", e.URL, nil)
    if err != nil {
        return err
    }

    client := &http.Client{Timeout: 2 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return http.ErrNotSupported
    }

    return nil
}

// StartPeriodicChecks begins background health checking
func (h *HealthChecker) StartPeriodicChecks(ctx context.Context, checkers map[string]DependencyChecker, interval time.Duration) {
    ticker := time.NewTicker(interval)
    go func() {
        for {
            select {
            case <-ctx.Done():
                ticker.Stop()
                return
            case <-ticker.C:
                h.runChecks(ctx, checkers)
            }
        }
    }()
}

func (h *HealthChecker) runChecks(ctx context.Context, checkers map[string]DependencyChecker) {
    for name, checker := range checkers {
        go func(n string, c DependencyChecker) {
            checkCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
            defer cancel()

            err := c.Check(checkCtx)
            if err != nil {
                h.UpdateDependencyStatus(n, false, err.Error())
            } else {
                h.UpdateDependencyStatus(n, true, "Healthy")
            }
        }(name, checker)
    }
}
```

## Application Layer Degradation Logic

Implement degradation logic in your application handlers:

```go
// handlers/api.go
package handlers

import (
    "encoding/json"
    "net/http"
    "your-app/health"
    "your-app/cache"
    "your-app/database"
)

type APIHandler struct {
    healthChecker *health.HealthChecker
    db            *database.DB
    cache         *cache.Cache
}

func NewAPIHandler(hc *health.HealthChecker, db *database.DB, cache *cache.Cache) *APIHandler {
    return &APIHandler{
        healthChecker: hc,
        db:            db,
        cache:         cache,
    }
}

// GetUserProfile demonstrates graceful degradation
func (h *APIHandler) GetUserProfile(w http.ResponseWriter, r *http.Request) {
    userID := r.URL.Query().Get("id")

    // Try cache first (non-critical dependency)
    if !h.healthChecker.IsDegraded() {
        // Cache is healthy, use it
        if profile, err := h.cache.Get(userID); err == nil {
            h.sendResponse(w, http.StatusOK, profile, false)
            return
        }
    }

    // Fallback to database (critical dependency)
    profile, err := h.db.GetUserProfile(userID)
    if err != nil {
        http.Error(w, "Failed to fetch profile", http.StatusInternalServerError)
        return
    }

    // Try to populate cache if available
    if !h.healthChecker.IsDegraded() {
        go h.cache.Set(userID, profile)
    }

    // Indicate degraded mode in response
    h.sendResponse(w, http.StatusOK, profile, h.healthChecker.IsDegraded())
}

// SearchUsers demonstrates feature degradation
func (h *APIHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
    query := r.URL.Query().Get("q")

    if h.healthChecker.IsDegraded() {
        // Degraded mode: only return cached/popular results
        results := h.getCachedSearchResults(query)
        h.sendDegradedResponse(w, http.StatusOK, results,
            "Search running in degraded mode - showing cached results only")
        return
    }

    // Normal mode: full search capability
    results, err := h.db.SearchUsers(query)
    if err != nil {
        http.Error(w, "Search failed", http.StatusInternalServerError)
        return
    }

    h.sendResponse(w, http.StatusOK, results, false)
}

func (h *APIHandler) sendResponse(w http.ResponseWriter, status int, data interface{}, degraded bool) {
    response := map[string]interface{}{
        "data":     data,
        "degraded": degraded,
    }

    if degraded {
        w.Header().Set("X-Service-Degraded", "true")
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(response)
}

func (h *APIHandler) sendDegradedResponse(w http.ResponseWriter, status int, data interface{}, message string) {
    response := map[string]interface{}{
        "data":     data,
        "degraded": true,
        "message":  message,
    }

    w.Header().Set("X-Service-Degraded", "true")
    w.Header().Set("X-Degradation-Reason", message)
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(response)
}

func (h *APIHandler) getCachedSearchResults(query string) []interface{} {
    // Return popular/cached results in degraded mode
    return []interface{}{
        // Cached results
    }
}
```

## Main Application Setup

Wire everything together in your main application:

```go
// main.go
package main

import (
    "context"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
    "your-app/health"
    "your-app/handlers"
)

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Initialize health checker
    healthChecker := health.NewHealthChecker()

    // Register dependencies with criticality
    healthChecker.RegisterDependency("database", true)  // Critical
    healthChecker.RegisterDependency("cache", false)    // Non-critical
    healthChecker.RegisterDependency("analytics", false) // Non-critical
    healthChecker.RegisterDependency("recommendations", false) // Non-critical

    // Set up dependency checkers
    checkers := map[string]health.DependencyChecker{
        "database":        &health.DatabaseChecker{},
        "cache":          &health.CacheChecker{},
        "analytics":      &health.ExternalAPIChecker{URL: "http://analytics:8080/health"},
        "recommendations": &health.ExternalAPIChecker{URL: "http://recommendations:8080/health"},
    }

    // Start periodic health checks
    healthChecker.StartPeriodicChecks(ctx, checkers, 10*time.Second)

    // Set up HTTP handlers
    mux := http.NewServeMux()

    // Health endpoints
    mux.HandleFunc("/healthz/live", func(w http.ResponseWriter, r *http.Request) {
        healthy, status := healthChecker.CheckLiveness()
        if healthy {
            w.WriteHeader(http.StatusOK)
        } else {
            w.WriteHeader(http.StatusServiceUnavailable)
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(status)
    })

    mux.HandleFunc("/healthz/ready", func(w http.ResponseWriter, r *http.Request) {
        ready, status := healthChecker.CheckReadiness()
        if ready {
            w.WriteHeader(http.StatusOK)
        } else {
            w.WriteHeader(http.StatusServiceUnavailable)
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(status)
    })

    // API handlers
    apiHandler := handlers.NewAPIHandler(healthChecker, nil, nil)
    mux.HandleFunc("/api/users/profile", apiHandler.GetUserProfile)
    mux.HandleFunc("/api/users/search", apiHandler.SearchUsers)

    // Start server
    server := &http.Server{
        Addr:    ":8080",
        Handler: mux,
    }

    go func() {
        fmt.Println("Server starting on :8080")
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            fmt.Printf("Server error: %v\n", err)
        }
    }()

    // Graceful shutdown
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan

    fmt.Println("Shutting down gracefully...")
    shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer shutdownCancel()

    if err := server.Shutdown(shutdownCtx); err != nil {
        fmt.Printf("Shutdown error: %v\n", err)
    }
}
```

## Kubernetes Deployment with Degradation Support

Configure your deployment to support graceful degradation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/path: "/metrics"
        prometheus.io/port: "8080"
    spec:
      containers:
      - name: api
        image: web-api:latest
        ports:
        - containerPort: 8080
          name: http

        env:
        - name: DEGRADATION_MODE
          value: "enabled"
        - name: CACHE_REQUIRED
          value: "false"  # Cache is non-critical

        livenessProbe:
          httpGet:
            path: /healthz/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3

        # Readiness probe allows degraded mode
        readinessProbe:
          httpGet:
            path: /healthz/ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 2
          # Pod stays ready even if non-critical deps fail

        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: web-api
  namespace: production
spec:
  selector:
    app: web-api
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

## Monitoring Degradation State

Track degradation with Prometheus metrics:

```go
// metrics/degradation.go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    DegradationStatus = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "app_degradation_status",
            Help: "Application degradation status (0=normal, 1=degraded)",
        },
        []string{"reason"},
    )

    DependencyHealth = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "app_dependency_health",
            Help: "Dependency health status (0=unhealthy, 1=healthy)",
        },
        []string{"dependency", "critical"},
    )

    DegradedRequests = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "app_degraded_requests_total",
            Help: "Total requests served in degraded mode",
        },
        []string{"endpoint"},
    )
)
```

Create Prometheus alerts for degradation:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: degradation-alerts
spec:
  groups:
  - name: degradation
    interval: 30s
    rules:
    - alert: ApplicationDegraded
      expr: app_degradation_status == 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Application running in degraded mode"
        description: "{{ $labels.namespace }}/{{ $labels.pod }} degraded: {{ $labels.reason }}"

    - alert: CriticalDependencyDown
      expr: app_dependency_health{critical="true"} == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Critical dependency unhealthy"
        description: "Critical dependency {{ $labels.dependency }} is down"
```

Graceful degradation with readiness probes allows your applications to maximize availability while maintaining service quality. By distinguishing between critical and non-critical dependencies, you can continue serving traffic with reduced functionality rather than failing completely, providing a better experience for your users even during partial outages.
