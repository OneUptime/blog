# Validation Summary: How to Detect MySQL Connection Churn Before `Threads_connected` Reaches `max_connections`

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- MySQL 8.4 classic protocol connection management
- MySQL global status and system variables
- MySQL default connection-thread cache and Enterprise Thread Pool
- MySQL Performance Schema threads, connection attributes, and host cache
- MySQL X Protocol connection metrics and limits
- Application connection pools and failover capacity planning
- Prometheus metrics and alerting

## Sources Consulted

- [MySQL 8.4 server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)
- [MySQL 8.4 status-variable scope reference](https://dev.mysql.com/doc/refman/8.4/en/server-status-variable-reference.html)
- [MySQL 8.4 `SHOW STATUS` statement](https://dev.mysql.com/doc/refman/8.4/en/show-status.html)
- [MySQL 8.4 `SHOW VARIABLES` statement](https://dev.mysql.com/doc/refman/8.4/en/show-variables.html)
- [MySQL 8.4 `FLUSH STATUS` semantics](https://dev.mysql.com/doc/refman/8.4/en/flush.html)
- [MySQL 8.4 server system variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html)
- [MySQL 8.4 connection interfaces and thread-cache behavior](https://dev.mysql.com/doc/refman/8.4/en/connection-interfaces.html)
- [MySQL 8.4 too-many-connections handling](https://dev.mysql.com/doc/refman/8.4/en/too-many-connections.html)
- [MySQL 8.4 administrative connection management](https://dev.mysql.com/doc/refman/8.4/en/administrative-connection-interface.html)
- [MySQL 8.4 communication errors and aborted connections](https://dev.mysql.com/doc/refman/8.4/en/communication-errors.html)
- [MySQL 8.4 Performance Schema `threads` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-threads-table.html)
- [MySQL 8.4 Performance Schema connection attribute tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-connection-attribute-tables.html)
- [MySQL 8.4 Performance Schema `session_connect_attrs` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-session-connect-attrs-table.html)
- [MySQL 8.4 Performance Schema `host_cache` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-host-cache-table.html)
- [MySQL 8.4 Enterprise Thread Pool FAQ](https://dev.mysql.com/doc/refman/8.4/en/faqs-thread-pool.html)
- [MySQL 8.4 X Plugin options and system variables](https://dev.mysql.com/doc/refman/8.4/en/x-plugin-options-system-variables.html)
- [MySQL 8.4 X Plugin status variables](https://dev.mysql.com/doc/refman/8.4/en/x-plugin-status-variables.html)
- [MySQL 8.4.6 built-in status-variable registration and `FLUSH STATUS` implementation](https://github.com/mysql/mysql-server/blob/mysql-8.4.6/sql/mysqld.cc)
- [MySQL 8.4.6 status-variable reset implementation](https://github.com/mysql/mysql-server/blob/mysql-8.4.6/sql/sql_show.cc)
- [Prometheus metric and label naming guidance](https://prometheus.io/docs/practices/naming/)

## Issues Found

- **`SHOW STATUS` scope:** The post said unqualified `SHOW STATUS` was the wrong source for these server-wide values. Although the statement defaults to session scope, every selected status variable is global-only, and MySQL returns a global value when no session value exists. Reworded the guidance to retain explicit `GLOBAL` for clarity without implying that the unqualified query would return session values for this particular list.
- **Counter and reset semantics:** The post grouped counters, gauges, and a high-water mark together as cumulative values since startup or reset. In MySQL 8.4, `Connections`, `Threads_created`, `Aborted_connects`, and `Connection_errors_max_connections` accumulate since server startup and are not reset by `FLUSH STATUS`; `Threads_connected` and `Threads_running` are instantaneous gauges; and `Max_used_connections` is rebased to the current open-connection count by `FLUSH STATUS`. Corrected the classification, rate guidance, and `Max_used_connections` description.
- **Thread-handler scope:** The thread-cache miss interpretation of `Threads_created / Connections` applies to the default `one-thread-per-connection` handler. MySQL Enterprise Thread Pool decouples connections from execution threads, so that ratio is not a connection-thread-cache miss measure there. Added `thread_handling` to the collection query and qualified the ratio, thread-creation explanation, and diagnostic table.
- **Protocol scope:** The queried variables and `max_connections` describe the classic MySQL protocol path, while X Plugin exposes separate `Mysqlx_*` status variables and `mysqlx_max_connections`. Added a concise scope statement.
- **Failover capacity calculation:** The original wording could be read as summing pool maxima across independent database replicas and comparing that total with one server's limit. Reframed the calculation per possible database target, including all service-instance pools that can converge on that target after failover.
- **Refusal-counter inference:** `Connection_errors_max_connections` proves that a connection was refused because the server limit was reached, but it does not classify the refused caller as a normal application client. Removed that unsupported client classification.
- **Connection-error diagnosis:** “Connection error subclasses” was underspecified because global `Connection_errors_*` variables cover only certain early or non-host-specific failures. Updated the diagnostic guidance to use those counters together with the per-host error columns in `performance_schema.host_cache` when enabled.

## Review Notes

- Both `SHOW GLOBAL STATUS ... WHERE Variable_name IN (...)` and `SHOW GLOBAL VARIABLES ... WHERE Variable_name IN (...)` are valid MySQL 8.4 syntax. The variables and privileges used by the post are current; `SUPER` is accurately identified as deprecated.
- The interval formulas are valid for successive samples from the same server. Returning no cache ratio for a zero `Connections` delta and discarding restart or decreasing-counter intervals are correct safeguards.
- The Performance Schema `threads` and connection-attribute tables represent current sessions and do not provide durable connection history. The warning against exporting unbounded client attributes as Prometheus labels is also correct.
- MySQL's extra privileged connection on the ordinary interface is accurately described. A separately configured administrative interface has different privileges and capacity behavior, but the post's “normally” qualification keeps its statement correct.
- All external links in the post resolved to their intended pages during validation; the author link redirects to the canonical GitHub profile URL.
