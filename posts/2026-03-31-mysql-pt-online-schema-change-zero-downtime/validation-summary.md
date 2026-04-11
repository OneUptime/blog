# Validation Summary: How to Use pt-online-schema-change for Zero-Downtime Schema Changes in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Percona Toolkit (pt-online-schema-change)
- Linux package managers (apt-get, yum)

## Sources Consulted
- Percona Toolkit official documentation for pt-online-schema-change: https://docs.percona.com/percona-toolkit/pt-online-schema-change.html
- Percona Toolkit DSN specification: https://docs.percona.com/percona-toolkit/dsn_data_source_name_specifications.html
- Percona Toolkit installation guide: https://docs.percona.com/percona-toolkit/installation.html

## Issues Found

### 1. Invalid CPAN installation method
- **What was wrong:** The post listed `cpan Percona::Toolkit` as an installation method. There is no `Percona::Toolkit` CPAN distribution. Percona Toolkit is not distributed via CPAN.
- **What was changed:** Replaced the CPAN installation line with a reference to download directly from the Percona website.
- **Why:** Running `cpan Percona::Toolkit` would fail with a "module not found" error since this module does not exist on CPAN.

### 2. `--database` and `--table` used as CLI options (all 6 command examples)
- **What was wrong:** All command examples used `--database=myapp` and `--table=tablename` as command-line options. These are not valid CLI options for `pt-online-schema-change`. The tool requires a DSN (Data Source Name) string as a positional argument to specify the database and table.
- **What was changed:** Replaced `--database=X --table=Y` with the correct DSN format `D=X,t=Y` as the last positional argument in all six examples.
- **Why:** Using `--database` and `--table` would cause the tool to fail with an unrecognized option error. The correct syntax uses DSN keys: `D` for database and `t` for table, passed as a positional argument (e.g., `D=myapp,t=users`). Other connection parameters like `--host`, `--user`, and `--password` are valid CLI options and were left unchanged.

## Review Notes
- The explanation of how pt-osc works (shadow table, triggers, chunk copying, atomic rename) is accurate.
- All `--alter` SQL syntax is correct for the respective operations.
- Options `--chunk-size`, `--sleep`, `--max-lag`, `--check-interval`, `--alter-foreign-keys-method`, `--dry-run`, and `--execute` are all valid and correctly described.
- The "Critical Limitations" section accurately describes the primary key requirement, foreign key constraint handling, and trigger conflict issue.
- Specifying `--password` on the command line exposes it in process listings; production usage should prefer `--ask-pass` or a defaults file. This is a best-practice consideration, not a technical error, so it was not changed.
