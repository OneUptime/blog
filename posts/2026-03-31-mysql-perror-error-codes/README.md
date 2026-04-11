# How to Use perror to Look Up MySQL Error Codes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error, Command Line, Troubleshooting

Description: Learn how to use the perror utility to translate MySQL and operating system error codes into human-readable descriptions for faster troubleshooting.

---

## What Is perror?

`perror` is a MySQL command-line utility that decodes numeric error codes into descriptive error messages. When MySQL logs show error numbers like `1045` or OS errors like `ERRNO 28`, `perror` lets you quickly find out what they mean without searching the documentation.

Note: The `--ndb` option for `perror` was removed in MySQL 8.0.13 and replaced by the separate `ndb_perror` utility for NDB Cluster error codes. The `perror` utility itself remains available in MySQL 8.0, 8.4, and later versions for looking up MySQL server and OS error codes.

## Basic Syntax

```bash
perror [options] error_code [error_code ...]
```

## Looking Up MySQL Error Codes

```bash
# Look up error 1045 (Access denied)
perror 1045
```

```text
MySQL error code MY-001045 (ER_ACCESS_DENIED_ERROR):
Access denied for user '%s'@'%s' (using password: %s)
```

```bash
# Look up multiple errors at once
perror 1045 1064 1213
```

```text
MySQL error code MY-001045 (ER_ACCESS_DENIED_ERROR):
Access denied for user '%s'@'%s' (using password: %s)

MySQL error code MY-001064 (ER_PARSE_ERROR):
You have an error in your SQL syntax...

MySQL error code MY-001213 (ER_LOCK_DEADLOCK):
Deadlock found when trying to get lock; try restarting transaction
```

## Looking Up OS Error Codes

```bash
# Look up OS error 28 (No space left on device)
perror 28
```

```text
OS error code  28: No space left on device
```

Common OS errors encountered in MySQL:

```bash
perror 13   # Permission denied
perror 24   # Too many open files
perror 28   # No space left on device
perror 32   # Broken pipe
perror 111  # Connection refused
```

## MySQL Error Reference Documentation

For a complete list of MySQL error codes and messages, consult the official MySQL Error Message Reference:

```text
https://dev.mysql.com/doc/mysql-errors/8.0/en/
```

This is useful when you need to look up error codes on a system where `perror` is not installed, or when you need additional context such as the SQL state code.

## Looking Up Errors from the mysql Client

Within a MySQL session, you can retrieve the last error:

```sql
-- Show the last error number and message
SHOW ERRORS;

-- Show warnings alongside errors
SHOW WARNINGS;

-- Check error occurrence statistics (MySQL 8.0+)
-- This table tracks how often each error has occurred, not the error message text
SELECT ERROR_NUMBER, ERROR_NAME, SQL_STATE, SUM_ERROR_RAISED
FROM performance_schema.events_errors_summary_global_by_error
WHERE ERROR_NUMBER = 1213;
```

## Common MySQL Error Codes Reference

```text
1005  - Can't create table (check foreign key constraints)
1045  - Access denied (wrong user/password)
1046  - No database selected
1054  - Unknown column
1062  - Duplicate entry (unique key violation)
1064  - SQL syntax error
1146  - Table does not exist
1213  - Deadlock detected
1215  - Cannot add foreign key constraint
1292  - Incorrect datetime value
1366  - Incorrect integer value
2003  - Cannot connect to MySQL server
2006  - MySQL server has gone away
```

## Using perror in Scripts

```bash
#!/bin/bash
# Decode error codes from a MySQL error log
grep "Got error" /var/log/mysql/error.log | \
  grep -oP '\d+' | \
  sort -u | \
  while read code; do
    echo "Error $code: $(perror $code 2>/dev/null | tail -1)"
  done
```

## Summary

`perror` is a simple but useful tool for translating numeric MySQL and OS error codes into human-readable messages. When you encounter an unfamiliar error number in logs or application output, run `perror <code>` to understand what MySQL is reporting. The same information is also accessible via the [MySQL Error Message Reference](https://dev.mysql.com/doc/mysql-errors/8.0/en/) documentation.
