# Validation Summary: How to Transfer Data Between Two MySQL Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (mysqldump, mysql client)
- mydumper / myloader
- MySQL FEDERATED storage engine
- MySQL binary log replication
- SSH, SCP, rsync (for file transfer)
- gzip (for compression)

## Sources Consulted
- MySQL 8.0 mysqldump documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.4 mysqldump documentation: https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- MySQL 8.0.26 Release Notes (deprecation of --master-data): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-26.html
- MySQL FEDERATED CREATE CONNECTION documentation: https://dev.mysql.com/doc/refman/8.0/en/federated-create-connection.html
- mydumper usage documentation: https://mydumper.github.io/mydumper/docs/html/mydumper_usage.html
- myloader usage documentation: https://mydumper.github.io/mydumper/docs/html/myloader_usage.html
- MySQL 8.4 Added/Deprecated/Removed options: https://dev.mysql.com/doc/refman/8.4/en/added-deprecated-removed.html

## Issues Found

1. **Misleading section title for Method 5**: The title was "mysqldump with mydumper for Speed", which implies using mysqldump together with mydumper. In reality, mydumper/myloader is an alternative to mysqldump, not used alongside it. Changed to "Use mydumper/myloader for Speed".

2. **Deprecated `--master-data=2` flag in Method 6**: The `--master-data` option was deprecated in MySQL 8.0.26 and replaced by `--source-data`. Updated `--master-data=2` to `--source-data=2`.

3. **Outdated replication terminology in Method 6**: The comment referenced "CHANGE MASTER TO" and the grep searched for "MASTER_LOG". Since MySQL 8.0.26+, the dump output uses "CHANGE REPLICATION SOURCE TO" with `SOURCE_LOG_FILE` and `SOURCE_LOG_POS`. Updated the comment and grep pattern accordingly.

## Review Notes
- The `--triggers` flag in Method 2 is redundant since mysqldump includes triggers by default, but including it explicitly is not incorrect and can serve as documentation of intent.
- The FEDERATED storage engine (Method 4) is not enabled by default in many MySQL installations. Users may need to enable it first. The post does not mention this prerequisite.
- The `-p` flag without a password value causes an interactive prompt. In piped commands (Method 1 compression example with SSH), this can be problematic since the remote mysql process may not have access to a terminal. In practice, users would need `--password=xxx` or a MySQL option file for non-interactive usage.
- The `table_rows` column from `information_schema.tables` is an estimate for InnoDB tables, not an exact count. This is acceptable for monitoring progress but worth noting.
- The `--master-data` flag still works as a deprecated alias in MySQL 8.4, so the original was not broken but would produce deprecation warnings.
