# Validation Summary: How to Use TINYBLOB Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (TINYBLOB data type, BLOB family)
- Python (mysql-connector-python library)
- SQL (DDL, DML, built-in functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: String Data Types (BLOB and TEXT) — https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL 8.0 Reference Manual: Data Type Storage Requirements — https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual: Limits on Table Column Count and Row Size — https://dev.mysql.com/doc/refman/8.0/en/column-count-limit.html
- MySQL 8.0 Reference Manual: Data Type Default Values — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement (prefix indexes) — https://dev.mysql.com/doc/refman/8.0/en/create-index.html

## Issues Found
1. **Row-size limit claim was incorrect**: The post stated that TINYBLOB "does not count against the 65,535-byte row-size limit." Per MySQL docs, BLOB and TEXT columns contribute 9 to 12 bytes toward the row-size limit (for the pointer/length overhead). Changed to: "only contributes 9 bytes toward the 65,535-byte row-size limit."
2. **Default value claim was outdated**: The comparison table stated that TINYBLOB default values are "Not allowed." Since MySQL 8.0.13, BLOB and TEXT columns can have expression-based defaults (e.g., `DEFAULT (expression)`), though literal defaults are still not permitted. Changed to: "Expression only (MySQL 8.0.13+)."

## Review Notes
- The "Storage location: Off-page" claim in the comparison table is a simplification. With InnoDB COMPACT/REDUNDANT row format, up to 768 bytes of BLOB data can be stored inline. Since TINYBLOB max is 255 bytes, its data may actually be stored entirely inline depending on the InnoDB row format. With DYNAMIC/COMPRESSED row format, small values may still be stored off-page. The table's simplification is acceptable for a tutorial-level post but could be noted in a future revision.
- The Python code examples use `mysql-connector-python`, which is correct and functional. The `bytes()` wrapper in the retrieval example is redundant (BLOB columns already return `bytes` objects) but not harmful.
- All SQL syntax is valid for MySQL 5.6.5+ (DATETIME with DEFAULT CURRENT_TIMESTAMP) and MySQL 8.0+.
