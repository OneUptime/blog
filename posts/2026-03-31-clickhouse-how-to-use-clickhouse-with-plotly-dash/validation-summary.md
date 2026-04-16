# Validation Summary: How to Use ClickHouse with Plotly Dash

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Plotly Dash (Python web framework)
- clickhouse-connect (official ClickHouse Python driver)
- pandas
- Plotly Express
- Gunicorn (WSGI server)
- functools.lru_cache (standard library caching)

## Sources Consulted
- Plotly Dash documentation: https://dash.plotly.com/
- Dash `app.run` / `run_server` API: https://dash.plotly.com/reference
- `dcc.Dropdown`, `dcc.Graph`, `dcc.DatePickerRange` reference: https://dash.plotly.com/dash-core-components
- clickhouse-connect documentation: https://clickhouse.com/docs/en/integrations/python
- clickhouse-connect `query()` method and parameter binding: https://clickhouse.com/docs/en/integrations/python#parameters-argument
- ClickHouse HTTP interface (port 8123): https://clickhouse.com/docs/en/interfaces/http
- Gunicorn deployment for Dash: https://dash.plotly.com/deployment
- Plotly Express reference: https://plotly.com/python-api-reference/plotly.express.html
- Python functools.lru_cache: https://docs.python.org/3/library/functools.html#functools.lru_cache

## Issues Found
- The "Deploying with Gunicorn" section uses `gunicorn app:server`, but the `app.py` example did not expose `server = app.server`. Without that line, Gunicorn cannot import the Flask WSGI server from the Dash app. Added `server = app.server` right after `app = dash.Dash(__name__)` in the basic app example so the subsequent Gunicorn command works without modification.

## Review Notes
- `app.run(debug=True)` is current for Dash 2.17+ (May 2024); older `app.run_server()` still works as an alias.
- clickhouse-connect's `query()` method accepts `parameters=` with the `%(name)s` client-side substitution style shown in the post; the server-side `{name:Type}` style is also valid but not required.
- Port 8123 is the correct default HTTP interface for ClickHouse.
- `@lru_cache` on `cached_query` caches based on the `sql_key` string argument; pandas DataFrames not being hashable is not a concern here because only the argument (not the return value) needs to be hashable.
- Minor stylistic note (not a technical error): for production deployments with frequently changing data, the `lru_cache` approach has no TTL — consider `cachetools.TTLCache` if stale results become an issue.
