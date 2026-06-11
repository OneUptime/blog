# Validation Summary: How to Build Pessimistic Locking Implementation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (row-level locking: FOR UPDATE, FOR NO KEY UPDATE, FOR SHARE, FOR KEY SHARE, NOWAIT, SKIP LOCKED, lock_timeout, pg_locks, pg_stat_activity)
- MySQL / InnoDB (FOR UPDATE, FOR SHARE, LOCK IN SHARE MODE, NOWAIT, SKIP LOCKED, innodb_lock_wait_timeout, INNODB_TRX, performance_schema.data_locks)
- TypeScript with the `pg` Node.js client
- Mermaid diagrams

## Sources Consulted
- PostgreSQL Explicit Locking docs: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL Error Codes appendix: https://www.postgresql.org/docs/current/errcodes-appendix.html
- MySQL InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL INNODB_LOCK_WAITS table reference: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-lock-waits-table.html
- MySQL performance_schema.data_lock_waits: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL Server Error Reference (ER_LOCK_NOWAIT 3572, ER_LOCK_WAIT_TIMEOUT 1205): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found

1. **Incorrect claim about lock escalation.** The post stated, "Most databases will escalate from row locks to table locks when too many rows are locked." This is false for both databases the post covers: PostgreSQL explicitly does not escalate row locks (it has no row-lock memory pool to escalate from), and MySQL InnoDB does not escalate row locks to table locks either — its intention locks (IS/IX) are metadata indicators, not escalations. Rewrote the intro of "Avoiding Lock Escalation" to clarify that PostgreSQL and InnoDB don't escalate, but locking many rows still hurts via lock memory, deadlock risk, and serialization. The three recommendations themselves (lock fewer rows, batch, keep transactions short) remain valid.

2. **Outdated MySQL lock-monitoring query.** The post used `SELECT * FROM information_schema.INNODB_LOCK_WAITS;` without noting that this table was deprecated in MySQL 5.7.14 and **removed in MySQL 8.0.1**. On MySQL 8.0+, the query fails. Added an explicit comment that this table is for MySQL 5.7 and earlier, and added the modern replacement `SELECT * FROM performance_schema.data_lock_waits;` for 8.0+.

## Review Notes

- PostgreSQL SQLSTATEs used in the TypeScript samples are correct: `55P03` (lock_not_available) is returned for both `NOWAIT` failures and `lock_timeout` expiration, and `40P01` (deadlock_detected) is correct.
- MySQL error codes/messages are correct: 1205 for `innodb_lock_wait_timeout` and 3572 (ER_LOCK_NOWAIT) for `NOWAIT` failures.
- PostgreSQL row-level lock compatibility table is consistent with the official docs.
- The "Lock Mode Selection Flow" mermaid diagram is a useful simplification: in PostgreSQL the practical distinction between FOR SHARE and FOR KEY SHARE is about which writes they block (any UPDATE vs. only key-column UPDATEs), not about other readers. The framing as "allow other readers?" is a simplification but not incorrect for a decision tree; left as-is to honor the no-restructuring rule.
- The PostgreSQL NOWAIT error message in the post (`could not obtain lock on row in relation "inventory"`) matches the actual message emitted by `heap_lock_tuple`, with `"inventory"` correctly serving as a concrete example relation name.
- `SET LOCAL lock_timeout` is correctly placed inside a transaction in the TypeScript example.
- The `pg_locks` blocking-queries query is a standard approach; on PostgreSQL 9.6+ the built-in helper `pg_blocking_pids()` could simplify it, but the post's query is correct and works on older versions too.
