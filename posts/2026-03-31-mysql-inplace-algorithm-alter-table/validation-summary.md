# Validation Summary: What Is the INPLACE Algorithm for ALTER TABLE in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- ALTER TABLE with ALGORITHM clause
- Online DDL (COPY, INPLACE, INSTANT algorithms)
- Performance Schema for DDL monitoring

## Sources Consulted
- MySQL 8.0 Reference Manual, Section 15.12.1 "Online DDL Operations" — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual, Section 15.12 "InnoDB and Online DDL" — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl.html
- MySQL 8.0 Reference Manual, Table 15.16 "Online DDL Support for Column Operations"
- MySQL 8.0 Reference Manual, "Online DDL Operations for Generated Columns"
- MySQL 8.0 Reference Manual, Section 15.12.2 "Online DDL Performance and Concurrency"

## Issues Found

### Issue 1: Adding a STORED generated column claimed to support INPLACE (Fixed)
**What was wrong:** The post included an example showing `ADD COLUMN order_year INT AS (YEAR(order_date)) STORED` with `ALGORITHM=INPLACE, LOCK=NONE`. Per MySQL 8.0 documentation (Table "Online DDL Operations for Generated Columns"), adding a STORED generated column does **not** support INPLACE — it requires `ALGORITHM=COPY`. The example as written would produce `ERROR 1846 (0A000): ALGORITHM=INPLACE is not supported`.

**What was changed:** Replaced with `DROP COLUMN legacy_notes, ALGORITHM=INPLACE, LOCK=NONE`, which correctly demonstrates an INPLACE operation that rebuilds the table while permitting concurrent DML.

### Issue 2: Character set conversion claimed to support INPLACE (Fixed)
**What was wrong:** The post included an example showing `MODIFY COLUMN description VARCHAR(500) CHARACTER SET utf8mb4` with `ALGORITHM=INPLACE, LOCK=NONE`. Per MySQL 8.0 documentation, changing a column's character set to one with a different maximum byte length (e.g., latin1→utf8mb4 or utf8mb3→utf8mb4) does not support INPLACE and requires `ALGORITHM=COPY`. Since the source character set was unspecified, the example would fail in most practical scenarios.

**What was changed:** Replaced with `MODIFY COLUMN description VARCHAR(500) NOT NULL, ALGORITHM=INPLACE, LOCK=NONE`, which correctly demonstrates an INPLACE operation that rebuilds the table while permitting concurrent DML.

### Issue 3: Misleading SHOW ENGINE INNODB STATUS guidance (Fixed)
**What was wrong:** The post stated to "Look for the ROW OPERATIONS section, which reports the number of rows processed during an in-place rebuild." The ROW OPERATIONS section of INNODB STATUS shows general row operation counters (inserts, updates, deletes, reads per second), not online DDL progress specifically.

**What was changed:** Updated to reference the SEMAPHORES and TRANSACTIONS sections for general DDL activity indicators, and redirected readers to the Performance Schema query for precise row-level progress tracking.

## Review Notes
- The claim that INSTANT "only supports a narrow set of operations like adding a column at the end of a table" was accurate for MySQL 8.0.12–8.0.28, but MySQL 8.0.29+ expanded INSTANT to support adding columns at any position and dropping columns. The post doesn't specify a version, so this is not wrong but could be updated in the future.
- The claim about "adding a primary key to a table that already has data in certain edge cases" requiring COPY is vague. Adding a primary key generally supports INPLACE in InnoDB. Edge cases exist (e.g., NULL values in the column being promoted to PK) but the statement could be more precise.
- All SQL syntax is correct and uses valid MySQL clauses.
- The Performance Schema monitoring query is accurate and useful.
- The error code 1846 with SQLSTATE 0A000 is correct for unsupported algorithm errors.
