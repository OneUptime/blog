# Validation Summary: How to Implement the Outbox Pattern with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (expression defaults, JSON type, FOR UPDATE SKIP LOCKED)
- Python (pymysql library)
- Transactional Outbox Pattern (microservices event publishing)
- Message brokers (Kafka, RabbitMQ, SNS referenced conceptually)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE and expression defaults — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: SELECT ... FOR UPDATE SKIP LOCKED — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual: JSON_OBJECT() function — https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html
- MySQL 8.0 Reference Manual: LAST_INSERT_ID() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual: ROW_COUNT() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual: InnoDB locking and transaction commit behavior — https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html
- PyMySQL documentation — https://pymysql.readthedocs.io/

## Issues Found
- **Relay code committed per-event inside the loop, defeating FOR UPDATE SKIP LOCKED**: The original Python relay code called `db_conn.commit()` inside the `for` loop after each event's UPDATE. In MySQL/InnoDB, `COMMIT` releases ALL row locks held by the transaction, including those acquired by `SELECT ... FOR UPDATE SKIP LOCKED`. After the first `db_conn.commit()`, the remaining rows fetched by the batch SELECT were no longer locked, allowing a concurrent relay instance to pick up and duplicate-process those events. This contradicted the post's claim that FOR UPDATE SKIP LOCKED prevents concurrent processing. **Fix**: Moved `db_conn.commit()` outside the for loop so the entire batch is committed in a single transaction, maintaining row locks for the duration of batch processing.

## Review Notes
- The post implicitly targets MySQL 8.0+ due to use of `DEFAULT (UUID())` (expression defaults, 8.0.13+) and `FOR UPDATE SKIP LOCKED` (8.0+). This is not explicitly stated but is consistent throughout.
- `TIMESTAMP` columns are used instead of `DATETIME`. With MySQL 8.0 defaults (`explicit_defaults_for_timestamp=ON`), this works correctly. On MySQL 5.7 with default settings, the first TIMESTAMP column (`published_at`) would auto-get `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, breaking the NULL-based unpublished detection. This is not a bug given the 8.0+ target, but could be noted for readers on older versions.
- The batch commit approach means that if the relay crashes after publishing some events to the broker but before committing, those events will be re-published on the next run. This is acceptable under the at-least-once delivery guarantee the post describes, and is handled by the idempotent consumer section.
