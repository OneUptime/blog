# Validation Summary: Persist Backoff State Across Worker Restarts

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- PostgreSQL SQL, partial indexes, and transactions
- PostgreSQL `timestamptz` and database clock functions
- Row-level locking with `FOR UPDATE SKIP LOCKED`
- Durable worker queues and lease recovery
- Retry backoff, jitter, and rate limiting
- UUID lease tokens, fencing, and idempotent effects

## Sources Consulted

- PostgreSQL `SELECT` locking clause and `SKIP LOCKED`: https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
- PostgreSQL explicit locking: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL date and time types: https://www.postgresql.org/docs/current/datatype-datetime.html
- PostgreSQL date and time functions: https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL function volatility categories: https://www.postgresql.org/docs/current/xfunc-volatility.html
- PostgreSQL partial indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL `UPDATE`: https://www.postgresql.org/docs/current/sql-update.html
- PostgreSQL transactions: https://www.postgresql.org/docs/current/tutorial-transactions.html
- AWS guidance for controlling and limiting retries: https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html
- AWS guidance for throttling requests and queue consumers: https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_throttle_requests.html
- AWS guidance for idempotent mutating operations: https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html
- Amazon SQS visibility-timeout guidance: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Python monotonic-clock semantics: https://docs.python.org/3/library/time.html#time.monotonic
- OWASP logging guidance for sensitive data: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## Issues Found

- The claim query compared indexed due times with volatile `clock_timestamp()`, whose value can change for each row and cannot be used as an index-scan comparison value. Replaced those eligibility comparisons with the stable, per-statement `statement_timestamp()` cutoff.
- The only partial index covered pending jobs even though the claim query also reclaimed expired running jobs. Added a partial `(lease_until, id)` index for `running` rows so PostgreSQL can use indexed time conditions for both branches.
- The lease-token wording implied broader fencing than the predicate provides, and it did not require the application to detect an `UPDATE` that matched no row. Clarified that the token fences queue-state updates, added `RETURNING id` to the failure update, and required exactly one affected row; otherwise the worker has lost the lease and a same-database business-effect transaction must roll back.
- The fixed 30-second lease could expire during legitimate long-running work and permit another worker to reclaim the job. Added guidance to size the lease for the expected processing time or renew it before expiry with a token-guarded update.

## Review Notes

- The corrected DDL, claim statement, interval arithmetic, token mismatch behavior, and failure update were executed successfully on PostgreSQL 14.17. An `EXPLAIN` check confirmed that the corrected eligibility predicates can use both partial indexes. The official `current` documentation was PostgreSQL 18.6 on the validation date.
- `timestamptz` stores an absolute instant internally in UTC but renders it in the session time zone; the post's durable-time guidance is correct.
- If lease expiry does not consume `attempt_count`, repeated worker crashes can retry indefinitely. A separate bounded lease-expiration or redelivery count may be useful when the system requires a hard delivery limit.
- All external links in the post resolved to their intended current documentation, and no deprecated or version-specific APIs were found.
