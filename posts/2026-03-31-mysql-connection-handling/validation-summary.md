# Validation Summary: How MySQL Connection Handling Works

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.x
- MySQL connection protocol (TCP handshake, authentication)
- MySQL thread-per-connection model
- MySQL Performance Schema
- MySQL server configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual: performance_schema.threads table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: back_log system variable — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_back_log
- MySQL 8.0 Reference Manual: Connection Interfaces — https://dev.mysql.com/doc/refman/8.0/en/connection-interfaces.html
- MySQL 8.0 Reference Manual: thread_cache_size — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_thread_cache_size
- MySQL 8.0 Reference Manual: max_connections — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_connections

## Issues Found

### 1. Connection lifecycle order was incorrect
**What was wrong:** The post stated that MySQL's main listener thread "accepts the connection and performs the initial handshake" and that a dedicated thread is assigned afterward (step 5). In reality, the connection manager thread accepts the TCP connection and immediately assigns a dedicated thread (new or from the thread cache), and that dedicated thread performs the handshake and authentication.
**What was changed:** Reordered the lifecycle steps so thread assignment happens before the handshake. Updated the ASCII diagram to reflect the corrected flow.

### 2. back_log error description was incorrect
**What was wrong:** The post stated that when the `back_log` queue fills up, "new connections are refused with 'Too many connections.'" The "Too many connections" error (error 1040) is actually caused by exceeding `max_connections`, not by `back_log` overflow. When `back_log` is full, the OS refuses new connections at the TCP level (connection timeout or refusal), and MySQL never gets the chance to send a protocol-level error.
**What was changed:** Corrected the description to explain that `back_log` overflow causes TCP-level refusal, and clarified that "Too many connections" is a separate condition from `max_connections`.

### 3. performance_schema.threads column names were incorrect
**What was wrong:** The query used `user`, `host`, `command`, `time`, `state` as column names, which do not exist in the `performance_schema.threads` table. These columns require the `PROCESSLIST_` prefix.
**What was changed:** Updated the query to use the correct column names: `PROCESSLIST_USER`, `PROCESSLIST_HOST`, `PROCESSLIST_COMMAND`, `PROCESSLIST_TIME`, `PROCESSLIST_STATE`.

## Review Notes
- The thread stack size is described as "around 256 KB by default." This was accurate for MySQL 8.0 prior to 8.0.27 (default was 286720 bytes / ~280 KB). Starting with MySQL 8.0.27, the default `thread_stack` on 64-bit platforms was increased to 1048576 bytes (1 MB). The claim is approximately correct for older 8.0.x versions but may be misleading for current MySQL 8.0 installations.
- The post covers MySQL Community Edition's thread-per-connection model. MySQL Enterprise Edition offers a thread pool plugin that uses a different model; this is not mentioned but is outside the post's scope.
