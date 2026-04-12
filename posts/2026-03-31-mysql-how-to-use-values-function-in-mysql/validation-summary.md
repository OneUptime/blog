# Validation Summary: How to Use VALUES() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (5.7, 8.0, 8.0.20+)
- SQL INSERT ... ON DUPLICATE KEY UPDATE
- VALUES() function (deprecated in 8.0.20)
- Row alias syntax (MySQL 8.0.20+ replacement)
- REPLACE INTO statement
- ROW_COUNT() function

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE Statement (https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html)
- MySQL 8.0 Reference Manual: INSERT Statement (https://dev.mysql.com/doc/refman/8.0/en/insert.html)
- MySQL 8.0 Reference Manual: REPLACE Statement (https://dev.mysql.com/doc/refman/8.0/en/replace.html)
- MySQL 8.0 Reference Manual: Information Functions - ROW_COUNT() (https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count)
- MySQL 8.0 Reference Manual: Data Type Default Values (https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes the MySQL 8.0.20 deprecation and provides both legacy and modern syntax for each example, which is good practice.
- The INSERT...SELECT example in the final section uses the deprecated VALUES(stock) syntax. This is appropriate since the row alias syntax (`AS alias_name`) attaches to the VALUES clause and does not directly apply to INSERT...SELECT. The post does not claim otherwise.
- The ROW_COUNT() return values (1 for insert, 2 for update, 0 for no change) are accurate per MySQL documentation. This is a commonly misunderstood behavior worth highlighting.
- The REPLACE vs ON DUPLICATE KEY UPDATE comparison is accurate: REPLACE performs DELETE + INSERT which can cascade foreign key deletes and allocate new auto-increment values.
- `DEFAULT NOW()` is valid for DATETIME columns as MySQL recognizes NOW() as a synonym for CURRENT_TIMESTAMP in the column default context.
