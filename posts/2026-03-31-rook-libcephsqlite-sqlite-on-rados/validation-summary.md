# Validation Summary: How to Use libcephsqlite for SQLite on RADOS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (libcephsqlite)
- RADOS (Reliable Autonomic Distributed Object Store)
- SQLite (VFS extension mechanism)
- Python (sqlite3 module, ctypes)

## Sources Consulted
- Official Ceph documentation for libcephsqlite: https://docs.ceph.com/en/latest/rados/api/libcephsqlite/
- Ceph source code: `src/libcephsqlite.cc` and `src/SimpleRADOSStriper.cc` on GitHub
- Ceph RPM spec (`ceph.spec.in`) for package naming verification
- Ceph release history (Pacific 16.2.x release notes)

## Issues Found

1. **Incorrect Ceph version for availability**: The post claimed libcephsqlite is available from "Quincy+", but it was actually introduced in Pacific (16.2.x). Fixed to "Pacific 16.2.x+".

2. **Incorrect URI format**: All URIs used `file:<pool>/<object>?vfs=ceph` (e.g., `file:mypool/myapp.db?vfs=ceph`). The correct format requires triple slashes and a colon separator between pool and namespace: `file:///<pool>:[namespace]/<dbname>?vfs=ceph` (e.g., `file:///mypool:/myapp.db?vfs=ceph`). Fixed in all occurrences (SQLite CLI, Python example, configuration section).

3. **Incorrect SQLite CLI loading approach**: The post showed opening an interactive `sqlite3` session, then using `.load` and `.open` separately. The official docs recommend using `-cmd` flags at invocation: `sqlite3 -cmd '.load libcephsqlite.so' -cmd '.open file:///mypool:/myapp.db?vfs=ceph'`. This ensures the extension is loaded before the database is opened. Fixed accordingly.

4. **Incorrect RADOS object naming**: The post claimed objects would be named `myapp.db`, `myapp.db-wal`, and `myapp.db-shm`. In reality, libcephsqlite uses a striped storage model where objects are named with hex stripe suffixes (e.g., `myapp.db.0000000000000000`). Also added the `rados --striper get` export command. The `-shm` file does not apply to RADOS-backed SQLite.

5. **Fabricated `ceph_config` URI parameter**: The post showed `sqlite3 "file:mypool/myapp.db?vfs=ceph&ceph_config=/etc/ceph/ceph.conf"` but libcephsqlite does not support custom URI query parameters. Configuration is done exclusively via environment variables (`CEPH_CONF`, `CEPH_KEYRING`, `CEPH_ARGS`). Replaced with the correct environment variable approach.

6. **Misleading concurrent access claim**: Changed "Concurrent access coordination using RADOS locking primitives" to "Serialized access coordination using RADOS exclusive locking" since the VFS uses a single exclusive lock and does not yet support concurrent readers.

7. **Library path too specific**: Added the RHEL/CentOS path (`/usr/lib64/libcephsqlite.so`) alongside the Debian/Ubuntu path. Updated `.load` commands to use just `libcephsqlite.so` (no absolute path) per official docs.

## Review Notes
- The Python ctypes approach (`ctypes.CDLL` to load the shared library) is not covered in official Ceph documentation. It is a community-known technique that works because the library auto-registers the VFS via a constructor function, but readers should be aware this is not an officially documented method.
- libcephsqlite does not support concurrent readers as of current releases. The official docs state: "The VFS does not yet support concurrent readers. All database access is protected by a single exclusive lock." This is an important limitation that the post could mention more explicitly in the future.
- WAL mode with libcephsqlite requires first setting exclusive locking mode (`PRAGMA locking_mode = EXCLUSIVE`) before enabling WAL. This is not mentioned in the post but would be relevant if a reader tries to use WAL mode.
