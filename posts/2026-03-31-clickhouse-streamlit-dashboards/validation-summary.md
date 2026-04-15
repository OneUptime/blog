# Validation Summary: How to Build Real-Time Dashboards with ClickHouse and Streamlit

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, DDL, aggregation functions, query cache)
- Streamlit (>=1.32.0, caching, widgets, plotly_chart, dataframe, rerun)
- clickhouse-connect Python driver (>=0.7.0)
- Plotly Express (line charts, pie charts)
- Pandas (DataFrames)
- Docker (containerized deployment)

## Sources Consulted
- clickhouse-connect Python library source code (`clickhouse_connect.driver.query.QueryResult` class) — verified `result_rows` property and `column_names` instance attribute exist
- ClickHouse documentation for SQL syntax: `MergeTree`, `LowCardinality`, `toYYYYMMDD`, `toStartOfMinute`, `quantile`, `countIf`, `intDiv`, `randCanonical`, `numbers()` table function, array indexing, TTL, query cache settings
- Streamlit API reference for `@st.cache_resource`, `st.rerun()`, `st.set_page_config()`, `st.metric()`, `st.plotly_chart()`, `st.dataframe(hide_index=True)`, `st.sidebar.multiselect()`
- Docker Hub `python:3.12-slim` image contents — confirmed `curl` is NOT included in the slim variant

## Issues Found

1. **Dockerfile HEALTHCHECK fails due to missing `curl`**: The Dockerfile uses `python:3.12-slim` as the base image and runs `HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health`. However, `python:3.12-slim` (based on `debian:bookworm-slim`) does not include `curl`. Added `RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*` before the pip install step.

2. **Incorrect code fence language for requirements.txt**: The requirements.txt contents were wrapped in a ` ```yaml ` code fence, but requirements.txt is a plain text pip format, not YAML. Changed to ` ```text `.

## Review Notes
- The auto-refresh pattern (`time.sleep(30)` + `st.rerun()`) works but blocks the page for 30 seconds during the sleep, making it unresponsive to user interactions. Newer Streamlit versions (1.33+) offer `st.fragment(run_every=...)` as a non-blocking alternative. This is a UX consideration, not a bug.
- The service filter construction uses f-string interpolation with user-selected values directly in SQL. Since the multiselect constrains choices to values fetched from the database, this is safe in practice, but parameterized queries would be more robust in production.
- The sample data generator (`number % 3600`) only creates ~1 hour of data, so the "Last 6 hours" and "Last 24 hours" filters will show the same results as "Last 1 hour". This is fine for a tutorial but could be noted for readers who copy the setup.
- `page_icon="ch"` is a plain string rather than an emoji or image path. Streamlit accepts this but it won't render as a recognizable favicon — a minor cosmetic detail.
