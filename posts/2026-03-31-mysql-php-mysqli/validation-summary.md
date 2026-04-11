# Validation Summary: How to Use MySQL with PHP MySQLi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PHP (8.1+)
- MySQLi extension
- MySQL

## Sources Consulted
- PHP official documentation for MySQLi: https://www.php.net/manual/en/book.mysqli.php
- PHP `mysqli::__construct`: https://www.php.net/manual/en/mysqli.construct.php
- PHP `mysqli_stmt::bind_param`: https://www.php.net/manual/en/mysqli-stmt.bind-param.php
- PHP `mysqli::begin_transaction`: https://www.php.net/manual/en/mysqli.begin-transaction.php
- PHP `mysqli_report` and error mode defaults: https://www.php.net/manual/en/function.mysqli-report.php
- PHP 8.1 migration guide (MySQLi default error mode change): https://www.php.net/manual/en/migration81.incompatible.php

## Issues Found
No technical issues found.

## Review Notes
- The prepared statements examples bind parameters before assigning values to the variables (`bind_param()` is called before `$email` and `$status` are assigned). This is technically correct because `bind_param()` binds by reference — PHP creates the variables at bind time and `execute()` reads their current values. However, this is an unconventional ordering that may confuse beginners. Assigning values before calling `bind_param()` would be more conventional and easier to follow.
- The transaction example uses a try/catch pattern that relies on MySQLi throwing exceptions on query failure. This works correctly in PHP 8.1+ where the default error reporting mode was changed to `MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT`. In PHP versions prior to 8.1 (which are now all EOL), `query()` would silently return `false` without throwing, so the catch block would never trigger. Since PHP 8.1+ is the current supported range, this is correct for modern PHP.
- The OO connection example checks `$mysqli->connect_error` after constructing the object. In PHP 8.1+, the constructor throws `mysqli_sql_exception` on failure, making this check redundant. The check is not harmful and is still a widely used defensive pattern, so it does not warrant a fix.
