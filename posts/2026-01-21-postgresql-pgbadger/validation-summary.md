# Validation Summary: How to Use pgBadger for PostgreSQL Log Analysis

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- pgBadger
- PostgreSQL server logging configuration
- Cron automation

## Sources Consulted
- pgBadger official documentation: https://pgbadger.darold.net/documentation.html
- pgBadger GitHub README and CLI option reference: https://github.com/darold/pgbadger
- pgBadger GitHub releases: https://github.com/darold/pgbadger/releases
- PostgreSQL 18 logging configuration documentation: https://www.postgresql.org/docs/current/runtime-config-logging.html

## Issues Found
- Removed the `cpan pgBadger` install example because the official pgBadger documentation describes package or source installation for pgBadger itself, while CPAN modules such as `JSON::XS` and `Text::CSV_XS` are optional dependencies for specific output/input formats.
- Updated the source download example from pgBadger `v12.3` to `v13.2`, the current latest release found in the official GitHub releases page at review time.
- Changed incremental report examples from `-o /path/` to `-O /path/` because pgBadger incremental mode requires `--outdir`/`-O`; `-o` is for an output file name.
- Changed the weekly summary cron example to remove `-w`, because `-w` is watch mode for error-style reporting, not a weekly summary mode.
- Changed the JSON output example from `-f json` to `-x json`; `-f` selects the input log format, while `-x` selects the report output format.

## Review Notes
- The PostgreSQL logging settings shown are valid for stderr log collection and pgBadger parsing. In production, `log_min_duration_statement = 0` and `log_temp_files = 0` can create large logs, so thresholds should be chosen based on workload and storage capacity.
