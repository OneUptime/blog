# Validation Summary: How to Use SQLite with Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (Golang) and the `database/sql` package
- SQLite
- `github.com/mattn/go-sqlite3` (CGO driver)
- `modernc.org/sqlite` (pure Go driver)
- SQL: schema design, migrations, transactions, prepared statements
- SQLite PRAGMAs (WAL, busy_timeout, synchronous, cache_size, foreign_keys, integrity_check, page_count, page_size, freelist_count, journal_mode)
- `VACUUM` / `VACUUM INTO` for maintenance and backups
- Go testing patterns with in-memory SQLite

## Sources Consulted
- SQLite official documentation — https://www.sqlite.org/docs.html
- SQLite PRAGMA reference — https://www.sqlite.org/pragma.html
- SQLite VACUUM (including `VACUUM INTO`) — https://www.sqlite.org/lang_vacuum.html
- SQLite EXPLAIN QUERY PLAN — https://www.sqlite.org/eqp.html
- SQLite limits (`SQLITE_MAX_VARIABLE_NUMBER`) — https://www.sqlite.org/limits.html
- SQLite WAL mode — https://www.sqlite.org/wal.html
- `mattn/go-sqlite3` README / DSN options — https://github.com/mattn/go-sqlite3
- `modernc.org/sqlite` package docs — https://pkg.go.dev/modernc.org/sqlite
- Go `database/sql` package — https://pkg.go.dev/database/sql

## Issues Found

1. **Missing `errors` import in the Task repository code block.** The code uses `errors.Is(err, sql.ErrNoRows)` inside `TaskRepository.FindByID`, but the `import` block did not include the `"errors"` package — the snippet would not compile as shown. Fixed by adding `"errors"` to the import list.

2. **Missing `errors` import in the Prepared Statements code block.** `OptimizedUserRepository.FindByID` uses `errors.Is(err, sql.ErrNoRows)` but the `import` block omitted `"errors"`. Fixed by adding `"errors"` to the import list.

3. **Incorrect claim about switching SQLite drivers.** The post stated that the code "works with either driver by changing only the import path." This is wrong: `modernc.org/sqlite` registers itself as the driver name `"sqlite"`, while `mattn/go-sqlite3` registers as `"sqlite3"`. To switch drivers you must change both the import and the name passed to `sql.Open`. Updated the sentence to make this explicit.

4. **Contradictory binary-size disadvantage.** The post listed "Larger binary sizes" as a disadvantage of *both* `mattn/go-sqlite3` and `modernc.org/sqlite`. In practice `modernc.org/sqlite` (pure-Go SQLite transpiled from C) typically produces noticeably larger binaries than the CGO driver. Replaced the mattn driver's "larger binary sizes" bullet with a more accurate "Build complexity (toolchain dependencies)" note; left the pure-Go driver's larger-binary note intact.

5. **Outdated `SQLITE_MAX_VARIABLE_NUMBER` claim.** The post said "Default is 999" for SQLite's variable limit. This was correct before SQLite 3.32.0 (May 2020), but the default has been 32766 since then. Both `mattn/go-sqlite3` and `modernc.org/sqlite` ship with SQLite versions well past 3.32. Updated the comment to mention both the modern default (32766) and the legacy default (999), noting that a batch size of 100 stays safely under either limit.

6. **Misleading comment about the "backup API".** The `Backup` function's comments referred to "SQLite's backup API" and "SQLite's backup command," but the actual implementation uses `VACUUM INTO`, which is a distinct mechanism from SQLite's online backup API (`sqlite3_backup_*`). Both produce consistent snapshots, but they are not the same feature. Rewrote the comments to correctly describe `VACUUM INTO` and note that it has been available since SQLite 3.27.0.

## Review Notes

- The DSN parameters used (`_journal_mode`, `_busy_timeout`, `_synchronous`, `_cache_size`, `_foreign_keys`) are correct for `mattn/go-sqlite3`. The interpretation of `_cache_size=-64000` as ~64 MB is consistent with SQLite's `cache_size` PRAGMA semantics (negative values are in KiB).
- The advice to set `SetMaxOpenConns(1)` is a defensive, well-known SQLite pattern that simplifies serialization and avoids `SQLITE_BUSY` errors. It is technically suboptimal for read-heavy WAL workloads (which can support multiple concurrent readers), but it is a reasonable default and not incorrect. No change made.
- The custom `contains` / `containsAt` helpers in `isUniqueConstraintError` reimplement `strings.Contains`. This is unidiomatic but functionally correct, so left as-is per the "don't make stylistic-only changes" guideline.
- The `EXPLAIN QUERY PLAN` output schema (id, parent, notused, detail) used in `QueryPlan` matches the columns documented at https://www.sqlite.org/eqp.html.
- `VACUUM INTO ?` with a bound parameter works through the `mattn/go-sqlite3` driver because the filename is an expression evaluated at run time.
- `t.Cleanup` (used in `testDB`) requires Go 1.14+, which is well below any currently supported Go version.
- The final paragraph promoting OneUptime is a marketing note, not a technical claim.
