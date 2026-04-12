# Validation Summary: How to Understand InnoDB Page Structure in MySQL

## Status
validated

## Post Type
Technical reference / educational guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB page structure (FIL header, PAGE header, infimum/supremum, record format, page directory, file trailer)
- COMPACT/DYNAMIC row format

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Row Formats — https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html
- MySQL 8.0 Reference Manual: InnoDB Page Size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_page_size
- MySQL 8.0 Reference Manual: innodb_checksum_algorithm — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_checksum_algorithm
- MySQL Source: fil0types.h (FIL_PAGE_DATA = 38, FIL_PAGE_DATA_END = 8) — https://dev.mysql.com/doc/dev/mysql-server/latest/fil0types_8h.html
- MySQL Source: page0page.h (PAGE_DATA = 56, PAGE_DIR_SLOT_SIZE = 2) — https://dev.mysql.com/doc/dev/mysql-server/latest/page0page_8h.html
- MySQL Source: rec.h (record layout for COMPACT format) — https://dev.mysql.com/doc/dev/mysql-server/latest/rec_8h_source.html
- Jeremy Cole — "The basics of InnoDB space file layout" — https://blog.jcole.us/2013/01/03/the-basics-of-innodb-space-file-layout/
- Jeremy Cole — "The physical structure of InnoDB index pages" — https://blog.jcole.us/2013/01/07/the-physical-structure-of-innodb-index-pages/
- Jeremy Cole — "The physical structure of records in InnoDB" — https://blog.jcole.us/2013/01/10/the-physical-structure-of-records-in-innodb/

## Issues Found

### 1. Record format component order was incorrect
**What was wrong:** The record format section listed components in this order: (1) Record header, (2) Null bitmap, (3) Variable-length column lengths, (4) Column data. In COMPACT/DYNAMIC row format, the actual physical on-disk order from low to high address is: variable-length field lengths (in reverse column order), null bitmap, record header (5 bytes), then column data after the record origin pointer.

**What was changed:** Reordered the list to match the correct physical layout: variable-length column lengths first, then null bitmap, then record header (with a note about the origin pointer), then column data.

**Why:** This is a post specifically about understanding the physical page structure. A reader following this guide to parse raw InnoDB pages would encounter the wrong byte sequence if using the original order.

### 2. Free space description was misleading
**What was wrong:** The page layout diagram described free space as "grows down as records are inserted." Free space does not grow — it shrinks as user records are added from above and page directory slots grow from below.

**What was changed:** Changed to "shrinks as records and directory slots are added" which accurately describes the behavior.

**Why:** The original wording could be misread as the free space area increasing in size, which is the opposite of what happens.

## Review Notes
- All byte offsets and sizes in the page layout diagram are correct: FIL header (38 bytes at offset 0), PAGE header (56 bytes at offset 38), infimum (13 bytes at offset 94), supremum (13 bytes at offset 107), user records starting at offset 120, file trailer (8 bytes at offset 16376).
- The page type constants (FIL_PAGE_INDEX, FIL_PAGE_UNDO_LOG, etc.) are accurate.
- The `innodb_page_size` discussion correctly notes it can only be set at initialization time. The post gives 8K and 32K as examples; 4K and 64K are also valid but the post doesn't claim to be exhaustive.
- The `innodb_checksum_algorithm` default of `crc32` is correct for MySQL 5.7.7+ and 8.0.
- The summary's claim that "a row must fit on a page" is a simplification — with DYNAMIC/COMPRESSED row format, large columns overflow to external BLOB pages. However, the on-page portion of a row does have size limits, so this is acceptable as a high-level statement.
