# How to Use ClickHouse with Plotly Dash

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Plotly, DASH, Python, Data Visualization, Dashboard

Description: Connect Plotly Dash to ClickHouse to build interactive, production-grade analytical dashboards with callbacks and real-time chart updates.

---

Plotly Dash is a Python framework for building analytical web applications. Backed by ClickHouse's fast columnar queries, Dash applications can handle large-scale analytics with smooth, interactive charts.

## Installing Dependencies

```bash
pip install dash plotly clickhouse-connect pandas
```

## Basic Dash App with ClickHouse

Create `app.py`:

```python
import dash
from dash import dcc, html, Input, Output
import plotly.express as px
import clickhouse_connect
import pandas as pd

app = dash.Dash(__name__)
server = app.server

client = clickhouse_connect.get_client(
    host='localhost',
    port=8123,
    username='default',
    password=''
)

app.layout = html.Div([
    html.H1("ClickHouse Analytics"),
    dcc.Dropdown(
        id='metric-selector',
        options=[
            {'label': 'Page Views', 'value': 'views'},
            {'label': 'Unique Users', 'value': 'users'},
        ],
        value='views'
    ),
    dcc.Graph(id='main-chart'),
])

@app.callback(
    Output('main-chart', 'figure'),
    Input('metric-selector', 'value')
)
def update_chart(metric):
    if metric == 'views':
        sql = """
            SELECT toDate(created_at) AS day, count() AS value
            FROM default.page_views
            GROUP BY day ORDER BY day
        """
    else:
        sql = """
            SELECT toDate(created_at) AS day, uniq(user_id) AS value
            FROM default.page_views
            GROUP BY day ORDER BY day
        """
    result = client.query(sql)
    df = pd.DataFrame(result.result_rows, columns=result.column_names)
    return px.line(df, x='day', y='value', title=f'Daily {metric}')

if __name__ == '__main__':
    app.run(debug=True)
```

## Adding Range Sliders

Use `dcc.DatePickerRange` for time window filtering:

```python
dcc.DatePickerRange(
    id='date-range',
    start_date='2024-01-01',
    end_date='2024-12-31'
)
```

```python
@app.callback(
    Output('main-chart', 'figure'),
    Input('date-range', 'start_date'),
    Input('date-range', 'end_date')
)
def filtered_chart(start, end):
    result = client.query("""
        SELECT toDate(created_at) AS day, count() AS views
        FROM default.page_views
        WHERE created_at BETWEEN %(start)s AND %(end)s
        GROUP BY day ORDER BY day
    """, parameters={'start': start, 'end': end})
    df = pd.DataFrame(result.result_rows, columns=result.column_names)
    return px.bar(df, x='day', y='views')
```

## Caching Query Results

Use `dash-extensions` or `functools.lru_cache` to reduce ClickHouse load.

```python
from functools import lru_cache

@lru_cache(maxsize=32)
def cached_query(sql_key):
    result = client.query(sql_key)
    return pd.DataFrame(result.result_rows, columns=result.column_names)
```

## Deploying with Gunicorn

```bash
pip install gunicorn
gunicorn app:server -b 0.0.0.0:8050 -w 4
```

## Summary

Plotly Dash and ClickHouse make a powerful pairing for self-hosted analytical dashboards. Dash's callback system enables interactive filtering without page reloads, and ClickHouse executes aggregation queries over billions of rows in milliseconds, making the experience feel responsive even at scale.
