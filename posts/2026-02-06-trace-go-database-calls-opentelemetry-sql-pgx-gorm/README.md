# How to Trace Go Database Calls with OpenTelemetry (database/sql, pgx, GORM)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, database/sql, pgx, GORM, Database Tracing

Description: Complete guide to instrumenting Go database operations with OpenTelemetry across database/sql, pgx, and GORM for visibility into query performance and execution patterns.

Database operations often represent the most critical bottleneck in web applications. A slow query can cascade through your entire system, degrading user experience and consuming server resources. Without proper instrumentation, identifying problematic queries, understanding their execution patterns, and correlating database performance with application behavior becomes nearly impossible.

OpenTelemetry provides comprehensive instrumentation for Go database libraries, capturing query execution time, connection pool statistics, and error rates. Whether you use the standard library's database/sql, the high-performance pgx driver, or the GORM ORM, OpenTelemetry instrumentation transforms opaque database operations into observable, traceable events.

## Understanding Database Instrumentation

Database instrumentation works at different levels depending on the library. For database/sql, instrumentation wraps the driver to intercept SQL execution. For pgx, instrumentation hooks into the query tracer interface. For GORM, instrumentation uses callbacks to capture operations before and after they execute.

Each approach captures similar information: query text, execution duration, affected rows, and errors. This data appears as spans in your distributed traces, showing exactly how long each database operation takes and how it fits into the broader request context.

## Installing Database Instrumentation Packages

Install OpenTelemetry and the instrumentation packages for your database libraries.

```bash
# Core OpenTelemetry packages
go get -u go.opentelemetry.io/otel
go get -u go.opentelemetry.io/otel/sdk/trace
go get -u go.opentelemetry.io/otel/exporters/stdout/stdouttrace

# database/sql instrumentation
go get -u go.opentelemetry.io/contrib/instrumentation/database/sql/otelsql
go get -u github.com/lib/pq  # PostgreSQL driver example

# pgx instrumentation (v5)
go get -u github.com/jackc/pgx/v5
go get -u go.opentelemetry.io/contrib/instrumentation/github.com/jackc/pgx/v5/otelpgx

# GORM instrumentation
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres
go get -u go.opentelemetry.io/contrib/instrumentation/gorm.io/gorm/otelgorm
```

These packages provide the building blocks for tracing database operations across different libraries.

## Setting Up the Tracer Provider

Initialize OpenTelemetry before instrumenting database connections.

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func initTracer() (*sdktrace.TracerProvider, error) {
    exporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("database-service"),
            semconv.ServiceVersion("1.0.0"),
        )),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}
```

This setup creates a tracer provider that exports spans to stdout for development purposes.

## Instrumenting database/sql

The otelsql package wraps database/sql drivers to automatically trace all SQL operations.

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    "go.opentelemetry.io/contrib/instrumentation/database/sql/otelsql"
    "go.opentelemetry.io/otel/attribute"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func setupDatabaseSQL() (*sql.DB, error) {
    // Register instrumented driver
    driverName, err := otelsql.Register(
        "postgres",
        otelsql.WithAttributes(
            semconv.DBSystemPostgreSQL,
        ),
    )
    if err != nil {
        return nil, err
    }

    // Open database connection using instrumented driver
    db, err := sql.Open(
        driverName,
        "postgres://user:password@localhost:5432/mydb?sslmode=disable",
    )
    if err != nil {
        return nil, err
    }

    // Configure connection pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)

    // Record database stats as metrics
    err = otelsql.RecordStats(db)
    if err != nil {
        return nil, err
    }

    return db, nil
}

func queryUsers(ctx context.Context, db *sql.DB) ([]User, error) {
    // Query execution is automatically traced
    rows, err := db.QueryContext(
        ctx,
        "SELECT id, name, email FROM users WHERE active = $1",
        true,
    )
    if err != nil {
        return nil, fmt.Errorf("query failed: %w", err)
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
            return nil, fmt.Errorf("scan failed: %w", err)
        }
        users = append(users, u)
    }

    if err := rows.Err(); err != nil {
        return nil, err
    }

    return users, nil
}

func insertUser(ctx context.Context, db *sql.DB, name, email string) (int64, error) {
    // Insert with RETURNING clause
    var id int64
    err := db.QueryRowContext(
        ctx,
        "INSERT INTO users (name, email, active) VALUES ($1, $2, $3) RETURNING id",
        name, email, true,
    ).Scan(&id)

    if err != nil {
        return 0, fmt.Errorf("insert failed: %w", err)
    }

    return id, nil
}

func updateUser(ctx context.Context, db *sql.DB, id int64, name string) error {
    result, err := db.ExecContext(
        ctx,
        "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2",
        name, id,
    )
    if err != nil {
        return fmt.Errorf("update failed: %w", err)
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }

    if rowsAffected == 0 {
        return fmt.Errorf("user not found")
    }

    return nil
}

type User struct {
    ID    int64
    Name  string
    Email string
}
```

The otelsql package captures query text, execution time, and connection pool metrics automatically. Each database operation creates a span showing its contribution to overall request latency.

## Instrumenting pgx

The pgx library provides a native tracer interface that OpenTelemetry hooks into for detailed query tracing.

```go
package main

import (
    "context"
    "fmt"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "go.opentelemetry.io/contrib/instrumentation/github.com/jackc/pgx/v5/otelpgx"
)

func setupPgxPool(ctx context.Context) (*pgxpool.Pool, error) {
    // Parse connection string
    config, err := pgxpool.ParseConfig(
        "postgres://user:password@localhost:5432/mydb?sslmode=disable",
    )
    if err != nil {
        return nil, err
    }

    // Add OpenTelemetry tracer to pgx config
    config.ConnConfig.Tracer = otelpgx.NewTracer()

    // Configure pool settings
    config.MaxConns = 25
    config.MinConns = 5
    config.MaxConnLifetime = 5 * time.Minute

    // Create pool with instrumentation
    pool, err := pgxpool.NewWithConfig(ctx, config)
    if err != nil {
        return nil, err
    }

    return pool, nil
}

func queryUsersPgx(ctx context.Context, pool *pgxpool.Pool) ([]User, error) {
    // Query with automatic tracing
    rows, err := pool.Query(
        ctx,
        "SELECT id, name, email FROM users WHERE active = $1",
        true,
    )
    if err != nil {
        return nil, fmt.Errorf("query failed: %w", err)
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
            return nil, fmt.Errorf("scan failed: %w", err)
        }
        users = append(users, u)
    }

    if err := rows.Err(); err != nil {
        return nil, err
    }

    return users, nil
}

func insertUserPgx(ctx context.Context, pool *pgxpool.Pool, name, email string) (int64, error) {
    var id int64

    // Use transaction with tracing
    tx, err := pool.Begin(ctx)
    if err != nil {
        return 0, err
    }
    defer tx.Rollback(ctx)

    err = tx.QueryRow(
        ctx,
        "INSERT INTO users (name, email, active) VALUES ($1, $2, $3) RETURNING id",
        name, email, true,
    ).Scan(&id)

    if err != nil {
        return 0, fmt.Errorf("insert failed: %w", err)
    }

    if err := tx.Commit(ctx); err != nil {
        return 0, fmt.Errorf("commit failed: %w", err)
    }

    return id, nil
}

func batchInsertPgx(ctx context.Context, pool *pgxpool.Pool, users []User) error {
    // Use batch operations for efficiency
    batch := &pgx.Batch{}

    for _, u := range users {
        batch.Queue(
            "INSERT INTO users (name, email, active) VALUES ($1, $2, $3)",
            u.Name, u.Email, true,
        )
    }

    // Execute batch with tracing
    results := pool.SendBatch(ctx, batch)
    defer results.Close()

    for i := 0; i < len(users); i++ {
        _, err := results.Exec()
        if err != nil {
            return fmt.Errorf("batch insert failed at index %d: %w", i, err)
        }
    }

    return nil
}
```

The pgx instrumentation provides detailed traces including connection acquisition time, query parsing, execution, and result processing. Batch operations appear as single spans with attributes showing the number of statements.

## Instrumenting GORM

GORM uses callbacks for instrumentation, allowing OpenTelemetry to hook into the ORM lifecycle.

```go
package main

import (
    "context"
    "fmt"
    "time"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "go.opentelemetry.io/contrib/instrumentation/gorm.io/gorm/otelgorm"
)

func setupGORM() (*gorm.DB, error) {
    dsn := "host=localhost user=user password=password dbname=mydb port=5432 sslmode=disable"

    // Open GORM connection
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        return nil, err
    }

    // Add OpenTelemetry plugin
    if err := db.Use(otelgorm.NewPlugin()); err != nil {
        return nil, err
    }

    return db, nil
}

type GormUser struct {
    ID        uint      `gorm:"primarykey"`
    Name      string    `gorm:"not null"`
    Email     string    `gorm:"uniqueIndex;not null"`
    Active    bool      `gorm:"default:true"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

func (GormUser) TableName() string {
    return "users"
}

func queryUsersGORM(ctx context.Context, db *gorm.DB) ([]GormUser, error) {
    var users []GormUser

    // Query with automatic tracing
    result := db.WithContext(ctx).
        Where("active = ?", true).
        Order("created_at DESC").
        Limit(100).
        Find(&users)

    if result.Error != nil {
        return nil, fmt.Errorf("query failed: %w", result.Error)
    }

    return users, nil
}

func createUserGORM(ctx context.Context, db *gorm.DB, name, email string) (*GormUser, error) {
    user := &GormUser{
        Name:   name,
        Email:  email,
        Active: true,
    }

    // Create with tracing
    result := db.WithContext(ctx).Create(user)
    if result.Error != nil {
        return nil, fmt.Errorf("create failed: %w", result.Error)
    }

    return user, nil
}

func updateUserGORM(ctx context.Context, db *gorm.DB, id uint, name string) error {
    result := db.WithContext(ctx).
        Model(&GormUser{}).
        Where("id = ?", id).
        Update("name", name)

    if result.Error != nil {
        return fmt.Errorf("update failed: %w", result.Error)
    }

    if result.RowsAffected == 0 {
        return fmt.Errorf("user not found")
    }

    return nil
}

func complexQueryGORM(ctx context.Context, db *gorm.DB) ([]GormUser, error) {
    var users []GormUser

    // Complex query with joins and conditions
    result := db.WithContext(ctx).
        Where("active = ?", true).
        Where("created_at > ?", time.Now().AddDate(0, -1, 0)).
        Order("name ASC").
        Find(&users)

    if result.Error != nil {
        return nil, fmt.Errorf("complex query failed: %w", result.Error)
    }

    return users, nil
}

func transactionGORM(ctx context.Context, db *gorm.DB) error {
    // Transaction with automatic tracing
    return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        // Create user
        user := &GormUser{
            Name:   "Transaction User",
            Email:  "tx@example.com",
            Active: true,
        }

        if err := tx.Create(user).Error; err != nil {
            return err
        }

        // Update user
        if err := tx.Model(user).Update("name", "Updated Name").Error; err != nil {
            return err
        }

        return nil
    })
}
```

GORM instrumentation captures not just the generated SQL but also GORM-specific operations like hooks, associations, and transaction boundaries.

## Adding Custom Spans for Business Logic

Combine database instrumentation with custom spans to trace business logic.

```go
package main

import (
    "context"
    "database/sql"
    "fmt"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
)

func getUserWithOrders(ctx context.Context, db *sql.DB, userID int64) (*UserWithOrders, error) {
    tracer := otel.Tracer("business-logic")

    // Create span for the entire operation
    ctx, span := tracer.Start(ctx, "get-user-with-orders")
    defer span.End()

    span.SetAttributes(
        attribute.Int64("user.id", userID),
    )

    // Fetch user (creates child database span)
    ctx, userSpan := tracer.Start(ctx, "fetch-user")
    var user User
    err := db.QueryRowContext(
        ctx,
        "SELECT id, name, email FROM users WHERE id = $1",
        userID,
    ).Scan(&user.ID, &user.Name, &user.Email)
    userSpan.End()

    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "failed to fetch user")
        return nil, fmt.Errorf("user query failed: %w", err)
    }

    // Fetch orders (creates child database span)
    ctx, ordersSpan := tracer.Start(ctx, "fetch-orders")
    rows, err := db.QueryContext(
        ctx,
        "SELECT id, total, status FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
        userID,
    )
    if err != nil {
        ordersSpan.RecordError(err)
        ordersSpan.End()
        span.SetStatus(codes.Error, "failed to fetch orders")
        return nil, fmt.Errorf("orders query failed: %w", err)
    }
    defer rows.Close()

    var orders []Order
    for rows.Next() {
        var o Order
        if err := rows.Scan(&o.ID, &o.Total, &o.Status); err != nil {
            ordersSpan.RecordError(err)
            ordersSpan.End()
            return nil, err
        }
        orders = append(orders, o)
    }

    ordersSpan.SetAttributes(attribute.Int("orders.count", len(orders)))
    ordersSpan.End()

    span.SetStatus(codes.Ok, "user and orders fetched successfully")

    return &UserWithOrders{
        User:   user,
        Orders: orders,
    }, nil
}

type Order struct {
    ID     int64
    Total  float64
    Status string
}

type UserWithOrders struct {
    User   User
    Orders []Order
}
```

This pattern creates a hierarchy of spans showing business logic at the top level with database operations as children, providing complete visibility into request processing.

## Database Trace Visualization

Understanding how database traces appear in your observability system:

```mermaid
graph TD
    A[HTTP Request Span] --> B[Business Logic Span]
    B --> C[Database Query: SELECT user]
    B --> D[Database Query: SELECT orders]
    B --> E[Database Query: SELECT products]
    C --> F[Connection Acquire]
    C --> G[Query Execute]
    C --> H[Result Scan]
    D --> I[Connection Acquire]
    D --> J[Query Execute]
    D --> K[Result Scan]
```

Each database operation creates a span with timing information, allowing you to identify slow queries and connection pool contention.

## Handling Connection Pools

Monitor connection pool behavior with OpenTelemetry metrics.

```go
package main

import (
    "context"
    "database/sql"
    "time"

    "go.opentelemetry.io/otel/metric"
)

func monitorConnectionPool(db *sql.DB, meter metric.Meter) error {
    // Create gauges for pool stats
    maxOpenConns, err := meter.Int64ObservableGauge(
        "db.pool.max_open_connections",
        metric.WithDescription("Maximum open database connections"),
    )
    if err != nil {
        return err
    }

    openConns, err := meter.Int64ObservableGauge(
        "db.pool.open_connections",
        metric.WithDescription("Current open database connections"),
    )
    if err != nil {
        return err
    }

    inUseConns, err := meter.Int64ObservableGauge(
        "db.pool.in_use_connections",
        metric.WithDescription("Connections currently in use"),
    )
    if err != nil {
        return err
    }

    idleConns, err := meter.Int64ObservableGauge(
        "db.pool.idle_connections",
        metric.WithDescription("Idle database connections"),
    )
    if err != nil {
        return err
    }

    // Register callback to collect stats
    _, err = meter.RegisterCallback(
        func(ctx context.Context, observer metric.Observer) error {
            stats := db.Stats()
            observer.ObserveInt64(maxOpenConns, int64(stats.MaxOpenConnections))
            observer.ObserveInt64(openConns, int64(stats.OpenConnections))
            observer.ObserveInt64(inUseConns, int64(stats.InUse))
            observer.ObserveInt64(idleConns, int64(stats.Idle))
            return nil
        },
        maxOpenConns, openConns, inUseConns, idleConns,
    )

    return err
}
```

Connection pool metrics help identify resource exhaustion and tuning opportunities.

## Best Practices for Database Tracing

Follow these patterns to get the most value from database instrumentation:

```go
package main

import (
    "context"
    "database/sql"
    "fmt"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// Always pass context through the call chain
func goodContextPropagation(ctx context.Context, db *sql.DB, id int64) error {
    // Context carries trace information to database calls
    _, err := db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", id)
    return err
}

// Add semantic attributes for better filtering
func addSemanticAttributes(ctx context.Context, db *sql.DB, email string) error {
    span := trace.SpanFromContext(ctx)

    span.SetAttributes(
        attribute.String("db.operation", "user_lookup"),
        attribute.String("user.email", email),
        attribute.String("db.table", "users"),
    )

    var id int64
    err := db.QueryRowContext(
        ctx,
        "SELECT id FROM users WHERE email = $1",
        email,
    ).Scan(&id)

    return err
}

// Use prepared statements for repeated queries
func usePreparedStatements(ctx context.Context, db *sql.DB, ids []int64) error {
    // Prepare statement (traced once)
    stmt, err := db.PrepareContext(
        ctx,
        "SELECT name FROM users WHERE id = $1",
    )
    if err != nil {
        return err
    }
    defer stmt.Close()

    // Execute multiple times (each execution traced)
    for _, id := range ids {
        var name string
        if err := stmt.QueryRowContext(ctx, id).Scan(&name); err != nil {
            return err
        }
        fmt.Println(name)
    }

    return nil
}
```

These patterns ensure your traces provide actionable insights into database performance.

Database instrumentation with OpenTelemetry transforms opaque SQL execution into observable operations with clear timing, error rates, and resource utilization. Whether you use database/sql, pgx, or GORM, OpenTelemetry provides the instrumentation needed to understand database behavior in production, identify optimization opportunities, and debug performance issues with concrete data rather than guesswork.
