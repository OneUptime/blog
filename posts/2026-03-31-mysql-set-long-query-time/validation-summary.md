# Validation Summary: How to Set long_query_time in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (slow query log configuration)
- Percona Toolkit (pt-query-digest)
- systemd (service management)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_long_query_time
- MySQL 8.0 Reference Manual: The Slow Query Log — https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: Server Status Variables (Slow_queries) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html#statvar_Slow_queries
- Percona Toolkit Documentation: pt-query-digest — https://docs.percona.com/percona-toolkit/pt-query-digest.html

## Issues Found
No technical issues found.

## Review Notes
- The section title "Setting a Per-User or Per-Connection Threshold" mentions "Per-User," but MySQL does not support setting `long_query_time` on a per-user basis — only per-session. The body text correctly describes it as a per-connection override, so the content is accurate even if the title is slightly loose.
- The `systemctl restart mysql` command uses the service name `mysql`, which is standard on Debian/Ubuntu. On RHEL/CentOS systems the service is typically named `mysqld`. This is a minor platform difference, not an error.
