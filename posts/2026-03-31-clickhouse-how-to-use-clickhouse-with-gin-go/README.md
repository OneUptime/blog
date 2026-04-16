# How to Use ClickHouse with Gin (Go)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Gin, Go, API, Analytics, HTTP

Description: Build a Go REST API with the Gin framework that queries ClickHouse to serve fast analytical data with typed structs and connection pooling.

---

Gin is a high-performance HTTP framework for Go. Combining it with ClickHouse's native Go client gives you a fast, type-safe analytics API that can handle thousands of requests per second.

## Setting Up the Project

```bash
mkdir clickhouse-gin-api && cd clickhouse-gin-api
go mod init example.com/clickhouse-gin-api
go get github.com/gin-gonic/gin
go get github.com/ClickHouse/clickhouse-go/v2
```

## Creating a ClickHouse Connection

Create `db/clickhouse.go`:

```go
package db

import (
    "context"
    "fmt"

    "github.com/ClickHouse/clickhouse-go/v2"
    "github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

func NewClickHouseConn() (driver.Conn, error) {
    conn, err := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"localhost:9000"},
        Auth: clickhouse.Auth{
            Database: "default",
            Username: "default",
            Password: "",
        },
        Settings: clickhouse.Settings{
            "max_execution_time": 60,
        },
        Compression: &clickhouse.Compression{
            Method: clickhouse.CompressionLZ4,
        },
    })
    if err != nil {
        return nil, fmt.Errorf("failed to connect to ClickHouse: %w", err)
    }
    if err := conn.Ping(context.Background()); err != nil {
        return nil, fmt.Errorf("ClickHouse ping failed: %w", err)
    }
    return conn, nil
}
```

## Defining Query Result Structs

Create `models/analytics.go`:

```go
package models

import "time"

type TopPage struct {
    Page        string  `json:"page"`
    Views       uint64  `json:"views"`
    UniqueUsers uint64  `json:"unique_users"`
}

type DailyTraffic struct {
    Day         time.Time `json:"day"`
    Visits      uint64    `json:"visits"`
}
```

## Writing Gin Handlers

Create `handlers/analytics.go`:

```go
package handlers

import (
    "context"
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "github.com/ClickHouse/clickhouse-go/v2/lib/driver"
    "example.com/clickhouse-gin-api/models"
)

type AnalyticsHandler struct {
    db driver.Conn
}

func NewAnalyticsHandler(db driver.Conn) *AnalyticsHandler {
    return &AnalyticsHandler{db: db}
}

func (h *AnalyticsHandler) GetTopPages(c *gin.Context) {
    days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))

    rows, err := h.db.Query(context.Background(), `
        SELECT
            page,
            count() AS views,
            uniq(user_id) AS unique_users
        FROM default.page_views
        WHERE created_at >= now() - INTERVAL ? DAY
        GROUP BY page
        ORDER BY views DESC
        LIMIT 20
    `, days)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    defer rows.Close()

    var result []models.TopPage
    for rows.Next() {
        var row models.TopPage
        if err := rows.Scan(&row.Page, &row.Views, &row.UniqueUsers); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        result = append(result, row)
    }

    c.JSON(http.StatusOK, result)
}
```

## Wiring Up the Router

Create `main.go`:

```go
package main

import (
    "log"

    "github.com/gin-gonic/gin"
    "example.com/clickhouse-gin-api/db"
    "example.com/clickhouse-gin-api/handlers"
)

func main() {
    conn, err := db.NewClickHouseConn()
    if err != nil {
        log.Fatalf("ClickHouse connection failed: %v", err)
    }

    analyticsHandler := handlers.NewAnalyticsHandler(conn)

    r := gin.Default()
    r.GET("/analytics/top-pages", analyticsHandler.GetTopPages)
    r.Run(":8080")
}
```

## Summary

Gin and ClickHouse's native Go client form a high-performance analytics API stack. The typed scan pattern ensures query results map cleanly to Go structs, and Gin's lightweight routing adds minimal overhead. This combination is well-suited for serving analytical dashboards and high-throughput metrics endpoints.
