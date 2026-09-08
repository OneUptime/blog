# Validation Summary: How to Size an LMDB Map and Recover from `MDB_MAP_FULL`

## Status
validated

## Post Type
Technical guide with C API examples and operational recovery procedures.

## Technologies Covered
- LMDB C API and database utilities
- C and 64-bit virtual address space
- Copy-on-write storage, reader snapshots, and capacity planning
- Multi-process transaction coordination and database backups
- Python LMDB binding documentation as a supporting reference

## Sources Consulted
- Official LMDB API header: https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/lmdb.h
- Official LMDB implementation, including map resizing, transaction renewal, commit, and statistics: https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/mdb.c
- Official mdb_stat manual: https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/mdb_stat.1
- Official LMDB repository mirror: https://github.com/LMDB/lmdb
- Official LMDB utilities directory: https://github.com/LMDB/lmdb/tree/mdb.master/libraries/liblmdb
- Python LMDB binding documentation: https://lmdb.readthedocs.io/en/release/#lmdb.Environment

## Issues Found
1. The resize barrier stopped new writes but allowed new readers or renewed read transactions to race with remapping. Updated the first step to block all local transaction admission and read renewals until the barrier is released, as required by the no-active-transactions precondition.
2. The map-allocation statement lacked the writable-map filesystem exception. Qualified it for the default mode and documented that MDB_WRITEMAP can allocate the entire map on filesystems without sparse-file support.
3. The monitoring guidance implied environment statistics supplied general entry and reader counts plus growth. Clarified that environment entry statistics describe the main database, named databases require mdb_stat(), growth requires repeated sampling, and me_numreaders is a high-water mark rather than an active-reader count.
4. The C initialization fragment omitted execution prerequisites. Made explicit that it assumes a 64-bit process, an existing writable directory, and a non-returning application error handler.
5. Clarified that persisting a resize requires a successful transaction that changes data. The implementation skips metadata writes for an empty write transaction.
6. The cross-process recovery guidance covered transaction begin but omitted renewal of reset read transactions. Added mdb_txn_renew(), which shares the size check, and explicitly required a successful resize before beginning or renewing a transaction.
7. The bare mdb_stat reference did not specify the operation needed to clear stale readers. Replaced it with the documented -rr invocation and clarified that both it and mdb_reader_check() check and clear stale slots.

## Review Notes
- Verified map sizing order, page alignment, growth-only persistence, adoption with size zero, and the minimum consumed-space behavior against the API and implementation.
- Verified copy-on-write growth, delayed reuse under old readers, failed-write abort handling, commit-handle invalidation, and backup snapshot behavior. The compact-copy APIs remain present and are not marked deprecated.
- The C snippets are application fragments, not standalone programs: transaction/database/value setup and retry helpers are supplied by the application. Reviewed syntax and API contracts; no compilation or runtime exhaustion test was performed.
- The 64 GiB value is an example, not a universally appropriate capacity target. The forecast formula is a planning heuristic; allocated extent can include reusable pages and does not equal live payload size.
- Verified the four technical documentation links resolve to the intended resources. The author profile is attribution, not a technical source.
- Reviewed current mdb.master sources and the linked binding documentation; the post does not claim a specific LMDB release. Filesystem exhaustion still requires separate testing, especially when using writable mappings.
