# Validation Summary: Which Timeout Failures Are Safe to Retry, and Which Should Fail Fast?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Timeout and retry policy
- HTTP method semantics and status codes
- gRPC deadlines, status codes, and retry configuration
- PostgreSQL statement timeouts, transaction recovery, and serialization failures
- Google Cloud Storage retry behavior
- Python

## Sources Consulted

- [RFC 9110: Safe Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.1)
- [RFC 9110: Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9110: Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [RFC 9110: 408 Request Timeout](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.9)
- [RFC 9110: 503 Service Unavailable](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6.4)
- [RFC 6585: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [PostgreSQL serialization failure handling](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)
- [PostgreSQL statement_timeout](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-STATEMENT-TIMEOUT)
- [PostgreSQL ROLLBACK](https://www.postgresql.org/docs/current/sql-rollback.html)
- [PostgreSQL ROLLBACK TO SAVEPOINT](https://www.postgresql.org/docs/current/sql-rollback-to.html)
- [Google Cloud Storage retry strategy](https://cloud.google.com/storage/docs/retry-strategy)
- [Python dataclasses documentation](https://docs.python.org/3/library/dataclasses.html)
- [Python enum documentation](https://docs.python.org/3/library/enum.html)

## Issues Found

- The Python decision function rejected retries for an `UNKNOWN` outcome when the operation itself was idempotent. It also rejected a non-idempotent operation when the prior attempt was known not to have started or to have failed atomically. Changed the condition so another attempt is allowed when the prior operation is known not to have applied, or when duplicate effects are controlled by idempotency or an enforced idempotency key.
- The read-timeout guidance described reads generally as safe to repeat, but some read-shaped operations can have side effects or non-idempotent semantics. Qualified the statement so it applies to idempotent reads.
- The database statement-timeout guidance treated all such timers as server-side cancellation and implied that every PostgreSQL error requires a full rollback before connection reuse. Distinguished server-side statement timeouts from client- or driver-side execution timers, and clarified PostgreSQL's behavior for explicit transactions, including recovery through a suitable savepoint.

## Review Notes

All referenced documentation URLs resolved to the intended official sources. The post does not pin product versions; its PostgreSQL claims were checked against the current PostgreSQL 18 documentation. No deprecated Python APIs or version-specific compatibility issues were found.
