# Validation Summary: How to Import a TSV File into MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LOAD DATA INFILE, LOAD DATA LOCAL INFILE)
- mysqlimport CLI tool
- TSV (tab-separated value) file format
- Bash (sed for TSV-to-CSV conversion)

## Sources Consulted
- MySQL 8.0 Reference Manual: LOAD DATA Statement — https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual: mysqlimport — https://dev.mysql.com/doc/refman/8.0/en/mysqlimport.html
- MySQL 8.0 Reference Manual: Server System Variables (local_infile) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_local_infile

## Issues Found
No technical issues found.

## Review Notes
- The `sed 's/\t/,/g'` command for TSV-to-CSV conversion is a naive approach that does not handle fields containing commas or quotes. This is acceptable for the scope of the post but readers should be aware it is not a robust conversion for all data.
- The `sed` command with `\t` works with GNU sed (standard on Linux) but not with BSD sed (macOS default). Since MySQL servers typically run on Linux, this is reasonable in context.
- Both `IGNORE N ROWS` and `IGNORE N LINES` are valid syntax in MySQL; the post uses `ROWS` which is correct.
