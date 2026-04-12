# Validation Summary: How to Add a Column Without Downtime in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB, Online DDL, INSTANT algorithm)
- ALTER TABLE with ALGORITHM=INPLACE and ALGORITHM=INSTANT
- pt-online-schema-change (Percona Toolkit)
- gh-ost (GitHub Online Schema Migration Tool)
- MySQL stored procedures (REPEAT loop, ROW_COUNT, SLEEP)

## Sources Consulted
- MySQL 8.0 Reference Manual: Online DDL Operations (https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)
- MySQL 8.0 Reference Manual: ALTER TABLE (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- MySQL 8.0.12 Release Notes — ALGORITHM=INSTANT support for ADD COLUMN
- Percona Toolkit pt-online-schema-change documentation (https://docs.percona.com/percona-toolkit/pt-online-schema-change.html)
- gh-ost documentation (https://github.com/github/gh-ost)
- Other validated posts in this blog repository covering pt-osc, gh-ost, and INSTANT DDL

## Issues Found

### Issue 1: Strategy 2 used ALGORITHM=INPLACE but described INSTANT behavior
- **What was wrong:** The code example used `ALGORITHM=INPLACE, LOCK=NONE` but the accompanying text claimed the operation is "instant even for billion-row tables." ALGORITHM=INPLACE still requires a table rebuild; only ALGORITHM=INSTANT (available since MySQL 8.0.12) performs a metadata-only change without rewriting rows.
- **What was changed:** Updated the SQL to use `ALGORITHM=INSTANT` (without LOCK clause, since INSTANT operations do not take any lock). Updated the section heading and text to reference "Instant DDL" and specify MySQL 8.0.12+ as the minimum version.
- **Why:** Using ALGORITHM=INPLACE on a billion-row table would take a long time and cause significant I/O, contradicting the "instant" claim. The INSTANT algorithm is the correct choice to match the described behavior.

### Issue 2: pt-online-schema-change used invalid --database and --table flags
- **What was wrong:** The pt-osc command used `--database=myapp` and `--table=events` as named flags. These are not valid pt-online-schema-change options. The tool requires the database and table to be specified via a DSN positional argument.
- **What was changed:** Replaced `--database=myapp` and `--table=events` flags with the DSN positional argument `D=myapp,t=events` at the end of the command.
- **Why:** Running the original command would produce an error because pt-online-schema-change does not recognize `--database` or `--table` as command-line options. The DSN format (`D=database,t=table`) is the documented and correct way to specify the target.

## Review Notes
- Strategy 1 uses ALGORITHM=INPLACE for adding a nullable column, which is correct and works across MySQL 5.6+. For MySQL 8.0.12+, ALGORITHM=INSTANT could also be used here and would be faster, but the post appropriately positions this as a general-purpose strategy.
- The stored procedure for backfilling is syntactically correct and uses proper MySQL constructs (ROW_COUNT(), DO SLEEP(), REPEAT...UNTIL).
- The gh-ost command syntax is correct with all valid flags.
- The backward-compatible deploy order (schema first, then application code, then backfill) is sound advice.
