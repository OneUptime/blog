# Validation Summary: How to Use SQLite in Node.js Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SQLite (SQL, FTS5 full-text search, JSON1 extension, PRAGMAs, WAL mode)
- Node.js
- `better-sqlite3` (synchronous Node.js binding)
- `sqlite3` (callback-based Node.js binding)
- Express.js (used in the complete example app)

## Sources Consulted
- better-sqlite3 official API docs: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- SQLite limits documentation: https://www.sqlite.org/limits.html
- SQLite PRAGMA documentation: https://www.sqlite.org/pragma.html
- SQLite FTS5 documentation: https://www.sqlite.org/fts5.html (external content tables, contentless delete syntax, bm25 ranking)
- SQLite JSON1 extension docs: https://www.sqlite.org/json1.html (`json()`, `json_extract`)
- SQLite result codes: https://www.sqlite.org/rescode.html (`SQLITE_CONSTRAINT_UNIQUE`, `SQLITE_CONSTRAINT_FOREIGNKEY`, `SQLITE_CONSTRAINT_NOTNULL`, `SQLITE_BUSY`)
- node-sqlite3 README: https://github.com/TryGhost/node-sqlite3

## Issues Found
1. **Incorrect `db.backup()` usage in the `TestDatabase.clone()` example.** The original code passed a `Database` instance to `backup()` and did not handle the returned Promise:
   ```javascript
   clone() {
       const newDb = new Database(':memory:');
       this.db.backup(newDb);
       return newDb;
   }
   ```
   Per the better-sqlite3 API, `db.backup(destination)` expects a **file path string** and returns a **Promise**, so the snippet would not actually clone the in-memory database. Replaced with the correct pattern using `db.serialize()` (returns a `Buffer`) and `new Database(buffer)`, which is the documented way to clone an in-memory SQLite database:
   ```javascript
   clone() {
       const buffer = this.db.serialize();
       return new Database(buffer);
   }
   ```

## Review Notes
- The "281 terabytes" maximum SQLite database size claim is correct per https://www.sqlite.org/limits.html (2^48 bytes with 65 536-byte pages).
- `db.transaction(fn)`, `.run()`/`.get()`/`.all()`/`.iterate()`, named parameters with `@name`, `db.pragma()`, the `timeout` constructor option, and the `.immediate` transaction variant are all valid better-sqlite3 APIs. Nested transactions correctly fall back to SAVEPOINTs as described.
- The FTS5 external-content trigger pattern (AI/AD/AU) and the `INSERT INTO posts_fts(posts_fts, ...) VALUES('delete', ...)` syntax for contentless delete are accurate; `ORDER BY bm25(...)` ASC for best-match-first is correct (FTS5 bm25 returns lower values for better matches).
- The PRAGMA values (`cache_size = -64000` meaning 64 MB, `synchronous = NORMAL`, `mmap_size = 268435456`, `wal_autocheckpoint = 1000`, `temp_store = MEMORY`, `foreign_keys = ON`) are all valid SQLite settings.
- The SQLite extended result codes used (`SQLITE_CONSTRAINT_UNIQUE`, `SQLITE_CONSTRAINT_FOREIGNKEY`, `SQLITE_CONSTRAINT_NOTNULL`, `SQLITE_BUSY`) match what better-sqlite3 surfaces on `error.code`.
- Minor design note (not a technical error, so not modified): in the `AsyncDatabase` class, `promisify(db.run.bind(db))` loses access to `this.lastID`/`this.changes` since `util.promisify` cannot capture sqlite3's `function(){}` callback context. The post already provides the correct alternative via the `execute()` method that uses a manual Promise wrapper.
- Minor performance note (not modified): in the Express handlers, calling `req.db.prepare(...)` inside the request handler re-prepares the statement on each request rather than reusing a hoisted prepared statement. The "Complete Example Application" section at the end demonstrates the recommended hoisted-statements pattern, so the inconsistency is intentional in showing both styles.
