# Validation Summary: How to Use Read-Write Transactions in Cloud Spanner

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner read-write transactions
- Cloud Spanner Python client library
- Cloud Spanner mutations and DML
- Transaction isolation, locking, retries, and contention

## Sources Consulted
- Google Cloud Spanner transactions overview: https://docs.cloud.google.com/spanner/docs/transactions
- Google Cloud Spanner DML documentation: https://docs.cloud.google.com/spanner/docs/dml-tasks
- Google Cloud Spanner DML versus mutations documentation: https://docs.cloud.google.com/spanner/docs/dml-versus-mutations
- Google Cloud Spanner lock statistics documentation: https://docs.cloud.google.com/spanner/docs/introspection/lock-statistics
- Google Cloud Spanner Python transaction usage documentation: https://docs.cloud.google.com/python/docs/reference/spanner/latest/transaction-usage
- Google Cloud Spanner Python transaction API reference: https://cloud.google.com/python/docs/reference/spanner/latest/transaction-api
- Google Cloud Spanner read-write transaction sample: https://docs.cloud.google.com/spanner/docs/samples/spanner-read-write-transaction

## Issues Found
- The post described Spanner locking as row-level and said only one transaction can write a row at a time. Updated this to match current Spanner documentation: default serializable transactions use row-and-column lock granularity, and write conflicts are more nuanced, especially for blind writes versus read-then-write operations.
- The post said read-write transactions have a maximum lifetime of 10 seconds from first read or write to commit. Updated this because the documented 10-second behavior is the idle transaction threshold: Spanner can abort a transaction that has no outstanding reads or SQL queries and has not started one in the last 10 seconds.
- The append-only and DML Python examples used `uuid.uuid4()` without importing `uuid`. Added `import uuid` to those code blocks.
- The transaction flow diagram said reads acquire shared locks on rows. Updated it to say rows and columns, consistent with Spanner's lock granularity.

## Review Notes
The Python client APIs used in the examples, including `database.run_in_transaction`, mutation methods, `transaction.execute_update`, parameter typing, and commit timestamp placeholders, are consistent with the current Cloud Spanner Python documentation. The examples assume the relevant commit timestamp columns are configured with `allow_commit_timestamp=true`.
