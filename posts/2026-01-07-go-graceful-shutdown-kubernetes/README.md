# How to Implement Graceful Shutdown in Go for Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Kubernetes, Graceful Shutdown, DevOps, Reliability

Description: Implement proper graceful shutdown in Go applications for Kubernetes with signal handling, connection draining, and health probe transitions.

---

When running Go applications in Kubernetes, graceful shutdown is not just a nice-to-have feature - it is essential for maintaining service reliability. Without proper shutdown handling, your application might terminate abruptly during deployments, scaling events, or node maintenance, leading to dropped connections, lost requests, and poor user experience.

This guide covers everything you need to implement production-ready graceful shutdown in your Go applications for Kubernetes environments.

## Understanding the Kubernetes Shutdown Lifecycle

Before diving into code, it is crucial to understand what happens when Kubernetes terminates a pod:

1. **Pod marked for termination**: Kubernetes updates the pod status and removes it from Service endpoints
2. **preStop hook execution**: If configured, the preStop hook runs first
3. **SIGTERM sent**: Kubernetes sends SIGTERM to the main container process
4. **Grace period countdown**: The `terminationGracePeriodSeconds` timer starts (default: 30 seconds)
5. **SIGKILL sent**: If the process has not exited, Kubernetes sends SIGKILL

The key insight is that your application needs to handle SIGTERM properly and complete shutdown before the grace period expires.

## Signal Handling in Go

The foundation of graceful shutdown is proper signal handling. Go provides the `os/signal` package for this purpose.

### Basic Signal Handler

The following code demonstrates a minimal signal handler that catches SIGTERM and SIGINT signals:

```go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    // Create a channel to receive OS signals
    // Buffer size of 1 ensures we don't miss the signal
    sigChan := make(chan os.Signal, 1)

    // Register for SIGTERM (Kubernetes) and SIGINT (Ctrl+C)
    signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

    // Start your application logic here
    fmt.Println("Application started. Press Ctrl+C to stop.")

    // Block until we receive a signal
    sig := <-sigChan
    fmt.Printf("Received signal: %v\n", sig)

    // Create a context with timeout for graceful shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Perform graceful shutdown
    if err := gracefulShutdown(ctx); err != nil {
        fmt.Printf("Graceful shutdown failed: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("Shutdown complete")
}

func gracefulShutdown(ctx context.Context) error {
    // Shutdown logic goes here
    fmt.Println("Performing graceful shutdown...")
    return nil
}
```

### Production-Ready Signal Handler

For production applications, you need a more robust signal handler that integrates with your server lifecycle:

```go
package main

import (
    "context"
    "errors"
    "log"
    "net/http"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

// Application holds all components that need graceful shutdown
type Application struct {
    httpServer    *http.Server
    shutdownOnce  sync.Once
    isShuttingDown bool
    mu            sync.RWMutex
}

func NewApplication() *Application {
    return &Application{}
}

// IsShuttingDown returns true if the application is in shutdown mode
func (a *Application) IsShuttingDown() bool {
    a.mu.RLock()
    defer a.mu.RUnlock()
    return a.isShuttingDown
}

// SetShuttingDown marks the application as shutting down
func (a *Application) SetShuttingDown() {
    a.mu.Lock()
    defer a.mu.Unlock()
    a.isShuttingDown = true
}

func main() {
    app := NewApplication()

    // Setup signal handling with context
    ctx, stop := signal.NotifyContext(context.Background(),
        syscall.SIGTERM, syscall.SIGINT)
    defer stop()

    // Start the HTTP server in a goroutine
    go func() {
        if err := app.StartServer(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            log.Fatalf("Server error: %v", err)
        }
    }()

    log.Println("Server started on :8080")

    // Wait for shutdown signal
    <-ctx.Done()
    log.Println("Shutdown signal received")

    // Perform graceful shutdown
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
    defer cancel()

    if err := app.Shutdown(shutdownCtx); err != nil {
        log.Printf("Shutdown error: %v", err)
        os.Exit(1)
    }

    log.Println("Graceful shutdown completed")
}
```

## HTTP Server Graceful Shutdown

Go's `net/http` package has built-in support for graceful shutdown through the `Shutdown` method.

### Basic HTTP Server Shutdown

The `http.Server.Shutdown` method stops accepting new connections and waits for existing requests to complete:

```go
package main

import (
    "context"
    "errors"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    // Create the HTTP server with timeouts
    server := &http.Server{
        Addr:         ":8080",
        Handler:      setupRoutes(),
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Channel to signal server errors
    serverErrors := make(chan error, 1)

    // Start server in a goroutine
    go func() {
        log.Println("Starting server on :8080")
        serverErrors <- server.ListenAndServe()
    }()

    // Setup signal handling
    shutdown := make(chan os.Signal, 1)
    signal.Notify(shutdown, syscall.SIGTERM, syscall.SIGINT)

    // Block until signal or server error
    select {
    case err := <-serverErrors:
        if !errors.Is(err, http.ErrServerClosed) {
            log.Fatalf("Server error: %v", err)
        }
    case sig := <-shutdown:
        log.Printf("Shutdown started due to %v signal", sig)

        // Give outstanding requests 25 seconds to complete
        ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
        defer cancel()

        // Attempt graceful shutdown
        if err := server.Shutdown(ctx); err != nil {
            log.Printf("Graceful shutdown failed: %v", err)
            // Force close if graceful shutdown fails
            if err := server.Close(); err != nil {
                log.Printf("Force close failed: %v", err)
            }
        }
    }

    log.Println("Server stopped")
}

func setupRoutes() http.Handler {
    mux := http.NewServeMux()

    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello, World!"))
    })

    // Simulate a long-running request for testing
    mux.HandleFunc("/slow", func(w http.ResponseWriter, r *http.Request) {
        time.Sleep(10 * time.Second)
        w.Write([]byte("Slow response"))
    })

    return mux
}
```

### Server with Request Tracking

For more control over in-flight requests, you can implement request tracking:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "sync"
    "sync/atomic"
    "time"
)

// RequestTracker monitors in-flight requests
type RequestTracker struct {
    inFlight int64
    wg       sync.WaitGroup
}

func NewRequestTracker() *RequestTracker {
    return &RequestTracker{}
}

// Increment adds a request to tracking
func (rt *RequestTracker) Increment() {
    atomic.AddInt64(&rt.inFlight, 1)
    rt.wg.Add(1)
}

// Decrement removes a request from tracking
func (rt *RequestTracker) Decrement() {
    atomic.AddInt64(&rt.inFlight, -1)
    rt.wg.Done()
}

// InFlight returns the current number of in-flight requests
func (rt *RequestTracker) InFlight() int64 {
    return atomic.LoadInt64(&rt.inFlight)
}

// Wait blocks until all tracked requests complete
func (rt *RequestTracker) Wait() {
    rt.wg.Wait()
}

// TrackingMiddleware wraps handlers to track requests
func (rt *RequestTracker) TrackingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        rt.Increment()
        defer rt.Decrement()
        next.ServeHTTP(w, r)
    })
}

// GracefulServer wraps http.Server with request tracking
type GracefulServer struct {
    server  *http.Server
    tracker *RequestTracker
}

func NewGracefulServer(addr string, handler http.Handler) *GracefulServer {
    tracker := NewRequestTracker()

    return &GracefulServer{
        server: &http.Server{
            Addr:         addr,
            Handler:      tracker.TrackingMiddleware(handler),
            ReadTimeout:  15 * time.Second,
            WriteTimeout: 15 * time.Second,
        },
        tracker: tracker,
    }
}

func (gs *GracefulServer) ListenAndServe() error {
    return gs.server.ListenAndServe()
}

// Shutdown performs graceful shutdown with request draining
func (gs *GracefulServer) Shutdown(ctx context.Context) error {
    log.Printf("Starting shutdown with %d in-flight requests", gs.tracker.InFlight())

    // First, stop accepting new connections
    if err := gs.server.Shutdown(ctx); err != nil {
        return err
    }

    // Wait for tracked requests with context
    done := make(chan struct{})
    go func() {
        gs.tracker.Wait()
        close(done)
    }()

    select {
    case <-done:
        log.Println("All requests drained successfully")
        return nil
    case <-ctx.Done():
        log.Printf("Shutdown timeout with %d requests remaining", gs.tracker.InFlight())
        return ctx.Err()
    }
}
```

## Connection Draining Strategies

Connection draining ensures that existing connections complete their work before the server shuts down.

### Strategy 1: Time-Based Draining

Allow a fixed time for connections to drain before forcing closure:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "time"
)

// DrainConfig holds configuration for connection draining
type DrainConfig struct {
    // Initial delay before starting shutdown (for load balancer updates)
    PreShutdownDelay time.Duration
    // Maximum time to wait for connections to drain
    DrainTimeout time.Duration
    // Time between drain progress logs
    LogInterval time.Duration
}

func DefaultDrainConfig() DrainConfig {
    return DrainConfig{
        PreShutdownDelay: 5 * time.Second,
        DrainTimeout:     20 * time.Second,
        LogInterval:      2 * time.Second,
    }
}

// DrainableServer implements connection draining
type DrainableServer struct {
    server  *http.Server
    tracker *RequestTracker
    config  DrainConfig
}

func (ds *DrainableServer) Shutdown(ctx context.Context) error {
    // Phase 1: Pre-shutdown delay
    // This allows load balancers to remove this instance from rotation
    log.Printf("Pre-shutdown delay: %v", ds.config.PreShutdownDelay)
    select {
    case <-time.After(ds.config.PreShutdownDelay):
    case <-ctx.Done():
        return ctx.Err()
    }

    // Phase 2: Stop accepting new connections
    log.Println("Stopping new connections...")
    shutdownComplete := make(chan error, 1)
    go func() {
        shutdownComplete <- ds.server.Shutdown(ctx)
    }()

    // Phase 3: Wait for existing connections with progress logging
    ticker := time.NewTicker(ds.config.LogInterval)
    defer ticker.Stop()

    drainDeadline := time.After(ds.config.DrainTimeout)

    for {
        select {
        case err := <-shutdownComplete:
            if err != nil {
                return err
            }
            log.Println("Server shutdown complete, all connections drained")
            return nil
        case <-ticker.C:
            log.Printf("Draining... %d connections remaining", ds.tracker.InFlight())
        case <-drainDeadline:
            log.Println("Drain timeout reached, forcing closure")
            return ds.server.Close()
        case <-ctx.Done():
            return ctx.Err()
        }
    }
}
```

### Strategy 2: Active Connection Management

For applications with long-lived connections (WebSockets, gRPC streams), implement active connection management:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "sync"
)

// ConnectionManager tracks and manages active connections
type ConnectionManager struct {
    connections map[string]context.CancelFunc
    mu          sync.RWMutex
}

func NewConnectionManager() *ConnectionManager {
    return &ConnectionManager{
        connections: make(map[string]context.CancelFunc),
    }
}

// Register adds a new connection with its cancel function
func (cm *ConnectionManager) Register(id string, cancel context.CancelFunc) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    cm.connections[id] = cancel
}

// Unregister removes a connection
func (cm *ConnectionManager) Unregister(id string) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    delete(cm.connections, id)
}

// Count returns the number of active connections
func (cm *ConnectionManager) Count() int {
    cm.mu.RLock()
    defer cm.mu.RUnlock()
    return len(cm.connections)
}

// CloseAll cancels all active connections
func (cm *ConnectionManager) CloseAll() {
    cm.mu.Lock()
    defer cm.mu.Unlock()

    for id, cancel := range cm.connections {
        log.Printf("Closing connection: %s", id)
        cancel()
    }

    // Clear the map
    cm.connections = make(map[string]context.CancelFunc)
}

// ConnectionAwareHandler wraps handlers with connection lifecycle management
func ConnectionAwareHandler(cm *ConnectionManager) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Generate unique connection ID
            connID := r.RemoteAddr + "-" + r.Header.Get("X-Request-ID")

            // Create cancellable context for this connection
            ctx, cancel := context.WithCancel(r.Context())
            defer cancel()

            // Register connection
            cm.Register(connID, cancel)
            defer cm.Unregister(connID)

            // Serve with the cancellable context
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

## Health Probe Transitions

Kubernetes uses health probes to determine pod health. During shutdown, you need to transition probes appropriately.

### Implementing Health Endpoints

Create separate liveness and readiness probes that respond differently during shutdown:

```go
package main

import (
    "encoding/json"
    "net/http"
    "sync/atomic"
    "time"
)

// HealthStatus represents the current health state
type HealthStatus struct {
    Status    string    `json:"status"`
    Timestamp time.Time `json:"timestamp"`
    Details   string    `json:"details,omitempty"`
}

// HealthManager manages application health state
type HealthManager struct {
    // ready indicates if the app is ready to receive traffic
    ready int32
    // alive indicates if the app is running (not deadlocked)
    alive int32
    // shutdownStarted indicates shutdown has begun
    shutdownStarted int32
}

func NewHealthManager() *HealthManager {
    hm := &HealthManager{}
    // Application starts as alive but not ready
    atomic.StoreInt32(&hm.alive, 1)
    return hm
}

// SetReady marks the application as ready to receive traffic
func (hm *HealthManager) SetReady() {
    atomic.StoreInt32(&hm.ready, 1)
}

// SetNotReady marks the application as not ready (e.g., during shutdown)
func (hm *HealthManager) SetNotReady() {
    atomic.StoreInt32(&hm.ready, 0)
}

// SetShutdownStarted marks that shutdown has begun
func (hm *HealthManager) SetShutdownStarted() {
    atomic.StoreInt32(&hm.shutdownStarted, 1)
    atomic.StoreInt32(&hm.ready, 0)
}

// IsReady returns true if the application is ready
func (hm *HealthManager) IsReady() bool {
    return atomic.LoadInt32(&hm.ready) == 1
}

// IsAlive returns true if the application is alive
func (hm *HealthManager) IsAlive() bool {
    return atomic.LoadInt32(&hm.alive) == 1
}

// IsShuttingDown returns true if shutdown has started
func (hm *HealthManager) IsShuttingDown() bool {
    return atomic.LoadInt32(&hm.shutdownStarted) == 1
}

// LivenessHandler returns HTTP handler for liveness probe
func (hm *HealthManager) LivenessHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        status := HealthStatus{
            Timestamp: time.Now(),
        }

        if hm.IsAlive() {
            status.Status = "alive"
            w.WriteHeader(http.StatusOK)
        } else {
            status.Status = "dead"
            status.Details = "Application is not responding"
            w.WriteHeader(http.StatusServiceUnavailable)
        }

        json.NewEncoder(w).Encode(status)
    }
}

// ReadinessHandler returns HTTP handler for readiness probe
func (hm *HealthManager) ReadinessHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        status := HealthStatus{
            Timestamp: time.Now(),
        }

        if hm.IsShuttingDown() {
            status.Status = "shutting_down"
            status.Details = "Application is shutting down"
            w.WriteHeader(http.StatusServiceUnavailable)
        } else if hm.IsReady() {
            status.Status = "ready"
            w.WriteHeader(http.StatusOK)
        } else {
            status.Status = "not_ready"
            status.Details = "Application is starting up"
            w.WriteHeader(http.StatusServiceUnavailable)
        }

        json.NewEncoder(w).Encode(status)
    }
}
```

### Startup Probe Handler

For applications with slow startup, implement a startup probe:

```go
// StartupHandler returns HTTP handler for startup probe
func (hm *HealthManager) StartupHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        status := HealthStatus{
            Timestamp: time.Now(),
        }

        // Startup probe only cares if the app has started
        // It should return success once initialization is complete
        if hm.IsAlive() {
            status.Status = "started"
            w.WriteHeader(http.StatusOK)
        } else {
            status.Status = "starting"
            w.WriteHeader(http.StatusServiceUnavailable)
        }

        json.NewEncoder(w).Encode(status)
    }
}
```

## Kubernetes Configuration

Proper Kubernetes configuration is essential for graceful shutdown to work correctly.

### Pod Specification with PreStop Hook

The preStop hook provides additional time for load balancers to update before SIGTERM is sent:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: go-app
  template:
    metadata:
      labels:
        app: go-app
    spec:
      # Allow 60 seconds for graceful shutdown
      terminationGracePeriodSeconds: 60
      containers:
      - name: go-app
        image: your-registry/go-app:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: health

        # Liveness probe - is the app alive?
        livenessProbe:
          httpGet:
            path: /health/live
            port: health
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe - is the app ready for traffic?
        readinessProbe:
          httpGet:
            path: /health/ready
            port: health
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

        # Startup probe - has the app started?
        startupProbe:
          httpGet:
            path: /health/startup
            port: health
          initialDelaySeconds: 0
          periodSeconds: 2
          timeoutSeconds: 2
          failureThreshold: 30

        # PreStop hook - delay before SIGTERM
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - "sleep 10"

        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
```

### Understanding terminationGracePeriodSeconds

The `terminationGracePeriodSeconds` value should account for:

1. preStop hook execution time
2. Time for your application to complete shutdown
3. Buffer for unexpected delays

The recommended formula is:

```
terminationGracePeriodSeconds = preStopDelay + applicationShutdownTime + buffer
```

For the configuration above: 60 = 10 (preStop) + 40 (app shutdown) + 10 (buffer)

## Complete Production Example

Here is a complete, production-ready example that ties everything together:

```go
package main

import (
    "context"
    "encoding/json"
    "errors"
    "log"
    "net/http"
    "os"
    "os/signal"
    "sync"
    "sync/atomic"
    "syscall"
    "time"
)

// Config holds application configuration
type Config struct {
    ServerAddr       string
    HealthAddr       string
    PreShutdownDelay time.Duration
    ShutdownTimeout  time.Duration
    ReadTimeout      time.Duration
    WriteTimeout     time.Duration
}

func DefaultConfig() Config {
    return Config{
        ServerAddr:       ":8080",
        HealthAddr:       ":8081",
        PreShutdownDelay: 5 * time.Second,
        ShutdownTimeout:  25 * time.Second,
        ReadTimeout:      15 * time.Second,
        WriteTimeout:     15 * time.Second,
    }
}

// Application represents the main application
type Application struct {
    config        Config
    mainServer    *http.Server
    healthServer  *http.Server
    health        *HealthManager
    tracker       *RequestTracker
    shutdownOnce  sync.Once
}

// HealthManager manages health state
type HealthManager struct {
    ready           int32
    alive           int32
    shutdownStarted int32
}

func NewHealthManager() *HealthManager {
    hm := &HealthManager{}
    atomic.StoreInt32(&hm.alive, 1)
    return hm
}

func (hm *HealthManager) SetReady()           { atomic.StoreInt32(&hm.ready, 1) }
func (hm *HealthManager) SetNotReady()        { atomic.StoreInt32(&hm.ready, 0) }
func (hm *HealthManager) SetShutdownStarted() {
    atomic.StoreInt32(&hm.shutdownStarted, 1)
    atomic.StoreInt32(&hm.ready, 0)
}
func (hm *HealthManager) IsReady() bool       { return atomic.LoadInt32(&hm.ready) == 1 }
func (hm *HealthManager) IsAlive() bool       { return atomic.LoadInt32(&hm.alive) == 1 }
func (hm *HealthManager) IsShuttingDown() bool {
    return atomic.LoadInt32(&hm.shutdownStarted) == 1
}

// RequestTracker tracks in-flight requests
type RequestTracker struct {
    inFlight int64
    wg       sync.WaitGroup
}

func NewRequestTracker() *RequestTracker {
    return &RequestTracker{}
}

func (rt *RequestTracker) Increment() {
    atomic.AddInt64(&rt.inFlight, 1)
    rt.wg.Add(1)
}

func (rt *RequestTracker) Decrement() {
    atomic.AddInt64(&rt.inFlight, -1)
    rt.wg.Done()
}

func (rt *RequestTracker) InFlight() int64 {
    return atomic.LoadInt64(&rt.inFlight)
}

func (rt *RequestTracker) Wait() {
    rt.wg.Wait()
}

// NewApplication creates a new application instance
func NewApplication(config Config) *Application {
    app := &Application{
        config:  config,
        health:  NewHealthManager(),
        tracker: NewRequestTracker(),
    }

    // Setup main server
    mainMux := http.NewServeMux()
    mainMux.HandleFunc("/", app.handleRoot)
    mainMux.HandleFunc("/api/data", app.handleAPIData)

    app.mainServer = &http.Server{
        Addr:         config.ServerAddr,
        Handler:      app.requestTrackingMiddleware(mainMux),
        ReadTimeout:  config.ReadTimeout,
        WriteTimeout: config.WriteTimeout,
    }

    // Setup health server on separate port
    healthMux := http.NewServeMux()
    healthMux.HandleFunc("/health/live", app.handleLiveness)
    healthMux.HandleFunc("/health/ready", app.handleReadiness)
    healthMux.HandleFunc("/health/startup", app.handleStartup)

    app.healthServer = &http.Server{
        Addr:    config.HealthAddr,
        Handler: healthMux,
    }

    return app
}

// requestTrackingMiddleware tracks in-flight requests
func (app *Application) requestTrackingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Reject new requests during shutdown
        if app.health.IsShuttingDown() {
            http.Error(w, "Service is shutting down", http.StatusServiceUnavailable)
            return
        }

        app.tracker.Increment()
        defer app.tracker.Decrement()
        next.ServeHTTP(w, r)
    })
}

// Handler implementations
func (app *Application) handleRoot(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "message": "Hello from Go graceful shutdown demo",
        "status":  "ok",
    })
}

func (app *Application) handleAPIData(w http.ResponseWriter, r *http.Request) {
    // Simulate some processing
    time.Sleep(100 * time.Millisecond)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "data":      "sample data",
        "timestamp": time.Now().Unix(),
    })
}

func (app *Application) handleLiveness(w http.ResponseWriter, r *http.Request) {
    if app.health.IsAlive() {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "alive"})
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{"status": "dead"})
    }
}

func (app *Application) handleReadiness(w http.ResponseWriter, r *http.Request) {
    if app.health.IsShuttingDown() {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{
            "status": "shutting_down",
        })
    } else if app.health.IsReady() {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{"status": "not_ready"})
    }
}

func (app *Application) handleStartup(w http.ResponseWriter, r *http.Request) {
    if app.health.IsAlive() {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "started"})
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{"status": "starting"})
    }
}

// Start begins the application
func (app *Application) Start() error {
    // Start health server
    go func() {
        log.Printf("Health server starting on %s", app.config.HealthAddr)
        if err := app.healthServer.ListenAndServe(); err != nil &&
           !errors.Is(err, http.ErrServerClosed) {
            log.Printf("Health server error: %v", err)
        }
    }()

    // Simulate startup initialization
    time.Sleep(1 * time.Second)

    // Mark as ready
    app.health.SetReady()
    log.Println("Application is ready to receive traffic")

    // Start main server (blocking)
    log.Printf("Main server starting on %s", app.config.ServerAddr)
    return app.mainServer.ListenAndServe()
}

// Shutdown gracefully shuts down the application
func (app *Application) Shutdown(ctx context.Context) error {
    var shutdownErr error

    app.shutdownOnce.Do(func() {
        log.Println("Beginning graceful shutdown sequence...")

        // Step 1: Mark as shutting down (readiness probe will fail)
        app.health.SetShutdownStarted()
        log.Println("Readiness probe now returning unavailable")

        // Step 2: Pre-shutdown delay for load balancer updates
        log.Printf("Waiting %v for load balancer updates...", app.config.PreShutdownDelay)
        select {
        case <-time.After(app.config.PreShutdownDelay):
        case <-ctx.Done():
            shutdownErr = ctx.Err()
            return
        }

        // Step 3: Stop accepting new connections on main server
        log.Println("Stopping main server...")
        if err := app.mainServer.Shutdown(ctx); err != nil {
            log.Printf("Main server shutdown error: %v", err)
            shutdownErr = err
        }

        // Step 4: Wait for in-flight requests
        log.Printf("Waiting for %d in-flight requests to complete...", app.tracker.InFlight())
        done := make(chan struct{})
        go func() {
            app.tracker.Wait()
            close(done)
        }()

        select {
        case <-done:
            log.Println("All requests completed")
        case <-ctx.Done():
            log.Printf("Timeout waiting for requests, %d still in flight", app.tracker.InFlight())
            shutdownErr = ctx.Err()
        }

        // Step 5: Shutdown health server
        log.Println("Stopping health server...")
        healthCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        if err := app.healthServer.Shutdown(healthCtx); err != nil {
            log.Printf("Health server shutdown error: %v", err)
        }

        log.Println("Graceful shutdown complete")
    })

    return shutdownErr
}

func main() {
    config := DefaultConfig()
    app := NewApplication(config)

    // Setup signal handling
    ctx, stop := signal.NotifyContext(context.Background(),
        syscall.SIGTERM, syscall.SIGINT)
    defer stop()

    // Start application in goroutine
    serverErr := make(chan error, 1)
    go func() {
        serverErr <- app.Start()
    }()

    // Wait for shutdown signal or server error
    select {
    case err := <-serverErr:
        if err != nil && !errors.Is(err, http.ErrServerClosed) {
            log.Fatalf("Server error: %v", err)
        }
    case <-ctx.Done():
        log.Println("Received shutdown signal")

        shutdownCtx, cancel := context.WithTimeout(
            context.Background(),
            config.ShutdownTimeout,
        )
        defer cancel()

        if err := app.Shutdown(shutdownCtx); err != nil {
            log.Printf("Shutdown failed: %v", err)
            os.Exit(1)
        }
    }

    log.Println("Application stopped")
}
```

## Testing Graceful Shutdown

Testing your graceful shutdown implementation is critical. Here are some strategies:

### Unit Test for Shutdown Sequence

Write tests that verify the shutdown sequence works correctly:

```go
package main

import (
    "context"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"
)

func TestGracefulShutdown(t *testing.T) {
    config := DefaultConfig()
    config.PreShutdownDelay = 100 * time.Millisecond
    config.ShutdownTimeout = 5 * time.Second

    app := NewApplication(config)

    // Start server
    go app.Start()

    // Wait for server to be ready
    time.Sleep(2 * time.Second)

    // Verify readiness
    if !app.health.IsReady() {
        t.Fatal("Application should be ready")
    }

    // Start a long-running request
    requestDone := make(chan bool)
    go func() {
        resp, err := http.Get("http://localhost:8080/api/data")
        if err != nil {
            t.Errorf("Request failed: %v", err)
        }
        if resp != nil {
            resp.Body.Close()
        }
        requestDone <- true
    }()

    // Initiate shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    shutdownDone := make(chan error)
    go func() {
        shutdownDone <- app.Shutdown(ctx)
    }()

    // Verify the request completes
    select {
    case <-requestDone:
        // Request completed successfully
    case <-time.After(5 * time.Second):
        t.Fatal("Request should have completed")
    }

    // Verify shutdown completes
    select {
    case err := <-shutdownDone:
        if err != nil {
            t.Fatalf("Shutdown failed: %v", err)
        }
    case <-time.After(10 * time.Second):
        t.Fatal("Shutdown should have completed")
    }
}

func TestReadinessProbeTransition(t *testing.T) {
    hm := NewHealthManager()

    // Initially not ready
    if hm.IsReady() {
        t.Error("Should not be ready initially")
    }

    // Set ready
    hm.SetReady()
    if !hm.IsReady() {
        t.Error("Should be ready after SetReady")
    }

    // Start shutdown
    hm.SetShutdownStarted()
    if hm.IsReady() {
        t.Error("Should not be ready during shutdown")
    }
    if !hm.IsShuttingDown() {
        t.Error("Should be shutting down")
    }
}
```

### Integration Test with Docker

Test your application in a container environment:

```bash
#!/bin/bash
# test-shutdown.sh

# Build the container
docker build -t go-graceful-test .

# Run the container
CONTAINER_ID=$(docker run -d -p 8080:8080 -p 8081:8081 go-graceful-test)

# Wait for startup
sleep 3

# Verify readiness
READY=$(curl -s http://localhost:8081/health/ready | jq -r '.status')
if [ "$READY" != "ready" ]; then
    echo "FAIL: Application not ready"
    docker stop $CONTAINER_ID
    exit 1
fi

# Start a background request
curl -s http://localhost:8080/api/data &
REQUEST_PID=$!

# Send SIGTERM
docker stop --time=30 $CONTAINER_ID &
STOP_PID=$!

# Wait for request to complete
wait $REQUEST_PID
REQUEST_STATUS=$?

# Wait for container to stop
wait $STOP_PID

if [ $REQUEST_STATUS -eq 0 ]; then
    echo "PASS: Request completed during shutdown"
else
    echo "FAIL: Request failed during shutdown"
    exit 1
fi
```

## Best Practices Summary

1. **Always handle SIGTERM and SIGINT**: These are the primary signals used by Kubernetes and operators.

2. **Use separate ports for health probes**: This ensures health checks are independent of main traffic.

3. **Implement proper probe transitions**: Readiness should fail immediately on shutdown signal.

4. **Add a preStop hook delay**: This gives load balancers time to update before your app stops accepting traffic.

5. **Track in-flight requests**: Know how many requests are still being processed during shutdown.

6. **Set appropriate timeouts**: Your `terminationGracePeriodSeconds` must be longer than your shutdown sequence.

7. **Test your shutdown logic**: Write tests that verify requests complete during shutdown.

8. **Log shutdown progress**: Visibility into the shutdown sequence helps with debugging.

## Conclusion

Implementing graceful shutdown in Go for Kubernetes requires careful coordination between your application code and Kubernetes configuration. By following the patterns in this guide, you can ensure that your applications handle termination gracefully, maintaining reliability for your users during deployments and scaling events.

The key components are:

- Signal handling to catch SIGTERM
- HTTP server graceful shutdown
- Connection draining for in-flight requests
- Health probe transitions to stop new traffic
- Kubernetes configuration with appropriate timeouts and preStop hooks

With these pieces in place, your Go applications will be production-ready for Kubernetes environments.
