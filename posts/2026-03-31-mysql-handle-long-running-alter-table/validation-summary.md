# Validation Summary: How to Handle Long-Running ALTER TABLE Operations in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB, ALTER TABLE, Performance Schema, information_schema.PROCESSLIST)
- Percona Toolkit (pt-online-schema-change)
- gh-ost (referenced but not demonstrated)
- MySQL replication monitoring (SHOW REPLICA STATUS)
- cron scheduling

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE and Online DDL (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- MySQL 8.0 Reference Manual: Performance Schema Stage Event Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-stage-tables.html)
- MySQL 8.0 Reference Manual: information_schema.PROCESSLIST (https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html)
- MySQL 8.0 Reference Manual: lock_wait_timeout (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_lock_wait_timeout)
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS (https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html)
- Percona Toolkit Documentation: pt-online-schema-change (https://docs.percona.com/percona-toolkit/pt-online-schema-change.html)
- MySQL 8.0 Reference Manual: mysql client options (https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html)

## Issues Found

### Issue 1: Invalid pt-online-schema-change flags (`--database` and `--table`)
- **What was wrong:** The pt-online-schema-change command used `--database=myapp` and `--table=events` as separate flags. `--table` is not a valid option for pt-online-schema-change; the database and table must be specified via the DSN positional argument (e.g., `D=myapp,t=events`). While `--database` technically exists as a connection option, `--table` does not, so the command as written would fail.
- **What was changed:** Removed `--database=myapp` and `--table=events` flags and added `D=myapp,t=events` as the DSN positional argument at the end of the command.
- **Why:** The Percona Toolkit documentation specifies the synopsis as `pt-online-schema-change [OPTIONS] DSN`, where the DSN must include `D=database,t=table`.

### Issue 2: Cron job uses interactive password prompt (`-p`)
- **What was wrong:** The cron example used `mysql -u root -p myapp -e "..."`. The `-p` flag (with a space before the next argument) causes mysql to prompt for a password interactively. In a cron context, there is no terminal for the prompt, so the command would hang or fail silently.
- **What was changed:** Replaced `-u root -p` with `--defaults-file=/root/.my.cnf` to use a MySQL options file for credentials, which is the standard approach for non-interactive/automated MySQL connections.
- **Why:** Non-interactive environments like cron cannot handle password prompts. Using `--defaults-file` is the recommended secure approach for automated scripts.

## Review Notes
- The Performance Schema monitoring query requires that the `events_stages_current` consumer and the `stage/innodb/alter%` instruments are enabled. By default in some MySQL configurations, these may be disabled. The post could mention this prerequisite in a future update.
- The `SHOW REPLICA STATUS` syntax and `Seconds_Behind_Source` field are MySQL 8.0.22+ terminology. Older versions use `SHOW SLAVE STATUS` and `Seconds_Behind_Master`. The post doesn't specify a version, but the modern syntax is appropriate.
- The pt-osc example includes `--password=secret` on the command line, which is insecure (visible in process lists and shell history). In production, `--ask-pass` or a defaults file would be preferred. This is a security best practice rather than a technical error.
