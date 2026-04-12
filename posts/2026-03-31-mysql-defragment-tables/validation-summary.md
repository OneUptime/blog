# Validation Summary: How to Defragment MySQL Tables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- OPTIMIZE TABLE command
- ALTER TABLE DDL
- pt-online-schema-change (Percona Toolkit)
- information_schema.TABLES system view
- Bash scripting for scheduled maintenance

## Sources Consulted
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE — https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: InnoDB Online DDL — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl.html
- MySQL 8.0 Reference Manual: information_schema.TABLES — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- Percona Toolkit: pt-online-schema-change documentation — https://docs.percona.com/percona-toolkit/pt-online-schema-change.html

## Issues Found

1. **Incorrect internal mapping for OPTIMIZE TABLE**: The post stated that InnoDB performs `ALTER TABLE ... ENGINE=InnoDB` under the hood. Per the MySQL 8.0 documentation, OPTIMIZE TABLE for InnoDB is mapped to `ALTER TABLE ... FORCE`. Changed to the correct mapping.

2. **Incomplete OPTIMIZE TABLE example output**: The example output only showed a single "status: OK" row. In practice, InnoDB tables produce a "note" row first ("Table does not support optimize, doing recreate + analyze instead") followed by the "status: OK" row. Updated the example output to match reality and added an explanatory note, since users unfamiliar with this behavior might think the operation failed.

## Review Notes
- The `data_free` column from `information_schema.TABLES` is most meaningful when InnoDB is configured with file-per-table tablespaces (`innodb_file_per_table=ON`), which is the default since MySQL 5.6.6. For shared tablespaces, `data_free` reflects free space in the shared tablespace, not per-table fragmentation. The post's approach is correct for the default configuration but doesn't note this caveat.
- The scheduling script and pt-online-schema-change examples use plaintext passwords on the command line (`-psecret`, `--password=secret`). This is acceptable for illustrative purposes but users should be aware that passwords passed this way are visible in process listings. Using `--defaults-file` or `--ask-pass` is recommended in production.
- All SQL syntax, pt-online-schema-change flags (--alter, --execute, --progress, --chunk-size, --sleep, DSN format), and bash piping patterns are correct.
- The `HAVING` clause without `GROUP BY` to filter on a SELECT alias is a valid MySQL extension and works correctly.
