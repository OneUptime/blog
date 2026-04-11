# Validation Summary: How to Migrate from MariaDB to MySQL

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MySQL 8.0
- MariaDB
- mysqldump
- sed (for dump file cleanup)
- InnoDB storage engine
- Character sets (utf8mb3, utf8mb4)

## Sources Consulted
- MySQL 8.0 Reference Manual — Character Sets: https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-sets.html
- MySQL 8.0 Reference Manual — mysqldump: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — InnoDB Row Formats: https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html
- MariaDB Knowledge Base — Sequences: https://mariadb.com/kb/en/create-sequence/
- MariaDB Knowledge Base — Character Sets: https://mariadb.com/kb/en/setting-character-sets-and-collations/
- MariaDB Knowledge Base — mysqldump: https://mariadb.com/kb/en/mariadb-dump/

## Issues Found

1. **Wrong code block language for schema export command (line 24):** The `mysqldump --no-data` command was inside a `` ```sql `` fenced code block, but it is a shell command. Changed to `` ```bash `` with a bash-style comment.

2. **Incorrect utf8 aliasing claim (line 72):** The post stated "MySQL 8.0 aliases `utf8` to `utf8mb4`." This is incorrect. In MySQL 8.0, `utf8` remains an alias for `utf8mb3` (the 3-byte character set). MySQL 8.0 has *deprecated* this alias and recommends using `utf8mb4` explicitly, but the actual alias mapping has not changed. Updated the sentence to accurately describe the deprecation while keeping the normalization advice intact.

## Review Notes
- The `table_rows` column from `information_schema.tables` is an estimate for InnoDB tables, not an exact count. The post implicitly acknowledges this by providing exact `SELECT COUNT(*)` queries as a follow-up, which is correct practice.
- The `sed -i` flag behaves differently on macOS (requires a backup extension argument like `sed -i ''`) vs. GNU/Linux. This is a common cross-platform caveat but not specific to the migration topic.
- When using `--databases` with mysqldump, the dump includes `CREATE DATABASE IF NOT EXISTS` and `USE` statements. The manual `CREATE DATABASE` step before import is still valid and useful for ensuring the desired character set, since the `IF NOT EXISTS` clause in the dump won't override an already-created database's defaults.
- The MariaDB-specific comment regex `\/\*M!100316[^*]*\*\/` only targets one specific version number (10.3.16). Real dumps may contain other version numbers. A more general pattern like `\/\*M![0-9]*[^*]*\*\/` would catch more cases, but the post's approach works as a starting example.
