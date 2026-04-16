# Validation Summary: How to Use golang-migrate with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- golang-migrate (v4)
- ClickHouse
- Go (programmatic API)
- SQL (MergeTree DDL, ALTER TABLE)
- Homebrew (installation)

## Sources Consulted
- golang-migrate GitHub repository: https://github.com/golang-migrate/migrate
- golang-migrate ClickHouse driver README: https://github.com/golang-migrate/migrate/blob/master/database/clickhouse/README.md
- golang-migrate CLI docs: https://github.com/golang-migrate/migrate/tree/master/cmd/migrate
- golang-migrate Go API reference: https://pkg.go.dev/github.com/golang-migrate/migrate/v4
- ClickHouse ALTER TABLE docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse network interfaces (ports 9000 native, 8123 HTTP, 9440 native TLS): https://clickhouse.com/docs/en/interfaces/overview

## Issues Found
- **Incorrect driver protocol claim**: The intro stated the driver "supports ClickHouse via its HTTP driver." The golang-migrate ClickHouse driver is built on top of `clickhouse-go` and uses ClickHouse's native TCP protocol (default port 9000, or 9440 for TLS), not HTTP (which would be port 8123). The rest of the post correctly uses port 9000/9440, confirming native TCP. Changed "HTTP driver" to "native driver."

## Review Notes
- The `-tags 'clickhouse'` go install command is correct for building the CLI with ClickHouse support.
- The URL format `clickhouse://host:port/dbname` works via path-based database naming; the driver also supports the `database=` query-parameter form shown in the official driver README. Both are valid.
- `x-multi-statement=true` is the correct query parameter for enabling multi-statement migrations.
- The `down` without arguments command will prompt for confirmation interactively; for non-interactive environments, users may need `-all` flag. This isn't strictly an error but is a version-dependent behavior worth noting.
- Go code correctly uses `migrate.ErrNoChange` and the proper import paths with the blank identifier for driver registration.
- ClickHouse `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `DROP COLUMN IF EXISTS` syntax is valid.
