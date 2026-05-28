# Validation Summary: How to Enable and Configure the AlloyDB Columnar Engine for Analytical Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- AlloyDB columnar engine
- Google Cloud CLI
- PostgreSQL SQL and EXPLAIN

## Sources Consulted
- Google Cloud documentation: About the AlloyDB columnar engine - https://docs.cloud.google.com/alloydb/docs/columnar-engine/about
- Google Cloud documentation: Configure the columnar engine - https://docs.cloud.google.com/alloydb/docs/columnar-engine/configure
- Google Cloud documentation: Columnar engine flags - https://docs.cloud.google.com/alloydb/docs/reference/columnar-engine-flags
- Google Cloud documentation: Manage column store content using auto-columnarization - https://docs.cloud.google.com/alloydb/docs/columnar-engine/manage-content-recommendations
- Google Cloud documentation: Manage column store content manually - https://docs.cloud.google.com/alloydb/docs/columnar-engine/manage-content-manually
- Google Cloud documentation: Monitor the columnar engine - https://docs.cloud.google.com/alloydb/docs/columnar-engine/monitor-tune
- Google Cloud SDK reference: gcloud alloydb instances update - https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/instances/update

## Issues Found
- The post said enabling `google_columnar_engine.enabled` takes effect without restart. Google Cloud documents that setting this flag automatically restarts the instance, so the text was corrected.
- The memory configuration used a non-documented `google_columnar_engine.memory_size_percentage` flag. The post now uses the documented `google_columnar_engine.memory_size_in_mb` flag and explains the default 30% behavior and documented limits.
- The post implied recommended percentage ranges that could exceed Google Cloud's recommended maximum. The guidance was changed to use the default 30% as a starting point and note the 50% recommended maximum and 70% allowed maximum.
- The auto-columnarization section described `g_columnar_recommended_columns` as current column store contents. It now describes that view as recommendations and points readers to `g_columnar_columns` and `g_columnar_relations` for actual column store contents.
- The manual removal example used `google_columnar_engine_remove`, which is not the documented function. It was changed to `google_columnar_engine_drop`.
- The EXPLAIN guidance said to look for `Columnar Scan`. Google Cloud's documented plan node is `Custom Scan (columnar scan)`, so the text was corrected.
- The monitoring section used a non-documented `g_columnar_memory_usage` view and described `g_columnar_stat_statements` as a hit-rate source. It now uses `google_columnar_engine_memory_available()` and describes `g_columnar_stat_statements` as recent query execution statistics.
- The Google Cloud CLI examples did not mention that `--database-flags` replaces the manually configured flag list. A short warning was added so readers preserve existing non-default flags.

## Review Notes
None.
