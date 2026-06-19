# Validation Summary: How to Fix 'Duplicate Entry' Primary Key Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- MySQL
- SQL
- Primary keys and unique indexes
- AUTO_INCREMENT
- INSERT IGNORE, INSERT ... ON DUPLICATE KEY UPDATE, and REPLACE

## Sources Consulted
- MySQL Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE Statement - https://dev.mysql.com/doc/refman/9.7/en/insert-on-duplicate.html
- MySQL Reference Manual: INSERT Statement and IGNORE behavior - https://dev.mysql.com/doc/refman/9.7/en/insert.html
- MySQL Reference Manual: ALTER TABLE Statement and AUTO_INCREMENT reset behavior - https://dev.mysql.com/doc/refman/8.4/en/alter-table.html
- MySQL Reference Manual: SHOW TABLE STATUS Statement - https://dev.mysql.com/doc/refman/8.4/en/show-table-status.html
- MySQL Reference Manual: REPLACE Statement - https://dev.mysql.com/doc/refman/8.4/en/replace.html
- MySQL Reference Manual: Compound Statement Syntax - https://dev.mysql.com/doc/refman/8.4/en/sql-compound-statements.html
- MySQL 8.0.20 Release Notes: VALUES() deprecation in ON DUPLICATE KEY UPDATE - https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html

## Issues Found
- The post used the deprecated `VALUES()` function in several `ON DUPLICATE KEY UPDATE` examples. MySQL deprecated this usage in 8.0.20 and recommends row or column aliases instead. Updated the examples to use the MySQL 8.0.19+ row alias syntax.
- The REPLACE comparison said "REPLACE resets auto-generated values and triggers," which was misleading. Updated it to say REPLACE can reset unspecified auto-generated values and fires DELETE/INSERT triggers.
- The check-then-insert example used `IF ... THEN ... END IF` syntax in a standalone SQL-looking snippet. MySQL compound flow-control statements are for stored programs, so the snippet is now labeled as pseudocode.
- The unique-index comment said "if not exists" while the statement itself does not perform an existence check. Clarified the comment to say to add the index if one does not already exist.

## Review Notes
The remaining examples are technically sound for modern MySQL usage. `INSERT IGNORE` intentionally converts duplicate-key errors into warnings and skips offending rows, and `ALTER TABLE ... AUTO_INCREMENT = 1` is valid because MySQL resets the counter to the current maximum AUTO_INCREMENT column value plus one when the supplied value is too low.
