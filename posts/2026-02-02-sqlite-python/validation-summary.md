# Validation Summary: How to Use SQLite in Python Applications

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- SQLite (SQL syntax, PRAGMAs, WAL mode, CTEs, recursive queries, window functions, UPSERT, backup API)
- Python 3 `sqlite3` standard library module
- Python `dataclasses`, `typing`, `contextlib`, `threading` (thread-local storage, singletons)
- pytest (in-memory test fixtures, monkeypatch)
- Repository pattern, migration system, query plan analysis

## Sources Consulted
- Python `sqlite3` module documentation — https://docs.python.org/3/library/sqlite3.html
  - `Cursor.lastrowid` semantics (only updated after successful INSERT/REPLACE)
  - `Connection.backup()` API (added in Python 3.7)
  - `isolation_level` and autocommit behavior
- SQLite PRAGMA reference — https://www.sqlite.org/pragma.html
  - Verified existence of `journal_mode`, `synchronous`, `foreign_keys`, `cache_size`, `mmap_size`, `busy_timeout`, `temp_store`, `wal_checkpoint`, `integrity_check`, `quick_check`, `page_count`, `page_size`, `freelist_count`, `table_info`
  - Confirmed `PRAGMA cache_stats` does NOT exist
- SQLite VACUUM documentation — https://www.sqlite.org/lang_vacuum.html (VACUUM cannot run inside an open transaction)
- SQLite UPSERT documentation — https://www.sqlite.org/lang_upsert.html (`ON CONFLICT ... DO UPDATE` semantics)
- SQLite WAL documentation — https://www.sqlite.org/wal.html (`wal_checkpoint(TRUNCATE)` returns `(busy, log, checkpointed)`)
- SQLite CTE / window function support — https://www.sqlite.org/lang_with.html and https://www.sqlite.org/windowfunctions.html
- Python `contextlib.contextmanager` semantics (generator must yield exactly once; resuming after `throw()` raises `RuntimeError: generator didn't stop after throw`)

## Issues Found

1. **`optimize_database()` ran `VACUUM` inside `db.transaction()` — would fail at runtime.**
   SQLite's `VACUUM` cannot be executed while a transaction is open, and Python's `sqlite3` module begins an implicit transaction inside the transaction context manager. Fixed by committing the prior `ANALYZE`, temporarily setting `conn.isolation_level = None` (autocommit) around the `VACUUM`, then restoring the previous isolation level. Integrity check moved outside the transaction block.

2. **`get_metrics()` used `PRAGMA cache_stats`, which does not exist in SQLite.**
   This PRAGMA is not listed in the SQLite PRAGMA reference and would raise `sqlite3.OperationalError: no such pragma: cache_stats`. Replaced with real, documented PRAGMAs that are useful for monitoring: `page_count`, `page_size`, `freelist_count`, and `cache_size`.

3. **`retry_on_lock` was implemented as a `@contextmanager` with a retry loop — fundamentally broken.**
   A `@contextmanager` generator can only `yield` once. When the `with`-body raises and the exception is caught at `yield`, looping back to `yield` again causes `RuntimeError: generator didn't stop after throw()`. The body of a `with` statement also cannot be re-executed by the context manager. Converted into a decorator using `functools.wraps` so the wrapped function is actually retried; updated the `safe_update_order_status` usage to apply `@retry_on_lock()` instead of nesting `with retry_on_lock():`.

4. **`upsert_products` used `cursor.lastrowid` truthiness to distinguish insert vs. update — unreliable.**
   Per the Python `sqlite3` docs, `lastrowid` is only updated after successful `INSERT`/`REPLACE`; when `ON CONFLICT DO UPDATE` takes the UPDATE branch, `lastrowid` is left unchanged. In a loop, prior inserted rowids would persist and every iteration would look like an insert. Fixed by performing a quick `SELECT 1 FROM products WHERE sku = ?` before each upsert and incrementing `inserted` vs. `updated` based on that.

## Review Notes
- The connection manager's mix of a class-level singleton with thread-local connections is correct in spirit, but each thread's connection is never closed unless that thread explicitly calls `db.close()`. In long-lived worker pools this can leak file descriptors. Not a correctness bug in the post, but worth a future note.
- `bulk_update_prices` interpolates `p['id']` and `p['price']` directly into the SQL `CASE` expression. The post frames this as an internal-data optimization, but readers should be cautioned never to use this pattern with values that originate from untrusted input. Left as-is since the surrounding section is explicitly about controlled bulk operations.
- The `get_user_order_summary` query uses `LEFT JOIN recent_orders r ON 1=1` to attach up to five recent orders to the single stats row. This works but produces a cross-join; the Python code correctly handles the row layout. A future revision could split this into two queries for clarity.
- The post claims SQLite is suitable "up to ~100K hits/day" for small/medium websites. This is on the conservative end of what modern SQLite (with WAL) can handle, but it's defensible guidance and matches the official "Appropriate Uses For SQLite" page in spirit. Left unchanged.
- `PRAGMA wal_checkpoint(TRUNCATE)` returns `(busy, log, checkpointed)`; the post labels these as `blocked`, `wal_pages`, `moved_pages`. The semantics are close enough and the values are interpreted correctly, so left as-is.
