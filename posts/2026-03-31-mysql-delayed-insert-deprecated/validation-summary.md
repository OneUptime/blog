# Validation Summary: How to Use DELAYED INSERT in MySQL (Deprecated)

## Status
validated

## Post Type
Tutorial / Reference guide on a deprecated MySQL feature

## Technologies Covered
- MySQL (versions 5.5, 5.6, 5.7, 8.0)
- INSERT DELAYED syntax
- MyISAM, MEMORY, ARCHIVE, BLACKHOLE storage engines
- InnoDB
- Python (pymysql library)

## Sources Consulted
- MySQL 5.7 INSERT DELAYED documentation: https://dev.mysql.com/doc/refman/5.7/en/insert-delayed.html
- MySQL 8.0 INSERT DELAYED documentation: https://dev.mysql.com/doc/refman/8.0/en/insert-delayed.html
- MySQL 8.4 INSERT DELAYED documentation: https://dev.mysql.com/doc/refman/8.4/en/insert-delayed.html
- MySQL Worklog WL#6073 (Remove INSERT DELAYED): https://dev.mysql.com/worklog/task/?id=6073
- MySQL 5.7.0 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/5.7/en/news-5-7-0.html
- MySQL Bug #72367 (deprecation tracking): https://bugs.mysql.com/bug.php?id=72367

## Issues Found

1. **Storage engine support was overstated as "MyISAM-only"**: The post claimed INSERT DELAYED "never worked with InnoDB, NDB, or other storage engines," implying it was exclusive to MyISAM. In fact, INSERT DELAYED worked with MyISAM, MEMORY, ARCHIVE, and BLACKHOLE tables. Fixed the bullet point and summary to list all supported engines.

2. **Incorrect warning code and message for MySQL 5.7+**: The post showed warning code 1287 with the message "'INSERT DELAYED' is deprecated and will be removed in a future release. Please use INSERT (without DELAYED)." The actual warning in MySQL 5.7+ is code 3005 (`ER_WARN_LEGACY_SYNTAX_CONVERTED`) with message "INSERT DELAYED is no longer supported. The statement was converted to INSERT." Fixed the code example.

3. **Contradictory "silently ignored" comment**: The code comment said "DELAYED is silently ignored" while simultaneously showing a warning message. Changed to "DELAYED is ignored with a warning" to match the actual behavior.

4. **"Removed entirely" was misleading**: The post said INSERT DELAYED was "removed entirely in MySQL 5.7," but the syntax is still accepted (just ignored with a warning). Clarified that the functionality was removed while the syntax remains accepted.

5. **LAST_INSERT_ID() claim oversimplified**: The post stated the function "returned 0" which is an oversimplification. The accurate statement is that LAST_INSERT_ID() could not return the AUTO_INCREMENT value because the row was not yet inserted. Reworded for accuracy.

## Review Notes
- The Python write-buffering example is correct and demonstrates a practical pattern, though it lacks error handling for connection failures (acceptable for a blog example).
- The post correctly identifies the deprecation version as MySQL 5.6.6.
- As of MySQL 8.4, the DELAYED keyword still has not been fully removed from the parser grammar, so the syntax continues to be accepted with a warning.
- The LOW_PRIORITY alternative mentioned is accurate but also only applies to table-level locking engines (MyISAM, MEMORY), not InnoDB.
