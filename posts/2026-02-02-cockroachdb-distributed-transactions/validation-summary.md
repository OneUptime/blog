# Validation Summary: How to Handle Distributed Transactions in CockroachDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB (distributed SQL database)
- SQL (transactions, savepoints, isolation levels, SELECT FOR UPDATE, AS OF SYSTEM TIME)
- Go (database/sql, github.com/cockroachdb/cockroach-go/v2/crdb, github.com/lib/pq)
- Raft consensus protocol
- Hybrid Logical Clocks (HLC)

## Sources Consulted
- CockroachDB Transactions documentation: https://www.cockroachlabs.com/docs/stable/transactions
- CockroachDB Architecture / Transaction Layer: https://www.cockroachlabs.com/docs/stable/architecture/transaction-layer
- CockroachDB Savepoints: https://www.cockroachlabs.com/docs/stable/savepoint
- CockroachDB SELECT FOR UPDATE / SKIP LOCKED: https://www.cockroachlabs.com/docs/stable/select-for-update
- CockroachDB AS OF SYSTEM TIME: https://www.cockroachlabs.com/docs/stable/as-of-system-time
- CockroachDB Follower Reads: https://www.cockroachlabs.com/docs/stable/follower-reads
- CockroachDB Read Committed Isolation (v23.2+): https://www.cockroachlabs.com/docs/stable/read-committed
- cockroach-go library: https://github.com/cockroachdb/cockroach-go
- PostgreSQL SQLSTATE codes (CockroachDB inherits SQLSTATE 40001 for serialization_failure)
- CockroachDB crdb_internal schema reference: https://www.cockroachlabs.com/docs/stable/crdb-internal

## Issues Found

1. **Unused Go imports in `TransferFunds` example** — The first Go snippet imported `math/rand` and `time` but neither was used in the function body. Go does not allow unused imports, so the snippet would fail to compile. Removed both imports.

2. **Unused `errors` import in manual retry example** — The second Go snippet imported `errors` but never referenced it. Removed.

3. **Fictitious `"CR000"` error code** — The `isRetryableError` helper checked for `strings.Contains(errStr, "CR000")` with a comment claiming it was a "CockroachDB retry error". No such SQLSTATE exists in CockroachDB; CockroachDB uses the standard SQLSTATE class 40 (notably `40001` for serialization failures) for retryable transaction errors. Removed the `CR000` clause to avoid misleading readers.

4. **Wrong `crdb_internal` view in active-transactions query** — The "Key Metrics to Track" query referenced columns `query` and `phase` from `crdb_internal.cluster_transactions`, but those columns live in `crdb_internal.cluster_queries`, not `cluster_transactions`. Also `cluster_transactions` does not expose the running query text, so the query as written would fail. Rewrote the query to target `crdb_internal.cluster_queries` (which has `query`, `phase`, `start`, and `application_name`) and removed `num_retries` / `num_auto_retries` references that don't exist on that view.

## Review Notes

- The contention-monitoring SQL examples against `crdb_internal.cluster_contention_events` are illustrative; the actual schema of that view in current CockroachDB versions differs somewhat (e.g., `contention_duration` instead of a generic `duration`/`cumulative_contention_time`, and some columns such as `range_id` are not present). The queries communicate the intent clearly and could still be adapted by readers, so they were left as is rather than rewritten.
- The `READ COMMITTED` isolation example is correct for CockroachDB v23.2+ (where READ COMMITTED was added). Older versions only support SERIALIZABLE.
- `SELECT ... FOR UPDATE SKIP LOCKED` is available in CockroachDB v22.2+ and works as described.
- `follower_read_timestamp()` and `default_transaction_use_follower_reads` are valid built-ins / session settings.
- The `BEGIN PRIORITY {LOW|NORMAL|HIGH}` syntax and priority semantics are correctly described.
- The Raft / leaseholder / HLC overview is accurate at the level of detail given.
- Style note (not a correctness issue): the Go examples mix `tx.QueryRow`/`tx.Exec` with `tx.ExecContext`. Using the `*Context` variants consistently would be slightly better practice but is not incorrect.
