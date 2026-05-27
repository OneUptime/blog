# Validation Summary: How to Use Cloud Spanner with the Java Client Library

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner Java client library
- Java
- Maven
- Gradle
- Spanner mutations, SQL queries, DML, read-write transactions, read-only transactions, and session pool configuration

## Sources Consulted
- Google Cloud Spanner Java getting started guide: https://docs.cloud.google.com/spanner/docs/getting-started/java
- Google Cloud Spanner Java client library reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner
- `DatabaseClient` Java reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.DatabaseClient
- `TransactionRunner` Java reference: https://cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.TransactionRunner
- `TransactionRunner.TransactionCallable` Java reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.TransactionRunner.TransactionCallable
- `ReadOnlyTransaction` Java reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.ReadOnlyTransaction
- `SessionPoolOptions` Java reference: https://cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.SessionPoolOptions
- `SessionPoolOptions.Builder` Java reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.SessionPoolOptions.Builder
- Cloud Spanner commit timestamp documentation: https://cloud.google.com/spanner/docs/commit-timestamp
- Cloud Spanner transactions documentation: https://cloud.google.com/spanner/docs/transactions

## Issues Found
- The Maven and Gradle dependency examples pinned `google-cloud-spanner` to `6.58.0`, while the current Google Cloud Java reference pages reviewed are for `6.103.0`. Updated both snippets to `6.103.0`.
- The read-write transaction examples used `new TransactionCallable<...>()`. In the current Java client, `TransactionCallable` is a nested interface of `TransactionRunner`, so the snippets would not compile as shown with only `import com.google.cloud.spanner.*;`. Updated them to `new TransactionRunner.TransactionCallable<...>()`.
- The DML transaction example generated `UUID.randomUUID()` inside the retryable transaction callback. Since the callback may be invoked more than once after aborted attempts, this made the callback non-deterministic. Moved the generated log ID outside the callback and reused it inside the transaction.
- The session pool example used `SessionPoolOptions.Builder#setWriteSessionsFraction(float)`, which the current reference documentation marks deprecated and no longer used because the session pool no longer prepares read/write sessions. Removed that option from the example.

## Review Notes
The remaining examples align with the official Java client patterns for `DatabaseClient`, `singleUse()`, `readOnlyTransaction()`, `write()`, mutations, parameterized statements, DML, commit timestamp placeholders, and automatic retries for read-write transactions. The examples assume surrounding application classes and imports such as `User`, `Order`, `Dashboard`, `Arrays`, `ArrayList`, `List`, and `UUID`.
