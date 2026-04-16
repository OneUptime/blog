# How to Use ClickHouse with Evidence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Evidence, Markdown, Analytics, Report, Data Visualization

Description: Use Evidence to write SQL-powered reports in Markdown against ClickHouse, then deploy them as static sites with interactive charts.

---

Evidence is an open-source framework for building data reports using SQL and Markdown. Queries run at build time (or on refresh), and results are embedded into a clean, deployable static site. ClickHouse is a natural fit as the query engine.

## Setting Up an Evidence Project

```bash
npx degit evidence-dev/template my-evidence-app
cd my-evidence-app
npm install
npm run dev
```

## Connecting to ClickHouse

Evidence supports ClickHouse via the community plugin `evidence-connector-clickhouse`. Install it:

```bash
npm install evidence-connector-clickhouse
```

Register it in `evidence.plugins.yaml`:

```text
datasources:
  evidence-connector-clickhouse: {}
```

Start the dev server and open `http://localhost:3000/settings` to add a source using the plugin, or write `sources/clickhouse/connection.yaml` directly:

```text
name: clickhouse
type: evidence-connector-clickhouse
options:
  url: http://localhost:8123
  username: default
  password: ""
```

## Writing a Report in Markdown

Create `pages/index.md`:

````text
# Website Analytics Report

```sql top_pages
SELECT
    page,
    count() AS views
FROM default.page_views
WHERE created_at >= today() - 30
GROUP BY page
ORDER BY views DESC
LIMIT 10
```

<BarChart
    data={top_pages}
    x="page"
    y="views"
    title="Top Pages - Last 30 Days"
/>

## Daily Traffic

```sql daily_traffic
SELECT
    toDate(created_at) AS day,
    count() AS visits
FROM default.page_views
GROUP BY day
ORDER BY day
```

<LineChart
    data={daily_traffic}
    x="day"
    y="visits"
    title="Daily Visits"
/>
````

## Using Query Parameters

Evidence supports URL-based query parameters on templated pages (e.g. `pages/[date]/index.md`). Reference them in SQL with `${params.name}`:

````text
```sql filtered_events
SELECT
    event_type,
    count() AS cnt
FROM default.events
WHERE toDate(created_at) = '${params.date}'
GROUP BY event_type
```
````

## Building and Deploying

```bash
npm run build
```

The output in `build/` is a static site you can host on any CDN, S3, or static server.

## Scheduling Refreshes

For live data, use a cron job or CI pipeline to rebuild and redeploy on a schedule.

```bash
# Rebuild every hour via cron
0 * * * * cd /app && npm run build && rsync -av build/ user@server:/var/www/html
```

## Summary

Evidence makes it easy to write SQL reports against ClickHouse without building a backend or UI framework. SQL queries live in Markdown files, charts are declarative components, and the output is a fast static site. It is ideal for sharing analytics with non-technical stakeholders.
