# Validation Summary: How to Handle Database Migrations in Go Projects

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Go (golang) — including the `embed` package introduced in Go 1.16
- golang-migrate (v4) — CLI and library (`github.com/golang-migrate/migrate/v4`)
- goose v3 (`github.com/pressly/goose/v3`)
- PostgreSQL (referenced version 15) — `gen_random_uuid()`, `CREATE INDEX CONCURRENTLY`
- `lib/pq` PostgreSQL Go driver
- `golang.org/x/crypto/bcrypt`
- GitHub Actions (`actions/checkout@v4`, `actions/setup-go@v5`)
- Homebrew for macOS install
- Makefile, bash deploy script

## Sources Consulted
- golang-migrate official repository and README: https://github.com/golang-migrate/migrate
- golang-migrate CLI usage docs: https://github.com/golang-migrate/migrate/tree/master/cmd/migrate
- golang-migrate iofs source driver: https://github.com/golang-migrate/migrate/tree/master/source/iofs
- golang-migrate postgres driver: https://github.com/golang-migrate/migrate/tree/master/database/postgres
- goose v3 repository: https://github.com/pressly/goose
- Go embed package docs: https://pkg.go.dev/embed
- PostgreSQL 13+ `gen_random_uuid()` docs: https://www.postgresql.org/docs/current/functions-uuid.html
- PostgreSQL `CREATE INDEX CONCURRENTLY` docs: https://www.postgresql.org/docs/current/sql-createindex.html
- GitHub Actions: actions/setup-go, actions/checkout

## Issues Found
1. **Inconsistent comment about migration versioning scheme.** The inline comment above the `migrate create` command read "Create a new migration with timestamp versioning" but the command uses the `-seq` flag, which in golang-migrate produces **sequential numbering** (e.g., `000001_*.sql`), not Unix timestamps. The example output (`000001_create_users_table.up.sql`) confirmed sequential numbering was actually being demonstrated. Updated the comment to accurately describe the `-seq` flag and clarified that omitting it produces Unix timestamps (which the prose recommends).

## Review Notes
- The `gen_random_uuid()` function is a core PostgreSQL function from version 13 onward; for earlier PostgreSQL versions, the `pgcrypto` extension is required. The post mentions PostgreSQL 15 in the CI snippet, so this is fine, but readers on older PostgreSQL may need to enable `pgcrypto`.
- `github.com/lib/pq` is in maintenance mode; many projects now prefer `github.com/jackc/pgx/v5` (with `pgx/stdlib` as a `database/sql` driver) for active development and better performance. `lib/pq` still works correctly for the example shown.
- The `goose.AddMigration` function used in the Go-based migration example is still valid in goose v3, though newer code may prefer the context-aware variant `goose.AddMigrationContext`. Both are supported.
- The `deploy.sh` example has a slight redundancy: `set -e` already aborts on a non-zero exit code, making the subsequent `if [ $? -ne 0 ]` check unreachable in practice. This is a style nit, not a technical error.
- golang-migrate's `iofs` source driver requires v4.15+ — the post specifies v4.17.0, which is compatible.
- The author's recommendation in prose to prefer Unix timestamps over sequential numbering (to avoid merge conflicts) is sound general advice. The example uses sequential numbering for readability, which is a common pedagogical trade-off; the corrected comment now clarifies how to opt into either format.
