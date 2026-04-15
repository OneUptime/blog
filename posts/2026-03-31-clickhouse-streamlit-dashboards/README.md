# How to Build Real-Time Dashboards with ClickHouse and Streamlit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Streamlit, Python, Dashboard, Real-Time, Analytics

Description: Learn how to build real-time analytical dashboards in Python using Streamlit and ClickHouse, with live query execution, auto-refresh, and interactive filters.

---

> Streamlit's Python-native approach lets you build interactive ClickHouse dashboards without writing HTML or JavaScript, with auto-refresh for real-time monitoring.

Streamlit turns Python scripts into interactive web applications in minutes. Combined with ClickHouse's millisecond query performance, you can build real-time analytics dashboards that display live data, respond to user filters, and refresh automatically. This guide covers setting up the connection, building common chart types, implementing auto-refresh, and deploying the dashboard.

---

## Installing Dependencies

Install the required Python packages.

```bash
pip install streamlit clickhouse-connect plotly pandas altair

# Verify the installation
python -c "import streamlit, clickhouse_connect, plotly; print('OK')"

# Check version
streamlit --version
```

## Setting Up the ClickHouse Connection

Create a reusable connection using Streamlit's caching.

```python
# clickhouse_utils.py
import streamlit as st
import clickhouse_connect
from clickhouse_connect.driver.client import Client

@st.cache_resource
def get_clickhouse_client() -> Client:
    """Return a cached ClickHouse client."""
    return clickhouse_connect.get_client(
        host     = st.secrets["clickhouse"]["host"],
        port     = st.secrets["clickhouse"]["port"],
        username = st.secrets["clickhouse"]["username"],
        password = st.secrets["clickhouse"]["password"],
        database = st.secrets["clickhouse"]["database"],
        compress = True,
        settings = {
            "max_execution_time":  30,
            "use_query_cache":     1,
            "query_cache_ttl":     60
        }
    )


def run_query(sql: str) -> "pd.DataFrame":
    """Execute a ClickHouse query and return a DataFrame."""
    import pandas as pd
    client = get_clickhouse_client()
    result = client.query(sql)
    return pd.DataFrame(result.result_rows, columns=result.column_names)
```

```toml
# .streamlit/secrets.toml
[clickhouse]
host     = "localhost"
port     = 8123
username = "streamlit_user"
password = "streamlit_password"
database = "analytics"
```

## Creating the ClickHouse Tables

Build tables with fresh data for the dashboard.

```sql
CREATE TABLE analytics.realtime_events
(
    ts          DateTime DEFAULT now(),
    service     LowCardinality(String),
    endpoint    LowCardinality(String),
    method      LowCardinality(String),
    status_code UInt16,
    duration_ms Float32,
    user_id     UInt64,
    country     LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (service, endpoint, ts)
TTL ts + INTERVAL 7 DAY;

-- Populate with recent data
INSERT INTO analytics.realtime_events
SELECT
    now() - (number % 3600)                                           AS ts,
    ['api','web','mobile','worker'][1 + number % 4]                   AS service,
    ['/users','/orders','/products','/search','/checkout'][1 + number % 5] AS endpoint,
    ['GET','POST','PUT','DELETE'][1 + number % 4]                     AS method,
    [200, 200, 200, 201, 400, 404, 500][1 + number % 7]               AS status_code,
    round(randCanonical() * 2000, 1)                                  AS duration_ms,
    number % 10000                                                    AS user_id,
    ['US','UK','DE','FR','CA'][1 + number % 5]                        AS country
FROM numbers(100000);
```

## Building the Main Dashboard

Create the Streamlit app with interactive controls.

```python
# app.py
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import time
from clickhouse_utils import run_query

# Page configuration
st.set_page_config(
    page_title="ClickHouse Real-Time Dashboard",
    page_icon="ch",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("Real-Time Service Dashboard")

# Sidebar controls
st.sidebar.header("Filters")

time_range = st.sidebar.selectbox(
    "Time range",
    options=["Last 15 minutes", "Last 1 hour", "Last 6 hours", "Last 24 hours"],
    index=1
)

time_map = {
    "Last 15 minutes": "15 MINUTE",
    "Last 1 hour":     "1 HOUR",
    "Last 6 hours":    "6 HOUR",
    "Last 24 hours":   "24 HOUR"
}
interval = time_map[time_range]

services = run_query(
    f"SELECT DISTINCT service FROM analytics.realtime_events "
    f"WHERE ts >= now() - INTERVAL {interval} ORDER BY service"
)["service"].tolist()

selected_services = st.sidebar.multiselect(
    "Services",
    options=services,
    default=services
)

auto_refresh = st.sidebar.checkbox("Auto-refresh (30s)", value=True)

service_filter = (
    "AND service IN (" +
    ",".join(f"'{s}'" for s in selected_services) + ")"
    if selected_services else ""
)
```

## KPI Scorecards

Display key metrics at the top of the dashboard.

```python
# KPI row
col1, col2, col3, col4 = st.columns(4)

kpis = run_query(f"""
    SELECT
        count()                                AS total_requests,
        round(avg(duration_ms), 1)             AS avg_latency,
        round(countIf(status_code >= 500)
              / count() * 100, 2)              AS error_rate,
        count(DISTINCT user_id)                AS unique_users
    FROM analytics.realtime_events
    WHERE ts >= now() - INTERVAL {interval}
    {service_filter}
""")

row = kpis.iloc[0]

col1.metric(
    "Total Requests",
    f"{int(row['total_requests']):,}",
    delta=None
)
col2.metric(
    "Avg Latency (ms)",
    f"{row['avg_latency']:.1f}",
    delta=None
)
col3.metric(
    "Error Rate",
    f"{row['error_rate']:.2f}%",
    delta=None
)
col4.metric(
    "Unique Users",
    f"{int(row['unique_users']):,}",
    delta=None
)
```

## Time-Series Chart

Plot request volume and latency over time.

```python
# Time-series requests
ts_data = run_query(f"""
    SELECT
        toStartOfMinute(ts)                           AS minute,
        service,
        count()                                       AS requests,
        round(quantile(0.95)(duration_ms), 1)         AS p95_latency
    FROM analytics.realtime_events
    WHERE ts >= now() - INTERVAL {interval}
    {service_filter}
    GROUP BY minute, service
    ORDER BY minute
""")

col_left, col_right = st.columns(2)

with col_left:
    st.subheader("Request Volume by Service")
    fig = px.line(
        ts_data,
        x="minute",
        y="requests",
        color="service",
        template="plotly_dark",
        labels={"minute": "Time", "requests": "Requests/min"}
    )
    fig.update_layout(height=350, margin=dict(t=10, b=10))
    st.plotly_chart(fig, use_container_width=True)

with col_right:
    st.subheader("P95 Latency by Service")
    fig = px.line(
        ts_data,
        x="minute",
        y="p95_latency",
        color="service",
        template="plotly_dark",
        labels={"minute": "Time", "p95_latency": "P95 latency (ms)"}
    )
    fig.update_layout(height=350, margin=dict(t=10, b=10))
    st.plotly_chart(fig, use_container_width=True)
```

## Error Rate and Status Code Distribution

Show HTTP status breakdown in real time.

```python
status_data = run_query(f"""
    SELECT
        toString(intDiv(status_code, 100) * 100) AS status_class,
        count() AS requests
    FROM analytics.realtime_events
    WHERE ts >= now() - INTERVAL {interval}
    {service_filter}
    GROUP BY status_class
    ORDER BY status_class
""")

col_a, col_b = st.columns(2)

with col_a:
    st.subheader("Status Code Distribution")
    fig = px.pie(
        status_data,
        names="status_class",
        values="requests",
        color="status_class",
        color_discrete_map={
            "200": "#2ecc71",
            "300": "#3498db",
            "400": "#f39c12",
            "500": "#e74c3c"
        },
        template="plotly_dark"
    )
    fig.update_layout(height=300)
    st.plotly_chart(fig, use_container_width=True)

with col_b:
    st.subheader("Top Slow Endpoints")
    slow = run_query(f"""
        SELECT
            endpoint,
            round(quantile(0.99)(duration_ms), 1) AS p99_ms,
            count() AS requests
        FROM analytics.realtime_events
        WHERE ts >= now() - INTERVAL {interval}
        {service_filter}
        GROUP BY endpoint
        ORDER BY p99_ms DESC
        LIMIT 10
    """)
    st.dataframe(
        slow,
        use_container_width=True,
        hide_index=True
    )
```

## Auto-Refresh Logic

Implement the auto-refresh loop.

```python
# Auto-refresh
if auto_refresh:
    time.sleep(30)
    st.rerun()
```

## Deploying the Dashboard

Run and deploy the Streamlit app.

```bash
# Run locally
streamlit run app.py --server.port 8501

# Run with a specific ClickHouse secrets file
streamlit run app.py \
  --server.port 8501 \
  --server.headless true
```

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8501

HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health || exit 1

ENTRYPOINT ["streamlit", "run", "app.py", \
  "--server.port=8501", \
  "--server.address=0.0.0.0", \
  "--server.headless=true"]
```

```text
# requirements.txt contents
streamlit>=1.32.0
clickhouse-connect>=0.7.0
plotly>=5.18.0
pandas>=2.0.0
altair>=5.0.0
```

## Summary

Streamlit and ClickHouse form a powerful combination for real-time analytical dashboards built entirely in Python. Use `@st.cache_resource` to maintain a persistent ClickHouse connection, `@st.cache_data(ttl=60)` to cache query results, and `st.rerun()` for auto-refresh. Build KPI scorecards with `st.metric`, time-series charts with Plotly Express, and data tables with `st.dataframe`. Deploy using Docker with the ClickHouse credentials stored in `.streamlit/secrets.toml` or environment variables. ClickHouse's sub-second query performance ensures that even complex aggregations return fast enough for interactive, live-refreshing dashboards.
