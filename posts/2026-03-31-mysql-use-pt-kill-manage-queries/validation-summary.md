# Validation Summary: How to Use pt-kill to Manage MySQL Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Percona Toolkit (pt-kill)
- MySQL processlist monitoring
- MySQL query management and termination

## Sources Consulted
- Percona Toolkit official documentation for pt-kill (https://docs.percona.com/percona-toolkit/pt-kill.html)
- Percona Toolkit special option types documentation (for `time` type defaults)

## Issues Found

1. **`--run-time=1` description was inaccurate (line 126)**: The post stated "`--run-time=1` makes pt-kill check once and exit." In reality, `--run-time` specifies how many seconds pt-kill should run before exiting (it is a `time` type option defaulting to seconds). `--run-time=1` means "run for 1 second then exit," not "perform exactly one check." Fixed the description to accurately explain the time-based behavior.

2. **`--log` example missing `--daemonize` (lines 130-139)**: The `--log` option only captures output when pt-kill is running as a daemon (with `--daemonize`). The original example omitted `--daemonize`, so `--log` would have had no effect. Added `--daemonize` to the example and a clarifying note.

## Review Notes
- All `--match-*` and `--ignore-*` options accept Perl regexes, not plain strings. The post correctly notes this for `--match-info` but does not mention it for `--match-user`, `--match-db`, or `--ignore-user`. This is technically fine since literal strings work as regex patterns, but users should be aware that special regex characters in usernames or database names would need escaping.
- For structured audit logging of killed queries (e.g., to a database table), `--log-dsn` may be more appropriate than `--log`. The post does not mention this option but is not incorrect in its current scope.
