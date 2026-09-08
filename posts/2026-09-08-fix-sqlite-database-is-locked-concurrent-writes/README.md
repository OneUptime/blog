# How to Fix SQLite “Database Is Locked” Errors Under Concurrent Writes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLite, Database, Concurrency, Locking, Reliability

Description: Diagnose SQLite lock contention, shorten write transactions, configure bounded waiting, and choose a safe write architecture.

---

SQLite supports many concurrent readers, but it permits only one write transaction at a time. A `database is locked` error usually means that another connection still owns the write lock, a read transaction is preventing progress in rollback-journal mode, or an application tried to upgrade a deferred read transaction while another writer had already changed the database.

The durable fix is to control transaction lifetime and write admission. An ever-longer retry loop only hides overload.

## Identify which lock is lasting too long

Instrument every write transaction with:

- a request or job identifier;
- the time spent waiting to begin;
- the time from `BEGIN` to `COMMIT` or `ROLLBACK`;
- the statements executed and rows affected;
- whether the operation returned `SQLITE_BUSY` or `SQLITE_LOCKED`;
- the database path, process ID, and connection-pool name.

Look for transactions that remain open while code performs HTTP calls, waits on a queue, renders a response, or iterates a large result set. Finalize statements, close cursors, and return pooled connections promptly. A connection left in a failed transaction must be rolled back before it is reused.

On a host you control, inspect which processes have the database and its sidecars open:

```bash
lsof /srv/app/app.db /srv/app/app.db-wal /srv/app/app.db-shm
```

Do not delete a journal, WAL, or shared-memory file to clear a lock. Those files can be part of the database's live state.

## Configure waiting on every connection

SQLite's busy timeout is connection-local. Set it whenever the pool creates a connection, then verify it:

```python
import sqlite3

def open_db(path: str) -> sqlite3.Connection:
    connection = sqlite3.connect(path, timeout=5.0)
    connection.execute("PRAGMA busy_timeout = 5000")
    actual_ms = connection.execute("PRAGMA busy_timeout").fetchone()[0]
    if actual_ms != 5000:
        connection.close()
        raise RuntimeError(f"unexpected busy_timeout: {actual_ms}")
    return connection
```

A timeout absorbs short, expected collisions, but SQLite may return `SQLITE_BUSY` immediately to avoid deadlock. It does not resolve `SQLITE_LOCKED` conflicts within a connection or shared cache, and a stale WAL snapshot (`SQLITE_BUSY_SNAPSHOT`) requires rolling back and restarting the transaction. It does not create more write capacity. Bound the total request deadline, retry only an idempotent transaction, add jitter, and surface a controlled overload error when the budget is exhausted.

## Acquire the write reservation before doing work

The default `BEGIN DEFERRED` does not acquire a write transaction until the first write. A transaction that reads, performs work, and then tries to write can therefore fail during the upgrade. When a unit of work is known to write, use `BEGIN IMMEDIATE` and keep the protected section short:

```python
def rename_device(connection, device_id: int, new_name: str) -> None:
    try:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            "UPDATE devices SET name = ? WHERE id = ?",
            (new_name, device_id),
        )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
```

This example expects an idle connection created by `open_db`, using Python's current default legacy transaction control. Do not call it inside an existing transaction; with `autocommit=False`, a transaction is always open, and with `autocommit=True`, the Python `commit()` and `rollback()` methods have no effect.

Prepare and validate input before `BEGIN`. Do not hold the transaction open while calling another service. `BEGIN EXCLUSIVE` is rarely a concurrency improvement. In WAL mode it starts a write transaction like `BEGIN IMMEDIATE`; in other journal modes it also blocks readers.

## Use WAL for reader and writer overlap

WAL mode lets readers continue while a writer appends to the WAL, but it still allows only one writer. Before using WAL with multiple connections, require SQLite 3.51.3 or newer, or an official fixed backport such as 3.50.7 or 3.44.6. Releases from 3.7.0 through 3.51.2 contain a rare WAL-reset race that can corrupt a database when separate connections write and checkpoint concurrently.

Set and verify the journal mode during controlled initialization:

```sql
PRAGMA journal_mode = WAL;
```

Set and verify the durability policy on every connection:

```sql
PRAGMA synchronous = FULL;
PRAGMA synchronous; -- Verify that the returned value is 2 (FULL).
```

`journal_mode=WAL` persists in the database, whereas `synchronous` is connection-local. Do not repeatedly switch journal modes under load. WAL requires all processes to be on the same host and is unsuitable for a database shared over a network filesystem.

Long-lived read transactions can prevent checkpoints from finishing and make the WAL grow. Monitor its size and the three values returned by a passive checkpoint:

```sql
PRAGMA wal_checkpoint(PASSIVE);
```

Schedule a more aggressive checkpoint only when the application can tolerate its blocking behavior. Fix readers that never finish before tuning checkpoint frequency.

## Serialize writes when bursts exceed capacity

If several workers routinely contend, put write commands through one in-process writer or one dedicated writer service. A bounded queue makes overload visible and permits batching related writes into short transactions. Include an idempotency key so a caller can safely retry after losing the response to a committed operation.

Measure queue depth and oldest-item age. If they grow continuously, the workload requires batching, fewer writes, faster storage, or a client/server database. More SQLite connections will not increase single-file write throughput.

## Test the failure modes

Run a workload with the same number of processes, connections, journal mode, filesystem, and transaction sizes as production. Verify:

1. a short collision completes within the busy timeout;
2. a deliberately long writer causes a bounded, observable failure;
3. retries do not duplicate writes;
4. every error path rolls back;
5. WAL checkpoints make progress after readers finish;
6. process termination leaves the database recoverable.

Do not use a production database for destructive concurrency or crash tests.

## Conclusion

Treat `database is locked` as a transaction-lifetime or capacity signal. Set a bounded busy timeout on every connection, start known writes with `BEGIN IMMEDIATE`, keep transactions free of external waits, and use WAL only for same-host reader and writer overlap. When multiple workers regularly write, admit those writes through a single bounded queue or move to a client/server database.

## Official Documentation

- [SQLite transaction control](https://www.sqlite.org/lang_transaction.html)
- [SQLite write-ahead logging](https://www.sqlite.org/wal.html)
- [SQLite WAL-reset bug and fixed releases](https://www.sqlite.org/wal.html#walreset)
- [SQLite `busy_timeout` pragma](https://www.sqlite.org/pragma.html#pragma_busy_timeout)
- [SQLite result and extended result codes](https://www.sqlite.org/rescode.html)
