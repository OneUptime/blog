# How to Test Go Code That Uses ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Go, Testing, Integration Test, Testcontainers

Description: Learn how to write reliable unit and integration tests for Go applications that query ClickHouse using mocks and Testcontainers.

---

## Why Testing ClickHouse Code Matters

ClickHouse powers analytics-heavy workloads, and bugs in query logic can silently return wrong results. A solid test suite catches regressions before they reach production.

## Setting Up Testcontainers for ClickHouse

Testcontainers-Go lets you spin up a real ClickHouse instance inside Docker for integration tests.

```bash
go get github.com/testcontainers/testcontainers-go
go get github.com/ClickHouse/clickhouse-go/v2
```

```go
package db_test

import (
    "context"
    "testing"

    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/wait"
)

func startClickHouse(t *testing.T) string {
    t.Helper()
    ctx := context.Background()
    req := testcontainers.ContainerRequest{
        Image:        "clickhouse/clickhouse-server:latest",
        ExposedPorts: []string{"9000/tcp"},
        WaitingFor:   wait.ForListeningPort("9000/tcp"),
    }
    c, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: req,
        Started:          true,
    })
    if err != nil {
        t.Fatalf("start container: %v", err)
    }
    t.Cleanup(func() { c.Terminate(ctx) })
    host, _ := c.Host(ctx)
    port, _ := c.MappedPort(ctx, "9000")
    return host + ":" + port.Port()
}
```

## Writing an Integration Test

```go
func TestInsertAndQuery(t *testing.T) {
    addr := startClickHouse(t)
    conn, err := clickhouse.Open(&clickhouse.Options{
        Addr: []string{addr},
    })
    if err != nil {
        t.Fatal(err)
    }
    defer conn.Close()

    ctx := context.Background()
    conn.Exec(ctx, `CREATE TABLE IF NOT EXISTS events (
        id   UInt64,
        name String
    ) ENGINE = MergeTree() ORDER BY id`)

    conn.Exec(ctx, `INSERT INTO events VALUES (1, 'signup')`)

    var name string
    row := conn.QueryRow(ctx, `SELECT name FROM events WHERE id = 1`)
    if err := row.Scan(&name); err != nil {
        t.Fatal(err)
    }
    if name != "signup" {
        t.Fatalf("expected signup, got %s", name)
    }
}
```

## Mocking the ClickHouse Interface

For unit tests that run fast without Docker, define a small interface and mock it.

```go
import "github.com/ClickHouse/clickhouse-go/v2/lib/driver"

type Querier interface {
    QueryRow(ctx context.Context, query string, args ...any) driver.Row
}

type MockQuerier struct {
    RowResult driver.Row
}

func (m *MockQuerier) QueryRow(_ context.Context, _ string, _ ...any) driver.Row {
    return m.RowResult
}
```

Use `testify/mock` or manual structs to inject fakes into service logic without hitting a real database.

## Table-Driven Tests

Structure tests to cover edge cases systematically.

```go
tests := []struct {
    name     string
    id       uint64
    wantName string
}{
    {"existing event", 1, "signup"},
    {"another event", 2, "purchase"},
}
for _, tc := range tests {
    t.Run(tc.name, func(t *testing.T) {
        // query and assert
    })
}
```

## Running Tests in CI

Add a `docker` service to your CI pipeline or use the Testcontainers cloud so tests run without a pre-installed ClickHouse.

```yaml
- name: Run tests
  run: go test ./... -v -timeout 120s
```

## Summary

Testing Go code that uses ClickHouse involves two layers: fast unit tests with mocked interfaces, and integration tests backed by Testcontainers. This combination gives confidence without coupling tests to a shared database.
