# Validation Summary: How to Use pt-stalk for MySQL Diagnostics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Percona Toolkit (pt-stalk, pt-sift)
- Linux OS diagnostic tools (vmstat, iostat, netstat, ps, df, top)

## Sources Consulted
- Percona Toolkit official documentation for pt-stalk: https://docs.percona.com/percona-toolkit/pt-stalk.html
- Percona Toolkit official documentation for pt-sift: https://docs.percona.com/percona-toolkit/pt-sift.html
- Percona Toolkit source code on GitHub: https://github.com/percona/percona-toolkit/blob/3.x/bin/pt-stalk

## Issues Found

### 1. Incorrect output file naming format
- **What was wrong:** The blog post used ISO 8601 format with hyphens, `T` separator, and colons for pt-stalk output filenames (e.g., `2026-03-31T10:45:01-processlist`). pt-stalk actually converts all hyphens and colons to underscores via `tr ':-' '_'`, producing filenames like `2026_03_31_10_45_01-processlist`.
- **What was changed:** Updated all six example filenames in the directory listing, the `cat` command for reviewing InnoDB status, and the `pt-sift` command to use the correct underscore format.
- **Why:** Readers following the examples would not find the files at the paths shown, and colons in filenames are problematic on many filesystems.

### 2. Incorrect claim about binary log collection
- **What was wrong:** The "What Data pt-stalk Collects" section listed "Binary log information" as one of the items collected. Review of the pt-stalk source code shows that pt-stalk does not run `SHOW BINARY LOGS` or `SHOW BINLOG EVENTS` during collection.
- **What was changed:** Removed "Binary log information" from the collected data list.
- **Why:** This claim is not supported by the tool's actual behavior and could mislead readers expecting to find binary log data in the output.

## Review Notes
- The blog uses `nohup ... &` to run pt-stalk as a background process. pt-stalk has a native `--daemonize` option that achieves the same result more idiomatically. This is not incorrect but could be noted as an alternative.
- The `Innodb_row_lock_waits` example uses a cumulative counter with a fixed threshold. Once this counter exceeds the threshold, it will stay above it permanently, causing pt-stalk to trigger on every cycle. This works but is better suited for gauge-type metrics like `Threads_running`. Not changed since the command is technically valid.
- The post correctly notes the `SHOW REPLICA STATUS` alias available in MySQL 8.0 (specifically 8.0.22+).
- All pt-stalk command-line options used in the post (`--function`, `--variable`, `--threshold`, `--cycles`, `--dest`, `--host`, `--user`, `--password`, `--log`) are verified as correct per official documentation.
