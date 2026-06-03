# How to Trace Database Queries from Kubernetes Pods Through Connection Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenTelemetry, Distributed Tracing, Database, Performance

Description: Learn how to implement distributed tracing for database queries from Kubernetes pods including connection pool metrics and query performance tracking using OpenTelemetry database instrumentation.

---

Database queries often represent the slowest operations in distributed systems, yet they're frequently invisible in traces. OpenTelemetry database instrumentation captures query execution, connection pool behavior, and transaction boundaries, providing complete visibility into database interactions from Kubernetes pods.

Tracing database queries reveals slow queries, connection pool exhaustion, and transaction patterns. By capturing query text, execution time, and connection metadata, you identify performance bottlenecks and optimize database interactions. Connection pool instrumentation shows when applications wait for connections, indicating scaling issues.

## Understanding Database Instrumentation

OpenTelemetry database instrumentation wraps database drivers to capture query operations as spans. Each query creates a span containing the SQL statement, execution duration, rows affected, and connection details. Instrumentation respects parent spans, linking database operations to the request context that triggered them.

Connection pools manage database connections across requests. Instrumentation tracks connection acquisition time, pool size, and active connections. High acquisition times indicate pool exhaustion, while idle connections suggest over-provisioning. These metrics guide connection pool tuning.

## Instrumenting PostgreSQL with Go

Implement database tracing in a Go application using pgx:

```go
// database.go
package database

import (
    "context"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgconn"
    "github.com/jackc/pgx/v5/pgxpool"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("database")

type TracedDB struct {
    *pgxpool.Pool
}

func NewTracedDB(ctx context.Context, connString string) (*TracedDB, error) {
    config, err := pgxpool.ParseConfig(connString)
    if err != nil {
        return nil, err
    }

    // Configure connection pool
    config.MaxConns = 25
    config.MinConns = 5
    config.MaxConnLifetime = time.Hour
    config.MaxConnIdleTime = 30 * time.Minute
    config.HealthCheckPeriod = time.Minute

    pool, err := pgxpool.NewWithConfig(ctx, config)
    if err != nil {
        return nil, err
    }

    return &TracedDB{Pool: pool}, nil
}

func (db *TracedDB) QueryRowContext(ctx context.Context, query string, args ...any) pgx.Row {
    // Create span for database query
    ctx, span := tracer.Start(ctx, "db.query",
        trace.WithSpanKind(trace.SpanKindClient),
        trace.WithAttributes(
            attribute.String("db.system.name", "postgresql"),
            attribute.String("db.operation.name", "SELECT"),
            attribute.String("db.query.text", query),
        ),
    )

    // Track connection pool stats
    stats := db.Stat()
    span.SetAttributes(
        attribute.Int64("db.pool.connections.total", int64(stats.TotalConns())),
        attribute.Int64("db.pool.connections.idle", int64(stats.IdleConns())),
        attribute.Int64("db.pool.connections.max", int64(stats.MaxConns())),
    )

    // Measure connection acquisition time
    acquireStart := time.Now()
    conn, err := db.Acquire(ctx)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        span.End()
        return errorRow{err: err}
    }

    acquireDuration := time.Since(acquireStart)
    span.SetAttributes(
        attribute.Int64("db.pool.acquire_duration_ms", acquireDuration.Milliseconds()),
    )

    // Record slow connection acquisition
    if acquireDuration > 100*time.Millisecond {
        span.AddEvent("slow_connection_acquisition", trace.WithAttributes(
            attribute.Int64("duration_ms", acquireDuration.Milliseconds()),
        ))
    }

    // Execute query
    return &tracedRow{
        Row:        conn.QueryRow(ctx, query, args...),
        conn:       conn,
        span:       span,
        query:      query,
        queryStart: time.Now(),
    }
}

type tracedRow struct {
    pgx.Row
    conn       *pgxpool.Conn
    span       trace.Span
    query      string
    queryStart time.Time
}

func (r *tracedRow) Scan(dest ...any) error {
    defer r.span.End()
    defer r.conn.Release()

    err := r.Row.Scan(dest...)
    queryDuration := time.Since(r.queryStart)

    r.span.SetAttributes(
        attribute.Int64("db.query.duration_ms", queryDuration.Milliseconds()),
    )

    if err != nil {
        r.span.RecordError(err)
        r.span.SetStatus(codes.Error, err.Error())
        return err
    }

    // Record slow query
    if queryDuration > 500*time.Millisecond {
        r.span.AddEvent("slow_query", trace.WithAttributes(
            attribute.Int64("duration_ms", queryDuration.Milliseconds()),
            attribute.String("query", r.query),
        ))
    }

    return nil
}

type errorRow struct {
    err error
}

func (r errorRow) Scan(dest ...any) error {
    return r.err
}

func (db *TracedDB) ExecContext(ctx context.Context, query string, args ...any) (pgconn.CommandTag, error) {
    ctx, span := tracer.Start(ctx, "db.exec",
        trace.WithSpanKind(trace.SpanKindClient),
        trace.WithAttributes(
            attribute.String("db.system.name", "postgresql"),
            attribute.String("db.operation.name", "UPDATE"),
            attribute.String("db.query.text", query),
        ),
    )
    defer span.End()

    conn, err := db.Acquire(ctx)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return pgconn.CommandTag{}, err
    }
    defer conn.Release()

    result, err := conn.Exec(ctx, query, args...)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return pgconn.CommandTag{}, err
    }

    span.SetAttributes(
        attribute.Int64("db.rows_affected", result.RowsAffected()),
    )

    return result, nil
}
```

Use the traced database:

```go
// handler.go
func getUser(ctx context.Context, db *database.TracedDB, userID string) (*User, error) {
    query := "SELECT id, email, created_at FROM users WHERE id = $1"

    var user User
    err := db.QueryRowContext(ctx, query, userID).Scan(&user.ID, &user.Email, &user.CreatedAt)
    if err != nil {
        return nil, err
    }

    return &user, nil
}
```

## Tracing Transactions

Implement transaction tracing:

```go
// transactions.go
func (db *TracedDB) BeginTx(ctx context.Context) (*TracedTx, error) {
    ctx, span := tracer.Start(ctx, "db.transaction",
        trace.WithSpanKind(trace.SpanKindClient),
        trace.WithAttributes(
            attribute.String("db.system.name", "postgresql"),
            attribute.String("db.operation.name", "BEGIN"),
        ),
    )

    conn, err := db.Acquire(ctx)
    if err != nil {
        span.End()
        return nil, err
    }

    tx, err := conn.Begin(ctx)
    if err != nil {
        conn.Release()
        span.End()
        return nil, err
    }

    return &TracedTx{
        Tx:    tx,
        conn:  conn,
        ctx:   ctx,
        span:  span,
    }, nil
}

type TracedTx struct {
    pgx.Tx
    conn  *pgxpool.Conn
    ctx   context.Context
    span  trace.Span
}

func (tx *TracedTx) Commit(ctx context.Context) error {
    defer tx.span.End()
    defer tx.conn.Release()

    tx.span.AddEvent("transaction_commit")

    err := tx.Tx.Commit(ctx)
    if err != nil {
        tx.span.RecordError(err)
    }

    return err
}

func (tx *TracedTx) Rollback(ctx context.Context) error {
    defer tx.span.End()
    defer tx.conn.Release()

    tx.span.AddEvent("transaction_rollback")

    return tx.Tx.Rollback(ctx)
}
```

## Deploying with Database Connection

Configure database connection in Kubernetes:

```yaml
# payment-service-deployment.yaml

apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  connection-string: "postgres://user:password@postgres.database.svc.cluster.local:5432/payments?sslmode=require"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: payment-service:v1.0.0
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: connection-string
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector:4317"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
```

## Monitoring Database Performance

Query traces for database insights:

```bash
# Find slow queries
curl -G -s 'http://tempo:3100/api/search' \
  --data-urlencode 'q={ span.db.system.name = "postgresql" && span:kind = client }' \
  --data-urlencode 'minDuration=500ms'

# Find connection pool issues
curl -G -s 'http://tempo:3100/api/search' \
  --data-urlencode 'q={ event:name = "slow_connection_acquisition" }'
```

Database query tracing provides complete visibility into data access patterns from Kubernetes pods. By capturing query execution, connection pool behavior, and transaction boundaries, you identify performance bottlenecks and optimize database interactions.
