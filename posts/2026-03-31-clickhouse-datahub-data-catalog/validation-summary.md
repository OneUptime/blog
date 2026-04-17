# Validation Summary: How to Use ClickHouse with Datahub for Data Catalog

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse
- DataHub (acryl-datahub)
- DataHub CLI
- YAML ingestion recipes
- cron scheduling
- ClickHouse `system.query_log`

## Sources Consulted
- DataHub ClickHouse ingestion source docs: https://docs.datahub.com/docs/generated/ingestion/sources/clickhouse
- DataHub CLI reference: https://docs.datahub.com/docs/cli/
- ClickHouse `system.query_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found
1. **Invalid config field `include_column_lineage`** in the ClickHouse ingestion recipe. The DataHub ClickHouse source does not expose this field; the correct field is `include_view_column_lineage`. Replaced in the recipe.
2. **Nonexistent CLI command `datahub dataset add-owner`** with `--urn`/`--owner` flags. The `datahub dataset` subcommand group supports `get`/`upsert`/etc., but there is no flag-based `add-owner` command. Removed.
3. **Incorrect `datahub dataset upsert` invocation.** The command does not accept `--urn`, `--description`, or `--tags` flags; it is file-based (`-f <yaml>`). Replaced with a correct YAML-based example and the proper `datahub dataset upsert -f orders_dataset.yml` call.
4. **Invalid `column_tag_mapping` key** in the ClickHouse ingestion recipe. This is not a config field exposed by the DataHub ClickHouse source. Replaced with a correct dataset-upsert YAML snippet that applies tags at the schema-field level.

## Review Notes
- The ClickHouse `system.query_log` SELECT example is syntactically valid and uses correct fields (`query`, `databases`, `tables`, `type`, `query_start_time`) with valid `has()` array function and `INTERVAL` syntax.
- The URN format `urn:li:dataset:(urn:li:dataPlatform:clickhouse,analytics.orders,PROD)` is correct DataHub URN syntax.
- The pip extras install `pip install 'acryl-datahub[clickhouse]'` is correct.
- The dataset YAML schema format is based on DataHub's current dataset YAML convention; exact field availability may vary by DataHub version, but the structure shown is consistent with the official upsert flow. Readers should consult their installed DataHub version's CLI help for the precise YAML fields supported.
