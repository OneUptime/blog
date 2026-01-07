# How to Implement Health Checks in Go for Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Kubernetes, Health Checks, DevOps, Reliability, Monitoring

Description: Build robust health checks in Go for Kubernetes liveness and readiness probes with dependency checks for databases, caches, and external services.

---

Kubernetes relies on health checks to determine when to restart containers and when to route traffic to pods. Without proper health checks, your application might receive traffic before it is ready or continue running in a degraded state. This guide walks you through implementing comprehensive health checks in Go that cover liveness, readiness, and startup probes with real dependency verification.

## Understanding Kubernetes Probes

Kubernetes provides three types of probes, each serving a distinct purpose in managing container lifecycle and traffic routing.

### Liveness Probe

The liveness probe tells Kubernetes whether your application is alive and functioning. If this probe fails, Kubernetes restarts the container. Use liveness probes to detect situations where the application is running but unable to make progress, such as deadlocks or infinite loops.

**Key characteristics:**
- Fails = container restart
- Should check if the process itself is healthy
- Should NOT check external dependencies
- Should be fast and lightweight

### Readiness Probe

The readiness probe indicates whether your application is ready to receive traffic. If this probe fails, Kubernetes removes the pod from service endpoints, stopping traffic from reaching it. The container is NOT restarted.

**Key characteristics:**
- Fails = removed from service load balancer
- Should check if the application can serve requests
- SHOULD check critical dependencies
- Can fail temporarily without container restart

### Startup Probe

The startup probe is used for applications with slow startup times. While the startup probe is running, liveness and readiness probes are disabled. Once the startup probe succeeds, the other probes take over.

**Key characteristics:**
- Used for slow-starting containers
- Prevents premature liveness probe failures
- Only runs once at container startup
- Disables other probes until it succeeds

## Project Structure

Let us start by setting up a well-organized project structure for our health check implementation.

```
health-checks/
├── main.go
├── health/
│   ├── handler.go
│   ├── checker.go
│   └── dependencies.go
├── go.mod
└── k8s/
    └── deployment.yaml
```

## Basic Health Check Implementation

This minimal implementation provides simple endpoints that Kubernetes can probe. It serves as a foundation before adding dependency checks.

```go
// main.go
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync/atomic"
	"time"
)

// ready tracks whether the application is ready to serve traffic
var ready atomic.Bool

func main() {
	// Start initialization in background
	go initialize()

	// Health check endpoints
	http.HandleFunc("/healthz", livenessHandler)
	http.HandleFunc("/readyz", readinessHandler)

	// Application endpoints
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello, World!"))
	})

	log.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}

// initialize simulates application startup tasks
func initialize() {
	log.Println("Initializing application...")
	time.Sleep(5 * time.Second) // Simulate startup work
	ready.Store(true)
	log.Println("Application ready")
}

// livenessHandler responds to liveness probe requests
// Returns 200 if the process is alive
func livenessHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "alive"})
}

// readinessHandler responds to readiness probe requests
// Returns 200 only if the application is ready to serve traffic
func readinessHandler(w http.ResponseWriter, r *http.Request) {
	if !ready.Load() {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"status": "not ready"})
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
}
```

## Comprehensive Health Check System

For production applications, you need a more sophisticated health check system that can verify multiple dependencies and provide detailed status information.

### Health Check Types and Responses

Define the data structures that represent health check results and the overall system status.

```go
// health/checker.go
package health

import (
	"context"
	"sync"
	"time"
)

// Status represents the health status of a component
type Status string

const (
	StatusHealthy   Status = "healthy"
	StatusUnhealthy Status = "unhealthy"
	StatusDegraded  Status = "degraded"
)

// CheckResult contains the result of a single health check
type CheckResult struct {
	Name      string        `json:"name"`
	Status    Status        `json:"status"`
	Message   string        `json:"message,omitempty"`
	Duration  time.Duration `json:"duration_ms"`
	Timestamp time.Time     `json:"timestamp"`
}

// HealthResponse is the complete health check response
type HealthResponse struct {
	Status    Status                 `json:"status"`
	Timestamp time.Time              `json:"timestamp"`
	Checks    map[string]CheckResult `json:"checks,omitempty"`
}

// Checker defines the interface for health checks
type Checker interface {
	Name() string
	Check(ctx context.Context) CheckResult
}

// HealthService manages all health checks
type HealthService struct {
	mu       sync.RWMutex
	checkers []Checker
	timeout  time.Duration
}

// NewHealthService creates a new health service with the specified timeout
func NewHealthService(timeout time.Duration) *HealthService {
	return &HealthService{
		checkers: make([]Checker, 0),
		timeout:  timeout,
	}
}

// Register adds a new checker to the health service
func (h *HealthService) Register(checker Checker) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.checkers = append(h.checkers, checker)
}

// CheckAll runs all registered health checks concurrently
func (h *HealthService) CheckAll(ctx context.Context) HealthResponse {
	h.mu.RLock()
	checkers := make([]Checker, len(h.checkers))
	copy(checkers, h.checkers)
	h.mu.RUnlock()

	// Create context with timeout
	ctx, cancel := context.WithTimeout(ctx, h.timeout)
	defer cancel()

	// Run checks concurrently
	results := make(chan CheckResult, len(checkers))
	var wg sync.WaitGroup

	for _, checker := range checkers {
		wg.Add(1)
		go func(c Checker) {
			defer wg.Done()
			results <- c.Check(ctx)
		}(checker)
	}

	// Close results channel when all checks complete
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	response := HealthResponse{
		Status:    StatusHealthy,
		Timestamp: time.Now(),
		Checks:    make(map[string]CheckResult),
	}

	for result := range results {
		response.Checks[result.Name] = result
		if result.Status == StatusUnhealthy {
			response.Status = StatusUnhealthy
		} else if result.Status == StatusDegraded && response.Status != StatusUnhealthy {
			response.Status = StatusDegraded
		}
	}

	return response
}
```

### Database Health Check

This checker verifies database connectivity by executing a simple ping command. It includes timeout handling and connection pool status checking.

```go
// health/dependencies.go
package health

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// DatabaseChecker verifies database connectivity
type DatabaseChecker struct {
	name string
	db   *sql.DB
}

// NewDatabaseChecker creates a new database health checker
func NewDatabaseChecker(name string, db *sql.DB) *DatabaseChecker {
	return &DatabaseChecker{
		name: name,
		db:   db,
	}
}

func (d *DatabaseChecker) Name() string {
	return d.name
}

// Check performs the database health check by pinging the connection
func (d *DatabaseChecker) Check(ctx context.Context) CheckResult {
	start := time.Now()
	result := CheckResult{
		Name:      d.name,
		Timestamp: time.Now(),
	}

	// Attempt to ping the database
	if err := d.db.PingContext(ctx); err != nil {
		result.Status = StatusUnhealthy
		result.Message = fmt.Sprintf("database ping failed: %v", err)
		result.Duration = time.Since(start)
		return result
	}

	// Check connection pool stats
	stats := d.db.Stats()
	if stats.OpenConnections >= stats.MaxOpenConnections {
		result.Status = StatusDegraded
		result.Message = "connection pool exhausted"
		result.Duration = time.Since(start)
		return result
	}

	result.Status = StatusHealthy
	result.Message = fmt.Sprintf("connections: %d/%d", stats.OpenConnections, stats.MaxOpenConnections)
	result.Duration = time.Since(start)
	return result
}
```

### Redis Cache Health Check

Redis health checks should verify both connectivity and the ability to perform basic operations. This implementation tests read and write capabilities.

```go
// RedisChecker verifies Redis connectivity and basic operations
type RedisChecker struct {
	name   string
	client RedisClient
}

// RedisClient interface for Redis operations (allows for mocking)
type RedisClient interface {
	Ping(ctx context.Context) error
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Get(ctx context.Context, key string) (string, error)
}

// NewRedisChecker creates a new Redis health checker
func NewRedisChecker(name string, client RedisClient) *RedisChecker {
	return &RedisChecker{
		name:   name,
		client: client,
	}
}

func (r *RedisChecker) Name() string {
	return r.name
}

// Check performs Redis health check including a write/read test
func (r *RedisChecker) Check(ctx context.Context) CheckResult {
	start := time.Now()
	result := CheckResult{
		Name:      r.name,
		Timestamp: time.Now(),
	}

	// Test basic connectivity
	if err := r.client.Ping(ctx); err != nil {
		result.Status = StatusUnhealthy
		result.Message = fmt.Sprintf("redis ping failed: %v", err)
		result.Duration = time.Since(start)
		return result
	}

	// Test write operation with a health check key
	healthKey := "health:check"
	if err := r.client.Set(ctx, healthKey, "ok", 10*time.Second); err != nil {
		result.Status = StatusDegraded
		result.Message = fmt.Sprintf("redis write failed: %v", err)
		result.Duration = time.Since(start)
		return result
	}

	// Test read operation
	if _, err := r.client.Get(ctx, healthKey); err != nil {
		result.Status = StatusDegraded
		result.Message = fmt.Sprintf("redis read failed: %v", err)
		result.Duration = time.Since(start)
		return result
	}

	result.Status = StatusHealthy
	result.Message = "redis operational"
	result.Duration = time.Since(start)
	return result
}
```

### External API Health Check

When your application depends on external services, you need to verify their availability. This checker makes lightweight requests to external APIs.

```go
// HTTPChecker verifies external HTTP service availability
type HTTPChecker struct {
	name    string
	url     string
	client  *http.Client
	method  string
	headers map[string]string
}

// HTTPCheckerOption configures the HTTP checker
type HTTPCheckerOption func(*HTTPChecker)

// WithMethod sets the HTTP method for the health check request
func WithMethod(method string) HTTPCheckerOption {
	return func(h *HTTPChecker) {
		h.method = method
	}
}

// WithHeaders sets custom headers for the health check request
func WithHeaders(headers map[string]string) HTTPCheckerOption {
	return func(h *HTTPChecker) {
		h.headers = headers
	}
}

// WithTimeout sets a custom timeout for the HTTP client
func WithTimeout(timeout time.Duration) HTTPCheckerOption {
	return func(h *HTTPChecker) {
		h.client.Timeout = timeout
	}
}

// NewHTTPChecker creates a new HTTP health checker
func NewHTTPChecker(name, url string, opts ...HTTPCheckerOption) *HTTPChecker {
	checker := &HTTPChecker{
		name:   name,
		url:    url,
		method: "GET",
		client: &http.Client{Timeout: 5 * time.Second},
	}

	for _, opt := range opts {
		opt(checker)
	}

	return checker
}

func (h *HTTPChecker) Name() string {
	return h.name
}

// Check performs the HTTP health check
func (h *HTTPChecker) Check(ctx context.Context) CheckResult {
	start := time.Now()
	result := CheckResult{
		Name:      h.name,
		Timestamp: time.Now(),
	}

	// Create request with context
	req, err := http.NewRequestWithContext(ctx, h.method, h.url, nil)
	if err != nil {
		result.Status = StatusUnhealthy
		result.Message = fmt.Sprintf("failed to create request: %v", err)
		result.Duration = time.Since(start)
		return result
	}

	// Add custom headers
	for key, value := range h.headers {
		req.Header.Set(key, value)
	}

	// Execute request
	resp, err := h.client.Do(req)
	if err != nil {
		result.Status = StatusUnhealthy
		result.Message = fmt.Sprintf("request failed: %v", err)
		result.Duration = time.Since(start)
		return result
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode >= 500 {
		result.Status = StatusUnhealthy
		result.Message = fmt.Sprintf("service returned %d", resp.StatusCode)
	} else if resp.StatusCode >= 400 {
		result.Status = StatusDegraded
		result.Message = fmt.Sprintf("service returned %d", resp.StatusCode)
	} else {
		result.Status = StatusHealthy
		result.Message = fmt.Sprintf("service returned %d", resp.StatusCode)
	}

	result.Duration = time.Since(start)
	return result
}
```

### HTTP Handler for Health Endpoints

Create HTTP handlers that expose health check endpoints with proper response codes and detailed information.

```go
// health/handler.go
package health

import (
	"encoding/json"
	"net/http"
	"sync/atomic"
)

// Handler provides HTTP handlers for health endpoints
type Handler struct {
	service       *HealthService
	ready         *atomic.Bool
	startupDone   *atomic.Bool
	livenessCheck func() bool
}

// NewHandler creates a new health handler
func NewHandler(service *HealthService) *Handler {
	ready := &atomic.Bool{}
	startupDone := &atomic.Bool{}
	return &Handler{
		service:     service,
		ready:       ready,
		startupDone: startupDone,
		livenessCheck: func() bool {
			return true // Default: always alive
		},
	}
}

// SetReady marks the application as ready to receive traffic
func (h *Handler) SetReady(isReady bool) {
	h.ready.Store(isReady)
}

// SetStartupComplete marks startup as complete
func (h *Handler) SetStartupComplete() {
	h.startupDone.Store(true)
}

// SetLivenessCheck sets a custom liveness check function
func (h *Handler) SetLivenessCheck(check func() bool) {
	h.livenessCheck = check
}

// LivenessHandler handles liveness probe requests
// Returns 200 if the application is alive, 503 otherwise
func (h *Handler) LivenessHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if !h.livenessCheck() {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "unhealthy",
			"message": "liveness check failed",
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "alive",
	})
}

// ReadinessHandler handles readiness probe requests
// Checks all registered dependencies before reporting ready
func (h *Handler) ReadinessHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check if marked as not ready
	if !h.ready.Load() {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "not ready",
			"message": "application not ready",
		})
		return
	}

	// Run all dependency checks
	response := h.service.CheckAll(r.Context())

	if response.Status != StatusHealthy {
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	json.NewEncoder(w).Encode(response)
}

// StartupHandler handles startup probe requests
func (h *Handler) StartupHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if !h.startupDone.Load() {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "starting",
			"message": "application still initializing",
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "started",
	})
}
```

## Complete Application Example

Here is a complete example that ties everything together, demonstrating how to wire up the health check system with real dependencies.

```go
// main.go
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
	// Initialize health service with 5-second timeout for checks
	healthService := health.NewHealthService(5 * time.Second)
	healthHandler := health.NewHandler(healthService)

	// Connect to database
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Register database health check
	healthService.Register(health.NewDatabaseChecker("postgres", db))

	// Register external API health check
	healthService.Register(health.NewHTTPChecker(
		"payment-api",
		os.Getenv("PAYMENT_API_URL")+"/health",
		health.WithTimeout(3*time.Second),
	))

	// Create HTTP server
	mux := http.NewServeMux()

	// Health check endpoints
	mux.HandleFunc("/healthz", healthHandler.LivenessHandler)
	mux.HandleFunc("/readyz", healthHandler.ReadinessHandler)
	mux.HandleFunc("/startupz", healthHandler.StartupHandler)

	// Application endpoints
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Application is running"))
	})

	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// Run initialization in background
	go func() {
		log.Println("Starting initialization...")

		// Verify database connection
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := db.PingContext(ctx); err != nil {
			log.Printf("Database not ready: %v", err)
			return
		}

		// Run migrations, warm caches, etc.
		time.Sleep(5 * time.Second) // Simulate initialization

		// Mark startup as complete and ready for traffic
		healthHandler.SetStartupComplete()
		healthHandler.SetReady(true)
		log.Println("Application initialized and ready")
	}()

	// Graceful shutdown handling
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutdown signal received")

		// Mark as not ready to stop receiving new traffic
		healthHandler.SetReady(false)

		// Give load balancer time to update
		time.Sleep(5 * time.Second)

		// Shutdown server with timeout
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	log.Println("Starting server on :8080")
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
	log.Println("Server stopped")
}
```

## Kubernetes Deployment Configuration

Configure your Kubernetes deployment with appropriate probe settings. The values should be tuned based on your application's characteristics.

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: database-url
            - name: PAYMENT_API_URL
              value: "https://api.payment.example.com"
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"

          # Startup probe for slow-starting applications
          # Allows up to 5 minutes for startup (30 * 10s)
          startupProbe:
            httpGet:
              path: /startupz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 30

          # Liveness probe to detect deadlocks and hangs
          # Restarts container after 3 consecutive failures
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3

          # Readiness probe to control traffic routing
          # Removes from service after 3 consecutive failures
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 5
            timeoutSeconds: 5
            failureThreshold: 3
            successThreshold: 1

      # Graceful shutdown configuration
      terminationGracePeriodSeconds: 60
```

## Advanced Patterns

### Circuit Breaker for Dependency Checks

When checking external dependencies, implement circuit breaker patterns to prevent cascading failures and reduce load on struggling services.

```go
// CircuitBreakerChecker wraps a checker with circuit breaker logic
type CircuitBreakerChecker struct {
	checker       Checker
	failures      int
	threshold     int
	resetTimeout  time.Duration
	lastFailure   time.Time
	state         string // closed, open, half-open
	mu            sync.RWMutex
}

// NewCircuitBreakerChecker wraps a checker with circuit breaker protection
func NewCircuitBreakerChecker(checker Checker, threshold int, resetTimeout time.Duration) *CircuitBreakerChecker {
	return &CircuitBreakerChecker{
		checker:      checker,
		threshold:    threshold,
		resetTimeout: resetTimeout,
		state:        "closed",
	}
}

func (c *CircuitBreakerChecker) Name() string {
	return c.checker.Name()
}

// Check executes the health check with circuit breaker logic
func (c *CircuitBreakerChecker) Check(ctx context.Context) CheckResult {
	c.mu.Lock()
	defer c.mu.Unlock()

	// If circuit is open, check if we should try again
	if c.state == "open" {
		if time.Since(c.lastFailure) > c.resetTimeout {
			c.state = "half-open"
		} else {
			return CheckResult{
				Name:      c.checker.Name(),
				Status:    StatusUnhealthy,
				Message:   "circuit breaker open",
				Timestamp: time.Now(),
			}
		}
	}

	// Execute the actual check
	result := c.checker.Check(ctx)

	// Update circuit breaker state based on result
	if result.Status == StatusUnhealthy {
		c.failures++
		c.lastFailure = time.Now()

		if c.failures >= c.threshold {
			c.state = "open"
		}
	} else {
		c.failures = 0
		c.state = "closed"
	}

	return result
}
```

### Cached Health Checks

For expensive health checks, implement caching to reduce load while maintaining responsiveness.

```go
// CachedChecker caches health check results for a specified duration
type CachedChecker struct {
	checker    Checker
	cacheTTL   time.Duration
	lastResult CheckResult
	lastCheck  time.Time
	mu         sync.RWMutex
}

// NewCachedChecker wraps a checker with result caching
func NewCachedChecker(checker Checker, cacheTTL time.Duration) *CachedChecker {
	return &CachedChecker{
		checker:  checker,
		cacheTTL: cacheTTL,
	}
}

func (c *CachedChecker) Name() string {
	return c.checker.Name()
}

// Check returns cached result if valid, otherwise performs new check
func (c *CachedChecker) Check(ctx context.Context) CheckResult {
	c.mu.RLock()
	if time.Since(c.lastCheck) < c.cacheTTL {
		result := c.lastResult
		c.mu.RUnlock()
		return result
	}
	c.mu.RUnlock()

	// Perform fresh check
	c.mu.Lock()
	defer c.mu.Unlock()

	// Double-check after acquiring write lock
	if time.Since(c.lastCheck) < c.cacheTTL {
		return c.lastResult
	}

	c.lastResult = c.checker.Check(ctx)
	c.lastCheck = time.Now()
	return c.lastResult
}
```

### Weighted Health Checks

Some dependencies are more critical than others. Implement weighted checks to differentiate between critical and optional services.

```go
// WeightedHealthService provides weighted health checking
type WeightedHealthService struct {
	*HealthService
	weights map[string]int // 0 = optional, 1 = degraded if unhealthy, 2 = fail if unhealthy
}

// NewWeightedHealthService creates a weighted health service
func NewWeightedHealthService(timeout time.Duration) *WeightedHealthService {
	return &WeightedHealthService{
		HealthService: NewHealthService(timeout),
		weights:       make(map[string]int),
	}
}

// RegisterWithWeight registers a checker with a specific weight
// weight: 0 = optional (ignore failures), 1 = important (degrade on failure), 2 = critical (fail on failure)
func (w *WeightedHealthService) RegisterWithWeight(checker Checker, weight int) {
	w.Register(checker)
	w.weights[checker.Name()] = weight
}

// CheckAllWeighted performs weighted health evaluation
func (w *WeightedHealthService) CheckAllWeighted(ctx context.Context) HealthResponse {
	response := w.CheckAll(ctx)

	// Re-evaluate status based on weights
	response.Status = StatusHealthy
	for name, result := range response.Checks {
		weight := w.weights[name]

		if result.Status == StatusUnhealthy {
			switch weight {
			case 2: // Critical
				response.Status = StatusUnhealthy
			case 1: // Important
				if response.Status != StatusUnhealthy {
					response.Status = StatusDegraded
				}
			// case 0: Optional - ignore
			}
		}
	}

	return response
}
```

## Best Practices for Production

### 1. Keep Liveness Probes Simple

Liveness probes should only check if the process is alive and responsive. Avoid checking external dependencies in liveness probes, as a database outage should not cause all your pods to restart.

```go
// Good: Simple liveness check
func livenessHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

// Bad: Liveness check that queries database
func badLivenessHandler(w http.ResponseWriter, r *http.Request) {
	if err := db.Ping(); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)
}
```

### 2. Set Appropriate Timeouts

Configure timeouts that match your application's behavior. Health check timeouts should be shorter than the probe timeout configured in Kubernetes.

```go
// Health check timeout should be less than Kubernetes probe timeout
healthService := health.NewHealthService(3 * time.Second) // K8s timeout is 5s
```

### 3. Implement Graceful Shutdown

Mark your application as not ready before shutting down to drain existing connections gracefully.

```go
// Signal handler for graceful shutdown
go func() {
	<-sigChan
	// Stop accepting new traffic
	healthHandler.SetReady(false)
	// Wait for load balancer to update (match your K8s readiness probe period)
	time.Sleep(10 * time.Second)
	// Shutdown server
	server.Shutdown(ctx)
}()
```

### 4. Use Startup Probes for Slow Applications

If your application takes more than a few seconds to start, use startup probes to prevent premature liveness probe failures.

```yaml
startupProbe:
  httpGet:
    path: /startupz
    port: 8080
  failureThreshold: 30
  periodSeconds: 10
  # Total startup time allowed: 30 * 10 = 300 seconds
```

### 5. Log Health Check Status Changes

Log transitions between healthy and unhealthy states to aid in debugging and monitoring.

```go
// LoggingChecker wraps a checker and logs status changes
type LoggingChecker struct {
	checker    Checker
	lastStatus Status
	logger     *log.Logger
	mu         sync.RWMutex
}

func (l *LoggingChecker) Check(ctx context.Context) CheckResult {
	result := l.checker.Check(ctx)

	l.mu.Lock()
	defer l.mu.Unlock()

	if result.Status != l.lastStatus {
		l.logger.Printf("Health check %s changed: %s -> %s (%s)",
			result.Name, l.lastStatus, result.Status, result.Message)
		l.lastStatus = result.Status
	}

	return result
}
```

### 6. Avoid Expensive Operations

Health checks run frequently. Avoid operations that are resource-intensive or could affect application performance.

```go
// Bad: Full table scan on every health check
func (d *DatabaseChecker) Check(ctx context.Context) CheckResult {
	var count int
	d.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM large_table").Scan(&count)
	// ...
}

// Good: Simple connectivity check
func (d *DatabaseChecker) Check(ctx context.Context) CheckResult {
	err := d.db.PingContext(ctx)
	// ...
}
```

### 7. Monitor Health Check Metrics

Export health check metrics to your monitoring system for visibility into dependency health over time.

```go
// MetricsChecker wraps a checker and exports Prometheus metrics
type MetricsChecker struct {
	checker  Checker
	duration prometheus.Histogram
	status   *prometheus.GaugeVec
}

func (m *MetricsChecker) Check(ctx context.Context) CheckResult {
	result := m.checker.Check(ctx)

	// Record duration
	m.duration.Observe(result.Duration.Seconds())

	// Record status (1 = healthy, 0 = unhealthy)
	statusValue := 0.0
	if result.Status == StatusHealthy {
		statusValue = 1.0
	}
	m.status.WithLabelValues(result.Name).Set(statusValue)

	return result
}
```

## Summary

Implementing robust health checks in Go for Kubernetes involves understanding the distinct purposes of liveness, readiness, and startup probes. Keep liveness probes simple to detect process failures, use readiness probes with dependency checks to control traffic routing, and leverage startup probes for applications with slow initialization.

Key takeaways:
- Liveness probes should not check external dependencies
- Readiness probes should verify all critical dependencies
- Use startup probes to handle slow-starting applications
- Implement graceful shutdown by marking pods as not ready before terminating
- Run dependency checks concurrently with appropriate timeouts
- Consider circuit breakers and caching for expensive or unreliable checks
- Monitor health check metrics to track dependency health over time

With these patterns in place, your Go applications will integrate seamlessly with Kubernetes orchestration, providing reliable service discovery and automatic recovery from failures.
