# Validation Summary: Retry the Entire Transaction After a Database Deadlock

## Status

validated

## Post Type

Technical guide with a Python implementation example

## Technologies Covered

- PostgreSQL
- MySQL InnoDB
- Python
- Psycopg 3 and psycopg_pool
- SQL transactions, deadlocks, savepoints, retries, jittered backoff, idempotency, and the transactional outbox pattern

## Sources Consulted

- [PostgreSQL: Explicit Locking and Deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS)
- [PostgreSQL: Serialization Failure Handling](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)
- [PostgreSQL: Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL: ROLLBACK TO SAVEPOINT](https://www.postgresql.org/docs/current/sql-rollback-to.html)
- [Psycopg 3: Transactions Management](https://www.psycopg.org/psycopg3/docs/basic/transactions.html)
- [Psycopg 3: Connection Pools](https://www.psycopg.org/psycopg3/docs/advanced/pool.html)
- [Psycopg 3: Package Exceptions](https://www.psycopg.org/psycopg3/docs/api/errors.html)
- [MySQL 9.7: How to Minimize and Handle Deadlocks](https://dev.mysql.com/doc/refman/9.7/en/innodb-deadlocks-handling.html)
- [MySQL 9.7: InnoDB Error Handling](https://dev.mysql.com/doc/refman/9.7/en/innodb-error-handling.html)
- [MySQL 9.7: Server Error Message Reference](https://dev.mysql.com/doc/mysql-errors/9.7/en/server-error-reference.html)
- [MySQL 9.7: Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/9.7/en/innodb-locks-set.html)
- [Python 3: `random.uniform`](https://docs.python.org/3/library/random.html#random.uniform)
- [Python 3: `time.sleep`](https://docs.python.org/3/library/time.html#time.sleep)

## Issues Found

- The post referred to a single transaction snapshot. PostgreSQL's default `READ COMMITTED` isolation uses a new snapshot for each statement, so the wording now refers to snapshots and says that statements in the new transaction acquire new snapshots and locks.
- The idempotency explanation overstated what a stable unique operation key does. The wording now explains that it prevents a second transaction from committing the same database operation, while the sample would still surface a unique violation and production code must return or reconcile the recorded result.
- The statement that backoff inside a deadlock victim always retains locks was too absolute because a database can release locks while aborting the victim. The post now distinguishes locks retained by an active transaction from the connection that remains checked out until context exit.
- The savepoint discussion implied that a database-selected deadlock victim could never be recovered to a savepoint. The post now states that PostgreSQL supports `ROLLBACK TO SAVEPOINT`, while explaining why a full retry remains the safe general policy and noting that InnoDB rolls back the entire transaction.
- The indexing advice claimed that indexes make updates lock only intended rows. InnoDB can acquire record, gap, and next-key locks, so the advice now accurately describes reduced scan work and a potentially smaller range-lock footprint.
- The two MySQL 9.0 documentation URLs redirected to the current MySQL 9.7 manual. They were updated to direct MySQL 9.7 links.
- The conclusion stated without qualification that every deadlock invalidates the whole execution context and called the sample transaction idempotent. It now frames full-context invalidation as the safe general retry policy and refers to the stable operation identifier without claiming that the sample implements a complete idempotent API response.

## Review Notes

The Python example is syntactically valid and uses current Psycopg 3 APIs. `psycopg.errors.DeadlockDetected` maps to PostgreSQL SQLSTATE `40P01`; the nested transaction and pool contexts finish rollback and return the connection before the retry sleeps. A later pool checkout may reuse the same physical connection, but it starts a new transaction with fresh transactional state. PostgreSQL `serialization_failure` is SQLSTATE `40001`, and MySQL InnoDB deadlocks use error `1213` with SQLSTATE `40001`. No deprecated APIs or invalid commands remain.
