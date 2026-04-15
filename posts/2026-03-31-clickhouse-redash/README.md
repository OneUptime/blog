# How to Use ClickHouse with Redash

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Redash, Business Intelligence, Analytics, Visualization

Description: Learn how to connect Redash to ClickHouse, write SQL queries, create visualizations, build dashboards, and share analytics with your team.

---

> Redash's built-in ClickHouse data source provides a lightweight SQL-first BI experience with scheduled query execution and shareable dashboards.

Redash is an open-source, SQL-first BI tool built for data teams. It has a native ClickHouse data source that connects directly over HTTP, supports query scheduling, parameterized queries, and allows sharing dashboards with non-technical stakeholders. This guide covers setup, query writing, visualization configuration, and production deployment.

---

## Installing Redash with Docker

Launch Redash with the ClickHouse data source enabled.

```bash
# Create the Redash directory and download the setup script
mkdir -p /opt/redash
cd /opt/redash

# Download the Docker Compose setup script
curl -fsSL https://raw.githubusercontent.com/getredash/setup/master/setup.sh \
  -o setup.sh && chmod +x setup.sh

# Run the setup (creates docker-compose.yml and .env)
sudo ./setup.sh

# Start Redash
sudo docker-compose up -d

# Check the service status
sudo docker-compose ps
```

```yaml
# Minimal docker-compose.yml for Redash + ClickHouse
version: "3.8"

services:
  server:
    image: redash/redash:latest
    command: server
    ports:
      - "5000:5000"
    environment:
      PYTHONUNBUFFERED: 0
      REDASH_LOG_LEVEL: INFO
      REDASH_REDIS_URL: redis://redis:6379/0
      REDASH_DATABASE_URL: postgresql://postgres:redash_pass@postgres/redash
      REDASH_SECRET_KEY: "changeme-in-production"
      REDASH_WEB_WORKERS: 4
    depends_on:
      - postgres
      - redis

  scheduler:
    image: redash/redash:latest
    command: scheduler
    environment:
      REDASH_REDIS_URL: redis://redis:6379/0
      REDASH_DATABASE_URL: postgresql://postgres:redash_pass@postgres/redash
    depends_on:
      - postgres
      - redis

  worker:
    image: redash/redash:latest
    command: worker
    environment:
      REDASH_REDIS_URL: redis://redis:6379/0
      REDASH_DATABASE_URL: postgresql://postgres:redash_pass@postgres/redash
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: redash_pass
      POSTGRES_DB: redash
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"

volumes:
  pg_data:
```

## Configuring the ClickHouse Data Source

Add ClickHouse as a data source in Redash.

```text
Redash -> Settings -> Data Sources -> New Data Source

Type:     ClickHouse
Name:     ClickHouse Analytics

URL:      http://clickhouse:8123
Database: analytics
Username: redash_user
Password: redash_password

Options:
  Verify SSL: Yes (for production with HTTPS)
  Connection Timeout: 30
  Read Timeout: 120
```

## Creating a Read-Only Redash User in ClickHouse

```sql
-- Create the Redash user
CREATE USER redash_user
IDENTIFIED WITH plaintext_password BY 'redash_password'
HOST ANY;

-- Grant SELECT access
GRANT SELECT ON analytics.* TO redash_user;

-- Apply query resource limits
CREATE SETTINGS PROFILE redash_profile
    SETTINGS
        max_execution_time    = 60,
        max_rows_to_read      = 100000000,
        use_query_cache       = 1,
        query_cache_ttl       = 300,
        max_memory_usage      = 4000000000;

ALTER USER redash_user SETTINGS PROFILE redash_profile;
```

## Creating Analytical Tables for Redash

Build tables that support Redash's common chart types.

```sql
CREATE TABLE analytics.web_sessions
(
    session_date Date,
    country      LowCardinality(String),
    device       LowCardinality(String),
    channel      LowCardinality(String),
    sessions     UInt32,
    new_users    UInt32,
    pageviews    UInt32,
    duration_s   Float32,
    conversions  UInt32,
    revenue      Float64
)
ENGINE = SummingMergeTree(
    (sessions, new_users, pageviews, duration_s, conversions, revenue)
)
PARTITION BY toYYYYMM(session_date)
ORDER BY (session_date, country, device, channel);

INSERT INTO analytics.web_sessions
SELECT
    today() - (number % 365)                                      AS session_date,
    ['US','UK','DE','FR','CA','JP'][1 + number % 6]               AS country,
    ['desktop','mobile','tablet'][1 + number % 3]                 AS device,
    ['organic','paid','direct','social','email'][1 + number % 5]  AS channel,
    (rand() % 500) + 50                                           AS sessions,
    (rand() % 200) + 20                                           AS new_users,
    (rand() % 2000) + 100                                         AS pageviews,
    round(randCanonical() * 300, 1)                               AS duration_s,
    rand() % 50                                                   AS conversions,
    round(randCanonical() * 5000, 2)                              AS revenue
FROM numbers(50000);
```

## Writing Redash Queries

Write SQL queries optimized for Redash visualizations.

```sql
-- Sessions trend (use with Line Chart)
SELECT
    session_date             AS date,
    sum(sessions)            AS sessions,
    sum(new_users)           AS new_users,
    sum(conversions)         AS conversions
FROM analytics.web_sessions
WHERE session_date >= today() - 90
GROUP BY date
ORDER BY date;
```

```sql
-- Channel breakdown (use with Pie Chart or Bar Chart)
SELECT
    channel,
    sum(sessions)           AS total_sessions,
    sum(revenue)            AS total_revenue,
    round(sum(conversions) / sum(sessions) * 100, 2) AS conversion_rate
FROM analytics.web_sessions
WHERE session_date >= today() - 30
GROUP BY channel
ORDER BY total_sessions DESC;
```

```sql
-- Country map data (use with Choropleth Map)
SELECT
    country,
    sum(sessions)  AS sessions,
    sum(revenue)   AS revenue
FROM analytics.web_sessions
WHERE session_date >= today() - 30
GROUP BY country
ORDER BY sessions DESC;
```

## Parameterized Queries

Use Redash query parameters for reusable, filterable queries.

```sql
-- Parameterized query with date range and channel filter
SELECT
    session_date          AS date,
    device,
    sum(sessions)         AS sessions,
    sum(revenue)          AS revenue
FROM analytics.web_sessions
WHERE session_date BETWEEN '{{ start_date }}' AND '{{ end_date }}'
  AND channel = '{{ channel }}'
GROUP BY date, device
ORDER BY date;
```

```text
In Redash query editor, define parameters:

start_date:
  Type: Date
  Default: 2026-03-01

end_date:
  Type: Date
  Default: 2026-03-31

channel:
  Type: Dropdown List
  Values: organic, paid, direct, social, email
  Default: organic
```

## Scheduling Queries

Schedule queries to refresh automatically.

```text
Redash Query -> Schedule

Refresh every: 1 hour
Failure email: data-team@example.com

Send results by email:
  Every: Day
  Time: 8:00 AM
  Recipients: marketing@example.com
  Subject: Daily Web Sessions Report
```

## Building a Redash Dashboard

Assemble visualizations into a shareable dashboard.

```text
Redash -> New Dashboard -> Web Analytics

Add widgets:
  1. "Sessions Over Time" - Line chart from sessions trend query
  2. "Revenue by Channel"  - Bar chart from channel breakdown query
  3. "Country Map"         - Choropleth from country query
  4. "Key Metrics"         - Counter widgets (total sessions, total revenue)
  5. "Device Split"        - Pie chart (device breakdown)

Dashboard filters:
  - Connect date parameters across widgets
  - Enable refresh: every 30 minutes

Share settings:
  - Generate a public URL for embedding
  - Allow viewers to change parameters
```

## Embedding Dashboards

Embed Redash dashboards in other applications.

```html
<!-- Embed a public Redash dashboard via iframe -->
<iframe
  src="https://redash.example.com/embed/query/123/visualization/456?api_key=YOUR_API_KEY"
  width="100%"
  height="600"
  frameborder="0"
>
</iframe>
```

```python
# Access Redash query results via the API
import requests

REDASH_URL = "https://redash.example.com"
API_KEY    = "your_redash_api_key"

# Get query results
response = requests.get(
    f"{REDASH_URL}/api/queries/123/results.json",
    headers={"Authorization": f"Key {API_KEY}"}
)

data = response.json()
rows = data["query_result"]["data"]["rows"]
print(f"Got {len(rows)} rows")
```

## Summary

Redash connects to ClickHouse natively using the built-in ClickHouse HTTP data source. Configure a read-only user with resource limits, write SQL queries that produce chart-friendly column names, and use parameterized queries for reusable, filterable analytics. Schedule queries to refresh automatically and assemble them into dashboards that can be shared with public URLs or embedded via iframes. Redash is particularly well-suited for SQL-first data teams that want a lightweight, self-hosted alternative to heavier BI platforms.
