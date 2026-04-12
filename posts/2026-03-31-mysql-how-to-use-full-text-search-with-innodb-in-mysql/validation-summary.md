# Validation Summary: How to Use Full-Text Search with InnoDB in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6+, 8.0+)
- InnoDB storage engine
- Full-Text Search (FULLTEXT indexes)
- Natural Language Mode, Boolean Mode, Query Expansion

## Sources Consulted
- MySQL 8.4 Reference Manual — InnoDB Full-Text Indexes: https://dev.mysql.com/doc/refman/8.4/en/innodb-fulltext-index.html
- MySQL 8.4 Reference Manual — Natural Language Full-Text Searches: https://dev.mysql.com/doc/refman/8.4/en/fulltext-natural-language.html
- MySQL 8.4 Reference Manual — Fine-Tuning MySQL Full-Text Search: https://dev.mysql.com/doc/refman/8.4/en/fulltext-fine-tuning.html
- MySQL 8.0 Reference Manual — InnoDB INFORMATION_SCHEMA FULLTEXT Index Tables: https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-fulltext_index-tables.html
- MySQL 8.0 Reference Manual — InnoDB Startup Options and System Variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html

## Issues Found

1. **Incorrect 50% stopword threshold claim for InnoDB**: The post stated "Words appearing in more than 50% of rows are treated as stopwords and ignored." This 50% threshold applies only to MyISAM, not InnoDB. Fixed to clarify that InnoDB does not apply this threshold and relies solely on the stopword list.

2. **Incorrect FT cache flush trigger**: The post listed `FLUSH TABLE ... WITH READ LOCK` as a trigger for flushing the InnoDB full-text index cache. This is not documented by MySQL. The actual triggers are: `OPTIMIZE TABLE`, server shutdown, and exceeding `innodb_ft_cache_size` or `innodb_ft_total_cache_size` limits. Fixed to list the correct triggers.

3. **Misleading bulk load description**: The post described `innodb_optimize_fulltext_only = ON` as "disabling the full-text index" during bulk loads. This variable does not disable FT indexing; it only makes `OPTIMIZE TABLE` process the full-text index alone rather than rebuilding the entire table. Fixed the description and code comments to accurately reflect its behavior.

## Review Notes
- The `innodb_ft_cache_size = 8M` config example uses MySQL suffix notation which equals 8,388,608 bytes, while the actual default is 8,000,000 bytes. Since the config block doesn't explicitly claim `8M` is the default (only the other variables have "default:" comments), this is acceptable as a configuration example.
