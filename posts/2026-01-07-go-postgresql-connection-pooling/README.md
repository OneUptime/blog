# How to Implement Connection Pooling in Go for PostgreSQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, PostgreSQL, Database, Connection Pooling, Performance

Description: Learn to implement efficient PostgreSQL connection pooling in Go using database/sql and pgxpool with proper configuration for production workloads.

---

Connection pooling is one of the most critical performance optimizations for any database-backed application. Without proper pooling, your Go application would create a new TCP connection to PostgreSQL for every query, incurring significant overhead from connection establishment, TLS handshakes, and authentication. This guide covers everything you need to know about implementing robust connection pooling in Go using both the standard library's `database/sql` package and the high-performance `pgxpool` library.

## Understanding Connection Pooling

Before diving into implementation, let's understand why connection pooling matters. Each PostgreSQL connection consumes server resources including memory (typically 5-10MB per connection), file descriptors, and process slots. Creating new connections involves network round trips, authentication, and session initialization, which can take 20-100ms depending on network latency and TLS requirements.

A connection pool maintains a set of reusable connections, eliminating the per-query connection overhead and ensuring your application can handle high concurrency without overwhelming the database server.

## Using database/sql Built-in Pooling

Go's standard `database/sql` package includes a robust connection pooler out of the box. When you use the `lib/pq` or `pgx` driver with `database/sql`, you automatically get connection pooling.

### Basic Setup with database/sql

The following example shows how to set up a basic PostgreSQL connection pool using the standard library. We use the pgx driver in standard library compatibility mode for better performance.

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    "time"

    _ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
    // Connection string with all necessary parameters
    dsn := "postgres://user:password@localhost:5432/mydb?sslmode=require"

    // Open returns a pool, not a single connection
    db, err := sql.Open("pgx", dsn)
    if err != nil {
        log.Fatalf("Failed to open database: %v", err)
    }
    defer db.Close()

    // Verify connectivity before proceeding
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := db.PingContext(ctx); err != nil {
        log.Fatalf("Failed to ping database: %v", err)
    }

    log.Println("Successfully connected to PostgreSQL")
}
```

### Configuring Pool Size and Limits

The pool configuration is critical for production workloads. Here we set the maximum open connections, idle connections, and connection lifetime to balance performance with resource usage.

```go
package main

import (
    "database/sql"
    "log"
    "time"

    _ "github.com/jackc/pgx/v5/stdlib"
)

func setupDatabasePool(dsn string) (*sql.DB, error) {
    db, err := sql.Open("pgx", dsn)
    if err != nil {
        return nil, err
    }

    // Maximum number of open connections to the database
    // Set this based on your database's max_connections and number of app instances
    // Formula: max_connections / number_of_app_instances - buffer_for_admin
    db.SetMaxOpenConns(25)

    // Maximum number of idle connections in the pool
    // These connections are kept ready for reuse
    // Set to a fraction of MaxOpenConns (typically 25-50%)
    db.SetMaxIdleConns(10)

    // Maximum lifetime of a connection
    // Connections older than this are closed and replaced
    // Helps with load balancer connection distribution
    // Set slightly below PostgreSQL's idle_session_timeout
    db.SetConnMaxLifetime(30 * time.Minute)

    // Maximum idle time for a connection
    // Idle connections older than this are closed
    // Helps reduce resource usage during low traffic
    db.SetConnMaxIdleTime(5 * time.Minute)

    return db, nil
}

func main() {
    dsn := "postgres://user:password@localhost:5432/mydb?sslmode=require"

    db, err := setupDatabasePool(dsn)
    if err != nil {
        log.Fatalf("Failed to setup database pool: %v", err)
    }
    defer db.Close()

    log.Println("Database pool configured successfully")
}
```

### Monitoring Pool Statistics

Monitoring your connection pool is essential for understanding application behavior and troubleshooting performance issues. The database/sql package provides statistics through the DBStats struct.

```go
package main

import (
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
    "time"

    _ "github.com/jackc/pgx/v5/stdlib"
)

// PoolStats represents connection pool statistics for JSON export
type PoolStats struct {
    MaxOpenConnections int           `json:"max_open_connections"`
    OpenConnections    int           `json:"open_connections"`
    InUse              int           `json:"in_use"`
    Idle               int           `json:"idle"`
    WaitCount          int64         `json:"wait_count"`
    WaitDuration       time.Duration `json:"wait_duration_ms"`
    MaxIdleClosed      int64         `json:"max_idle_closed"`
    MaxIdleTimeClosed  int64         `json:"max_idle_time_closed"`
    MaxLifetimeClosed  int64         `json:"max_lifetime_closed"`
}

func getPoolStats(db *sql.DB) PoolStats {
    stats := db.Stats()
    return PoolStats{
        MaxOpenConnections: stats.MaxOpenConnections,
        OpenConnections:    stats.OpenConnections,
        InUse:              stats.InUse,
        Idle:               stats.Idle,
        WaitCount:          stats.WaitCount,
        WaitDuration:       stats.WaitDuration / time.Millisecond,
        MaxIdleClosed:      stats.MaxIdleClosed,
        MaxIdleTimeClosed:  stats.MaxIdleTimeClosed,
        MaxLifetimeClosed:  stats.MaxLifetimeClosed,
    }
}

func startStatsServer(db *sql.DB, addr string) {
    http.HandleFunc("/db/stats", func(w http.ResponseWriter, r *http.Request) {
        stats := getPoolStats(db)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(stats)
    })

    log.Printf("Starting stats server on %s", addr)
    if err := http.ListenAndServe(addr, nil); err != nil {
        log.Printf("Stats server error: %v", err)
    }
}

func logPoolStats(db *sql.DB, interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    for range ticker.C {
        stats := db.Stats()
        log.Printf("Pool stats: open=%d, in_use=%d, idle=%d, wait_count=%d, wait_duration=%v",
            stats.OpenConnections,
            stats.InUse,
            stats.Idle,
            stats.WaitCount,
            stats.WaitDuration,
        )
    }
}
```

## Using pgxpool for High-Performance Applications

While `database/sql` works well for many applications, the `pgxpool` package from the pgx library offers additional features and better performance by bypassing the database/sql abstraction layer.

### Basic pgxpool Setup

The pgxpool package provides a PostgreSQL-specific connection pool with better performance characteristics. It supports PostgreSQL-specific features like COPY, LISTEN/NOTIFY, and binary protocol.

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

func main() {
    ctx := context.Background()

    // Connection string supports all libpq parameters
    connString := "postgres://user:password@localhost:5432/mydb?sslmode=require"

    // Create a pool with default configuration
    pool, err := pgxpool.New(ctx, connString)
    if err != nil {
        log.Fatalf("Failed to create pool: %v", err)
    }
    defer pool.Close()

    // Verify the connection
    if err := pool.Ping(ctx); err != nil {
        log.Fatalf("Failed to ping database: %v", err)
    }

    log.Println("Successfully connected using pgxpool")
}
```

### Advanced pgxpool Configuration

For production environments, you need fine-grained control over pool behavior. The pgxpool.Config struct provides extensive configuration options including health checks, connection validation, and custom hooks.

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

func createProductionPool(ctx context.Context, connString string) (*pgxpool.Pool, error) {
    // Parse the connection string into a config object
    config, err := pgxpool.ParseConfig(connString)
    if err != nil {
        return nil, err
    }

    // Pool size configuration
    // MinConns keeps connections warm and ready
    config.MinConns = 5

    // MaxConns limits total connections to prevent database overload
    config.MaxConns = 25

    // MaxConnLifetime closes connections after this duration
    // Helps distribute load across read replicas behind a load balancer
    config.MaxConnLifetime = 1 * time.Hour

    // MaxConnIdleTime closes idle connections to free resources
    config.MaxConnIdleTime = 15 * time.Minute

    // HealthCheckPeriod specifies how often to check connection health
    // Stale connections are closed and replaced
    config.HealthCheckPeriod = 1 * time.Minute

    // ConnConfig allows setting connection-level parameters
    config.ConnConfig.ConnectTimeout = 5 * time.Second

    // Set default query execution timeout
    config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

    // Create the pool with the configuration
    return pgxpool.NewWithConfig(ctx, config)
}

func main() {
    ctx := context.Background()
    connString := "postgres://user:password@localhost:5432/mydb?sslmode=require"

    pool, err := createProductionPool(ctx, connString)
    if err != nil {
        log.Fatalf("Failed to create pool: %v", err)
    }
    defer pool.Close()

    log.Println("Production pool created successfully")
}
```

### Connection Lifecycle Hooks

pgxpool allows you to hook into connection lifecycle events for logging, metrics, and custom initialization. These hooks are invaluable for debugging connection issues and monitoring pool behavior.

```go
package main

import (
    "context"
    "log"
    "sync/atomic"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

// ConnectionMetrics tracks connection lifecycle statistics
type ConnectionMetrics struct {
    created   int64
    acquired  int64
    released  int64
    destroyed int64
}

func (m *ConnectionMetrics) OnCreate() {
    atomic.AddInt64(&m.created, 1)
}

func (m *ConnectionMetrics) OnAcquire() {
    atomic.AddInt64(&m.acquired, 1)
}

func (m *ConnectionMetrics) OnRelease() {
    atomic.AddInt64(&m.released, 1)
}

func (m *ConnectionMetrics) OnDestroy() {
    atomic.AddInt64(&m.destroyed, 1)
}

func createPoolWithHooks(ctx context.Context, connString string) (*pgxpool.Pool, *ConnectionMetrics, error) {
    config, err := pgxpool.ParseConfig(connString)
    if err != nil {
        return nil, nil, err
    }

    metrics := &ConnectionMetrics{}

    config.MinConns = 5
    config.MaxConns = 25

    // BeforeConnect is called before establishing a new connection
    // Use for custom authentication or connection parameter setup
    config.BeforeConnect = func(ctx context.Context, cfg *pgx.ConnConfig) error {
        log.Printf("Connecting to %s:%d", cfg.Host, cfg.Port)
        return nil
    }

    // AfterConnect is called after a connection is established
    // Use for connection initialization (SET commands, etc.)
    config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
        metrics.OnCreate()
        log.Printf("Connection established, running initialization")

        // Set session-level parameters
        _, err := conn.Exec(ctx, "SET statement_timeout = '30s'")
        if err != nil {
            return err
        }

        _, err = conn.Exec(ctx, "SET lock_timeout = '10s'")
        return err
    }

    // BeforeAcquire is called before returning a connection from the pool
    // Return false to reject a connection (it will be closed and a new one created)
    config.BeforeAcquire = func(ctx context.Context, conn *pgx.Conn) bool {
        // Validate the connection before use
        // This is a good place to check if the connection is still valid
        if conn.IsClosed() {
            log.Printf("Rejecting closed connection")
            return false
        }
        metrics.OnAcquire()
        return true
    }

    // AfterRelease is called after a connection is returned to the pool
    // Return false to close the connection instead of returning it to the pool
    config.AfterRelease = func(conn *pgx.Conn) bool {
        metrics.OnRelease()

        // Close connections that have been used too many times
        // This is handled by MaxConnLifetime but can add custom logic here
        return true
    }

    pool, err := pgxpool.NewWithConfig(ctx, config)
    return pool, metrics, err
}
```

### Monitoring pgxpool Statistics

pgxpool provides detailed statistics about pool behavior. Exposing these metrics helps you understand pool utilization and identify potential issues.

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

// PgxPoolStats represents pgxpool statistics
type PgxPoolStats struct {
    AcquireCount         int64         `json:"acquire_count"`
    AcquireDuration      time.Duration `json:"acquire_duration_ms"`
    AcquiredConns        int32         `json:"acquired_conns"`
    CanceledAcquireCount int64         `json:"canceled_acquire_count"`
    ConstructingConns    int32         `json:"constructing_conns"`
    EmptyAcquireCount    int64         `json:"empty_acquire_count"`
    IdleConns            int32         `json:"idle_conns"`
    MaxConns             int32         `json:"max_conns"`
    TotalConns           int32         `json:"total_conns"`
    NewConnsCount        int64         `json:"new_conns_count"`
    MaxLifetimeDestroy   int64         `json:"max_lifetime_destroy_count"`
    MaxIdleDestroy       int64         `json:"max_idle_destroy_count"`
}

func getPgxPoolStats(pool *pgxpool.Pool) PgxPoolStats {
    stat := pool.Stat()
    return PgxPoolStats{
        AcquireCount:         stat.AcquireCount(),
        AcquireDuration:      stat.AcquireDuration() / time.Millisecond,
        AcquiredConns:        stat.AcquiredConns(),
        CanceledAcquireCount: stat.CanceledAcquireCount(),
        ConstructingConns:    stat.ConstructingConns(),
        EmptyAcquireCount:    stat.EmptyAcquireCount(),
        IdleConns:            stat.IdleConns(),
        MaxConns:             stat.MaxConns(),
        TotalConns:           stat.TotalConns(),
        NewConnsCount:        stat.NewConnsCount(),
        MaxLifetimeDestroy:   stat.MaxLifetimeDestroyCount(),
        MaxIdleDestroy:       stat.MaxIdleDestroyCount(),
    }
}

func startPgxPoolStatsServer(pool *pgxpool.Pool, addr string) {
    http.HandleFunc("/pgxpool/stats", func(w http.ResponseWriter, r *http.Request) {
        stats := getPgxPoolStats(pool)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(stats)
    })

    log.Printf("Starting pgxpool stats server on %s", addr)
    if err := http.ListenAndServe(addr, nil); err != nil {
        log.Printf("Stats server error: %v", err)
    }
}
```

## Connection Pool Sizing and Tuning

Proper pool sizing is crucial for optimal performance. Too few connections leads to contention and waiting; too many overwhelms the database server.

### Calculating Optimal Pool Size

The optimal pool size depends on several factors: database server capacity, application concurrency requirements, and query characteristics. This function helps calculate a reasonable starting point.

```go
package main

import (
    "fmt"
    "runtime"
)

// PoolSizeConfig holds parameters for calculating optimal pool size
type PoolSizeConfig struct {
    // Number of application instances connecting to the database
    AppInstances int

    // PostgreSQL max_connections setting
    DBMaxConnections int

    // Reserve connections for admin operations and other services
    ReservedConnections int

    // Expected number of concurrent operations per instance
    ExpectedConcurrency int
}

// CalculateOptimalPoolSize returns recommended MinConns and MaxConns
func CalculateOptimalPoolSize(cfg PoolSizeConfig) (minConns, maxConns int) {
    // Available connections per instance
    availablePerInstance := (cfg.DBMaxConnections - cfg.ReservedConnections) / cfg.AppInstances

    // MaxConns should not exceed available connections
    maxConns = availablePerInstance

    // A common heuristic: connections = (core_count * 2) + disk_spindles
    // For SSDs, this simplifies to roughly core_count * 2-4
    cpuOptimal := runtime.NumCPU() * 3

    // Don't exceed what we calculated based on database capacity
    if maxConns > cpuOptimal && cfg.ExpectedConcurrency < cpuOptimal {
        maxConns = cpuOptimal
    }

    // MinConns should handle baseline load without connection creation overhead
    minConns = maxConns / 4
    if minConns < 2 {
        minConns = 2
    }

    return minConns, maxConns
}

func main() {
    cfg := PoolSizeConfig{
        AppInstances:        4,
        DBMaxConnections:    200,
        ReservedConnections: 20,
        ExpectedConcurrency: 50,
    }

    minConns, maxConns := CalculateOptimalPoolSize(cfg)
    fmt.Printf("Recommended pool size: MinConns=%d, MaxConns=%d\n", minConns, maxConns)
}
```

### Connection Lifetime Tuning

Connection lifetime settings affect how connections are recycled. Proper tuning helps with load balancing and resource management.

```go
package main

import (
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

// ConnectionLifetimeConfig holds lifetime configuration parameters
type ConnectionLifetimeConfig struct {
    // UsesLoadBalancer indicates if connections go through a load balancer
    // Shorter lifetimes help distribute connections across replicas
    UsesLoadBalancer bool

    // HighTraffic indicates if the application handles many requests
    HighTraffic bool

    // IdleConnectionsExpensive indicates if idle connections are costly
    // Set to true for managed database services with connection limits
    IdleConnectionsExpensive bool
}

// ApplyLifetimeConfig configures connection lifetimes based on use case
func ApplyLifetimeConfig(config *pgxpool.Config, lifetime ConnectionLifetimeConfig) {
    if lifetime.UsesLoadBalancer {
        // Shorter lifetime helps distribute connections across replicas
        // when using read replicas behind a load balancer
        config.MaxConnLifetime = 10 * time.Minute

        // Add jitter to prevent connection storm
        config.MaxConnLifetimeJitter = 2 * time.Minute
    } else {
        // Without load balancer, longer lifetime reduces connection overhead
        config.MaxConnLifetime = 1 * time.Hour
        config.MaxConnLifetimeJitter = 10 * time.Minute
    }

    if lifetime.HighTraffic {
        // Keep more connections warm for high traffic
        config.MaxConnIdleTime = 30 * time.Minute
    } else if lifetime.IdleConnectionsExpensive {
        // Close idle connections quickly for managed databases
        config.MaxConnIdleTime = 2 * time.Minute
    } else {
        // Moderate idle time for typical workloads
        config.MaxConnIdleTime = 10 * time.Minute
    }
}
```

## Health Checks and Connection Validation

Implementing proper health checks ensures your application can detect database issues early and respond appropriately.

### Implementing Health Check Endpoints

A comprehensive health check should verify not just connectivity but also pool health and query execution capability.

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

// HealthStatus represents the health check response
type HealthStatus struct {
    Status      string      `json:"status"`
    Database    DBHealth    `json:"database"`
    Latency     string      `json:"latency"`
    Timestamp   time.Time   `json:"timestamp"`
}

// DBHealth represents database-specific health information
type DBHealth struct {
    Connected      bool   `json:"connected"`
    PoolHealthy    bool   `json:"pool_healthy"`
    TotalConns     int32  `json:"total_connections"`
    IdleConns      int32  `json:"idle_connections"`
    AcquiredConns  int32  `json:"acquired_connections"`
    Message        string `json:"message,omitempty"`
}

// HealthChecker performs database health checks
type HealthChecker struct {
    pool    *pgxpool.Pool
    timeout time.Duration
}

// NewHealthChecker creates a new health checker
func NewHealthChecker(pool *pgxpool.Pool, timeout time.Duration) *HealthChecker {
    return &HealthChecker{
        pool:    pool,
        timeout: timeout,
    }
}

// Check performs a comprehensive health check
func (h *HealthChecker) Check(ctx context.Context) HealthStatus {
    start := time.Now()

    ctx, cancel := context.WithTimeout(ctx, h.timeout)
    defer cancel()

    status := HealthStatus{
        Timestamp: start,
    }

    stat := h.pool.Stat()
    dbHealth := DBHealth{
        TotalConns:    stat.TotalConns(),
        IdleConns:     stat.IdleConns(),
        AcquiredConns: stat.AcquiredConns(),
    }

    // Check if pool has available connections
    if stat.TotalConns() >= stat.MaxConns() && stat.IdleConns() == 0 {
        dbHealth.PoolHealthy = false
        dbHealth.Message = "connection pool exhausted"
    } else {
        dbHealth.PoolHealthy = true
    }

    // Test actual database connectivity
    var result int
    err := h.pool.QueryRow(ctx, "SELECT 1").Scan(&result)
    if err != nil {
        dbHealth.Connected = false
        dbHealth.Message = err.Error()
        status.Status = "unhealthy"
    } else {
        dbHealth.Connected = true
        if dbHealth.PoolHealthy {
            status.Status = "healthy"
        } else {
            status.Status = "degraded"
        }
    }

    status.Database = dbHealth
    status.Latency = time.Since(start).String()

    return status
}

// HTTPHandler returns an HTTP handler for health checks
func (h *HealthChecker) HTTPHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        status := h.Check(r.Context())

        w.Header().Set("Content-Type", "application/json")

        switch status.Status {
        case "healthy":
            w.WriteHeader(http.StatusOK)
        case "degraded":
            w.WriteHeader(http.StatusOK) // Still operational
        default:
            w.WriteHeader(http.StatusServiceUnavailable)
        }

        json.NewEncoder(w).Encode(status)
    }
}
```

### Kubernetes Liveness and Readiness Probes

When deploying to Kubernetes, you need separate liveness and readiness probes. The liveness probe checks if the application is alive, while the readiness probe checks if it's ready to receive traffic.

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    "sync/atomic"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

// K8sHealthChecker provides Kubernetes-compatible health checks
type K8sHealthChecker struct {
    pool          *pgxpool.Pool
    ready         atomic.Bool
    startupTime   time.Time
    startupGrace  time.Duration
}

// NewK8sHealthChecker creates a new Kubernetes health checker
func NewK8sHealthChecker(pool *pgxpool.Pool, startupGrace time.Duration) *K8sHealthChecker {
    hc := &K8sHealthChecker{
        pool:         pool,
        startupTime:  time.Now(),
        startupGrace: startupGrace,
    }
    return hc
}

// SetReady marks the application as ready to receive traffic
func (h *K8sHealthChecker) SetReady(ready bool) {
    h.ready.Store(ready)
}

// LivenessHandler checks if the application process is alive
// This should be a lightweight check that doesn't depend on external services
func (h *K8sHealthChecker) LivenessHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Liveness just checks if the process is responsive
        // Don't check database here - a slow database shouldn't restart the pod
        response := map[string]interface{}{
            "status": "alive",
            "uptime": time.Since(h.startupTime).String(),
        }

        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(response)
    }
}

// ReadinessHandler checks if the application can handle requests
// This should verify all dependencies are available
func (h *K8sHealthChecker) ReadinessHandler() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        response := map[string]interface{}{
            "timestamp": time.Now(),
        }

        // Check if application has signaled readiness
        if !h.ready.Load() {
            // During startup grace period, report not ready without error
            if time.Since(h.startupTime) < h.startupGrace {
                response["status"] = "starting"
                response["message"] = "application is starting up"
            } else {
                response["status"] = "not_ready"
                response["message"] = "application not ready"
            }
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusServiceUnavailable)
            json.NewEncoder(w).Encode(response)
            return
        }

        // Check database connectivity
        ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
        defer cancel()

        err := h.pool.Ping(ctx)
        if err != nil {
            response["status"] = "not_ready"
            response["database"] = "disconnected"
            response["error"] = err.Error()
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusServiceUnavailable)
            json.NewEncoder(w).Encode(response)
            return
        }

        // Check pool health
        stat := h.pool.Stat()
        if stat.TotalConns() >= stat.MaxConns() && stat.IdleConns() == 0 {
            response["status"] = "degraded"
            response["message"] = "connection pool near capacity"
        } else {
            response["status"] = "ready"
        }

        response["database"] = "connected"
        response["pool"] = map[string]interface{}{
            "total":    stat.TotalConns(),
            "idle":     stat.IdleConns(),
            "acquired": stat.AcquiredConns(),
        }

        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(response)
    }
}
```

## Production Best Practices

### Graceful Shutdown

Proper shutdown handling ensures in-flight queries complete and connections are closed cleanly.

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

// Application holds application dependencies
type Application struct {
    pool   *pgxpool.Pool
    server *http.Server
}

// Run starts the application and handles graceful shutdown
func (app *Application) Run() error {
    // Channel to receive shutdown signals
    shutdown := make(chan os.Signal, 1)
    signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

    // Channel to receive server errors
    serverErrors := make(chan error, 1)

    // Start the HTTP server
    go func() {
        log.Printf("Server starting on %s", app.server.Addr)
        serverErrors <- app.server.ListenAndServe()
    }()

    // Wait for shutdown signal or server error
    select {
    case err := <-serverErrors:
        return err

    case sig := <-shutdown:
        log.Printf("Received signal %v, initiating shutdown", sig)

        // Create a deadline for graceful shutdown
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        // Stop accepting new requests
        if err := app.server.Shutdown(ctx); err != nil {
            log.Printf("HTTP server shutdown error: %v", err)
            app.server.Close()
        }

        // Close the database pool
        // This waits for acquired connections to be released
        log.Println("Closing database pool...")
        app.pool.Close()

        log.Println("Shutdown complete")
    }

    return nil
}
```

### Connection Error Handling

Robust error handling distinguishes between transient and permanent failures, enabling appropriate retry behavior.

```go
package main

import (
    "context"
    "errors"
    "log"
    "net"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgconn"
    "github.com/jackc/pgx/v5/pgxpool"
)

// IsRetryableError determines if an error is transient and worth retrying
func IsRetryableError(err error) bool {
    if err == nil {
        return false
    }

    // Check for connection errors
    var netErr net.Error
    if errors.As(err, &netErr) {
        return netErr.Timeout() || netErr.Temporary()
    }

    // Check for PostgreSQL-specific errors
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) {
        switch pgErr.Code {
        case "40001": // serialization_failure
            return true
        case "40P01": // deadlock_detected
            return true
        case "57P03": // cannot_connect_now
            return true
        case "08000", "08003", "08006": // connection exceptions
            return true
        }
    }

    // Check for context errors (usually not retryable)
    if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
        return false
    }

    return false
}

// RetryConfig holds retry configuration
type RetryConfig struct {
    MaxAttempts int
    InitialWait time.Duration
    MaxWait     time.Duration
}

// DefaultRetryConfig returns sensible default retry settings
func DefaultRetryConfig() RetryConfig {
    return RetryConfig{
        MaxAttempts: 3,
        InitialWait: 100 * time.Millisecond,
        MaxWait:     2 * time.Second,
    }
}

// QueryWithRetry executes a query with automatic retry for transient errors
func QueryWithRetry(ctx context.Context, pool *pgxpool.Pool, cfg RetryConfig, sql string, args ...interface{}) (pgx.Rows, error) {
    var lastErr error
    wait := cfg.InitialWait

    for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
        rows, err := pool.Query(ctx, sql, args...)
        if err == nil {
            return rows, nil
        }

        lastErr = err

        if !IsRetryableError(err) {
            return nil, err
        }

        log.Printf("Query attempt %d failed with retryable error: %v", attempt, err)

        if attempt < cfg.MaxAttempts {
            select {
            case <-ctx.Done():
                return nil, ctx.Err()
            case <-time.After(wait):
                wait *= 2
                if wait > cfg.MaxWait {
                    wait = cfg.MaxWait
                }
            }
        }
    }

    return nil, lastErr
}
```

### Configuration from Environment Variables

Production applications should read configuration from environment variables for flexibility across environments.

```go
package main

import (
    "context"
    "fmt"
    "os"
    "strconv"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
    Host            string
    Port            int
    User            string
    Password        string
    Database        string
    SSLMode         string
    MinConns        int32
    MaxConns        int32
    MaxConnLifetime time.Duration
    MaxConnIdleTime time.Duration
}

// LoadDatabaseConfig reads configuration from environment variables
func LoadDatabaseConfig() (*DatabaseConfig, error) {
    cfg := &DatabaseConfig{
        Host:            getEnvOrDefault("DB_HOST", "localhost"),
        Port:            getEnvIntOrDefault("DB_PORT", 5432),
        User:            getEnvOrDefault("DB_USER", "postgres"),
        Password:        os.Getenv("DB_PASSWORD"),
        Database:        getEnvOrDefault("DB_NAME", "postgres"),
        SSLMode:         getEnvOrDefault("DB_SSLMODE", "require"),
        MinConns:        int32(getEnvIntOrDefault("DB_MIN_CONNS", 5)),
        MaxConns:        int32(getEnvIntOrDefault("DB_MAX_CONNS", 25)),
        MaxConnLifetime: getEnvDurationOrDefault("DB_CONN_MAX_LIFETIME", 30*time.Minute),
        MaxConnIdleTime: getEnvDurationOrDefault("DB_CONN_MAX_IDLE_TIME", 5*time.Minute),
    }

    if cfg.Password == "" {
        return nil, fmt.Errorf("DB_PASSWORD environment variable is required")
    }

    return cfg, nil
}

// ConnectionString returns a PostgreSQL connection string
func (c *DatabaseConfig) ConnectionString() string {
    return fmt.Sprintf(
        "postgres://%s:%s@%s:%d/%s?sslmode=%s",
        c.User,
        c.Password,
        c.Host,
        c.Port,
        c.Database,
        c.SSLMode,
    )
}

// CreatePool creates a pgxpool with the configuration
func (c *DatabaseConfig) CreatePool(ctx context.Context) (*pgxpool.Pool, error) {
    config, err := pgxpool.ParseConfig(c.ConnectionString())
    if err != nil {
        return nil, err
    }

    config.MinConns = c.MinConns
    config.MaxConns = c.MaxConns
    config.MaxConnLifetime = c.MaxConnLifetime
    config.MaxConnIdleTime = c.MaxConnIdleTime

    return pgxpool.NewWithConfig(ctx, config)
}

func getEnvOrDefault(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getEnvIntOrDefault(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intValue, err := strconv.Atoi(value); err == nil {
            return intValue
        }
    }
    return defaultValue
}

func getEnvDurationOrDefault(key string, defaultValue time.Duration) time.Duration {
    if value := os.Getenv(key); value != "" {
        if duration, err := time.ParseDuration(value); err == nil {
            return duration
        }
    }
    return defaultValue
}
```

### Complete Production Example

Here is a complete example bringing together all the concepts for a production-ready database layer.

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

func main() {
    ctx := context.Background()

    // Load configuration
    dbConfig, err := LoadDatabaseConfig()
    if err != nil {
        log.Fatalf("Failed to load database config: %v", err)
    }

    // Create the connection pool
    pool, err := dbConfig.CreatePool(ctx)
    if err != nil {
        log.Fatalf("Failed to create database pool: %v", err)
    }
    defer pool.Close()

    // Verify connectivity
    if err := pool.Ping(ctx); err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    log.Println("Connected to PostgreSQL")

    // Set up health checks
    healthChecker := NewK8sHealthChecker(pool, 30*time.Second)

    // Set up HTTP routes
    mux := http.NewServeMux()
    mux.HandleFunc("/healthz", healthChecker.LivenessHandler())
    mux.HandleFunc("/readyz", healthChecker.ReadinessHandler())

    // Create the HTTP server
    server := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Mark as ready after initialization
    healthChecker.SetReady(true)

    // Start the application
    app := &Application{
        pool:   pool,
        server: server,
    }

    if err := app.Run(); err != nil && err != http.ErrServerClosed {
        log.Fatalf("Application error: %v", err)
    }
}
```

## Summary

Implementing connection pooling effectively in Go requires understanding both the built-in `database/sql` pooling and the more feature-rich `pgxpool` library. Key takeaways include:

1. **Use pgxpool for PostgreSQL-heavy applications**: It provides better performance and PostgreSQL-specific features like COPY and LISTEN/NOTIFY support.

2. **Size your pool appropriately**: Consider database capacity, application concurrency, and the number of application instances. Start with `(CPU cores * 2) + 1` as a baseline for MaxConns.

3. **Configure connection lifetimes**: Use shorter lifetimes when load balancing across replicas, and longer lifetimes for stable, single-instance databases.

4. **Implement comprehensive health checks**: Separate liveness and readiness probes for Kubernetes, checking both connectivity and pool health.

5. **Handle errors appropriately**: Distinguish between transient and permanent failures, implementing retry logic only for recoverable errors.

6. **Monitor pool statistics**: Expose pool metrics for observability, tracking connection counts, wait times, and lifecycle events.

7. **Plan for graceful shutdown**: Properly close pools during shutdown to complete in-flight queries and release resources cleanly.

By following these practices, your Go applications will efficiently manage PostgreSQL connections, handle high concurrency gracefully, and provide reliable service in production environments.
