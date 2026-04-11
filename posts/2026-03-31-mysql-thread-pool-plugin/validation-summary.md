# Validation Summary: How to Use MySQL Thread Pool Plugin

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL Enterprise Edition (Thread Pool plugin)
- Percona Server for MySQL (built-in thread pool)
- MariaDB (built-in thread pool)
- sysbench (benchmarking)
- ProxySQL (connection pooling comparison)

## Sources Consulted
- MySQL 8.0 Reference Manual — Thread Pool plugin: https://dev.mysql.com/doc/refman/8.0/en/thread-pool.html
- MySQL 8.0 Reference Manual — Thread Pool system variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — Thread Pool INFORMATION_SCHEMA tables: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-information-schema-tables.html
- Percona Server 8.0 Documentation — Thread Pool: https://docs.percona.com/percona-server/8.0/thread-pool.html
- MySQL 8.0 Reference Manual — MySQL option file syntax: https://dev.mysql.com/doc/refman/8.0/en/option-files.html

## Issues Found

1. **MySQL Enterprise config included Percona-specific variables**: The MySQL Enterprise installation config block included `thread_handling = pool-of-threads`, `thread_pool_max_threads`, and `thread_pool_idle_timeout`. None of these variables exist in MySQL Enterprise Edition. In MySQL Enterprise, the thread pool is activated by loading the plugin — there is no `thread_handling` variable. Removed these variables and added an explanatory note.

2. **Invalid INI comment syntax**: Several config file blocks used `--` (SQL comment syntax) instead of `#` for inline comments. MySQL option files only support `#` and `;` as comment characters. Using `--` would either cause parse errors or be included as part of the config value. Changed all `--` comments to `#`.

3. **`thread_pool_size` shown as dynamically settable**: The post used `SET GLOBAL thread_pool_size = 16;` but this variable is not dynamic in MySQL Enterprise or Percona Server — it requires a server restart. Changed to show it as a config file directive with a note about requiring restart.

4. **`thread_pool_stall_limit` units and defaults were misleading**: The post stated "500ms (default)" without noting that MySQL Enterprise uses units of 10 milliseconds (default: 60 = 600ms) while Percona Server uses milliseconds (default: 500ms). Added per-distribution documentation of units and defaults, and separate SET GLOBAL examples for each.

5. **`thread_pool_max_threads` and `thread_pool_idle_timeout` presented as general variables**: These are Percona Server / MariaDB-specific variables that do not exist in MySQL Enterprise. Added distribution labels to the section headers and explanatory notes.

6. **Tuning examples lacked distribution context**: The tuning config blocks used Percona-specific syntax without noting it. Added an introductory note clarifying they use Percona Server syntax, added `thread_handling` directives, and noted to adjust for MySQL Enterprise.

7. **Summary omitted MariaDB**: The summary paragraph mentioned only "MySQL Enterprise Edition and Percona Server" despite MariaDB being listed in the Availability section. Added MariaDB.

## Review Notes
- The `TP_THREAD_GROUP_STATE` and `TP_THREAD_STATE` monitoring tables are available in both MySQL Enterprise and Percona Server, but the post labels them as "Percona Server / MariaDB" only. This is not strictly wrong (they are available there) but is slightly incomplete. Left as-is since the Enterprise monitoring table (`performance_schema.tp_thread_group_stats`) is covered separately.
- The `INSTALL PLUGIN thread_pool SONAME 'thread_pool.so'` command installs only the main thread_pool plugin. To also get the monitoring INFORMATION_SCHEMA tables in MySQL Enterprise, the related plugins (`tp_thread_state`, `tp_thread_group_state`, `tp_thread_group_stats`) must be installed separately or loaded via `plugin-load-add` which loads all plugins from the shared library. The post's config file approach (`plugin-load-add=thread_pool.so`) handles this correctly.
- The sysbench command is syntactically correct and uses standard options.
