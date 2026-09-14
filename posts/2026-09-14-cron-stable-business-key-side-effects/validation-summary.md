# Validation Summary: Prevent Duplicate Cron Side Effects with Stable Business Keys

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes CronJob scheduling, time zones, concurrency policies, and scheduled-time annotations
- PostgreSQL constraints, identity columns, data-modifying CTEs, `INSERT ... ON CONFLICT`, and Read Committed isolation
- Idempotency and stable business keys
- Transactional outbox pattern and downstream side-effect delivery

## Sources Consulted

- [Kubernetes CronJob documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Kubernetes Downward API documentation](https://kubernetes.io/docs/concepts/workloads/pods/downward-api/)
- [PostgreSQL 18 constraints documentation](https://www.postgresql.org/docs/18/ddl-constraints.html)
- [PostgreSQL 18 identity columns documentation](https://www.postgresql.org/docs/18/ddl-identity-columns.html)
- [PostgreSQL 18 `WITH` queries documentation](https://www.postgresql.org/docs/18/queries-with.html)
- [PostgreSQL 18 `INSERT` documentation](https://www.postgresql.org/docs/18/sql-insert.html)
- [PostgreSQL 18 transaction isolation documentation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL 18 sequence functions documentation](https://www.postgresql.org/docs/18/functions-sequence.html)
- [PostgreSQL 18 transactions tutorial](https://www.postgresql.org/docs/18/tutorial-transactions.html)
- [AWS Prescriptive Guidance: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## Issues Found
No technical issues found.

## Review Notes
The Kubernetes scheduled-timestamp claim is correctly scoped to version 1.32 and later. The PostgreSQL documentation links are version-pinned to PostgreSQL 18; the SQL and concurrency behavior described are accurate for that version. The post also correctly distinguishes a durable local delivery intent from exactly-once execution of an external effect.

The exact SQL snippets also passed local checks in an isolated temporary PostgreSQL 14 database: concurrent first-transaction commit and rollback, matching replay, changed-amount conflict, and rollback of the invoice when delivery-intent insertion fails. PostgreSQL 18 behavior was checked against its documentation; no shared database or external delivery service was used for these local checks.
