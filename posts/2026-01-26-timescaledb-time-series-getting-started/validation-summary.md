# Validation Summary: How to Get Started with TimescaleDB for Time-Series Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- TimescaleDB
- PostgreSQL
- Docker
- Ubuntu/Debian package installation
- SQL
- Python
- psycopg2
- psutil
- Flask

## Sources Consulted
- TimescaleDB self-hosted installation docs: https://docs.timescale.com/self-hosted/latest/install/
- TimescaleDB create_hypertable() docs: https://docs2.tigerdata.com/docs/reference/timescaledb/hypertables/create_hypertable
- TimescaleDB create_hypertable() old interface docs: https://docs2.tigerdata.com/docs/reference/timescaledb/hypertables/create_hypertable_old
- TimescaleDB continuous aggregate policy docs: https://docs.timescale.com/api/latest/continuous-aggregates/add_continuous_aggregate_policy/
- TimescaleDB retention policy docs: https://docs.timescale.com/use-timescale/latest/data-retention/create-a-retention-policy/
- TimescaleDB hypercore columnstore policy docs: https://docs2.tigerdata.com/docs/reference/timescaledb/hypercore/add_columnstore_policy
- TimescaleDB hypertable_detailed_size() docs: https://docs.timescale.com/api/latest/hypertable/hypertable_detailed_size/
- TimescaleDB chunk_columnstore_stats() docs: https://www.tigerdata.com/docs/reference/timescaledb/hypercore/chunk_columnstore_stats
- TimescaleDB timescaledb_information.hypertables docs: https://docs.timescale.com/api/latest/informational-views/hypertables/
- TimescaleDB timescaledb_information.chunks docs: https://docs.timescale.com/api/latest/informational-views/chunks/
- TimescaleDB first() docs: https://docs.timescale.com/api/latest/hyperfunctions/first/

## Issues Found
- The Ubuntu/Debian install snippet used `apt-key`, which is deprecated for current Ubuntu releases. Updated it to install the TimescaleDB GPG key with `gpg --dearmor` and added the PostgreSQL PGDG setup script plus the matching PostgreSQL 16 client package.
- The `psql` connection command was inside a SQL code fence. Split it into a Bash snippet for the command and a SQL snippet for `CREATE EXTENSION`.
- The hypertable examples used the old `create_hypertable('table', 'time')` interface, which TimescaleDB deprecated in 2.13. Updated the examples to the current `by_range(...)` interface.
- The `disk_io` column was documented as MB/s, but the Python example stores cumulative bytes converted to MB from `psutil.disk_io_counters()`. Updated the schema comment and Python comment to say cumulative MB.
- A CPU anomaly query claimed to find periods over 90% for more than 5 minutes, but the SQL only finds 5-minute buckets with average CPU over 90%. Updated the comment to match the query behavior.
- The compression examples used the old compression API superseded by hypercore/columnstore APIs. Updated the section to use `timescaledb.enable_columnstore`, `timescaledb.segmentby`, `timescaledb.orderby`, `add_columnstore_policy`, and `chunk_columnstore_stats`.
- The hypertable size query selected `hypertable_name` and `num_chunks` from `hypertable_detailed_size()`, but that function returns only size fields and `node_name`. Updated the query to combine `timescaledb_information.hypertables` with `hypertable_detailed_size()`.
- The final compression status query selected columns that do not exist in `timescaledb_information.chunk_compression_settings`. Updated it to use `chunk_columnstore_stats('server_metrics')`.

## Review Notes
- The Docker example uses a PostgreSQL 16 TimescaleDB image, while the current TimescaleDB docs show PostgreSQL 18 examples. PostgreSQL 16 remains a plausible supported target for the article, so the version was left unchanged.
- The Flask example accepts a user-provided interval string and passes it as a query parameter. This avoids SQL injection, but production code should still validate allowed intervals to return cleaner API errors.
