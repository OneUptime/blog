# Validation Summary: How to Use Read-Only Transactions for Consistent Reads in Cloud Spanner

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner read-only transactions
- Cloud Spanner read-write transactions
- Python client library for Cloud Spanner
- Go client library for Cloud Spanner
- GoogleSQL parameterized queries

## Sources Consulted
- Cloud Spanner transactions overview: https://docs.cloud.google.com/spanner/docs/transactions
- Cloud Spanner reads documentation: https://docs.cloud.google.com/spanner/docs/reads
- Cloud Spanner replication documentation: https://docs.cloud.google.com/spanner/docs/replication
- Cloud Spanner read lease documentation: https://docs.cloud.google.com/spanner/docs/read-lease
- Cloud Spanner transaction timeout documentation: https://docs.cloud.google.com/spanner/docs/transaction-timeout
- Python Cloud Spanner snapshot usage: https://docs.cloud.google.com/python/docs/reference/spanner/latest/snapshot-usage
- Python Cloud Spanner Snapshot class reference: https://cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.snapshot.Snapshot
- Go Cloud Spanner client package reference: https://cloud.google.com/go/docs/reference/cloud.google.com/go/spanner/latest

## Issues Found
- The Python examples used `database.snapshot()` for multiple `execute_sql()` calls. The Python client requires `multi_use=True` for multiple reads or queries in the same snapshot, so the examples were updated to `database.snapshot(multi_use=True)`.
- The post said read-only transactions are "cheaper" and "never block or are blocked by write transactions." This overstated the behavior. The text was updated to say they avoid locking overhead and do not hold locks that block writes, while noting that strong reads can wait briefly for ongoing writes to finish.
- The post described strong read-only transactions as being served by the nearest caught-up replica with no leader involvement. Official Spanner documentation says strong reads can go to any read-write or read-only replica, but non-leader replicas might contact the leader to confirm freshness unless read leases are configured. The performance section was updated accordingly.
- The post said read-only transactions need no retries. This was narrowed to no aborts due to lock contention, while retaining normal error handling for timeouts, service errors, and version-retention limits.
- The post said read-write transactions must complete within 10 seconds and read-only transactions have a 60-minute timeout. The current documentation describes keeping read-write transactions short and notes that idle transactions can be aborted; old read timestamps are constrained by the database version retention period, which defaults to one hour. That section was corrected.
- The timestamp example used `snapshot.read_timestamp`, which is not documented as a public Python `Snapshot` accessor. The example was changed to Go's documented `ReadOnlyTransaction.Timestamp()` method, and the debugging claim was updated to mention that historical reads are limited by the database's version retention period.
- The Go example imported `google.golang.org/api/iterator` without using it. The first query now handles `iterator.Done` when no customer row is returned, which makes the import necessary and improves the example's error handling.
- The conclusion was updated to prefer a single read or read-only transaction over a read-write transaction for read-only operations, matching the official guidance.

## Review Notes
The Go example uses current `cloud.google.com/go/spanner` APIs: `Client.ReadOnlyTransaction()`, `ReadOnlyTransaction.Query`, `RowIterator.Stop`, and `Row.Columns`. The Python examples use current `google.cloud.spanner` APIs and GoogleSQL parameter syntax. No external URLs in the post body needed correction.
