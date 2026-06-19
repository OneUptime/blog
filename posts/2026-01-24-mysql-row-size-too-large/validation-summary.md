# Validation Summary: How to Fix 'Row Size Too Large' Errors in MySQL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- MySQL
- InnoDB
- SQL
- MySQL Connector/Python
- MySQL server configuration

## Sources Consulted
- MySQL Reference Manual: Limits on Table Column Count and Row Size - https://dev.mysql.com/doc/refman/9.7/en/column-count-limit.html
- MySQL Reference Manual: InnoDB Row Formats - https://dev.mysql.com/doc/refman/9.1/en/innodb-row-format.html
- MySQL Reference Manual: Data Type Storage Requirements - https://dev.mysql.com/doc/refman/9.7/en/storage-requirements.html
- MySQL 5.7 Reference Manual: Enabling File Formats - https://dev.mysql.com/doc/refman/5.7/en/innodb-file-format-enabling.html
- MySQL WorkLog WL#7704: InnoDB remove deprecated file format parameters in 8.0 - https://dev.mysql.com/worklog/task/?id=7704

## Issues Found
- The post described InnoDB as having a maximum row size of approximately 65,535 bytes. MySQL has a 65,535-byte internal row size limit, but InnoDB's local row limit is smaller and depends on page size. Updated the wording to distinguish the server-level limit from the InnoDB page-local limit.
- The page layout explanation stated that InnoDB's maximum row size is about half the page size. That is true for 4KB, 8KB, 16KB, and 32KB pages, but 64KB pages are limited to slightly less than 16KB. Added the 64KB caveat.
- The row-format table implied DYNAMIC always stores large values as a 20-byte pointer and that COMPRESSED has the same approximate inline limit as DYNAMIC. Updated the wording to reflect that off-page storage depends on row size, page size, and row format, and that COMPRESSED also depends on compression/key block behavior.
- The row-format table stated that VARCHAR values are always inline for REDUNDANT and COMPACT row formats. MySQL documents that these formats store a 768-byte prefix for off-page variable-length values, including VARCHAR. Updated the table accordingly.
- The VARCHAR-to-TEXT section stated that VARCHAR columns are stored inline while TEXT columns overflow. Updated it to the more accurate reason for conversion: large VARCHAR columns count toward MySQL's 65,535-byte row-size limit by declared maximum length, while TEXT columns count as a small pointer and can overflow.
- The row-size estimator used 8 bytes for DATETIME. Current MySQL versions use 5 bytes for DATETIME without fractional seconds, plus 0-3 bytes for fractional seconds. Updated the estimator comments and values.
- The diagnostics section showed `SHOW VARIABLES LIKE 'innodb_file_format'` as a general InnoDB setting. That variable is deprecated in MySQL 5.7 and removed in MySQL 8.0. Moved it under a version-specific comment.
- The page-size configuration note said the option must be set before creating the database. InnoDB page size must be set before initializing the MySQL data directory. Updated the note and added the 64KB row-limit caveat.
- The quick-reference estimator used 768 bytes for TEXT/BLOB without noting row-format assumptions. Added a comment that this is the COMPACT/REDUNDANT inline prefix.

## Review Notes
The SQL and Python examples are illustrative and syntactically reasonable, but production tooling should quote generated identifiers and account for each column's actual character set, nullable overhead, fractional-second precision, and row format.
