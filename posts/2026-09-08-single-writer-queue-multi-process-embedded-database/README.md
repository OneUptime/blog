# How to Build a Single-Writer Queue for an Embedded Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Embedded Database, Concurrency, Application Development, Reliability, Observability

Description: Serialize multi-process mutations through a bounded idempotent queue with commit-based acknowledgements and crash recovery.

---

Many embedded engines serialize writes at the database or environment boundary. Letting every process race for that lock creates unpredictable latency and scattered retry logic. A single-writer queue makes admission explicit: workers submit typed commands, one owner executes short transactions, and success is returned only after commit.

The pattern improves control, but it does not create more storage throughput. A queue whose backlog grows without returning to baseline indicates overload or the need for another database architecture.

## Make one process the owner

Start one supervised writer that opens the database read-write. Other processes communicate over a bounded IPC queue, Unix socket, or local RPC interface:

```text
workers -> admission and bounded queue -> writer -> embedded database
                                      <- committed result
```

Use an exclusive process lease or lock to prevent two writer owners after a restart or deployment race. The database's own lock remains a final safety layer. The owner should refuse arbitrary SQL; expose versioned domain operations so commands can be validated, authorized, measured, and migrated.

Engine read behavior differs:

| Engine | Safe worker-read pattern |
| --- | --- |
| SQLite | Same-host worker connections can read; WAL permits overlap with one writer |
| LMDB | Multi-process readers are supported and do not block the writer, but end read transactions promptly |
| DuckDB native file | Keep live read-write access in one process; publish immutable read-only artifacts to other processes |

Honor the engine's documented filesystem and process boundaries. A queue does not make WAL safe on NFS or turn a native DuckDB file into a multi-process read-write database.

## Define the command envelope

Every mutation should include:

```json
{
  "operation": "record_payment_v2",
  "idempotency_key": "pay_01J7A4X0P4",
  "submitted_at": "2026-09-08T01:45:00Z",
  "deadline_ms": 3000,
  "payload": {
    "invoice_id": "inv_42",
    "amount_cents": 1299
  }
}
```

Limit payload bytes and reject unknown versions. Use externally stable identifiers so a replay does not depend on a connection-local row ID. Deadlines should govern admission and waiting; once a transaction has begun, finish or roll it back safely rather than abandoning the database handle.

## Make idempotency atomic with the write

Store the idempotency record in the same database transaction as the domain change. The owner first looks up the key and returns its stored outcome if present, rejecting reuse with a different operation or payload. Store and compare a canonical request representation or its fingerprint. In this SQLite example, the stored outcome is a fixed receipt (`recorded`); only an absent key should reach these statements. Execute each statement separately with bound parameters and roll back on failure:

```sql
BEGIN IMMEDIATE;

INSERT INTO applied_command(idempotency_key, operation, request_fingerprint, outcome, applied_at)
VALUES (?, ?, ?, 'recorded', CURRENT_TIMESTAMP);

UPDATE invoice
SET paid_cents = paid_cents + ?
WHERE id = ?;

-- Application: require exactly one updated row; otherwise ROLLBACK.
COMMIT;
```

The schema must make `invoice.id` unique, `paid_cents` non-null, and `applied_command.idempotency_key` non-null and unique; the latter is the final race guard. If the insert reports a duplicate, roll back the entire transaction, then read the committed record in a new transaction, verify the operation and request fingerprint, and return its outcome. Do not continue to the domain update after a duplicate-key result.

Return success only after commit. For success that must survive power loss, configure durable commits, such as `PRAGMA synchronous=FULL` in SQLite WAL mode, and avoid LMDB flags that weaken commit syncing. If the caller loses the response, it retries the same key. Never acknowledge when an operation is merely in an in-memory queue unless the API explicitly promises only best-effort enqueue.

## Decide how submissions survive a crash

There are two clear contracts:

- With caller retry, an unacknowledged in-memory command may disappear. The caller resends the same idempotency key.
- With durable acceptance, persist the command to a broker or an append-only spool before acknowledging enqueue.

For a file spool, write a complete command to a staging file, flush it, and sync the file according to the durability requirement. Rename it atomically into a ready directory on the same filesystem, then sync the affected directory entries where the platform supports directory syncing before acknowledging durable acceptance. If staging and ready are different directories, sync both. The writer moves committed items to a done or archive state. Secure permissions, checksums, bounded disk use, and poison-message quarantine are essential.

Do not create a second ad hoc database as a queue without defining how its commit coordinates with the target database. At-least-once delivery plus atomic idempotency at the target can provide exactly-once database effects, not exactly-once delivery. Retain idempotency records for the full retry and replay window.

## Batch without breaking semantics

The writer can combine compatible commands into one transaction to amortize sync cost. Bound batches by item count, bytes, and maximum wait. Do not mix commands whose failure rules require independent commits.

Ordering must be explicit. A global FIFO is simple but can cause head-of-line blocking. Per-entity ordering allows independent keys to progress, but batching and retries must never reorder two commands for the same entity. Document whether priority work can overtake earlier commands.

Prepare all external inputs before opening the transaction. The writer must not call remote APIs while holding the database's write lock.

## Apply backpressure

Set hard limits for queued items, bytes, and oldest age. When full, return a retryable overload response with a bounded retry hint. Blocking every producer indefinitely can consume all worker threads and cause a wider outage.

Separate admission for critical and bulk work only when starvation controls are defined. Large maintenance jobs should be chunked and rate-limited so interactive writes retain predictable service.

## Preserve read-after-write semantics

Include a monotonic commit sequence or version in the acknowledgement. A caller that requires read-after-write can ask the owner, or a read replica can wait until it has loaded at least that version. Do not promise immediate visibility from asynchronously published snapshots.

SQLite readers see a snapshot for the lifetime of their read transaction. End and restart that transaction to see a later commit. LMDB readers similarly retain an older snapshot until their transaction ends.

## Observe and recover

Measure enqueue rejections, queue count and bytes, oldest age, time to begin, transaction time, batch size, commit failures, retries, duplicate keys, poison commands, and writer restarts. Alert on backlog slope as well as absolute depth.

At startup, let SQLite or DuckDB perform journal or WAL recovery as applicable. LMDB uses copy-on-write rather than journal replay; check for stale reader slots after reader crashes using `mdb_reader_check`. Reconcile durable queued commands against committed idempotency records and replay only missing keys. Quarantine a deterministically failing command after a bounded number of attempts so it cannot block the entire queue.

## Conclusion

A single-writer queue turns implicit lock contention into explicit admission. Give one process write ownership, accept typed bounded commands, store idempotency with the domain change, and acknowledge only after commit. Define crash durability, batching, ordering, read visibility, and overload behavior. Migrate when sustained input still exceeds the writer's safe capacity.

## Official Documentation

- [SQLite transactions and single-writer behavior](https://www.sqlite.org/lang_transaction.html)
- [SQLite write-ahead logging](https://www.sqlite.org/wal.html)
- [DuckDB concurrency](https://duckdb.org/docs/current/connect/concurrency.html)
- [LMDB concurrency design](https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/lmdb.h)
