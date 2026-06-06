# Validation Summary: How to Install TimescaleDB on PostgreSQL

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- TimescaleDB (2.x extension)
- PostgreSQL (13-16)
- Ubuntu / Debian (apt)
- CentOS / RHEL / Rocky Linux (dnf/yum)
- macOS (Homebrew)
- Docker / Docker Compose
- SQL (hypertables, continuous aggregates, compression, retention policies)
- `timescaledb-tune` CLI
- `pg_stat_statements` extension

## Sources Consulted
- TimescaleDB self-hosted Linux install docs: https://www.tigerdata.com/docs/self-hosted/latest/install/installation-linux
- `timescaledb_information.jobs` view reference: https://www.tigerdata.com/docs/api/latest/informational-views/jobs
- `timescaledb_information.job_stats` view reference: https://www.tigerdata.com/docs/api/latest/informational-views/job_stats
- `hypertable_detailed_size()` API reference: https://www.tigerdata.com/docs/api/latest/hypertable/hypertable_detailed_size
- `chunk_compression_stats()` API reference (via timescale/docs GitHub repo): https://github.com/timescale/docs/blob/latest/api/compression/chunk_compression_stats.md
- TimescaleDB views source (`sql/views.sql`): https://github.com/timescale/timescaledb/blob/main/sql/views.sql
- Debian/Ubuntu GPG keyring guidance (replacement for deprecated `apt-key add`)

## Issues Found

1. **Deprecated `apt-key add` for repository signing key.** The Ubuntu/Debian "Step 1" used `wget ... | sudo apt-key add -`, which has been deprecated in modern Debian/Ubuntu releases. Replaced with the keyring-file approach recommended by the official docs: `wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/timescaledb.gpg`. Also removed the misleading "Add the TimescaleDB repository GPG key" comment that preceded the unrelated `apt-get update`/install line.

2. **Non-existent function `timescaledb_information.version()`.** The post called this in two places ("View detailed version information" and "View recommended settings based on your system"). This function/view does not exist in the `timescaledb_information` schema (confirmed against the upstream `sql/views.sql`). Replaced with valid queries: `SELECT * FROM pg_extension WHERE extname = 'timescaledb';` and a query against `pg_available_extensions`.

3. **`hypertable_detailed_size()` returned columns were wrong.** The post selected `hypertable_name`, `total_bytes`, `num_chunks` from `hypertable_detailed_size('sensor_data')`. The function actually returns only `table_bytes`, `index_bytes`, `toast_bytes`, `total_bytes`, `node_name`. Rewrote the query to select the real columns and added a separate `COUNT(*)` query against `timescaledb_information.chunks` to obtain `num_chunks`.

4. **`chunk_compression_stats()` does not return `compression_ratio`.** The post selected a non-existent `compression_ratio` column. Replaced with a computed `CASE` expression that derives the ratio from `before_compression_total_bytes` and `after_compression_total_bytes`.

5. **`timescaledb_information.jobs` does not expose `last_run_status` or `last_run_started_at`.** Those columns live in `timescaledb_information.job_stats`. Rewrote the "View background job status" query to join `jobs` with `job_stats USING (job_id)` so the run-status fields come from the correct view.

## Review Notes
- The post's Prerequisites lists PostgreSQL 13-16 as supported. TimescaleDB has since added PostgreSQL 17 support (TimescaleDB 2.17+), and the upstream docs currently recommend `timescaledb-2-postgresql-18`. The 13-16 range is still accurate (not wrong) but will look conservative over time. Left as-is to avoid scope creep.
- The Homebrew install path (`brew tap timescale/tap`, `brew install timescaledb`, `timescaledb_move.sh`) matches the historical official guidance. Tigerdata's macOS install instructions move around frequently and the page didn't resolve at the time of review; not modified.
- The Docker Compose snippet uses `version: '3.8'`, which is now considered obsolete by recent Docker Compose CLIs (warning, not error). Left as-is since it's still functional.
- `drop_chunks(..., OLDER_THAN => INTERVAL '90 days')` works because PostgreSQL named-argument identifiers are case-insensitive (lowercase `older_than` is the canonical name). No fix needed.
- The Mermaid edge label `convert_to_hypertable` is descriptive, not a real function name (the actual function is `create_hypertable`). Left as-is since it's labeled as a conceptual transition rather than a code reference.
