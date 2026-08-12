# Validation Summary: Kuzu In-Memory vs On-Disk: Which Mode Fits Tests, Analytics, and Production?

## Status
validated

## Post Type
Technical guide and deployment decision reference

## Technologies Covered
- Kuzu 0.11.3 graph database
- Kuzu in-memory and on-disk persistence modes
- Kuzu Python API
- Cypher, transactions, WAL, and checkpoints
- `COPY FROM` spill-to-disk behavior
- Read-write and read-only concurrency
- Kuzu CLI buffer-pool configuration
- Database export, import, backup, and migration
- Container persistent storage

## Sources Consulted
- [Kuzu persistence modes and quick start](https://kuzudb.github.io/docs/get-started/)
- [Kuzu connections, concurrency, and in-memory restrictions](https://kuzudb.github.io/docs/concurrency/)
- [Kuzu Python `Database`, `Connection`, and `QueryResult` API](https://kuzudb.github.io/api-docs/python/kuzu.html)
- [Kuzu prepared-statement parameters](https://kuzudb.github.io/docs/get-started/prepared-statements/)
- [Kuzu Python client guide](https://kuzudb.github.io/docs/client-apis/python/)
- [Kuzu CLI and buffer-pool options](https://kuzudb.github.io/docs/client-apis/cli/)
- [Kuzu connection and database configuration](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu transactions and checkpoints](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu on-disk file layout](https://kuzudb.github.io/docs/developer-guide/files/)
- [Kuzu database export and import](https://kuzudb.github.io/docs/migrate/)
- [Kuzu v0.11.0 single-file release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.0)
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Archived Kuzu upstream repository](https://github.com/kuzudb/kuzu)
- [Kuzu v0.11.3 default buffer-pool calculation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/database.cpp#L49-L67)
- [Kuzu v0.11.3 CLI buffer-pool unit conversion](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/shell/shell_runner.cpp#L109-L113)
- [Kuzu v0.11.3 spill eligibility implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/storage/table/chunked_node_group.cpp#L537-L570)
- [Kuzu v0.11.3 attached-database validation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/attached_database.cpp#L36-L43)

## Issues Found
- **Spill-to-disk behavior was overgeneralized.** The post implied that arbitrary query intermediates could spill and that on-disk mode would rescue an oversized query. Kuzu 0.11.3 documents `SPILL_TO_DISK` for `COPY FROM`, and its implementation exposes only eligible import partitioner data to the spiller. Narrowed the introduction, test checklist, analytics guidance, decision checklist, and conclusion to larger-than-memory stored graphs and eligible `COPY FROM` work.
- **The default buffer-pool description used the wrong memory basis and an imprecise unit.** Kuzu 0.11.3 calculates the default from approximately 80% of total physical system memory, subject to a virtual-memory-region cap; it does not calculate 80% of currently available memory. The CLI converts `--defaultbpsize` using a 20-bit shift, so the effective unit is MiB. Corrected both details.
- **The `ATTACH` restriction was ambiguous.** “In-memory databases cannot be attached” could also be read as prohibiting an in-memory primary database from attaching an on-disk target. The implementation specifically rejects an in-memory Kuzu database as the target of `ATTACH`, so the post now states that direction explicitly.
- **Recovery and concurrency wording lacked necessary scope.** Clarified that WAL recovery testing concerns abrupt termination or a crash, rather than an ordinary close that can checkpoint, and scoped the one-writer-or-many-readers rule to a given on-disk database path. Also clarified that an in-memory production graph may be application-level read-only even though the Kuzu database itself must be opened `READ_WRITE`.
- **The logical-export snippet imposed an unnecessary checkpoint precondition.** `EXPORT DATABASE` does not require a preceding `CHECKPOINT`; a manual checkpoint can run only when no transactions are active. Removed `CHECKPOINT` from the generic export snippet. Added the documented caveat that indexes are exported only when their dependent extensions have been loaded.
- **The production guidance omitted Kuzu's current lifecycle state.** Kuzu's upstream repository has been archived and read-only since October 2025, and v0.11.3 remains the latest official release. Added this material caveat so readers do not interpret the storage-mode guidance as an endorsement of an actively maintained production dependency.

## Review Notes
- The exact Python examples were smoke-tested with the official Kuzu 0.11.3 wheel. The omitted, empty-string, and `:memory:` constructors all created in-memory databases; `pathlib.Path` was accepted for an on-disk database; parameter binding with `$id` worked; result iteration produced the asserted lists; and the on-disk database reopened with the inserted row intact.
- `buffer_pool_size` is correctly specified in bytes, `max_num_threads` is current, and the 4 GiB constructor example is valid.
- `QueryResult.close()`, `Connection.close()`, and `Database.close()` are current APIs. The documented close order and file-lock release behavior match the post.
- Direct `EXPORT DATABASE` calls were smoke-tested for both on-disk and in-memory databases. The documented requirement that `IMPORT DATABASE` target an empty database is correct.
- The persistence, WAL/checkpoint, single-file format from v0.11.0 onward, `.wal`/`.shadow`/`.tmp` lifecycle, read-only restrictions, HTTPFS cache restriction, and one-writer concurrency claims are otherwise accurate for Kuzu 0.11.3.
- All external documentation links in the post resolved to the intended official Kuzu pages during validation on 2026-08-12.
