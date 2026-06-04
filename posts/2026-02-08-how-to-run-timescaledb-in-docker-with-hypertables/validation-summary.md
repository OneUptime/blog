# Validation Summary: How to Run TimescaleDB in Docker with Hypertables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- TimescaleDB
- PostgreSQL
- Hypertables
- Continuous aggregates
- Data retention policies
- Hypercore columnstore compression
- Python psycopg2

## Sources Consulted
- TimescaleDB Docker image documentation: https://github.com/timescale/timescaledb-docker
- TimescaleDB Docker Hub image page: https://hub.docker.com/r/timescale/timescaledb/
- Tiger Data Docker installation docs: https://www.tigerdata.com/docs/self-hosted/latest/install/installation-docker
- Tiger Data create_hypertable API docs: https://www.tigerdata.com/docs/api/latest/hypertable/create_hypertable
- Tiger Data continuous aggregates docs: https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/create-a-continuous-aggregate
- Tiger Data data retention policy docs: https://docs.tigerdata.com/api/latest/data-retention/add_retention_policy/
- Tiger Data Hypercore add_columnstore_policy docs: https://docs.tigerdata.com/api/latest/hypercore/add_columnstore_policy/
- Tiger Data Hypercore ALTER TABLE docs: https://docs.tigerdata.com/api/latest/hypercore/alter_table/
- Tiger Data time_bucket API docs: https://docs.tigerdata.com/api/latest/hyperfunctions/time_bucket/
- Tiger Data TimescaleDB configuration docs: https://www.tigerdata.com/docs/self-hosted/latest/configuration/about-configuration
- Docker Compose file version docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy resources docs: https://docs.docker.com/reference/compose-file/deploy/
- PostgreSQL Docker official image configuration docs: https://hub.docker.com/_/postgres
- PostgreSQL pg_dump / pg_restore docs: https://www.postgresql.org/docs/current/app-pgdump.html and https://www.postgresql.org/docs/current/app-pgrestore.html

## Issues Found
- The post described the Docker image as having the TimescaleDB extension already enabled. The image has the extension installed, but `CREATE EXTENSION` is still needed per database, so the wording was corrected.
- The Compose example used the obsolete top-level `version` field. Removed it to match the current Compose Specification.
- The Compose example mounted `./init.sql` even though the guide did not create that file, which could break a copy-pasted setup. Removed the mount.
- The telemetry environment variable was commented as preloading TimescaleDB. Corrected the comment to describe telemetry.
- The hypertable example used the old `create_hypertable('table', 'time', chunk_time_interval => ...)` interface. Updated it to the current `by_range` API.
- The retention policy example used a positional interval argument. Updated it to the documented `drop_after => INTERVAL '90 days'` form.
- The compression example used the old compression API. Updated it to Hypercore columnstore settings and `add_columnstore_policy`.
- The custom PostgreSQL configuration was mounted to a path PostgreSQL would not read automatically. Updated the Compose snippet to pass `config_file` explicitly and added required `listen_addresses` and `shared_preload_libraries` settings.
- The introduction called the Docker setup "production-grade" too broadly. Adjusted the wording and added production caveats for backups and high availability.

## Review Notes
The remaining examples are technically valid for the PostgreSQL 16 based TimescaleDB image tag used in the post. For production deployments, pinning an exact TimescaleDB image version instead of `latest-pg16` would be safer, but the tag itself is valid and the article explicitly frames it as a practical setup guide.
