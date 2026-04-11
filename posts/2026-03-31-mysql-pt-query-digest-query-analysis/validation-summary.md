# Validation Summary: How to Use MySQL pt-query-digest for Query Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (slow query log, general query log, binary log)
- Percona Toolkit / pt-query-digest
- tcpdump (for live MySQL traffic capture)
- mysqlbinlog (for binary log conversion)

## Sources Consulted
- Percona Toolkit pt-query-digest official documentation: https://docs.percona.com/percona-toolkit/pt-query-digest.html
- MySQL slow query log documentation: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL server system variables (long_query_time, slow_query_log, log_queries_not_using_indexes): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## Issues Found
1. **Invalid `--print` flag**: The "Common Flags" section included `pt-query-digest --print slow.log` with the comment "Include query fingerprints in output." The `--print` option does not exist in pt-query-digest. Query fingerprints are already included in the default report output. Removed the two lines referencing this non-existent flag.

## Review Notes
- The manual install section uses an illustrative download URL with version 3.6.0. The URL path structure may not exactly match Percona's current download portal, but it serves its purpose as an example. Readers should visit the Percona downloads page for the actual latest URL.
- The `apt-get` and `yum` install commands assume the Percona repository is already configured on the system. A note about adding the Percona repo first could be helpful but is not strictly necessary for the tutorial's scope.
- The `--review` and `--history` example uses plaintext password on the command line (`p=secret`), which is standard for Percona DSN syntax but worth noting as a security consideration in production.
- All other commands, flags, SQL statements, configuration directives, and technical explanations were verified as accurate.
