# Validation Summary: How MySQL Query Cache Worked (and Why It Was Removed)

## Status
validated

## Post Type
Historical reference / Guide

## Technologies Covered
- MySQL (versions 4.0.1 through 8.0)
- MySQL Query Cache
- InnoDB Buffer Pool
- Redis (Python client)
- mysql-connector-python
- ProxySQL

## Sources Consulted
- MySQL 5.7 Reference Manual: Query Cache (https://dev.mysql.com/doc/refman/5.7/en/query-cache.html)
- MySQL 8.0 Reference Manual: Removal of Query Cache (https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html)
- MySQL 4.0 Changelog for query cache introduction (https://dev.mysql.com/doc/relnotes/mysql/4.0/en/)
- MySQL 5.7 Reference Manual: Server System Variables for query_cache_type, query_cache_size, query_cache_limit (https://dev.mysql.com/doc/refman/5.7/en/server-system-variables.html)
- MySQL 5.7 Reference Manual: Option File Syntax (https://dev.mysql.com/doc/refman/5.7/en/option-files.html)
- ProxySQL documentation: mysql_query_rules and cache_ttl (https://proxysql.com/documentation/main-runtime/)
- Redis Python client documentation for setex (https://redis-py.readthedocs.io/)

## Issues Found

1. **Incorrect MySQL version for query cache introduction**: The post stated the query cache was available from "MySQL 3.23". The query cache was actually introduced in MySQL 4.0.1. Fixed to "MySQL 4.0.1".

2. **Wrong comment syntax in MySQL config file snippet**: The "Enabling Query Cache" config block used `--` (SQL comment syntax) for inline comments. MySQL option files (my.cnf) use `#` for comments. Changed `-- 64MB` to `# 64MB` and `-- Max 1MB per result` to `# Max 1MB per result`.

3. **Incorrect percentage in benchmark table**: The 16-thread benchmark row claimed "40% SLOWER" when comparing 200,000 QPS (disabled) to 80,000 QPS (enabled). The actual decrease is (200,000 - 80,000) / 200,000 = 60%. Fixed to "60% SLOWER".

## Review Notes
- The benchmark numbers appear to be illustrative rather than sourced from a specific published benchmark. The general trend (query cache degrading performance at higher concurrency) is well-documented and accurate.
- The Python code example does not close the cursor explicitly before closing the connection, which is a minor best-practice issue but not a bug.
- The post correctly notes MySQL 8.0 removed the query cache. More precisely, it was removed in MySQL 8.0.3 (the first GA being 8.0.11), but saying "MySQL 8.0" is acceptable shorthand.
