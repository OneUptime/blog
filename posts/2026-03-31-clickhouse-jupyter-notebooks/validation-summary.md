# Validation Summary: How to Use ClickHouse with Jupyter Notebooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (analytical database)
- Jupyter Notebook
- Python
- `clickhouse-connect` (official ClickHouse Python client)
- pandas
- matplotlib
- seaborn
- SQLAlchemy / `clickhouse-sqlalchemy`
- JupySQL (formerly ipython-sql) `%sql` magic

## Sources Consulted
- ClickHouse Python integration docs: https://clickhouse.com/docs/integrations/python
- `clickhouse-connect` source (driver/client.py) for `get_client`, `server_version`, `query_df`, and parameterized query syntax
- `clickhouse-sqlalchemy` README (xzkostyan/clickhouse-sqlalchemy) — confirms `clickhouse+http://` dialect
- `ipython-sql` README (catherinedevlin/ipython-sql) — project now directs users to JupySQL
- JupySQL docs / Ploomber (maintained fork of ipython-sql)

## Issues Found
- The "Magic Commands" section recommended `ipython-sql`, which the official project README now marks as superseded: "IPython-SQL's functionality and maintenance have been eclipsed by JupySQL, a fork maintained and developed by the Ploomber team." I updated the section heading and the `pip install` command to use `jupysql` instead. The `%load_ext sql` and `%sql` / `%%sql` magic syntax is identical between the two packages, so the downstream code cells remain correct without further changes.

## Review Notes
- `clickhouse_connect.get_client(host=..., port=8123, username="default", password="")` matches the official API; 8123 is the correct default HTTP port.
- `client.server_version` is a real attribute populated at client initialization.
- `client.query_df()` returning a pandas DataFrame is documented and accurate.
- Parameterized query syntax `{name:String}` paired with `parameters={"name": value}` is the documented style for `clickhouse-connect`.
- `clickhouse+http://` is a supported SQLAlchemy dialect in `clickhouse-sqlalchemy` alongside `clickhouse+native://`.
- All matplotlib / seaborn / pandas code is syntactically correct and uses current (non-deprecated) APIs.
- Minor future caveat: `seaborn.barplot` will eventually require explicit `hue` to assign distinct colors per category under newer seaborn releases, but the current call remains valid.
