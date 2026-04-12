# Validation Summary: How to Use FLUSH TABLES in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (FLUSH TABLES, FLUSH TABLES WITH READ LOCK, FLUSH TABLES FOR EXPORT)
- InnoDB tablespace export
- MySQL replication (binary log control with LOCAL / NO_WRITE_TO_BINLOG)

## Sources Consulted
- MySQL 8.0 Reference Manual — FLUSH TABLES Statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html#flush-tables
- MySQL 8.0 Reference Manual — FLUSH TABLES WITH READ LOCK: https://dev.mysql.com/doc/refman/8.0/en/flush.html#flush-tables-with-read-lock
- MySQL 8.0 Reference Manual — FLUSH TABLES ... FOR EXPORT: https://dev.mysql.com/doc/refman/8.0/en/flush.html#flush-tables-for-export
- MySQL 8.0 Reference Manual — Server Status Variables (Open_tables): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html#statvar_Open_tables
- MySQL 8.0 Reference Manual — InnoDB Buffer Pool: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html

## Issues Found

### 1. Backup script using separate mysql sessions (Critical)
**What was wrong:** The bash backup example used separate `mysql -e` invocations for `FLUSH TABLES WITH READ LOCK` and `UNLOCK TABLES`. Since the FTWRL lock is session-scoped, the lock is released as soon as the first `mysql` process exits and its connection closes. The backup would therefore run without any lock protection.

**What was changed:** Replaced with a single `mysql -e` invocation that uses the `SYSTEM` command to perform the filesystem snapshot within the same session, keeping the lock held throughout.

### 2. Incorrect claim about InnoDB buffer pool flushing (Moderate)
**What was wrong:** The "Impact of FLUSH TABLES" section stated that "Any in-memory InnoDB buffer pool dirty pages are flushed to disk." This is incorrect — `FLUSH TABLES` closes open table handles and invalidates the table definition cache, but it does not flush InnoDB buffer pool dirty pages. The buffer pool is a separate layer managed by InnoDB's page cleaner threads and checkpoint mechanism.

**What was changed:** Replaced the incorrect bullet point with an accurate description: "All open table file descriptors are closed and must be reopened on next access."

## Review Notes
- The post correctly notes that `FLUSH TABLES WITH READ LOCK` is the basis of physical backup workflows but does not mention that modern tools like MySQL Enterprise Backup or Percona XtraBackup handle locking automatically and are generally preferred over manual FTWRL in production.
- The `FLUSH TABLES ... FOR EXPORT` feature described is specific to InnoDB and was introduced in MySQL 5.6. The post correctly scopes this to InnoDB.
- The `FLUSH LOCAL TABLES` / `FLUSH NO_WRITE_TO_BINLOG TABLES` equivalence is correct.
