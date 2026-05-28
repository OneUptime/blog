# Validation Summary: How to Implement Batch DML Operations in Cloud Spanner for Bulk Data Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner DML and Batch DML
- Cloud Spanner Mutation API
- Python Cloud Spanner client library
- Java Cloud Spanner client library
- GoogleSQL

## Sources Consulted
- Google Cloud Spanner DML guide: https://docs.cloud.google.com/spanner/docs/dml-tasks
- Cloud Spanner ExecuteBatchDml REST reference: https://docs.cloud.google.com/spanner/docs/reference/rest/v1/projects.instances.databases.sessions/executeBatchDml
- Python Cloud Spanner Transaction client reference: https://cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.transaction.Transaction
- Java Cloud Spanner TransactionContext client reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.TransactionContext
- Google Cloud Spanner DML vs Mutations guide: https://docs.cloud.google.com/spanner/docs/dml-versus-mutations

## Issues Found
- The Python partial-failure example incorrectly expected `transaction.batch_update()` to raise `google.api_core.exceptions.InvalidArgument` and stated that the exception contains partial results. The Python client returns a status plus row counts for completed statements, so the example now checks `status.code` against `OK`, identifies the failed statement from `len(row_counts) + 1`, and aborts the transaction by raising an error.
- The Python batch DML examples did not inspect the returned status. Added `from google.rpc.code_pb2 import OK` and status checks so failed batch DML statements are not treated as successful.
- The Java example used `List`, `ArrayList`, and `Timestamp` without importing them. Added `java.util.List`, `java.util.ArrayList`, and `com.google.cloud.Timestamp`.
- The transaction limit section described the 80,000 mutation limit as "around" and tied it to affected rows. Updated it to the documented 80,000 mutations per transaction limit and clarified that chunking should be based on generated mutations, not row count alone.
- The statement-ordering best practice implied earlier statements should be placed first so they complete even if a later statement fails. Since all statements are in one transaction and failures should usually abort the transaction, revised the guidance to order prerequisites before dependent statements and abort unless intentionally committing completed statements.

## Review Notes
The post is technically relevant and the corrected examples align with current Cloud Spanner behavior. For very large bulk updates that do not require a single atomic transaction, a future revision could compare this pattern more explicitly with Partitioned DML, which Google documents for large-scale updates and deletes.
