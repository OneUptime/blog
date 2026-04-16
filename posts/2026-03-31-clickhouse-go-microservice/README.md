# How to Build a Go Microservice with ClickHouse Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Go, Microservice, REST API, Architecture

Description: Build a production-ready Go microservice that uses ClickHouse as its analytics backend, with connection pooling, graceful shutdown, and health endpoints.

---

## Architecture Overview

A Go microservice with a ClickHouse backend typically has:

- HTTP server with REST endpoints
- Repository layer for ClickHouse queries
- Connection pool for concurrent request handling
- Health check endpoint for Kubernetes probes
- Graceful shutdown to drain in-flight requests

## Project Structure

```text
service/
  main.go
  config/config.go
  repository/events.go
  handler/events.go
  middleware/logging.go
```

## Configuration

```go
// config/config.go
package config

import "os"

type Config struct {
    CHHost     string
    CHPort     string
    CHDatabase string
    CHUser     string
    CHPassword string
    ListenAddr string
}

func Load() Config {
    return Config{
        CHHost:     getEnv("CH_HOST", "localhost"),
        CHPort:     getEnv("CH_PORT", "9000"),
        CHDatabase: getEnv("CH_DATABASE", "default"),
        CHUser:     getEnv("CH_USER", "default"),
        CHPassword: getEnv("CH_PASSWORD", ""),
        ListenAddr: getEnv("LISTEN_ADDR", ":8080"),
    }
}

func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return fallback
}
```

## Repository Layer

```go
// repository/events.go
package repository

import (
    "context"
    "github.com/ClickHouse/clickhouse-go/v2"
)

type EventRepository struct {
    conn clickhouse.Conn
}

func NewEventRepository(conn clickhouse.Conn) *EventRepository {
    return &EventRepository{conn: conn}
}

func (r *EventRepository) GetDailyActiveUsers(ctx context.Context, date string) (uint64, error) {
    var count uint64
    row := r.conn.QueryRow(ctx,
        "SELECT uniq(user_id) FROM events WHERE toDate(event_time) = ?", date)
    if err := row.Scan(&count); err != nil {
        return 0, err
    }
    return count, nil
}

func (r *EventRepository) InsertEvents(ctx context.Context, events []Event) error {
    batch, err := r.conn.PrepareBatch(ctx, "INSERT INTO events (user_id, event_time, event_type)")
    if err != nil {
        return err
    }
    for _, e := range events {
        batch.Append(e.UserID, e.EventTime, e.EventType)
    }
    return batch.Send()
}
```

## HTTP Handler

```go
// handler/events.go
func (h *Handler) GetDAU(w http.ResponseWriter, r *http.Request) {
    date := r.URL.Query().Get("date")
    if date == "" {
        date = time.Now().Format("2006-01-02")
    }

    count, err := h.repo.GetDailyActiveUsers(r.Context(), date)
    if err != nil {
        http.Error(w, "Query failed", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]uint64{"dau": count})
}
```

## Main with Graceful Shutdown

```go
// main.go
func main() {
    cfg := config.Load()
    conn, _ := clickhouse.Open(&clickhouse.Options{
        Addr:         []string{cfg.CHHost + ":" + cfg.CHPort},
        Auth:         clickhouse.Auth{Database: cfg.CHDatabase, Username: cfg.CHUser, Password: cfg.CHPassword},
        MaxOpenConns: 20,
        MaxIdleConns: 10,
    })

    repo := repository.NewEventRepository(conn)
    h := handler.NewHandler(repo)

    mux := http.NewServeMux()
    mux.HandleFunc("/api/v1/dau", h.GetDAU)
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        if err := conn.Ping(r.Context()); err != nil {
            http.Error(w, "unhealthy", 503)
            return
        }
        w.WriteHeader(200)
    })

    srv := &http.Server{Addr: cfg.ListenAddr, Handler: mux}

    go srv.ListenAndServe()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    srv.Shutdown(ctx)
    conn.Close()
}
```

## Summary

A Go microservice with ClickHouse uses a repository pattern to isolate query logic, a connection pool for concurrent HTTP requests, and a `/health` endpoint that checks ClickHouse connectivity. Graceful shutdown drains in-flight requests before closing connections, preventing data loss during rolling deployments.
