# Validation Summary: How to Change Column Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- SQL DDL (ALTER TABLE, MODIFY COLUMN, CHANGE COLUMN)
- InnoDB Online DDL (ALGORITHM hints)

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Type Conversion in Expression Evaluation — https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html
- MySQL 8.0 Reference Manual: Numeric Data Type Syntax — https://dev.mysql.com/doc/refman/8.0/en/numeric-type-syntax.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: InnoDB and Online DDL — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl.html

## Issues Found

### 1. Incorrect claim that MySQL converts 'true'/'false' strings to 1/0 during ALTER TABLE (Critical)
**What was wrong:** The Complete Working Example section claimed `'true'/'false' strings will be converted to 1/0 by MySQL` when changing a VARCHAR column to BOOLEAN. This is incorrect — MySQL converts strings to integers by reading leading numeric characters. Since 'true' and 'false' have no leading digits, both convert to 0. This would silently corrupt all `true` values into `false`.

**What was changed:** Added an explicit UPDATE step before the ALTER TABLE to convert 'true'/'false' strings to '1'/'0', with a comment explaining why MySQL cannot do this automatically. Removed the incorrect comment.

### 2. Incorrect ALGORITHM=INSTANT suggestion for data type changes (Moderate)
**What was wrong:** The Algorithm Considerations section suggested using `ALGORITHM=INSTANT` for MODIFY COLUMN data type changes. MySQL's INSTANT algorithm does NOT support changing column data types — it only supports metadata-only operations (adding columns, changing defaults, etc.). The section also implied INPLACE works for general data type changes, but most data type changes require `ALGORITHM=COPY`.

**What was changed:** Rewrote the section to accurately explain that most data type changes require `ALGORITHM=COPY`. Noted the one exception: extending VARCHAR within the same length-prefix group (both ≤ 255 or both > 255 bytes) can use `ALGORITHM=INPLACE, LOCK=NONE`. Updated the code examples accordingly.

## Review Notes
- The post correctly notes that strict SQL mode is the default since MySQL 5.7, and accurately describes truncation behavior for VARCHAR narrowing.
- The claim "Increasing VARCHAR length is safe and fast (metadata-only in most cases)" on line 69 is slightly imprecise — it is only metadata-only when staying within the same length-prefix group (≤ 255 or > 255). Crossing the 255-byte boundary requires a table rebuild. The "in most cases" qualifier makes this acceptable but not perfectly precise.
- The REGEXP syntax used in the sanitization query is correct for both MySQL 5.x (Henry Spencer regex) and MySQL 8.0+ (ICU regex).
- All other SQL syntax, ALTER TABLE usage, and best practices are accurate.
