# Validation Summary: How to Fix 'Cannot Add Foreign Key' Constraint Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- MySQL
- InnoDB
- SQL DDL
- Foreign key constraints
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.4 Reference Manual: FOREIGN KEY Constraints - https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html
- MySQL 8.4 Reference Manual: SHOW ENGINE Statement - https://dev.mysql.com/doc/refman/8.4/en/show-engine.html
- MySQL 8.4 Reference Manual: INFORMATION_SCHEMA COLUMNS Table - https://dev.mysql.com/doc/refman/8.4/en/information-schema-columns-table.html
- MySQL 8.4 Reference Manual: INFORMATION_SCHEMA STATISTICS Table - https://dev.mysql.com/doc/refman/8.4/en/information-schema-statistics-table.html

## Issues Found
- The post said foreign key columns must have identical data types. MySQL requires compatible corresponding types; for fixed-precision types such as INTEGER and DECIMAL, size and sign must match, while string lengths do not need to be identical. Updated the wording to avoid overstating the rule.
- The post said referenced columns only need an index, and its example added a non-unique index. Current MySQL documentation notes that referencing non-unique keys is deprecated and may require `restrict_fk_on_non_standard_key` to be disabled. Updated the guidance and example to prefer a unique index.
- The storage engine section said foreign keys only work with InnoDB. MySQL also documents NDB foreign key support, while MyISAM does not enforce them. Updated the wording to say both tables must use the same foreign-key-capable engine, typically InnoDB.
- The string column section included TEXT as a foreign-key-capable type. MySQL does not support index prefixes on foreign key columns, so BLOB and TEXT columns cannot be used. Updated the wording to focus on VARCHAR and CHAR.
- The collation mismatch example referenced `users(email)` without indexing `email`, so the example would also fail for a missing referenced index. Added a unique key to keep the example focused on the charset/collation mismatch.
- The orphan-row detection and cleanup queries treated `NULL` child foreign key values as violations. MySQL permits `NULL` foreign key values unless the child column is `NOT NULL`. Added `c.parent_id IS NOT NULL` predicates.
- The diagnostic script checked whether the referenced column appeared anywhere in an index, but MySQL requires referenced columns to appear as the first columns of an index in the same order. Added `SEQ_IN_INDEX = 1` for the single-column check.

## Review Notes
The post is now technically accurate for the covered single-column MySQL foreign key troubleshooting cases. Composite foreign keys have additional ordering requirements that are not fully covered by the diagnostic script, but the post does not present the script as a complete composite-key validator.
