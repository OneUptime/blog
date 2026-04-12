# Validation Summary: How to Use FETCH FIRST N ROWS in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL (LIMIT/OFFSET pagination)
- SQL:2008 standard (FETCH FIRST N ROWS ONLY) — for comparison

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: LIMIT Query Optimization — https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html
- MySQL Bug #78929: Support for FETCH FIRST (SQL:2008) — https://bugs.mysql.com/bug.php?id=78929
- MySQL 8.0 Reference Manual: User-Defined Variables — https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual: PREPARE Statement — https://dev.mysql.com/doc/refman/8.0/en/prepare.html

## Issues Found

1. **CRITICAL: MySQL 8.0 does not support FETCH FIRST / FETCH NEXT syntax.** The original post claimed MySQL 8.0 added support for the SQL standard `FETCH FIRST` / `FETCH NEXT` syntax. This is false. MySQL 8.0 only supports `LIMIT` and `OFFSET` for result set limiting. The SQL:2008 `FETCH FIRST N ROWS ONLY` syntax is supported by PostgreSQL, Oracle, DB2, and SQL Server, but not MySQL. All SQL examples using `FETCH FIRST`, `FETCH NEXT`, `OFFSET N ROWS FETCH NEXT M ROWS ONLY` were replaced with equivalent `LIMIT`/`OFFSET` syntax. The title was also updated to reflect the actual MySQL syntax.

2. **CRITICAL: MySQL 8.0 does not support WITH TIES.** The original post claimed MySQL 8.0.4+ supports `WITH TIES`. This is false since MySQL does not support `FETCH FIRST` at all. The section was rewritten to show how to emulate `WITH TIES` behavior using window functions (`RANK()`) which MySQL 8.0 does support.

3. **User variables cannot be used directly in LIMIT/OFFSET.** The original post used `LIMIT @page_size OFFSET @offset` in a regular query. The MySQL documentation states that LIMIT requires nonnegative integer constants, except within prepared statements (using `?` placeholders) or stored programs (using local variables). The practical pagination example was rewritten to use a prepared statement correctly.

4. **Invalid parameter placeholder syntax.** The original post used `:last_seen_id` in the keyset pagination example, which is not MySQL syntax. MySQL uses `@var` for user variables or `?` for prepared statement parameters. Changed to `@last_seen_id`.

5. **Incorrect version claim.** The "Checking Compatibility" section claimed `FETCH FIRST requires MySQL 8.0.4 or later`. Since FETCH FIRST is not supported in any MySQL version, this section was removed.

## Review Notes
- The SQL:2008 `FETCH FIRST` syntax has an open MySQL feature request (Bug #78929, filed October 2015, status "Verified") but was never implemented as of MySQL 8.0.x, 8.4.x, or 9.x.
- MariaDB 10.6+ does support `OFFSET ... FETCH` syntax, which may be a source of confusion since MariaDB is a MySQL fork.
- The post's overall structure and pedagogical approach (basic syntax, pagination, performance considerations) is sound — only the specific syntax needed correction.
