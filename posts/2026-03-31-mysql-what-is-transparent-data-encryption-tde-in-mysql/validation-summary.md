# Validation Summary: What Is Transparent Data Encryption (TDE) in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0
- InnoDB Transparent Data Encryption (TDE)
- MySQL Keyring plugins and components
- INFORMATION_SCHEMA views for encryption status

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Data-at-Rest Encryption (https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html)
- MySQL 8.0 Reference Manual: Keyring Component Installation (https://dev.mysql.com/doc/refman/8.0/en/keyring-component-installation.html)
- MySQL 8.0 Reference Manual: component_keyring_file Plugin (https://dev.mysql.com/doc/refman/8.0/en/keyring-file-component.html)
- MySQL 8.0 Reference Manual: INNODB_TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tables-table.html)
- MySQL 8.0 Reference Manual: INNODB_TABLESPACES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html)

## Issues Found

### Issue 1: Non-existent `keyring_file_configure()` SQL function
**What was wrong:** The post showed configuring the component-based keyring (MySQL 8.0.24+) via `INSTALL COMPONENT` followed by a `SELECT keyring_file_configure(...)` call. The function `keyring_file_configure()` does not exist in MySQL. Component-based keyrings are configured via JSON configuration files on disk, not SQL functions. Additionally, keyring components are loaded via a manifest file (`mysqld.my`), not via `INSTALL COMPONENT`.

**What was changed:** Replaced the incorrect SQL block with the correct file-based configuration approach: creating a manifest file (`mysqld.my`) to load the component and a configuration file (`component_keyring_file.cnf`) with the JSON settings. Added a verification query using `performance_schema.keyring_component_status`.

**Why:** The original code would fail with an "unknown function" error. The correct configuration method is documented in the MySQL 8.0 Reference Manual under keyring component installation.

### Issue 2: Query against non-existent `encryption` column in `innodb_tables`
**What was wrong:** The post queried `SELECT name, encryption FROM information_schema.innodb_tables WHERE encryption = 'Y'`. The `information_schema.innodb_tables` table does not have an `encryption` column. Its columns are: TABLE_ID, NAME, FLAG, N_COLS, SPACE, ROW_FORMAT, ZIP_PAGE_SIZE, SPACE_TYPE, INSTANT_COLS, TOTAL_ROW_VERSIONS.

**What was changed:** Changed the table reference from `information_schema.innodb_tables` to `information_schema.innodb_tablespaces`, which does have an `ENCRYPTION` column (added in MySQL 8.0.13). Updated the comment from "Via InnoDB tables" to "Via InnoDB tablespaces".

**Why:** The original query would fail with an "Unknown column 'encryption'" error. The `INNODB_TABLESPACES` table is the correct source for encryption status.

## Review Notes
- The section title "Encrypting an Entire Schema (Tablespace)" conflates schemas and tablespaces, which are distinct concepts in MySQL. A tablespace can contain tables from multiple schemas. This is a minor conceptual imprecision but not a code error.
- The `grep -m1 aes /proc/cpuinfo` command is Linux-specific and will not work on macOS or Windows. This is acceptable since MySQL TDE is predominantly deployed on Linux servers.
- The 5-10% performance overhead claim is a reasonable general estimate but actual impact varies by workload. This is acceptable as a rough guideline.
