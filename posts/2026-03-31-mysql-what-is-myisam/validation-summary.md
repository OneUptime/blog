# Validation Summary: What Is MyISAM in MySQL

## Status
validated

## Post Type
Reference / Overview Guide

## Technologies Covered
- MySQL
- MyISAM storage engine
- InnoDB (for comparison)
- Full-text search (FULLTEXT indexes)
- MySQL data dictionary (.frm, .sdi files)

## Sources Consulted
- MySQL 8.0 Reference Manual: The MyISAM Storage Engine — https://dev.mysql.com/doc/refman/8.0/en/myisam-storage-engine.html
- MySQL 8.0 Reference Manual: Data Dictionary — https://dev.mysql.com/doc/refman/8.0/en/data-dictionary.html
- MySQL 8.0 Reference Manual: Serialized Dictionary Information (SDI) — https://dev.mysql.com/doc/refman/8.0/en/serialized-dictionary-information.html
- MySQL 8.0 Reference Manual: Internal Locking Methods (Table-Level Locking) — https://dev.mysql.com/doc/refman/8.0/en/internal-locking.html
- MySQL 8.0 Reference Manual: Concurrent Inserts — https://dev.mysql.com/doc/refman/8.0/en/concurrent-inserts.html
- MySQL 5.6 Reference Manual: InnoDB Full-Text Indexes — https://dev.mysql.com/doc/refman/5.6/en/innodb-fulltext-index.html

## Issues Found
- **`.frm` file description outdated for MySQL 8.0+**: The post stated that each MyISAM table consists of three files including `.frm` (format file), presented as a general fact. In MySQL 8.0 (released 2018), the `.frm` file was eliminated and replaced by the InnoDB data dictionary and `.sdi` (Serialized Dictionary Information) files. Added a note clarifying that `.frm` is replaced by `.sdi` in MySQL 8.0+ and a brief explanation of the change.

## Review Notes
- The post's description of table-level locking ("No other session can read or write to the table until the lock is released") is accurate for UPDATE and DELETE operations. However, MyISAM supports concurrent inserts under certain conditions (controlled by the `concurrent_insert` system variable): when the table has no deleted rows in the middle, INSERTs can proceed concurrently with SELECTs without full table locking. This nuance is omitted but the general statement is not incorrect for the overview context.
- All SQL syntax examples (CREATE TABLE, FULLTEXT INDEX, MATCH...AGAINST, CHECK/REPAIR/OPTIMIZE TABLE, ALTER TABLE ENGINE conversion, information_schema query) are syntactically correct and functional.
- The claim that InnoDB became default in MySQL 5.5 is accurate.
- The claim that InnoDB added full-text search in MySQL 5.6 is accurate.
- The bash example showing file paths under `/var/lib/mysql/` is the standard Linux default data directory and is correct.
