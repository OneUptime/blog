# How to Build a ClickHouse Query Builder in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Go, Query Builder, SQL, Type Safety

Description: Build a type-safe ClickHouse query builder in Go that constructs SELECT queries programmatically, preventing SQL injection and improving maintainability.

---

## Why a Query Builder?

String concatenation for SQL is error-prone and vulnerable to injection. A query builder lets you construct queries programmatically with type safety, making complex dynamic queries readable and safe.

## Simple Query Builder Struct

```go
package querybuilder

import (
    "fmt"
    "strings"
)

type SelectBuilder struct {
    table      string
    columns    []string
    conditions []string
    orderBy    string
    limit      int
    params     []interface{}
}

func NewSelect(table string) *SelectBuilder {
    return &SelectBuilder{table: table}
}

func (b *SelectBuilder) Columns(cols ...string) *SelectBuilder {
    b.columns = append(b.columns, cols...)
    return b
}

func (b *SelectBuilder) Where(condition string, args ...interface{}) *SelectBuilder {
    b.conditions = append(b.conditions, condition)
    b.params = append(b.params, args...)
    return b
}

func (b *SelectBuilder) OrderBy(col string) *SelectBuilder {
    b.orderBy = col
    return b
}

func (b *SelectBuilder) Limit(n int) *SelectBuilder {
    b.limit = n
    return b
}

func (b *SelectBuilder) buildBase() string {
    cols := "*"
    if len(b.columns) > 0 {
        cols = strings.Join(b.columns, ", ")
    }

    query := fmt.Sprintf("SELECT %s FROM %s", cols, b.table)

    if len(b.conditions) > 0 {
        query += " WHERE " + strings.Join(b.conditions, " AND ")
    }

    return query
}

func (b *SelectBuilder) Build() (string, []interface{}) {
    query := b.buildBase()

    if b.orderBy != "" {
        query += " ORDER BY " + b.orderBy
    }

    if b.limit > 0 {
        query += fmt.Sprintf(" LIMIT %d", b.limit)
    }

    return query, b.params
}
```

## Using the Query Builder

```go
query, params := querybuilder.NewSelect("events").
    Columns("user_id", "event_time", "event_type").
    Where("event_date = ?", "2024-01-15").
    Where("event_type IN (?, ?)", "login", "purchase").
    OrderBy("event_time DESC").
    Limit(100).
    Build()

fmt.Println(query)
// SELECT user_id, event_time, event_type FROM events
// WHERE event_date = ? AND event_type IN (?, ?)
// ORDER BY event_time DESC LIMIT 100

rows, err := conn.Query(ctx, query, params...)
```

## Aggregate Query Builder

```go
type AggregateBuilder struct {
    SelectBuilder
    groupByCols []string
    havingClause string
}

func (b *AggregateBuilder) GroupBy(cols ...string) *AggregateBuilder {
    b.groupByCols = append(b.groupByCols, cols...)
    return b
}

func (b *AggregateBuilder) Having(cond string) *AggregateBuilder {
    b.havingClause = cond
    return b
}

func (b *AggregateBuilder) Build() (string, []interface{}) {
    query := b.SelectBuilder.buildBase()
    if len(b.groupByCols) > 0 {
        query += " GROUP BY " + strings.Join(b.groupByCols, ", ")
    }
    if b.havingClause != "" {
        query += " HAVING " + b.havingClause
    }
    if b.orderBy != "" {
        query += " ORDER BY " + b.orderBy
    }
    if b.limit > 0 {
        query += fmt.Sprintf(" LIMIT %d", b.limit)
    }
    return query, b.params
}
```

## Preventing SQL Injection

Never interpolate user input directly:

```go
// UNSAFE - SQL injection risk
query := fmt.Sprintf("SELECT * FROM events WHERE user_id = %s", userInput)

// SAFE - parameterized
query, params := querybuilder.NewSelect("events").
    Where("user_id = ?", userID).
    Build()
```

ClickHouse's `?` placeholders are handled by the driver, which escapes values properly.

## Summary

A Go query builder for ClickHouse uses method chaining to construct SELECT queries with WHERE, GROUP BY, ORDER BY, and LIMIT clauses. Parameterized values prevent SQL injection and let the driver handle proper escaping. The builder pattern makes dynamic query construction readable and safe compared to string concatenation.
