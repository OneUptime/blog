# Validation Summary: How to Choose SQLite, DuckDB, RocksDB, or LMDB for Embedded Data

## Status
validated

## Post Type
Technical guide comparing embedded database engines. Although it contains no runnable code, commands, or configuration snippets, it includes substantive implementation details about concurrency, storage, backups, and map resizing that warrant technical validation.

## Technologies Covered
- SQLite: relational transactions, WAL, writer serialization, and online backups.
- DuckDB: analytical SQL, native-file concurrency, and Parquet pushdown.
- RocksDB: ordered key-value storage, LSM trees, memtables, WAL, SST files, compaction, and checkpoints.
- LMDB: memory mapping, copy-on-write B-trees, transaction concurrency, page reuse, and map sizing.
- Parquet and PostgreSQL as examples of analytical publication and authoritative storage boundaries.

## Sources Consulted
- [SQLite appropriate uses](https://www.sqlite.org/whentouse.html)
- [SQLite write-ahead logging](https://www.sqlite.org/wal.html)
- [SQLite online backup API](https://www.sqlite.org/backup.html)
- [SQLite foreign key support](https://www.sqlite.org/foreignkeys.html)
- [DuckDB concurrency](https://duckdb.org/docs/current/connect/concurrency)
- [Why DuckDB: analytical workloads and execution](https://duckdb.org/why_duckdb)
- [DuckDB Parquet reading, writing, and pushdown](https://duckdb.org/docs/current/data/parquet/overview)
- [Files created by DuckDB](https://duckdb.org/docs/current/operations_manual/footprint_of_duckdb/files_created_by_duckdb)
- [RocksDB overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview)
- [RocksDB basic operations](https://github.com/facebook/rocksdb/wiki/Basic-Operations)
- [RocksDB write stalls](https://github.com/facebook/rocksdb/wiki/Write-Stalls)
- [RocksDB checkpoints](https://github.com/facebook/rocksdb/wiki/Checkpoints)
- [LMDB API and design documentation](https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/lmdb.h), including the introduction, transaction caveats, backup functions, and map-sizing API; also checked the [raw header](https://raw.githubusercontent.com/LMDB/lmdb/mdb.master/libraries/liblmdb/lmdb.h).
- [Author profile](https://github.com/nawazdhandala), checked as a link destination rather than a technical source.

## Issues Found
No technical issues found.

## Review Notes
- README.md required no changes. All four documentation links and the author link resolved to the intended resources; the DuckDB and author URLs redirect normally.
- SQLite's local application-state use cases, single writer per database file, WAL reader/writer overlap, and online backup recommendation match the documentation. Foreign-key support is correctly identified; applications must enable enforcement per connection where it is disabled by default.
- DuckDB's analytical focus and conditional Parquet column/row-group skipping are accurate. The post explicitly limits its concurrency comparison to the native embedded model. Current documentation also discusses Quack client-server access and DuckLake coordination, which do not invalidate that stated scope. Multiple writer threads within one process remain possible, with conflicts subject to optimistic concurrency control.
- RocksDB's storage pipeline, ordered operations, application-owned data modeling, and operational monitoring advice are consistent with its documentation. Disabling WAL affects recovery guarantees; the post correctly calls it optional without claiming equivalent durability. Checkpoints provide consistent snapshots of a running database.
- LMDB's copy-on-write design, serialized writer, nonblocking readers, free-page reuse, and long-reader caveat are accurate. The map-sizing API requires the caller to ensure no transactions are active in the process before resizing. In multiprocess applications, other processes may additionally need to handle MDB_MAP_RESIZED and adopt the increased map size.
- The backup warning is sound: engine-specific snapshot or shutdown procedures are required, and DuckDB's WAL is needed for recovery after a crash. A checkpoint should not be interpreted as blanket permission to copy arbitrary live files.
- The workload checklist, lifecycle benchmark guidance, ownership of derived data, and warning about non-atomic dual writes are engineering recommendations, not quantified performance claims. No universal throughput or latency guarantee is asserted.
- No version-pinned APIs, deprecated commands, executable examples, or configuration snippets require runtime testing. Validation consisted of documentation review and link checks; no benchmark, crash-recovery experiment, or restore test was performed.
