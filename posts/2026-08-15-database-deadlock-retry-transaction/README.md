# Retry the Entire Transaction After a Database Deadlock

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, MySQL, Transaction, Deadlock, Retry, Backoff

Description: Recover from a database deadlock by rolling back, waiting outside the transaction, and rerunning the complete unit of work.

---

When a database detects a deadlock, it chooses a transaction to abort so the other transactions can progress. Retrying only the last SQL statement is incorrect because earlier reads, writes, locks, and snapshots were part of the aborted transaction.

Exit the failed transaction, back off, then execute the complete transaction function again.

## Put the Retry Loop Outside the Transaction

This Python example uses PostgreSQL and psycopg-style transaction contexts:

```python
import random
import time
import psycopg

MAX_ATTEMPTS = 5

def transfer(pool, request_id: str, from_id: int, to_id: int, amount: int) -> None:
    for attempt in range(MAX_ATTEMPTS):
        try:
            with pool.connection() as connection:
                with connection.transaction():
                    debit_account(connection, from_id, amount)
                    credit_account(connection, to_id, amount)
                    insert_ledger_entry(
                        connection,
                        operation_id=f"transfer:{from_id}:{to_id}:{request_id}",
                        amount=amount,
                    )
            return  # The transaction context committed successfully.

        except psycopg.errors.DeadlockDetected:
            if attempt == MAX_ATTEMPTS - 1:
                raise

            ceiling = min(2.0, 0.025 * 2 ** attempt)
            time.sleep(random.uniform(0.0, ceiling))
```

The transaction context has rolled back before `time.sleep` runs. The next loop iteration obtains a new connection context and begins a new transaction with fresh transaction state; its statements acquire new snapshots and locks.

The stable `operation_id` lets the application detect a caller retry after an ambiguous network failure around commit and prevents a second transaction from committing the same database operation. Enforce it with a unique constraint rather than relying only on application memory. The example would surface a unique violation for an already committed operation, so production code must return or reconcile the recorded outcome; the key alone does not make the API response idempotent.

## Retry the Correct Error Class

PostgreSQL reports `deadlock_detected` as SQLSTATE `40P01`. MySQL InnoDB commonly reports a deadlock as error `1213` with SQLSTATE `40001`. Use the driver's typed exception or SQLSTATE, not message text.

Do not use the same policy automatically for every database error:

- syntax, constraint, and authentication errors are normally permanent;
- lock timeouts can have different semantics from detected deadlocks;
- PostgreSQL `serialization_failure` is SQLSTATE `40001` and also commonly requires a complete transaction retry, but deserves its own metrics and policy;
- connection loss during commit can leave the result unknown and requires idempotency or reconciliation, not a blind duplicate.

## Never Sleep While Holding the Transaction

Sleeping while a transaction is still active can retain locks, and sleeping before context exit keeps the connection checked out while doing no useful work. A database may already have released some or all locks when it aborts a deadlock victim, but ensure rollback or context exit completes before backoff.

Savepoints do not make retrying only the failed statement generally correct. PostgreSQL can restore an aborted transaction with `ROLLBACK TO SAVEPOINT`, but work and locks acquired after that savepoint are discarded and application decisions may need reevaluation; MySQL InnoDB rolls back the entire transaction on a deadlock. Retrying the complete unit of work is the safe general policy. Recreate any session-scoped state the next attempt requires, and do not reuse in-memory decisions based on rows read during the old snapshot.

## Keep External Effects Out of the Retried Body

A transaction function can run more than once. Sending email, charging a card, or publishing directly to a broker inside it can duplicate an external side effect even though the database rolls back.

Write an outbox record in the same database transaction and publish it later, or use a downstream idempotency key. Generate stable operation identifiers before entering the retry loop, not once per attempt.

## Reduce Deadlocks as Well as Retrying Them

Backoff spreads repeat collisions but does not fix a consistently inverted lock order. Also:

- access shared rows and tables in a consistent order;
- keep transactions small and short;
- index predicates to reduce scan work and, where the engine locks scanned ranges, the lock footprint;
- avoid user interaction and network calls inside transactions;
- inspect PostgreSQL deadlock logs or MySQL `SHOW ENGINE INNODB STATUS` when deadlocks are frequent.

Use capped jitter and a small retry limit. A persistent deadlock pattern should fail visibly rather than loop forever.

## Official Documentation

- [PostgreSQL explicit locking and deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS)
- [PostgreSQL error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [PostgreSQL transaction isolation and serialization failures](https://www.postgresql.org/docs/current/transaction-iso.html)
- [MySQL InnoDB: How to minimize and handle deadlocks](https://dev.mysql.com/doc/refman/9.7/en/innodb-deadlocks-handling.html)
- [MySQL InnoDB deadlock detection](https://dev.mysql.com/doc/refman/9.7/en/innodb-deadlock-detection.html)

## Conclusion

For a safe general retry policy, treat a deadlock as invalidating the transaction's whole execution context. Let it roll back, release its resources, wait with bounded jitter, and invoke the entire transaction again with a stable operation identifier and fresh database state.
