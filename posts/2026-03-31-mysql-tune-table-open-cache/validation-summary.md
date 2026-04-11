# Validation Summary: How to Tune table_open_cache for MySQL

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- Linux OS-level file descriptor configuration (ulimit, limits.conf, systemd)
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (`table_open_cache`, `table_open_cache_instances`, `table_definition_cache`, `open_files_limit`) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Server Status Variables (`Open_tables`, `Opened_tables`, `Open_files`, `Open_table_definitions`) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: How MySQL Opens and Closes Tables — https://dev.mysql.com/doc/refman/8.0/en/table-cache.html
- MySQL 8.0 Reference Manual: Data Dictionary — https://dev.mysql.com/doc/refman/8.0/en/data-dictionary.html
- Linux man pages: ulimit, limits.conf, systemd.exec (LimitNOFILE)

## Issues Found
No technical issues found.

## Review Notes
- The section title "Calculating the Cache Hit Rate" is slightly misleading — the query calculates `Open_tables / Opened_tables * 100`, which is more of a utilization ratio than a true cache hit rate. However, the column alias (`cache_utilization_pct`) and surrounding explanation are accurate, so this is a minor naming issue rather than a technical error.
- The `.frm`-equivalent description for `table_definition_cache` is acceptable shorthand. In MySQL 8.0, `.frm` files were replaced by the transactional data dictionary stored in InnoDB. The `table_definition_cache` now caches data dictionary table definition objects, not `.frm` files. The "equivalent" qualifier makes this acceptable.
- The bash code block at lines 83-96 mixes executable commands (`ulimit -n`, `cat`, `sudo systemctl edit`) with file content that should be placed in `/etc/security/limits.conf`. The comments clarify the intent, but readers should note that the `limits.conf` lines are file content, not commands to run.
- The default value of `table_open_cache_instances` in MySQL 8.0 is 16, which matches the configuration example in the post.
