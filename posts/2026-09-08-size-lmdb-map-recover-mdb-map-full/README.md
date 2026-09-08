# How to Size an LMDB Map and Recover from `MDB_MAP_FULL`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LMDB, Embedded Database, Capacity Planning, Memory Management, Recovery

Description: Size LMDB address space with growth headroom, abort safely on map exhaustion, and coordinate online map increases.

---

LMDB maps its database into virtual address space. The configured map size is also the maximum database size, but reserving a large map does not immediately consume the same amount of physical RAM or disk in the default mode shown below. With `MDB_WRITEMAP`, filesystems without sparse-file support can allocate the full map size on disk. On a 64-bit platform, choosing generous headroom at creation time is usually simpler than resizing during an incident.

`MDB_MAP_FULL` means the environment reached its configured map size. It is a capacity error, not a signal to delete the lock file, remove database pages, or continue using a failed write transaction.

## Forecast the map, not just today's data file

Start from measured growth and include operational headroom:

```text
required map bytes = current used bytes
                   + forecast net growth bytes
                   + copy-on-write transaction headroom bytes
                   + delayed page reuse bytes from long readers
                   + safety margin bytes
```

LMDB uses copy-on-write pages, so a write needs free pages before the old snapshot can be released. Long-lived read transactions prevent pages freed by newer writers from being reused and can make the file grow quickly. Large delete-and-rewrite transactions can therefore need more headroom than the final live dataset size suggests.

Use `mdb_env_info()` and `mdb_env_stat()` or the binding's equivalents to report map size, last page number, page size, and main-database entries, and sample these over time to measure growth. Use `mdb_stat()` for entries in each named database. The `me_numreaders` field is a reader-slot high-water mark, not the current active-reader count; use `mdb_reader_list()` or `mdb_stat -r` to inspect the reader table. Convert page counts to bytes before combining them with growth estimates; for example, the byte extent represented by a zero-based last page number is `(last_page_number + 1) * page_size`. Alert well before that extent approaches the map size. Also monitor actual filesystem free space; virtual address headroom cannot create disk capacity.

## Set the map before opening

The LMDB API recommends calling `mdb_env_set_mapsize()` after `mdb_env_create()` and before `mdb_env_open()`. This example assumes a 64-bit process, an existing writable directory, and an application-defined `fail()` that does not return:

```c
MDB_env *env = NULL;
int rc = mdb_env_create(&env);
if (rc != MDB_SUCCESS) fail(rc);

rc = mdb_env_set_mapsize(env, 64ULL * 1024 * 1024 * 1024);
if (rc != MDB_SUCCESS) fail(rc);

rc = mdb_env_open(env, "/var/lib/myapp/lmdb", 0, 0600);
if (rc != MDB_SUCCESS) fail(rc);
```

The size should be a multiple of the operating-system page size. On 32-bit systems, address-space limits make very large maps impractical, so qualify the deployment architecture and leave room for the application and libraries.

Do not confuse `mapsize` with `maxreaders` or `maxdbs`. Those control reader slots and named databases, not data capacity.

## Abort the transaction on `MDB_MAP_FULL`

Check every LMDB return code. If `mdb_put` or a cursor operation reports `MDB_MAP_FULL` before commit, abort the write transaction and discard its cursors and value pointers:

```c
rc = mdb_put(txn, dbi, &key, &value, 0);
if (rc == MDB_MAP_FULL) {
    mdb_txn_abort(txn);
    txn = NULL;
    request_map_growth();
    return RETRY_LATER;
}
if (rc != MDB_SUCCESS) {
    mdb_txn_abort(txn);
    fail(rc);
}
```

Retry the entire idempotent unit of work only after a successful resize. Do not reuse a transaction or cursor from the failed attempt. Bound retries so a full filesystem or coordination failure becomes a visible outage rather than an infinite loop.

Treat `mdb_txn_commit()` differently: LMDB frees the transaction handle when that function returns, whether commit succeeds or fails. Never call `mdb_txn_abort()` on it afterward and never reuse it. A commit error is not an acknowledgement. Reopen or inspect authoritative state before deciding whether to begin a fresh, idempotent retry, because the caller must not infer outcome from a handle that is already invalid.

## Coordinate an online increase

LMDB allows `mdb_env_set_mapsize()` after open only when no transaction is active in that process. The library does not fully check that precondition for the caller. Build an application barrier:

1. stop admitting new read and write transactions, including read-transaction renewals, in the resizing process;
2. let the current writer finish or abort;
3. close or reset read transactions in the resizing process;
4. acquire the application's resize mutex or lease;
5. calculate a larger page-aligned size with headroom;
6. call `mdb_env_set_mapsize()`;
7. successfully commit a small write that actually changes data so the increase is persisted for other processes; an empty write transaction does not persist it;
8. release the barrier and retry the failed command once.

Only increases are persisted. Do not attempt to shrink the production map during recovery. A requested size below consumed space is silently raised to the current used size, which does not reclaim capacity.

## Handle other processes noticing the resize

If one process increases the map and data grows beyond another process's old view, `mdb_txn_begin()` or `mdb_txn_renew()` can return `MDB_MAP_RESIZED`. With no active transactions in that process, call:

```c
rc = mdb_env_set_mapsize(env, 0);  /* Adopt the size stored by another process. */
```

Check that the resize succeeded, then begin a fresh transaction or renew the reset read transaction. Centralize this behavior in the environment wrapper so every reader and writer handles it consistently. Keep application-level resize coordination even though LMDB serializes write transactions; the application must still prevent active local transactions during remapping.

## Reduce avoidable growth

End read transactions promptly, including error and cancellation paths. Periodically use `mdb_reader_check()` or `mdb_stat -rr /var/lib/myapp/lmdb` to check for and clear stale reader slots after abnormal process exits. Stale or long readers can hold old pages and make writers allocate new ones.

Keep write transactions bounded. Batch enough operations to reduce overhead, but avoid rewriting a huge portion of the database in one transaction. Validate retention and deletion logic rather than relying on an emergency map increase forever.

## Back up and test recovery

Use `mdb_env_copy2()` or `mdb_env_copyfd2()` for a database-aware backup. The compact-copy flag omits free pages but costs more CPU and time. A backup holds a read transaction, so a long copy concurrent with writes can delay page reuse and grow the source.

Test map exhaustion on a disposable small map. Verify that the application aborts cleanly, expands once, adopts the size in every process, replays by idempotency key, and retains all acknowledged records. Also test insufficient disk space separately because a larger map does not solve it.

## Conclusion

Size LMDB's map from forecast growth, copy-on-write headroom, long-reader behavior, and a safety margin. On `MDB_MAP_FULL`, abort the write and its cursors, quiesce local transactions, increase the map under an application barrier, and retry the complete idempotent operation. Handle `MDB_MAP_RESIZED` in every process and alert before capacity becomes urgent.

## Official Documentation

- [LMDB API header and environment map documentation](https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/lmdb.h)
- [LMDB repository](https://github.com/LMDB/lmdb)
- [LMDB tools and `mdb_stat`](https://github.com/LMDB/lmdb/tree/mdb.master/libraries/liblmdb)
- [LMDB Python binding environment options](https://lmdb.readthedocs.io/en/release/#lmdb.Environment)
