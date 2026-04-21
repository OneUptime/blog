# Validation Summary: How to Deploy TimescaleDB via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Portainer
- Docker Compose
- TimescaleDB
- PostgreSQL
- pgAdmin
- Grafana
- Python
- psycopg2

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/version-and-name/
- TimescaleDB Docker image documentation: https://github.com/timescale/timescaledb-docker
- TimescaleDB Docker installation documentation: https://docs.timescale.com/self-hosted/latest/install/installation-docker/
- TimescaleDB `create_hypertable()` API: https://www.tigerdata.com/docs/api/latest/hypertable/create_hypertable
- TimescaleDB continuous aggregates documentation: https://docs.timescale.com/use-timescale/latest/continuous-aggregates/about-continuous-aggregates/
- TimescaleDB `add_continuous_aggregate_policy()` API: https://www.tigerdata.com/docs/api/latest/continuous-aggregates/add_continuous_aggregate_policy
- TimescaleDB data retention documentation: https://www.tigerdata.com/docs/use-timescale/latest/data-retention/create-a-retention-policy
- TimescaleDB Hypercore / columnstore `ALTER TABLE` API: https://www.tigerdata.com/docs/api/latest/hypercore/alter_table
- TimescaleDB `add_columnstore_policy()` API: https://docs.tigerdata.com/api/latest/hypercore/add_columnstore_policy/
- TimescaleDB `convert_to_columnstore()` API: https://docs.tigerdata.com/api/latest/hypercore/convert_to_columnstore/
- Grafana Docker image configuration: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Grafana Simple JSON plugin page: https://grafana.com/grafana/plugins/grafana-simple-json-datasource/
- pgAdmin container deployment documentation: https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html
- PostgreSQL GRANT documentation: https://www.postgresql.org/docs/current/sql-grant.html
- psycopg2 usage documentation: https://www.psycopg.org/docs/usage.html

## Issues Found
- Removed the obsolete Docker Compose `version: "3.8"` key. Current Compose uses the latest schema and warns that the top-level `version` field is obsolete.
- Removed `POSTGRES_TUNE_SHARED_BUFFERS`, which is not a documented TimescaleDB/PostgreSQL Docker environment variable. The Compose example already sets PostgreSQL tuning through the `postgres -c` command arguments.
- Updated Grafana plugin installation to use `GF_PLUGINS_PREINSTALL`, the current Docker environment variable, and removed `grafana-simple-json-datasource` because Grafana marks that plugin as deprecated, no longer maintained, and past EOL.
- Updated `create_hypertable()` calls from the old string-column interface to the current `by_range()` API.
- Added schema and table grants for `appuser`. `GRANT ALL PRIVILEGES ON DATABASE` does not grant privileges on the tables that the Python example inserts into.
- Replaced the manual `compress_chunk()` example with a chunk-listing query in Step 4 because compression was shown before compression settings were enabled, and `compress_chunk()` has been replaced by the current columnstore API.
- Updated Step 5 from old TimescaleDB compression APIs (`timescaledb.compress`, `add_compression_policy()`, `chunk_compression_stats()`) to current Hypercore/columnstore APIs (`timescaledb.enable_columnstore`, `add_columnstore_policy()`, `chunk_columnstore_stats()`).

## Review Notes
- The post still uses floating `latest` image tags. That is valid for a practical guide, but pinning exact image versions would make production deployments more reproducible.
- The TimescaleDB image is pinned to PostgreSQL 15 via `latest-pg15`; current TimescaleDB docs also show PostgreSQL 17-based images. PostgreSQL 15 remains usable, but readers should choose a tag that matches their supported PostgreSQL target.
- Relative bind mounts such as `./init.sql` and `./grafana/provisioning` require those files/directories to exist on the Docker host or in the Git-backed stack context used by Portainer.
