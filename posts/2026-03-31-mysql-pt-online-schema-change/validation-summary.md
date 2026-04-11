# Validation Summary: What Is pt-online-schema-change for MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7 and 8.0)
- Percona Toolkit (pt-online-schema-change)
- gh-ost (mentioned for comparison)
- Ubuntu/Debian package management

## Sources Consulted
- Percona Toolkit official documentation for pt-online-schema-change: https://docs.percona.com/percona-toolkit/pt-online-schema-change.html
- MySQL 8.0 Reference Manual on ALTER TABLE and online DDL: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL documentation on INSERT ... SELECT syntax: https://dev.mysql.com/doc/refman/8.0/en/insert-select.html
- MySQL documentation on SELECT ... INTO syntax: https://dev.mysql.com/doc/refman/8.0/en/select-into.html
- gh-ost documentation: https://github.com/github/gh-ost

## Issues Found

### Issue 1: Incorrect SQL terminology in "How It Works" step 3
- **What was wrong:** Step 3 stated rows are copied using a `SELECT ... INTO` loop. In MySQL, `SELECT ... INTO` is used for assigning values to variables or writing to an outfile, not for copying data between tables.
- **What was changed:** Corrected to `INSERT ... SELECT`, which is the actual mechanism pt-osc uses (`INSERT LOW_PRIORITY IGNORE INTO _tablename_new ... SELECT ... FROM tablename`).
- **Why:** The original phrasing described a different SQL operation entirely and could mislead readers about how the tool works internally.

### Issue 2: Invalid CLI options in Basic Usage example
- **What was wrong:** The Basic Usage example used `--database=myapp` and `--table=users` as separate command-line options. pt-online-schema-change does not accept `--database` or `--table` flags. The database and table must be specified via the DSN (Data Source Name) positional argument.
- **What was changed:** Replaced `--database=myapp` and `--table=users` with `D=myapp,t=users` as a positional argument, which is the correct DSN syntax (as already used correctly in the other examples in the post).
- **Why:** Running the original command would produce an error because `--database` and `--table` are unrecognized options.

## Review Notes
- The `--check-slave-lag` option used in the Replication Awareness example was renamed to `--check-replica-lag` in Percona Toolkit 3.3.0+, but the old name still works as an alias. Both are valid.
- The Overview section slightly simplifies MySQL's ALTER TABLE locking behavior (MySQL 5.6+ supports online DDL for many operations), but the simplification is reasonable for the context of explaining why pt-osc exists.
- The Percona Toolkit download URL references version 3.5.7 which is a specific point-in-time version; readers should check for the latest version.
