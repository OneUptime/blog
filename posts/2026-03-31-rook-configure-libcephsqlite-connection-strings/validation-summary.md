# Validation Summary: How to Configure libcephsqlite Connection Strings

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (RADOS)
- libcephsqlite (SQLite VFS for Ceph)
- SQLite (URI filename format)
- Python sqlite3 module
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- Ceph official documentation on libcephsqlite: https://docs.ceph.com/en/latest/rados/api/libcephsqlite/
- Ceph source code for libcephsqlite (`src/libcephsqlite.cc`) — `parsepath()` function and VFS registration
- Ceph source code for config parsing (`src/common/config.cc`) — environment variable handling
- SQLite URI filename documentation: https://www.sqlite.org/uri.html

## Issues Found

### 1. Incorrect URI format (Critical)
**What was wrong:** The post used `file:<pool>/<object-name>?vfs=ceph` as the URI format.
**What was changed:** Corrected to `file:///pool:[namespace]/dbname?vfs=ceph`. The URI requires triple slashes (`///`) because the authority must be empty. The pool is separated from the optional namespace by a colon, not a slash.
**Why:** The `parsepath()` function in libcephsqlite parses paths using the `poolname:namespace/dbname` pattern. The blog's format would fail to parse correctly.

### 2. Fabricated URI query parameters (Critical)
**What was wrong:** The post claimed `ceph_config`, `ceph_keyring`, and `ceph_user` are valid URI query parameters for libcephsqlite.
**What was changed:** Removed all references to these non-existent URI parameters. Replaced with the correct approach: using environment variables (`CEPH_CONF`, `CEPH_KEYRING`, `CEPH_ARGS`) to configure the Ceph client.
**Why:** libcephsqlite does not parse any custom URI query parameters. The only recognized query parameter is `vfs=ceph` (a standard SQLite parameter). Configuration is done through standard Ceph environment variables and config files.

### 3. Non-existent `CEPH_USER` environment variable (Major)
**What was wrong:** The post listed `CEPH_USER` as a valid environment variable.
**What was changed:** Replaced `CEPH_USER=myapp` with `CEPH_ARGS='--id myapp'` throughout the post.
**Why:** There is no `CEPH_USER` environment variable in the Ceph client library. The correct way to set the client identity via environment is `CEPH_ARGS='--id <name>'`.

### 4. Incorrect namespace URI format (Major)
**What was wrong:** The post used `file:<pool>/<namespace>/<object>?vfs=ceph` for namespaces.
**What was changed:** Corrected to `file:///pool:namespace/object?vfs=ceph` — namespaces are separated from the pool name by a colon, not a slash.
**Why:** The libcephsqlite path parser uses `poolname:namespace/dbname` format. Using slashes would cause the parser to misidentify the pool, namespace, and object name.

### 5. WAL mode missing EXCLUSIVE locking prerequisite (Major)
**What was wrong:** The post suggested `PRAGMA journal_mode=WAL` without mentioning that exclusive locking mode is required.
**What was changed:** Added `PRAGMA locking_mode=EXCLUSIVE;` before the WAL pragma, and noted the requirement in the summary.
**Why:** libcephsqlite's VFS uses `iVersion = 1` for `sqlite3_io_methods`, which means it does not implement shared memory methods (xShmMap, xShmLock). WAL mode requires shared memory in NORMAL locking mode, so it only works with EXCLUSIVE locking mode.

### 6. Undocumented pool application tag (Minor)
**What was wrong:** The post used `ceph osd pool application enable mypool cephsqlite`, but `cephsqlite` is not a documented application tag.
**What was changed:** Removed the `ceph osd pool application enable` line entirely.
**Why:** The official libcephsqlite documentation does not require or mention a pool application tag. The standard tags are `rbd`, `cephfs`, and `rgw`. Using `cephsqlite` was based on a test pool name, not an application tag.

### 7. Misleading `mode=ro` for read-only connections (Minor)
**What was wrong:** The post suggested `?mode=ro` for read-only connections.
**What was changed:** Removed the read-only connection example.
**Why:** libcephsqlite uses a single exclusive RADOS lock for all access (including reads). The VFS does not support concurrent readers, so `mode=ro` would not provide the expected read-only-without-locking behavior.

## Review Notes
- libcephsqlite does not yet support concurrent readers — all database access is protected by a single exclusive lock. This is an important limitation that the original post did not mention, now noted in the summary section.
- The post's auth user creation example (`ceph auth get-or-create`) is correct and uses appropriate capabilities.
- Pool ID syntax (`*<poolid>`) is also supported (e.g., `file:///*2:/baz.db?vfs=ceph`) but was not mentioned in the post — this is fine as it's an advanced feature.
