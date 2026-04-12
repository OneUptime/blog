# Validation Summary: How to Use AUTO_INCREMENT in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (AUTO_INCREMENT column attribute)
- InnoDB and MyISAM storage engines
- SQL DDL (CREATE TABLE, ALTER TABLE, TRUNCATE TABLE)
- INFORMATION_SCHEMA and SHOW TABLE STATUS

## Sources Consulted
- MySQL 8.0 Reference Manual — Using AUTO_INCREMENT: https://dev.mysql.com/doc/refman/8.0/en/example-auto-increment.html
- MySQL 8.0 Reference Manual — InnoDB AUTO_INCREMENT Handling: https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
- MySQL 8.0 Reference Manual — TRUNCATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html

## Issues Found

### 1. Gap-finding query returned false positives
**What was wrong:** The query to find gaps in AUTO_INCREMENT sequences (`SELECT a.id + 1 AS gap_start FROM users a WHERE NOT EXISTS (...)`) did not exclude the maximum ID in the table. This caused it to always report `MAX(id) + 1` as a gap, which is not a real gap but simply the end of the sequence.

**What was changed:** Added `AND a.id < (SELECT MAX(id) FROM users)` to the WHERE clause to exclude the last row.

**Why:** Without this filter, users running the query would always see a spurious "gap" after the highest existing ID.

### 2. Incorrect description and example for composite primary keys
**What was wrong:** The section "AUTO_INCREMENT in Multi-Column Primary Keys" stated that InnoDB requires AUTO_INCREMENT to be "paired with a non-primary unique key." Per the MySQL documentation, the actual requirement is that the AUTO_INCREMENT column must be "the first or only column of some index" — any index, not specifically a unique key. Additionally, the code example showed a single-column primary key (`PRIMARY KEY (log_id)`) rather than an actual composite primary key, contradicting the section title.

**What was changed:** Corrected the text to accurately describe the InnoDB requirement (first or only column of some index). Replaced the example with two proper composite primary key examples: one for MyISAM (showing per-group auto-increment on a secondary column) and one for InnoDB (showing a composite primary key with a separate index on the AUTO_INCREMENT column).

**Why:** The original text was factually incorrect per the MySQL 8.0 docs, and the example did not demonstrate what the section title promised.

## Review Notes
- The post does not mention the `NO_AUTO_VALUE_ON_ZERO` SQL mode, which changes the behavior of inserting 0 into an AUTO_INCREMENT column (0 is stored literally instead of generating the next value). This is a minor omission since the default behavior is as described, but could be noted in a future update.
- The TINYINT UNSIGNED range is stated as "0 to 255 rows" — technically AUTO_INCREMENT starts at 1 by default, so the practical range is 1 to 255 (255 rows). The comment is close enough for a general guide.
