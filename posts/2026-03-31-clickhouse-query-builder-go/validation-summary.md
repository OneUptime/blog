# Validation Summary: How to Build a ClickHouse Query Builder in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (analytical database)
- Go (programming language)
- SQL query building / builder pattern
- clickhouse-go driver (parameterized query interface)

## Sources Consulted
- Go language specification: https://go.dev/ref/spec (struct embedding, method sets, variadic functions)
- ClickHouse SQL syntax reference: https://clickhouse.com/docs/en/sql-reference/statements/select (clause ordering: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT)
- clickhouse-go v2 driver documentation: https://github.com/ClickHouse/clickhouse-go (parameterized queries, `?` placeholder support)
- Go `fmt` and `strings` package documentation: https://pkg.go.dev/fmt, https://pkg.go.dev/strings

## Issues Found
1. **AggregateBuilder produces invalid SQL clause ordering.** The original `AggregateBuilder.Build()` called `b.SelectBuilder.Build()`, which already appended ORDER BY and LIMIT to the query string. It then appended GROUP BY and HAVING *after* ORDER BY and LIMIT, producing invalid SQL (e.g., `... ORDER BY x LIMIT 50 GROUP BY y HAVING z`). The correct SQL clause order is `WHERE → GROUP BY → HAVING → ORDER BY → LIMIT`. **Fix:** Refactored `SelectBuilder` to extract a `buildBase()` helper that builds the `SELECT ... FROM ... WHERE ...` portion. `SelectBuilder.Build()` now calls `buildBase()` and appends ORDER BY/LIMIT. `AggregateBuilder.Build()` calls `buildBase()` directly and appends GROUP BY, HAVING, ORDER BY, and LIMIT in the correct order.

## Review Notes
- The code uses `[]interface{}` rather than the Go 1.18+ `any` alias. Both are valid; `any` is now idiomatic but `interface{}` is not deprecated and works in all Go versions.
- The `AggregateBuilder` inherits `SelectBuilder` methods via embedding, but those methods return `*SelectBuilder` rather than `*AggregateBuilder`, so method chaining from an `AggregateBuilder` variable would require calling embedded methods individually rather than fluently chaining. This is a design limitation worth noting but not a correctness bug for the tutorial's scope.
- The `buildBase()` method is unexported (lowercase), which is correct since it is an internal helper within the `querybuilder` package.
