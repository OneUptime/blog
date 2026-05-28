# Validation Summary: How to Configure AlloyDB Columnar Engine for Analytical Query Acceleration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- AlloyDB columnar engine
- Google Cloud CLI (`gcloud alloydb`)
- PostgreSQL SQL and `EXPLAIN`

## Sources Consulted
- Google Cloud: About the AlloyDB columnar engine, https://docs.cloud.google.com/alloydb/docs/columnar-engine/about
- Google Cloud: Configure the columnar engine, https://docs.cloud.google.com/alloydb/docs/columnar-engine/configure
- Google Cloud: Columnar engine flags, https://docs.cloud.google.com/alloydb/docs/reference/columnar-engine-flags
- Google Cloud: Manage column store content using auto-columnarization, https://docs.cloud.google.com/alloydb/docs/columnar-engine/manage-content-recommendations
- Google Cloud: Manage column store content manually, https://docs.cloud.google.com/alloydb/docs/columnar-engine/manage-content-manually
- Google Cloud: Monitor the columnar engine, https://docs.cloud.google.com/alloydb/docs/columnar-engine/monitor-tune
- Google Cloud SDK: `gcloud alloydb clusters create`, https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create
- Google Cloud SDK: `gcloud alloydb instances create`, https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/instances/create

## Issues Found
- The post used the non-existent `google_columnar_engine.memory_size_in_bytes` flag. Changed examples to the documented `google_columnar_engine.memory_size_in_mb` flag and converted byte values to MiB values.
- The post used non-existent memory functions such as `google_columnar_engine_memory_used_bytes()` and `google_columnar_engine_memory_size_bytes()`. Replaced these with `google_columnar_engine_memory_available()` and the configured `memory_size_in_mb` setting.
- The post referenced `google_columnar_engine_recommended_columns`, which is not the documented recommendation view. Replaced it with `g_columnar_recommended_columns` and documented columns.
- The post referenced `google_columnar_engine_column_stats`, which is not the documented monitoring view. Replaced it with `g_columnar_columns`.
- The post showed `SET google_columnar_engine.scan_cost_threshold`, but no current AlloyDB columnar engine flag by that name is documented. Replaced it with the documented `google_columnar_engine.enable_columnar_scan` flag.
- The benchmarking example used `SET google_columnar_engine.enabled = off` for a session-level comparison, but `google_columnar_engine.enabled` is an instance flag that restarts the instance. Updated the instructions to use `google_columnar_engine.enable_columnar_scan` on a test instance for comparison.
- The post omitted restart behavior for enabling the columnar engine and changing memory size. Added a short note that these flag changes restart the instance.
- The post implied columns added with SQL functions are persistent manual configuration. Added the documented caveat that SQL-function additions are node-local and do not persist across instance restarts.

## Review Notes
The `gcloud alloydb` command shapes and required flags were consistent with current Google Cloud SDK documentation. When updating database flags on existing AlloyDB instances, operators should preserve any existing database flags they still need because `--database-flags` updates the instance flag set.
