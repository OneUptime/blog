# Validation Summary: How to Build a Simple ORM from Scratch in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- database/sql
- reflect
- Struct tags
- PostgreSQL
- github.com/lib/pq
- SQL CRUD operations

## Sources Consulted
- Go database/sql package documentation: https://pkg.go.dev/database/sql
- Go reflect package documentation: https://pkg.go.dev/reflect
- Go querying for data guide: https://go.dev/doc/database/querying
- Go SQL injection prevention guide: https://go.dev/doc/database/sql-injection
- lib/pq package documentation: https://pkg.go.dev/github.com/lib/pq

## Issues Found
- The `getTableName` comment said the function looked for a `table` tag on the struct, but the implementation only used the struct type name. Updated the comment to match the code.
- The INSERT query builder numbered PostgreSQL placeholders using the original struct field index. When a primary key field was skipped, placeholders could start at `$2` instead of `$1`, which would not match the supplied argument slice. Added a separate `paramIndex` counter so placeholders are contiguous.
- The primary key tag was only used to skip fields in INSERT and UPDATE, while generated queries still hard-coded `id` for `RETURNING`, UPDATE, SELECT-by-ID, and DELETE behavior. Added `getPrimaryKeyColumn` and used it in those query paths, while preserving `id` as the fallback.
- `FindByID` scanned into `v.Field(i)` after calling `getFields`, which can be wrong when fields are skipped with `db:"-"` or omitted because they are unexported. Added the original struct field index to `fieldInfo` and used it when building scan destinations.

## Review Notes
The post remains intentionally basic and still omits production ORM concerns such as identifier quoting, schema qualification, null handling, relationship mapping, migrations, context-aware database calls, and transaction APIs. The code uses parameterized values in line with Go and lib/pq guidance, but table and column identifiers are still interpolated from struct metadata and should be constrained or quoted carefully in production code. A local compile check was not run because the Go toolchain is not installed in the review environment.
