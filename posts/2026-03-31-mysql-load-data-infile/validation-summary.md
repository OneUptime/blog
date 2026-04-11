# Validation Summary: How to Use LOAD DATA INFILE in MySQL for Bulk Imports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LOAD DATA INFILE statement)
- SQL (DDL, DML)
- CSV / TSV / delimited file formats
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual — LOAD DATA Statement: https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual — performance_schema.events_stages_current Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-stages-current-table.html
- MySQL 8.0 Reference Manual — ALTER TABLE Statement (DISABLE KEYS / ENABLE KEYS): https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — Server System Variables (secure_file_priv, local_infile): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## Issues Found

1. **Monitoring Progress query used non-existent column names** — The query referenced `stage`, `source_file_size`, and `bytes_processed` as columns in `performance_schema.events_stages_current`. These columns do not exist. The correct columns are `EVENT_NAME`, `WORK_COMPLETED`, and `WORK_ESTIMATED`. Fixed the query to use the correct column names.

2. **DISABLE KEYS / ENABLE KEYS presented as a general optimization** — The Performance Tips section implied `ALTER TABLE ... DISABLE KEYS` works universally for all storage engines. Per MySQL documentation, this feature only affects MyISAM tables; it is silently ignored for InnoDB (the default engine). Added clarification that this is MyISAM-only and restructured the text so InnoDB users are directed to the correct optimization techniques (disabling foreign_key_checks, unique_checks, and autocommit).

3. **Syntax reference used misleading column list notation** — The syntax block showed `[(col1, col2, ...) | (@var1, @var2, ...)]` with a pipe operator, implying you must use either all column names or all user variables. MySQL allows mixing column names and user variables in the same list (e.g., `(sku, name, @price_cents, in_stock)`), which the post itself demonstrates later. Changed to `[(col_name_or_user_var, ...)]` to match the official MySQL syntax.

## Review Notes
- The post omits some optional syntax elements from the full MySQL reference (e.g., `LOW_PRIORITY | CONCURRENT`, `PARTITION`, `OPTIONALLY ENCLOSED BY`, `IGNORE n ROWS`). These are simplifications rather than errors, appropriate for a tutorial-level post.
- The performance_schema monitoring approach requires that stage instruments and consumers are enabled (`setup_instruments` and `setup_consumers` tables). The post doesn't mention this prerequisite, but this is acceptable for a brief monitoring tip.
