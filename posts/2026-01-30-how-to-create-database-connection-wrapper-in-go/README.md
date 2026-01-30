# How to Create Database Connection Wrapper in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Database, SQL, Architecture

Description: Learn how to build a database connection wrapper in Go for connection pooling, transaction management, and query instrumentation.

---

Building robust database interactions in Go requires more than just opening a connection. A well-designed database wrapper provides connection pooling, transaction management, query logging, and retry logic. In this guide, we will build a production-ready database connection wrapper from the ground up.

## Understanding sql.DB Connection Pool Settings

Go's `database/sql` package provides built-in connection pooling through the `sql.DB` type. Properly configuring these settings is crucial for application performance.

```go
package database

import (
    "database/sql"
    "time"

    _ "github.com/lib/pq"
)

type Config struct {
    DSN             string
    MaxOpenConns    int
    MaxIdleConns    int
    ConnMaxLifetime time.Duration
    ConnMaxIdleTime time.Duration
}

func NewConnection(cfg Config) (*sql.DB, error) {
    db, err := sql.Open("postgres", cfg.DSN)
    if err != nil {
        return nil, err
    }

    db.SetMaxOpenConns(cfg.MaxOpenConns)
    db.SetMaxIdleConns(cfg.MaxIdleConns)
    db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
    db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

    if err := db.Ping(); err != nil {
        return nil, err
    }

    return db, nil
}
```

The `MaxOpenConns` limits total connections, while `MaxIdleConns` controls how many stay open when idle. Setting `ConnMaxLifetime` prevents using stale connections, and `ConnMaxIdleTime` closes idle connections after a duration.

## Designing the Wrapper Interface

A clean interface abstracts database operations and enables testing with mocks.

```go
type DB interface {
    ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
    QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
    QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
    BeginTx(ctx context.Context, opts *sql.TxOptions) (Tx, error)
    Close() error
}

type Tx interface {
    ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
    QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
    QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
    Commit() error
    Rollback() error
}
```

## Building Transaction Helpers

Transaction management often involves repetitive patterns. A helper function simplifies this with automatic commit and rollback handling.

```go
type Wrapper struct {
    db     *sql.DB
    logger Logger
}

func (w *Wrapper) WithTransaction(ctx context.Context, fn func(tx Tx) error) error {
    tx, err := w.db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("begin transaction: %w", err)
    }

    defer func() {
        if p := recover(); p != nil {
            tx.Rollback()
            panic(p)
        }
    }()

    if err := fn(&txWrapper{tx: tx, logger: w.logger}); err != nil {
        if rbErr := tx.Rollback(); rbErr != nil {
            return fmt.Errorf("rollback failed: %v (original: %w)", rbErr, err)
        }
        return err
    }

    return tx.Commit()
}
```

This pattern ensures transactions are always properly closed, even when panics occur.

## Context Handling for Timeouts and Cancellation

Context propagation enables query timeouts and graceful cancellation. Every database method should accept and respect context.

```go
func (w *Wrapper) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    start := time.Now()
    result, err := w.db.ExecContext(ctx, query, args...)
    w.logQuery(ctx, query, time.Since(start), err)

    return result, err
}
```

## Adding Query Logging and Metrics

Instrumentation provides visibility into database performance. Track query duration, count, and errors.

```go
type Logger interface {
    Debug(ctx context.Context, msg string, fields map[string]any)
    Error(ctx context.Context, msg string, fields map[string]any)
}

func (w *Wrapper) logQuery(ctx context.Context, query string, duration time.Duration, err error) {
    fields := map[string]any{
        "query":    truncateQuery(query, 100),
        "duration": duration.Milliseconds(),
    }

    if err != nil {
        fields["error"] = err.Error()
        w.logger.Error(ctx, "database query failed", fields)
        return
    }

    w.logger.Debug(ctx, "database query executed", fields)
}

func truncateQuery(query string, maxLen int) string {
    if len(query) <= maxLen {
        return query
    }
    return query[:maxLen] + "..."
}
```

For metrics, integrate with Prometheus or your preferred monitoring system to track query latencies and error rates.

## Implementing Retry Logic

Transient failures require retry logic with exponential backoff. This handles temporary network issues and connection resets.

```go
func (w *Wrapper) ExecWithRetry(ctx context.Context, query string, args ...any) (sql.Result, error) {
    var result sql.Result
    var err error

    for attempt := 0; attempt < 3; attempt++ {
        result, err = w.ExecContext(ctx, query, args...)
        if err == nil {
            return result, nil
        }

        if !isRetryable(err) {
            return nil, err
        }

        backoff := time.Duration(1<<attempt) * 100 * time.Millisecond
        select {
        case <-ctx.Done():
            return nil, ctx.Err()
        case <-time.After(backoff):
        }
    }

    return nil, fmt.Errorf("max retries exceeded: %w", err)
}

func isRetryable(err error) bool {
    if err == nil {
        return false
    }
    return errors.Is(err, sql.ErrConnDone) ||
           strings.Contains(err.Error(), "connection reset")
}
```

## Putting It All Together

Here is a complete example showing the wrapper in action:

```go
func main() {
    cfg := database.Config{
        DSN:             "postgres://user:pass@localhost/db?sslmode=disable",
        MaxOpenConns:    25,
        MaxIdleConns:    5,
        ConnMaxLifetime: 5 * time.Minute,
        ConnMaxIdleTime: 1 * time.Minute,
    }

    db, err := database.NewWrapper(cfg, logger)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    err = db.WithTransaction(ctx, func(tx database.Tx) error {
        _, err := tx.ExecContext(ctx, "INSERT INTO users (name) VALUES ($1)", "Alice")
        return err
    })
}
```

A well-structured database wrapper improves code maintainability, simplifies testing, and provides essential observability into your application's data layer. Start with these patterns and extend them based on your specific requirements.
