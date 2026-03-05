# How to Run Panel/Bokeh Data Visualization Apps in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Panel, Bokeh, Data Visualization, Python, Docker Compose, Dashboard

Description: Learn how to deploy interactive Panel and Bokeh data visualization applications using Docker containers

---

Panel and Bokeh are Python libraries for building interactive data visualization applications. Bokeh renders beautiful, interactive charts in the browser using JavaScript, while Panel builds on top of Bokeh to provide a higher-level framework for creating dashboards and data apps. Both libraries include built-in servers that can serve applications to multiple users simultaneously. Docker packages these applications with their dependencies and makes deployment consistent across environments.

This guide covers building and deploying both Bokeh and Panel applications in Docker, from simple charts to production dashboards.

## Bokeh Basics in Docker

Let's start with a simple Bokeh application. First, create the application file:

```python
# app.py - interactive Bokeh scatter plot with hover tooltips
from bokeh.plotting import figure, curdoc
from bokeh.models import ColumnDataSource, HoverTool
from bokeh.layouts import column
import numpy as np

# Generate sample data
np.random.seed(42)
n = 200
x = np.random.randn(n)
y = 2 * x + np.random.randn(n) * 0.5
colors = ["#2196F3" if val > 0 else "#F44336" for val in y]

source = ColumnDataSource(data=dict(x=x, y=y, color=colors))

# Create the plot with interactive hover
p = figure(
    title="Interactive Scatter Plot",
    x_axis_label="Feature X",
    y_axis_label="Feature Y",
    width=800,
    height=500,
    tools="pan,wheel_zoom,box_zoom,reset,save"
)

p.circle("x", "y", source=source, color="color", size=8, alpha=0.6)

hover = HoverTool(tooltips=[("X", "@x{0.2f}"), ("Y", "@y{0.2f}")])
p.add_tools(hover)

# Add to the current document (required for Bokeh server)
curdoc().add_root(column(p))
curdoc().title = "Scatter Plot Dashboard"
```

Now create a Dockerfile:

```dockerfile
# Dockerfile - Bokeh application container
FROM python:3.12-slim

WORKDIR /app

# Install Bokeh and dependencies
RUN pip install --no-cache-dir bokeh numpy pandas

# Copy the application code
COPY app.py .

EXPOSE 5006

# Run the Bokeh server, allowing connections from any origin
CMD ["bokeh", "serve", "app.py", \
     "--address", "0.0.0.0", \
     "--port", "5006", \
     "--allow-websocket-origin", "*"]
```

Build and run it:

```bash
# Build and start the Bokeh application
docker build -t bokeh-app .
docker run -d --name bokeh-app -p 5006:5006 bokeh-app
```

Open http://localhost:5006/app to see the interactive chart.

## Panel Dashboard in Docker

Panel provides a higher-level API for building complete dashboards. Here is a more substantial example:

```python
# dashboard.py - Panel dashboard with multiple interactive widgets
import panel as pn
import pandas as pd
import numpy as np
from bokeh.plotting import figure

pn.extension()

# Generate sample time series data
np.random.seed(42)
dates = pd.date_range("2024-01-01", periods=365, freq="D")
data = pd.DataFrame({
    "date": dates,
    "revenue": np.cumsum(np.random.randn(365) * 100 + 50),
    "users": np.cumsum(np.random.randint(10, 100, 365)),
    "errors": np.random.poisson(5, 365),
})

# Create interactive widgets
date_range = pn.widgets.DateRangeSlider(
    name="Date Range",
    start=dates[0], end=dates[-1],
    value=(dates[0], dates[-1])
)

metric_select = pn.widgets.Select(
    name="Metric",
    options=["revenue", "users", "errors"],
    value="revenue"
)

# Reactive plot that updates when widgets change
@pn.depends(date_range.param.value, metric_select.param.value)
def create_plot(date_range_val, metric):
    mask = (data["date"] >= pd.Timestamp(date_range_val[0])) & \
           (data["date"] <= pd.Timestamp(date_range_val[1]))
    filtered = data[mask]

    p = figure(
        title=f"{metric.title()} Over Time",
        x_axis_type="datetime",
        width=700, height=400
    )
    p.line(filtered["date"], filtered[metric], line_width=2, color="#1976D2")
    p.circle(filtered["date"], filtered[metric], size=3, color="#1976D2")
    return p

# Reactive summary statistics
@pn.depends(date_range.param.value, metric_select.param.value)
def summary_stats(date_range_val, metric):
    mask = (data["date"] >= pd.Timestamp(date_range_val[0])) & \
           (data["date"] <= pd.Timestamp(date_range_val[1]))
    filtered = data[mask]
    stats = filtered[metric].describe()
    return pn.pane.DataFrame(stats.to_frame(), width=300)

# Layout the dashboard
sidebar = pn.Column(
    "## Controls",
    date_range,
    metric_select,
    summary_stats,
    width=320
)

main = pn.Column(
    "# Analytics Dashboard",
    create_plot
)

template = pn.Row(sidebar, main)
template.servable()
```

```dockerfile
# Dockerfile - Panel dashboard with all dependencies
FROM python:3.12-slim

WORKDIR /app

# Install Panel and data processing libraries
RUN pip install --no-cache-dir \
    panel \
    bokeh \
    pandas \
    numpy \
    holoviews \
    hvplot

COPY dashboard.py .

EXPOSE 5006

# Serve the Panel application
CMD ["panel", "serve", "dashboard.py", \
     "--address", "0.0.0.0", \
     "--port", "5006", \
     "--allow-websocket-origin", "*", \
     "--num-procs", "2"]
```

The `--num-procs 2` flag starts two server processes. Each process can handle multiple concurrent users. Scale this based on expected traffic.

## Docker Compose for Multi-App Deployment

When you have multiple dashboards, Docker Compose organizes them:

```yaml
# docker-compose.yml - multiple Panel/Bokeh apps behind a proxy
version: "3.8"

services:
  sales-dashboard:
    build:
      context: ./dashboards/sales
    container_name: sales-dashboard
    ports:
      - "5006:5006"
    volumes:
      - ./data:/app/data
    environment:
      - DB_HOST=postgres
      - DB_NAME=analytics
    restart: unless-stopped

  ops-dashboard:
    build:
      context: ./dashboards/operations
    container_name: ops-dashboard
    ports:
      - "5007:5006"
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  postgres:
    image: postgres:16
    volumes:
      - pg-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: analytics
      POSTGRES_USER: panel
      POSTGRES_PASSWORD: panelpass

volumes:
  pg-data:
```

## Connecting to Live Data Sources

Real dashboards pull from databases and APIs. Here is a Panel app connected to PostgreSQL:

```python
# live_dashboard.py - Panel dashboard with live database queries
import panel as pn
import pandas as pd
import os
from sqlalchemy import create_engine

pn.extension()

# Create database connection using environment variables
db_url = f"postgresql://{os.environ['DB_USER']}:{os.environ['DB_PASS']}" \
         f"@{os.environ['DB_HOST']}:5432/{os.environ['DB_NAME']}"
engine = create_engine(db_url)

# Widget for refreshing data
refresh_btn = pn.widgets.Button(name="Refresh Data", button_type="primary")

@pn.depends(refresh_btn.param.clicks)
def load_data(clicks):
    """Query the database and return a styled table."""
    df = pd.read_sql(
        "SELECT date, region, revenue, orders FROM daily_metrics "
        "ORDER BY date DESC LIMIT 100",
        engine
    )
    return pn.pane.DataFrame(df, width=800)

dashboard = pn.Column("# Live Sales Data", refresh_btn, load_data)
dashboard.servable()
```

## Serving Multiple Apps from One Container

You can serve multiple Bokeh or Panel apps from a single container by organizing them in a directory:

```bash
# Directory structure for multi-app serving
apps/
  sales/
    main.py
  inventory/
    main.py
  metrics/
    main.py
```

```dockerfile
# Dockerfile - serve multiple Panel apps from one container
FROM python:3.12-slim

WORKDIR /app
RUN pip install --no-cache-dir panel bokeh pandas numpy
COPY apps/ /app/apps/

EXPOSE 5006

# Serve all apps in the apps directory
CMD ["panel", "serve", "/app/apps/sales", "/app/apps/inventory", "/app/apps/metrics", \
     "--address", "0.0.0.0", \
     "--port", "5006", \
     "--allow-websocket-origin", "*", \
     "--num-procs", "2"]
```

Each app becomes available at its own URL path: `/sales`, `/inventory`, `/metrics`.

## Authentication with Panel

Panel supports basic authentication out of the box:

```bash
# Run Panel with basic authentication enabled
docker run -d \
  --name panel-secure \
  -p 5006:5006 \
  -v $(pwd)/auth:/app/auth \
  panel-app \
  panel serve dashboard.py \
  --address 0.0.0.0 \
  --port 5006 \
  --allow-websocket-origin "*" \
  --basic-auth /app/auth/credentials.json \
  --cookie-secret mysecretkey123
```

The credentials file is a simple JSON mapping of usernames to passwords:

```json
{
  "admin": "adminpass123",
  "analyst": "analystpass456"
}
```

## Performance Tuning

For dashboards with heavy data processing, consider these optimizations:

- **Cache expensive computations** using `pn.cache` decorator to avoid recomputing on every interaction.
- **Pre-aggregate data** at the database level rather than pulling raw rows.
- **Limit WebSocket origins** in production instead of using the wildcard `*`.
- **Increase `--num-procs`** based on CPU cores available to the container.

```python
# Caching expensive data loads
@pn.cache(ttl=300)  # Cache for 5 minutes
def load_large_dataset():
    """Load and pre-process the dataset once, serve from cache."""
    df = pd.read_parquet("/app/data/large_dataset.parquet")
    return df.groupby("category").agg({"value": "sum"}).reset_index()
```

## Conclusion

Panel and Bokeh in Docker provide a solid platform for deploying interactive data visualizations. Bokeh handles the rendering layer with high-quality interactive charts, while Panel adds the dashboard framework with widgets, layouts, and templates. Docker packages everything cleanly, and Docker Compose lets you run multiple dashboards alongside their data sources. Start with a single-app Dockerfile, add database connectivity as needed, and scale with multiple server processes when traffic grows.
