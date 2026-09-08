# How to Handle DuckDB's Single-Process Write Lock in Multi-Worker Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DuckDB, Concurrency, Locking, Embedded Database, Application Development

Description: Route native DuckDB writes through one owning process, return durable acknowledgements, and publish read-only snapshots to workers.

---

DuckDB's native embedded concurrency model centers read-write access in one process. Threads in that process can use multiple connections and concurrent writes, subject to optimistic conflicts. Multiple processes can open the same native database in read-only mode only when no process writes.

A process-level file-lock error is therefore an architecture signal. Repeatedly retrying `duckdb.connect(..., read_only=False)` from every web worker does not create a safe multi-writer design.

## Pick one owner for the native file

Run a dedicated process that opens the DuckDB file read-write before accepting commands. Other workers submit typed operations over an IPC queue, Unix socket, or local RPC interface:

```text
web workers -> bounded command queue -> DuckDB owner -> database.duckdb
                                      -> result or acknowledgement
```

The owner validates command shape, starts and ends transactions, batches compatible appends, and is the only component allowed to mutate the file. Start it under a supervisor and use an exclusive lease or process lock so two owners cannot start after a deployment race.

Do not open a connection in a parent process and then use it after `fork()`. Start the owner process first or have each child create only the connections appropriate to its role.

## Define a durable command protocol

Give every mutation an idempotency key and a versioned payload:

```json
{
  "operation": "append_events_v1",
  "idempotency_key": "batch-20260908-0042",
  "rows_uri": "/srv/staging/batch-0042.parquet"
}
```

Inside one transaction, the owner first queries the key. If it exists, the owner ends the transaction and returns the stored outcome. Only a new key reaches the mutation and completion statements. Execute these statements individually on the same connection, binding each `?` through the client API. Here, the stored outcome is a success acknowledgement represented by the key and `applied_at`; persist any additional response fields in the same transaction if callers need them:

```sql
BEGIN;

-- Query applied_command for the key here; if found, end the
-- transaction and return its acknowledgement without inserting.

INSERT INTO events
SELECT * FROM read_parquet(?);

INSERT INTO applied_command(idempotency_key, applied_at)
VALUES (?, current_timestamp);

COMMIT;
```

Return success only after commit. If the caller times out before receiving the response, it can resend the same key and receive the stored outcome instead of duplicating data. Keep command files immutable until acknowledgement and garbage-collect them later.

Enforce a unique constraint on the key as a final guard. If the insert or commit reports an idempotency-key conflict, roll back the whole transaction if it is still active and query the key in a new transaction. Return the outcome only if a committed record exists; otherwise retry the complete transaction. Do not continue to commit the preceding mutation after an idempotency conflict.

## Bound and observe the queue

Set maximum command count, bytes, and oldest-item age. Reject or shed work when the queue cannot meet its latency objective. An unbounded queue hides insufficient ingestion capacity and can exhaust memory or disk.

Measure:

- enqueue-to-start and start-to-commit latency;
- queue depth, bytes, and oldest age;
- batch rows and bytes;
- transaction conflicts and retries;
- checkpoint duration and WAL size;
- owner restarts and replayed idempotency keys.

Batch append-heavy commands to match DuckDB's analytical design. Do not hold a transaction open while downloading a file or waiting for another service; stage and verify inputs first.

## Use threads deliberately inside the owner

DuckDB supports concurrent writer threads within one process. Appends do not conflict, while updates or deletes of the same row can produce transaction conflicts. Use one connection per thread as required by the client API, and retry only the complete idempotent transaction after a conflict.

Often one ingestion thread with bulk `COPY`, Appender, or insert-select operations is simpler and faster than many threads issuing small writes. Benchmark with aged data, checkpoints, and the same storage device as production.

## Separate live writers from read-only replicas

Do not let independent processes read the live native file while the owner writes. For multi-process read serving, periodically produce a clean immutable artifact:

1. pause admission and finish all active transactions in the owner;
2. checkpoint successfully and close all connections to the database cleanly;
3. copy the closed database to a separate versioned file before reopening the live database or resuming writes;
4. validate the copy, calculate a checksum, and publish it without further modification;
5. let replicas copy it locally and open with `access_mode='READ_ONLY'`;
6. retire the old version after its readers close.

Alternatively, publish Parquet files, which are naturally suited to immutable analytical exchange. Use an atomic manifest update so a replica never sees a half-written artifact.

## Know when to use another architecture

Current DuckDB documentation also describes the Quack remote protocol for multi-process writing. Quack is a beta feature in DuckDB 1.5.3, and its protocol, function names, settings, and defaults remain subject to change. DuckDB recommends DuckLake with PostgreSQL as its catalog as the stable alternative for this use case. Check version, deployment, security, and recovery guarantees rather than assuming either option changes the native file-lock rules.

Choose a client/server transactional database when independent workers require small low-latency writes, per-client authorization, mature failover, or a shared system of record. DuckDB can remain downstream for analytics.

## Recover the owner safely

On restart, open the database through DuckDB so its WAL can recover. DuckDB documents that the `.wal` file is required after a crash. Do not delete it to clear a startup problem. Replay unacknowledged commands by idempotency key, validate database invariants, and resume admission only after the owner is healthy.

## Conclusion

For a native DuckDB database, make one process the write owner and route multi-worker mutations through a bounded, idempotent command protocol. Batch analytical writes, acknowledge only committed work, and publish immutable read-only copies or Parquet to independent readers. If workers truly require direct concurrent transactions, use a supported client/server architecture.

## Official Documentation

- [DuckDB concurrency](https://duckdb.org/docs/current/connect/concurrency.html)
- [DuckDB Quack beta overview](https://duckdb.org/docs/current/quack/overview)
- [DuckDB files and recovery WAL](https://duckdb.org/docs/current/operations_manual/footprint_of_duckdb/files_created_by_duckdb.html)
- [DuckDB workload tuning](https://duckdb.org/docs/current/guides/performance/how_to_tune_workloads.html)
- [DuckDB transaction management](https://duckdb.org/docs/current/sql/statements/transactions.html)
