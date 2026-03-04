# How to Build Service Health Aggregation Systems in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Health Checks, Monitoring, Microservices, Observability

Description: A practical guide to building a service health aggregation system in Go that monitors multiple services and dependencies.

---

When you're running a handful of microservices, checking their health is straightforward. You hit each `/health` endpoint, see some 200s, and call it a day. But once you scale to dozens or hundreds of services with complex dependency chains, you need something smarter - a system that aggregates health from all your services and gives you a single source of truth.

I've built health aggregation systems for production environments, and Go is exceptionally well-suited for this task. Its concurrency model, fast startup times, and small memory footprint make it ideal for a system that needs to poll many endpoints simultaneously. Let's build one from scratch.

## Defining Health Status Types

Before writing any aggregation logic, we need a clear vocabulary for health states. The classic "up or down" binary approach falls apart in distributed systems where partial degradation is common.

The following code defines our core health status types and a struct to represent the health of any checkable component:

```go
package health

import (
    "sync"
    "time"
)

// Status represents the health state of a service or dependency
type Status string

const (
    StatusHealthy   Status = "healthy"
    StatusDegraded  Status = "degraded"
    StatusUnhealthy Status = "unhealthy"
    StatusUnknown   Status = "unknown"
)

// CheckResult holds the outcome of a single health check
type CheckResult struct {
    Name        string            `json:"name"`
    Status      Status            `json:"status"`
    Message     string            `json:"message,omitempty"`
    LastChecked time.Time         `json:"last_checked"`
    Latency     time.Duration     `json:"latency_ms"`
    Metadata    map[string]string `json:"metadata,omitempty"`
}

// AggregatedHealth represents the combined health of a service and its dependencies
type AggregatedHealth struct {
    ServiceName  string                 `json:"service_name"`
    Status       Status                 `json:"status"`
    Checks       map[string]CheckResult `json:"checks"`
    Dependencies []AggregatedHealth     `json:"dependencies,omitempty"`
    Timestamp    time.Time              `json:"timestamp"`
}
```

The four-state model gives operators actionable information. "Degraded" means the service works but something is wrong - maybe a non-critical dependency is down or response times are elevated. This distinction prevents alert fatigue from binary health checks that cry wolf on minor issues.

## Building Individual Health Checkers

Each type of dependency needs its own checker. Here's a pattern I use that keeps checkers consistent while allowing flexibility for different backends.

This interface and implementation pattern allows you to add new checker types without modifying existing code:

```go
package health

import (
    "context"
    "database/sql"
    "fmt"
    "net/http"
    "time"
)

// Checker defines the interface all health checkers must implement
type Checker interface {
    Name() string
    Check(ctx context.Context) CheckResult
}

// HTTPChecker verifies an HTTP endpoint responds correctly
type HTTPChecker struct {
    name           string
    url            string
    client         *http.Client
    expectedStatus int
}

func NewHTTPChecker(name, url string, timeout time.Duration) *HTTPChecker {
    return &HTTPChecker{
        name:           name,
        url:            url,
        client:         &http.Client{Timeout: timeout},
        expectedStatus: http.StatusOK,
    }
}

func (h *HTTPChecker) Name() string {
    return h.name
}

func (h *HTTPChecker) Check(ctx context.Context) CheckResult {
    start := time.Now()
    result := CheckResult{
        Name:        h.name,
        LastChecked: start,
    }

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.url, nil)
    if err != nil {
        result.Status = StatusUnhealthy
        result.Message = fmt.Sprintf("failed to create request: %v", err)
        result.Latency = time.Since(start)
        return result
    }

    resp, err := h.client.Do(req)
    result.Latency = time.Since(start)

    if err != nil {
        result.Status = StatusUnhealthy
        result.Message = fmt.Sprintf("request failed: %v", err)
        return result
    }
    defer resp.Body.Close()

    if resp.StatusCode != h.expectedStatus {
        result.Status = StatusUnhealthy
        result.Message = fmt.Sprintf("unexpected status: %d", resp.StatusCode)
        return result
    }

    result.Status = StatusHealthy
    result.Message = "endpoint responding normally"
    return result
}
```

Database connections are another common dependency. The checker below tests actual connectivity rather than just checking if a connection object exists:

```go
// PostgresChecker verifies database connectivity with an actual query
type PostgresChecker struct {
    name string
    db   *sql.DB
}

func NewPostgresChecker(name string, db *sql.DB) *PostgresChecker {
    return &PostgresChecker{name: name, db: db}
}

func (p *PostgresChecker) Name() string {
    return p.name
}

func (p *PostgresChecker) Check(ctx context.Context) CheckResult {
    start := time.Now()
    result := CheckResult{
        Name:        p.name,
        LastChecked: start,
        Metadata:    make(map[string]string),
    }

    // Actually execute a query - don't just ping
    var version string
    err := p.db.QueryRowContext(ctx, "SELECT version()").Scan(&version)
    result.Latency = time.Since(start)

    if err != nil {
        result.Status = StatusUnhealthy
        result.Message = fmt.Sprintf("database query failed: %v", err)
        return result
    }

    // Check connection pool stats for degradation signals
    stats := p.db.Stats()
    result.Metadata["open_connections"] = fmt.Sprintf("%d", stats.OpenConnections)
    result.Metadata["in_use"] = fmt.Sprintf("%d", stats.InUse)

    // If we're using most of our connection pool, mark as degraded
    if stats.OpenConnections > 0 && float64(stats.InUse)/float64(stats.OpenConnections) > 0.8 {
        result.Status = StatusDegraded
        result.Message = "connection pool near capacity"
        return result
    }

    result.Status = StatusHealthy
    result.Message = "database responding normally"
    return result
}
```

Notice how the Postgres checker doesn't just ping - it runs a real query and checks connection pool utilization. A database can respond to pings while being overwhelmed with queries. Checking pool saturation catches this degradation early.

## The Health Aggregator

Now we need a component that runs all checkers concurrently and combines their results. Go's goroutines make this efficient even with dozens of checks.

The aggregator below manages multiple checkers and runs them in parallel with proper timeout handling:

```go
package health

import (
    "context"
    "sync"
    "time"
)

// Aggregator coordinates multiple health checkers and combines their results
type Aggregator struct {
    serviceName string
    checkers    []Checker
    cache       *resultCache
    cacheTTL    time.Duration
    mu          sync.RWMutex
}

type resultCache struct {
    result    AggregatedHealth
    expiresAt time.Time
}

func NewAggregator(serviceName string, cacheTTL time.Duration) *Aggregator {
    return &Aggregator{
        serviceName: serviceName,
        checkers:    make([]Checker, 0),
        cacheTTL:    cacheTTL,
    }
}

func (a *Aggregator) RegisterChecker(checker Checker) {
    a.mu.Lock()
    defer a.mu.Unlock()
    a.checkers = append(a.checkers, checker)
}

func (a *Aggregator) CheckHealth(ctx context.Context) AggregatedHealth {
    // Return cached result if still valid
    a.mu.RLock()
    if a.cache != nil && time.Now().Before(a.cache.expiresAt) {
        cached := a.cache.result
        a.mu.RUnlock()
        return cached
    }
    a.mu.RUnlock()

    // Run all checks concurrently
    results := make(map[string]CheckResult)
    var resultsMu sync.Mutex
    var wg sync.WaitGroup

    for _, checker := range a.checkers {
        wg.Add(1)
        go func(c Checker) {
            defer wg.Done()
            
            // Give each check its own timeout
            checkCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
            defer cancel()

            result := c.Check(checkCtx)
            
            resultsMu.Lock()
            results[c.Name()] = result
            resultsMu.Unlock()
        }(checker)
    }

    wg.Wait()

    // Aggregate individual results into overall status
    aggregated := AggregatedHealth{
        ServiceName: a.serviceName,
        Checks:      results,
        Timestamp:   time.Now(),
        Status:      a.calculateOverallStatus(results),
    }

    // Cache the result
    a.mu.Lock()
    a.cache = &resultCache{
        result:    aggregated,
        expiresAt: time.Now().Add(a.cacheTTL),
    }
    a.mu.Unlock()

    return aggregated
}

// calculateOverallStatus determines aggregate health from individual check results
func (a *Aggregator) calculateOverallStatus(results map[string]CheckResult) Status {
    unhealthyCount := 0
    degradedCount := 0

    for _, result := range results {
        switch result.Status {
        case StatusUnhealthy:
            unhealthyCount++
        case StatusDegraded:
            degradedCount++
        }
    }

    // Any unhealthy dependency makes the whole service unhealthy
    if unhealthyCount > 0 {
        return StatusUnhealthy
    }

    // Multiple degraded dependencies or a significant portion degraded
    if degradedCount > 1 || (len(results) > 0 && float64(degradedCount)/float64(len(results)) > 0.5) {
        return StatusDegraded
    }

    if degradedCount == 1 {
        return StatusDegraded
    }

    return StatusHealthy
}
```

The caching layer prevents thundering herds. Without it, a monitoring system polling every second would hammer all your dependencies with redundant checks. A short TTL of 5-10 seconds is usually sufficient - health status rarely changes faster than that.

## Exposing Health via HTTP

Your aggregated health needs to be accessible. Here's a handler that serves health data with appropriate HTTP status codes:

```go
package health

import (
    "encoding/json"
    "net/http"
)

// Handler provides HTTP endpoints for health checks
type Handler struct {
    aggregator *Aggregator
}

func NewHandler(aggregator *Aggregator) *Handler {
    return &Handler{aggregator: aggregator}
}

// ServeHTTP handles health check requests and returns appropriate status codes
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    health := h.aggregator.CheckHealth(ctx)

    w.Header().Set("Content-Type", "application/json")

    // Map health status to HTTP status code
    switch health.Status {
    case StatusHealthy:
        w.WriteHeader(http.StatusOK)
    case StatusDegraded:
        // 200 for degraded - service is still functional
        w.WriteHeader(http.StatusOK)
    case StatusUnhealthy:
        w.WriteHeader(http.StatusServiceUnavailable)
    default:
        w.WriteHeader(http.StatusInternalServerError)
    }

    json.NewEncoder(w).Encode(health)
}

// LivenessHandler returns a simple liveness check for Kubernetes probes
func (h *Handler) LivenessHandler(w http.ResponseWriter, r *http.Request) {
    // Liveness just checks if the process is running
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status": "alive"}`))
}

// ReadinessHandler checks if the service is ready to receive traffic
func (h *Handler) ReadinessHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    health := h.aggregator.CheckHealth(ctx)

    if health.Status == StatusUnhealthy {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(health)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(health)
}
```

Note the separation between liveness and readiness. Kubernetes uses these differently - liveness failures restart the container while readiness failures stop traffic. A degraded service should remain "ready" since it can still handle requests, just not optimally.

## Cascading Health Checks for Microservices

In a microservice architecture, Service A might depend on Service B, which depends on Service C. You need to aggregate health across this chain without creating circular dependencies or timeout cascades.

The following implementation fetches health from downstream services and incorporates it into the local health report:

```go
package health

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

// ServiceDependency represents a downstream service to check
type ServiceDependency struct {
    name     string
    healthURL string
    client   *http.Client
    critical bool  // If true, downstream unhealthy makes us unhealthy
}

func NewServiceDependency(name, healthURL string, timeout time.Duration, critical bool) *ServiceDependency {
    return &ServiceDependency{
        name:      name,
        healthURL: healthURL,
        client:    &http.Client{Timeout: timeout},
        critical:  critical,
    }
}

func (s *ServiceDependency) Name() string {
    return s.name
}

// Check fetches health from a downstream service and incorporates its status
func (s *ServiceDependency) Check(ctx context.Context) CheckResult {
    start := time.Now()
    result := CheckResult{
        Name:        s.name,
        LastChecked: start,
        Metadata:    make(map[string]string),
    }

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.healthURL, nil)
    if err != nil {
        result.Status = StatusUnhealthy
        result.Message = fmt.Sprintf("failed to create request: %v", err)
        result.Latency = time.Since(start)
        return result
    }

    resp, err := s.client.Do(req)
    result.Latency = time.Since(start)

    if err != nil {
        if s.critical {
            result.Status = StatusUnhealthy
        } else {
            result.Status = StatusDegraded
        }
        result.Message = fmt.Sprintf("downstream unreachable: %v", err)
        return result
    }
    defer resp.Body.Close()

    // Parse the downstream health response
    var downstreamHealth AggregatedHealth
    if err := json.NewDecoder(resp.Body).Decode(&downstreamHealth); err != nil {
        result.Status = StatusDegraded
        result.Message = "could not parse downstream health response"
        return result
    }

    result.Metadata["downstream_status"] = string(downstreamHealth.Status)

    // Propagate downstream status appropriately
    switch downstreamHealth.Status {
    case StatusHealthy:
        result.Status = StatusHealthy
        result.Message = "downstream service healthy"
    case StatusDegraded:
        result.Status = StatusDegraded
        result.Message = "downstream service degraded"
    case StatusUnhealthy:
        if s.critical {
            result.Status = StatusUnhealthy
        } else {
            result.Status = StatusDegraded
        }
        result.Message = "downstream service unhealthy"
    }

    return result
}
```

The `critical` flag is important. Not all dependencies are equal. If your payment service can't reach the notification service, that's degraded - users can still pay. But if it can't reach the database, that's unhealthy - no transactions are possible.

## Implementing Alert Thresholds

Raw health status isn't enough for alerting. A service that flaps between healthy and degraded every few seconds would trigger constant alerts. You need to track health over time and only alert when problems persist.

This threshold tracker prevents alert noise by requiring sustained unhealthy states before triggering:

```go
package health

import (
    "sync"
    "time"
)

// AlertThreshold tracks health history and determines when to alert
type AlertThreshold struct {
    windowSize     int
    unhealthyRatio float64
    history        []Status
    historyIndex   int
    mu             sync.Mutex
}

func NewAlertThreshold(windowSize int, unhealthyRatio float64) *AlertThreshold {
    return &AlertThreshold{
        windowSize:     windowSize,
        unhealthyRatio: unhealthyRatio,
        history:        make([]Status, windowSize),
    }
}

// Record adds a new health status to the tracking window
func (a *AlertThreshold) Record(status Status) {
    a.mu.Lock()
    defer a.mu.Unlock()

    a.history[a.historyIndex] = status
    a.historyIndex = (a.historyIndex + 1) % a.windowSize
}

// ShouldAlert returns true if enough recent checks were unhealthy
func (a *AlertThreshold) ShouldAlert() bool {
    a.mu.Lock()
    defer a.mu.Unlock()

    unhealthyCount := 0
    totalRecorded := 0

    for _, status := range a.history {
        if status != "" {
            totalRecorded++
            if status == StatusUnhealthy {
                unhealthyCount++
            }
        }
    }

    if totalRecorded < a.windowSize/2 {
        // Not enough data yet
        return false
    }

    return float64(unhealthyCount)/float64(totalRecorded) >= a.unhealthyRatio
}

// HealthMonitor combines aggregation with alerting
type HealthMonitor struct {
    aggregator *Aggregator
    threshold  *AlertThreshold
    alertFunc  func(AggregatedHealth)
    interval   time.Duration
    stopCh     chan struct{}
}

func NewHealthMonitor(aggregator *Aggregator, threshold *AlertThreshold, alertFunc func(AggregatedHealth), interval time.Duration) *HealthMonitor {
    return &HealthMonitor{
        aggregator: aggregator,
        threshold:  threshold,
        alertFunc:  alertFunc,
        interval:   interval,
        stopCh:     make(chan struct{}),
    }
}

// Start begins continuous health monitoring in the background
func (m *HealthMonitor) Start(ctx context.Context) {
    ticker := time.NewTicker(m.interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-m.stopCh:
            return
        case <-ticker.C:
            health := m.aggregator.CheckHealth(ctx)
            m.threshold.Record(health.Status)

            if m.threshold.ShouldAlert() {
                m.alertFunc(health)
            }
        }
    }
}

func (m *HealthMonitor) Stop() {
    close(m.stopCh)
}
```

A window of 10 checks with a 70% unhealthy threshold means the service needs to be unhealthy for 7 out of 10 consecutive checks before alerting. This filters out transient failures while still catching real outages quickly.

## Putting It All Together

Here's how you wire everything up in a real application:

```go
package main

import (
    "context"
    "database/sql"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "yourapp/health"
    _ "github.com/lib/pq"
)

func main() {
    // Initialize your dependencies
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Create the health aggregator with 10-second cache
    aggregator := health.NewAggregator("api-service", 10*time.Second)

    // Register all health checkers
    aggregator.RegisterChecker(health.NewPostgresChecker("primary-db", db))
    aggregator.RegisterChecker(health.NewHTTPChecker("redis", "http://redis:6379/health", 2*time.Second))
    aggregator.RegisterChecker(health.NewServiceDependency("user-service", "http://user-service:8080/health", 3*time.Second, true))
    aggregator.RegisterChecker(health.NewServiceDependency("notification-service", "http://notification-service:8080/health", 3*time.Second, false))

    // Set up alerting
    threshold := health.NewAlertThreshold(10, 0.7)
    monitor := health.NewHealthMonitor(aggregator, threshold, func(h health.AggregatedHealth) {
        log.Printf("ALERT: Service unhealthy - %+v", h)
        // Send to PagerDuty, Slack, etc.
    }, 5*time.Second)

    ctx, cancel := context.WithCancel(context.Background())
    go monitor.Start(ctx)

    // Set up HTTP handlers
    handler := health.NewHandler(aggregator)
    http.Handle("/health", handler)
    http.HandleFunc("/healthz", handler.LivenessHandler)
    http.HandleFunc("/ready", handler.ReadinessHandler)

    // Graceful shutdown
    server := &http.Server{Addr: ":8080"}
    go func() {
        sigCh := make(chan os.Signal, 1)
        signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
        <-sigCh
        
        cancel()
        monitor.Stop()
        server.Shutdown(context.Background())
    }()

    log.Println("Starting server on :8080")
    if err := server.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatal(err)
    }
}
```

## Production Considerations

A few things I've learned from running health aggregation in production:

**Timeouts are critical.** If a dependency check hangs, it shouldn't block your entire health endpoint. The 5-second per-check timeout in the aggregator prevents this, but make sure your downstream service timeouts are shorter than your overall health endpoint timeout.

**Don't check too frequently.** Polling every second sounds responsive but creates unnecessary load. Most monitoring systems only need updates every 10-30 seconds. Use the cache TTL to throttle actual check execution.

**Separate internal and external health endpoints.** Your internal `/health` endpoint can include detailed dependency information. Your external status page should show a simplified view without exposing infrastructure details.

**Log health transitions, not every check.** Logging every health check result floods your logs. Instead, log only when status changes - from healthy to degraded, degraded to unhealthy, or back to healthy.

The health aggregation pattern scales well. I've used this same architecture for systems monitoring hundreds of services. The key is consistent interfaces - every service exposes the same health endpoint format, making aggregation straightforward regardless of what language or framework each service uses.

---

*Get enterprise-grade health monitoring with [OneUptime](https://oneuptime.com) - aggregate health from all your services in one dashboard.*
