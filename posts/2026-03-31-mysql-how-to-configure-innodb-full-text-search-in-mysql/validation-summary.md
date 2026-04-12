# Validation Summary: How to Configure InnoDB Full-Text Search in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (8.0+)
- InnoDB Storage Engine
- InnoDB Full-Text Search (FTS)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Parameters: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual — InnoDB Full-Text Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual — Fine-Tuning Full-Text Search: https://dev.mysql.com/doc/refman/8.0/en/fulltext-fine-tuning.html
- MySQL 8.0 Reference Manual — Full-Text Stopwords: https://dev.mysql.com/doc/refman/8.0/en/fulltext-stopwords.html

## Issues Found

1. **innodb_ft_cache_size default value was wrong**: The post listed 8388608 (8MB / 8 MiB) but the actual MySQL default is 8000000 (~8MB, a round decimal number). Fixed in the configuration variables table.

2. **innodb_ft_total_cache_size default value lacked precision**: The post listed "640MB" which could be confused with 640 MiB (671,088,640 bytes). The actual default is 640,000,000 bytes. Fixed to show the exact byte value.

3. **innodb_ft_result_cache_limit default value lacked precision**: The post listed "2GB" which could be confused with 2 GiB (2,147,483,648 bytes). The actual default is 2,000,000,000 bytes. Fixed to show the exact byte value.

4. **innodb_ft_sort_pll_degree incorrectly shown as dynamic**: The post used `SET GLOBAL innodb_ft_sort_pll_degree = 8` which is incorrect — this variable is NOT dynamic and can only be set at server startup via the configuration file or command-line option. Rewrote the section to use my.cnf configuration with a server restart.

5. **Cache flush behavior on COMMIT was inaccurate**: The post claimed "the cache is flushed to the auxiliary tables when... a COMMIT triggers a sync." In reality, COMMIT controls search visibility (committed data becomes searchable), but does not trigger a physical flush of the in-memory FTS cache to the auxiliary tables on disk. The cache is flushed when it reaches the size limit. Fixed the description to accurately explain this distinction.

## Review Notes
- The config examples under "Tuning the FTS Cache" use 33554432 (32 MiB) for innodb_ft_cache_size and 671088640 (640 MiB) for innodb_ft_total_cache_size. These are valid custom values (different from defaults) and are fine as tuning recommendations.
- The "Monitoring FTS Query Performance" section sets innodb_ft_result_cache_limit to 2000000000, which is actually the default value — so the SET GLOBAL statement is a no-op. This is not technically wrong but could be misleading as it suggests it's enabling something.
- innodb_ft_min_token_size and innodb_ft_max_token_size are also not dynamic (startup only), which the post correctly handles by showing my.cnf configuration and a restart.
