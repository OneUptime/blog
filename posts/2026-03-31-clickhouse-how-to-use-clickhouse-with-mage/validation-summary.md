# Validation Summary: How to Use ClickHouse with Mage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Mage (mage-ai)
- Python
- clickhouse-connect (Python client)
- pandas
- YAML configuration

## Sources Consulted
- Mage official documentation: https://docs.mage.ai/
- Mage ClickHouse integration docs: https://docs.mage.ai/integrations/databases/ClickHouse
- Mage io_config reference: https://docs.mage.ai/production/configuring-production-settings/secrets
- clickhouse-connect Python client docs: https://clickhouse.com/docs/en/integrations/python
- clickhouse-connect source (`QueryResult`, `Client.insert_df`, `Client.query`)
- Mage source for `mage_ai.io.clickhouse.ClickHouse`, `ConfigFileLoader`, and `get_repo_path`

## Issues Found
No technical issues found.

Verified:
- `pip install mage-ai` and `mage start <project_name>` are correct.
- Default Mage UI port is 6789.
- `io_config.yaml` keys (`CLICKHOUSE_DATABASE`, `CLICKHOUSE_HOST`, `CLICKHOUSE_INTERFACE`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_PORT`, `CLICKHOUSE_USERNAME`) and their default values match Mage's documented schema.
- Mage block decorators `@data_loader`, `@transformer`, `@data_exporter` and the `if 'data_loader' not in globals():` guard pattern match Mage's official block template.
- `from mage_ai.io.clickhouse import ClickHouse`, `from mage_ai.settings.repo import get_repo_path`, and `from mage_ai.io.config import ConfigFileLoader` are all valid import paths.
- clickhouse-connect API usage is correct: `clickhouse_connect.get_client(...)`, `client.query(sql).result_rows` / `.column_names`, and `client.insert_df(table, df)`.
- ClickHouse SQL functions `toDate()` and `yesterday()` are valid.

## Review Notes
- The final example wraps `ClickHouse.with_config(loader)` in a `with ... as ch:` context manager. Mage's official docs instead chain the call directly (e.g., `ClickHouse.with_config(ConfigFileLoader(...)).load(query)`). The base `BaseIO` class in Mage does implement `__enter__`/`__exit__`, so the context manager form still works; it is just non-idiomatic compared to Mage's documented usage.
- The final code block reuses `path`, `get_repo_path`, and `ConfigFileLoader` without re-importing them in that snippet. This is fine when treated as a continuation of the earlier block file but would need its own imports if used standalone. Typical for blog-post excerpts.
- `pd.Timestamp.today().date()` captures the runner's local date, which may surprise users running Mage in a different timezone than their data. Not incorrect, just worth noting for production use.
