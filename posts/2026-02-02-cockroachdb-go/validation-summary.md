# Validation Summary: How to Use CockroachDB with Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB (distributed SQL database)
- Go 1.21+
- pgx v5 driver (`github.com/jackc/pgx/v5`)
- pgxpool connection pool (`github.com/jackc/pgx/v5/pgxpool`)
- pgconn (`github.com/jackc/pgx/v5/pgconn`)
- google/uuid library
- Standard `net/http` server
- PostgreSQL wire protocol / SQL

## Sources Consulted
- pgxpool docs: https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool
- pgx v5 docs: https://pkg.go.dev/github.com/jackc/pgx/v5
- pgconn.PgError: https://pkg.go.dev/github.com/jackc/pgx/v5/pgconn#PgError
- CockroachDB transaction retry errors: https://www.cockroachlabs.com/docs/stable/transaction-retry-error-reference
- CockroachDB Read Committed isolation: https://www.cockroachlabs.com/docs/stable/read-committed
- CockroachDB CREATE TABLE: https://www.cockroachlabs.com/docs/stable/create-table
- CockroachDB TIMESTAMP/TIMESTAMPTZ: https://www.cockroachlabs.com/docs/stable/timestamp
- CockroachDB start-a-local-cluster (default port 26257): https://www.cockroachlabs.com/docs/stable/start-a-local-cluster
- CockroachDB build-a-go-app-with-cockroachdb (reference link in post)

## Issues Found

1. **Fabricated CockroachDB error code `CR000`** in `isRetryableError`. CockroachDB does not document or emit a `CR000` SQLSTATE. Per the CockroachDB transaction retry error reference, all transaction retry errors use SQLSTATE `40001` (`serialization_failure`). Removed the bogus code.

2. **Incorrectly classified `40003` as a retryable code.** `40003` (`statement_completion_unknown`) is a real PostgreSQL/CockroachDB SQLSTATE for ambiguous commit/connection outcomes, but it is not part of CockroachDB's documented set of retryable transaction errors and should not be blindly retried (the operation may have already completed). Removed from the retry switch to match the official guidance that retry logic should target `40001` only.

3. **Misleading comment "Exponential backoff with jitter".** The implementation uses pure exponential backoff (`baseDelay * 2^attempt`) with no randomized jitter. Updated the comment to "Exponential backoff between retries" so it accurately describes the code.

## Review Notes

- The `config` package code snippet imports `"os"` but only references helpers `getEnv` / `getEnvAsInt` that are not shown. This is fine as a snippet convention (the helpers presumably live in the same package), but if a reader copies just this file verbatim, the `os` import will be flagged as unused unless those helpers are added in the same file.
- pgx v5 API surface (pool config fields, `pgx.Tx.SendBatch`, `pgxpool.Pool.CopyFrom`, `pgx.Identifier`, `pgx.CopyFromRows`, `pgx.Batch`, `pgx.ErrNoRows`, all `pgxpool.Stat` methods, `pgconn.PgError`) all verified against current package docs.
- CockroachDB SQL: inline `INDEX idx_name (col)` in `CREATE TABLE`, `gen_random_uuid()`, `STRING`, `TIMESTAMPTZ`, and default port `26257` all verified correct.
- Default isolation level claim ("serializable by default") remains accurate as of late 2025/2026 stable docs. READ COMMITTED is available since v23.2 but is opt-in.
- Scanning a column into a custom string-based type (`OrderStatus`) relies on pgx v5's reflection-based fallback for named string types; this works in practice but is worth being aware of if a future pgx release changes that behavior.
- The `BatchUpdateStatuses` function declares its map key as `string` while underlying order IDs are `UUID`; this works because pgx will accept the string form of a UUID, but a `uuid.UUID` key would be more type-safe. Not a correctness issue.
