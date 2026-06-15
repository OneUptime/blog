# Validation Summary: How to Prevent Race Conditions with Optimistic Locking in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- database/sql
- PostgreSQL
- GORM
- GORM optimistic locking plugin
- Optimistic locking and transaction patterns

## Sources Consulted
- Go `database/sql` package documentation: https://pkg.go.dev/database/sql
- GORM package documentation: https://pkg.go.dev/gorm.io/gorm
- GORM optimistic locking plugin documentation: https://pkg.go.dev/gorm.io/plugin/optimisticlock
- GORM optimistic locking plugin repository: https://github.com/go-gorm/optimisticlock
- PostgreSQL `UPDATE` documentation: https://www.postgresql.org/docs/current/sql-update.html
- PostgreSQL numeric types documentation: https://www.postgresql.org/docs/current/datatype-numeric.html

## Issues Found
- The GORM section incorrectly claimed optimistic locking works through a `gorm:"version"` tag. Updated it to use the documented `gorm.io/plugin/optimisticlock` package and `optimisticlock.Version` field type.
- The GORM code imported `gorm.io/gorm/clause` without using it, which would not compile. Removed the unused import while updating the example.
- The GORM example manually added a version `WHERE` clause and increment expression while describing automatic optimistic locking. Updated it to use the plugin's documented update behavior and retain the `RowsAffected` conflict check.
- The retry usage section described the example as a transfer even though the code performs a withdrawal. Updated the wording to match the code.
- The transfer example ignored possible errors returned by `RowsAffected()`. Updated both checks to handle and wrap those errors.

## Review Notes
- The examples are technically valid as illustrative snippets, but production money-handling code should avoid `float64` balances and use integer minor units or a decimal type to preserve exact arithmetic.
- Local compiler verification could not be run because the `go` binary is not installed in this environment.
