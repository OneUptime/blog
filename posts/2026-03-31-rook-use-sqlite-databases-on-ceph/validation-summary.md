# Validation Summary: How to Use SQLite Databases Stored on Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS
- libcephsqlite (Ceph SQLite VFS extension)
- SQLite3
- Python (sqlite3 module, ctypes)
- Rook (mentioned in tags)

## Sources Consulted
- Ceph official documentation on libcephsqlite: https://docs.ceph.com/en/latest/rados/api/libcephsqlite/ (accessed via GitHub source at https://raw.githubusercontent.com/ceph/ceph/main/doc/rados/api/libcephsqlite.rst)
- SQLite URI filename documentation: https://www.sqlite.org/uri.html
- Python sqlite3 module documentation: https://docs.python.org/3/library/sqlite3.html

## Issues Found

1. **Incorrect URI format**: The post used `file:{POOL}/{DB_NAME}?vfs=ceph` but libcephsqlite requires triple slashes: `file:///{POOL}/{DB_NAME}?vfs=ceph`. Fixed in both `get_connection()` and `get_readonly_connection()`.

2. **Invalid `ceph_user` URI parameter**: The post passed `ceph_user={CEPH_USER}` as a URI query parameter, but libcephsqlite does not support this. The Ceph client ID must be set via the `CEPH_ARGS` environment variable (e.g., `export CEPH_ARGS='--id admin'`). Removed the parameter from URIs and added an environment variable comment.

3. **WAL mode requires exclusive locking**: The post enabled WAL mode without first setting `PRAGMA locking_mode=EXCLUSIVE`, which is required by libcephsqlite for WAL to work. Added the missing PRAGMA.

4. **Misleading concurrent read-only connections**: The post suggested opening "multiple read-only connections" for read-heavy workloads, but libcephsqlite enforces exclusive locking — only one connection can access the database at a time. Updated the section text to clarify this limitation and added the required `PRAGMA locking_mode=EXCLUSIVE` to the read-only connection.

5. **Inaccurate summary claims**: The summary mentioned "better concurrent read performance" and "separate read-only connections for reporting queries," which is misleading given the exclusive locking constraint. Updated to accurately describe WAL mode benefits (write performance) and the single-connection limitation.

## Review Notes
- The `executescript()` call in `init_schema` implicitly commits any pending transaction before executing. The explicit `conn.commit()` afterward is redundant but harmless.
- libcephsqlite performance is documented as 3-10x slower than local SSD. The post could benefit from a performance expectations note, but this is not a correctness issue.
- The backup API usage (`conn.backup(local_conn)`) is correct and available in Python 3.7+.
- The `PRAGMA synchronous=NORMAL` is technically valid but provides weaker durability guarantees with DELETE journal mode. With WAL + exclusive locking as now configured, NORMAL is a reasonable choice.
