# How to Use ClickHouse with Observable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Observable, Data Visualization, Analytics, JavaScript

Description: Learn how to query ClickHouse from Observable notebooks using the HTTP API, build interactive D3 and Plot visualizations, and publish live data stories.

---

> Observable notebooks connect to ClickHouse via the HTTP API and enable code-first, interactive data visualizations and exploratory analysis with JavaScript.

Observable is a collaborative notebook platform for data visualization built on JavaScript. You can query ClickHouse directly from Observable notebooks using the HTTP API, then render results with Observable Plot, D3, or any other JavaScript library. This guide covers API connectivity, writing queries, building visualizations, and publishing Observable notebooks backed by ClickHouse.

---

## Connecting Observable to ClickHouse

Observable notebooks run in the browser and call ClickHouse's HTTP API.

```javascript
// Observable cell: ClickHouse HTTP client
const clickhouseQuery = async (sql, format = "JSONEachRow") => {
  const url = new URL("https://clickhouse.example.com:8443/");
  url.searchParams.set("query", sql);
  url.searchParams.set("default_format", format);
  url.searchParams.set("enable_http_compression", "1");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-ClickHouse-User":     "observable_user",
      "X-ClickHouse-Key":      "observable_password",
      "X-ClickHouse-Database": "analytics",
      "Content-Type":          "text/plain"
    }
  });

  if (!response.ok) {
    throw new Error(`ClickHouse error: ${await response.text()}`);
  }

  const text = await response.text();
  // Parse NDJSON rows
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(line => JSON.parse(line));
};
```

## Setting Up ClickHouse for Observable

Create a read-only user and configure CORS.

```sql
-- Create the Observable user
CREATE USER observable_user
IDENTIFIED WITH plaintext_password BY 'observable_password'
HOST ANY;

GRANT SELECT ON analytics.* TO observable_user;

CREATE SETTINGS PROFILE observable_profile
    SETTINGS
        max_execution_time = 30,
        max_rows_to_read   = 50000000,
        use_query_cache    = 1,
        query_cache_ttl    = 300;

ALTER USER observable_user SETTINGS PROFILE observable_profile;
```

```xml
<!-- /etc/clickhouse-server/config.d/cors.xml -->
<clickhouse>
    <http_options_response>
        <headers>
            <header>
                <name>Access-Control-Allow-Origin</name>
                <value>https://observablehq.com</value>
            </header>
            <header>
                <name>Access-Control-Allow-Headers</name>
                <value>X-ClickHouse-User,X-ClickHouse-Key,X-ClickHouse-Database,Content-Type</value>
            </header>
            <header>
                <name>Access-Control-Allow-Methods</name>
                <value>POST, GET, OPTIONS</value>
            </header>
        </headers>
    </http_options_response>
</clickhouse>
```

## Creating the Analytics Tables

Build tables for Observable notebook exploration.

```sql
CREATE TABLE analytics.page_events
(
    ts          DateTime,
    page        String,
    country     LowCardinality(String),
    device      LowCardinality(String),
    referrer    String,
    duration_s  Float32,
    is_bounce   UInt8
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (page, country, ts)
TTL ts + INTERVAL 90 DAY;

INSERT INTO analytics.page_events
SELECT
    now() - (number % 86400 * 30)                           AS ts,
    concat('/page-', toString(number % 20))                  AS page,
    ['US','UK','DE','FR','CA'][1 + number % 5]               AS country,
    ['desktop','mobile','tablet'][1 + number % 3]            AS device,
    ['google.com','twitter.com','direct','facebook.com'][1 + number % 4] AS referrer,
    round(randCanonical() * 300, 1)                          AS duration_s,
    if(randCanonical() < 0.35, 1, 0)                         AS is_bounce
FROM numbers(500000);
```

## Querying Data in Observable

Fetch and process ClickHouse data in a notebook cell.

```javascript
// Observable cell: fetch hourly traffic data
const hourlyTraffic = await clickhouseQuery(`
  SELECT
    toStartOfHour(ts)                              AS hour,
    count()                                        AS pageviews,
    countIf(is_bounce = 1)                         AS bounces,
    round(countIf(is_bounce = 1) / count() * 100, 1) AS bounce_rate,
    round(avg(duration_s), 1)                      AS avg_duration
  FROM analytics.page_events
  WHERE ts >= now() - INTERVAL 7 DAY
  GROUP BY hour
  ORDER BY hour
`);

hourlyTraffic.slice(0, 3)  // Preview first 3 rows
```

## Building an Observable Plot Chart

Create a time-series chart with Observable Plot.

```javascript
// Observable cell: line chart with Observable Plot
Plot.plot({
  title: "Hourly Pageviews (Last 7 Days)",
  width: 900,
  height: 350,
  x: {
    type: "time",
    label: "Time"
  },
  y: {
    label: "Pageviews",
    grid: true
  },
  marks: [
    Plot.lineY(hourlyTraffic, {
      x: d => new Date(d.hour),
      y: "pageviews",
      stroke: "steelblue",
      strokeWidth: 2
    }),
    Plot.areaY(hourlyTraffic, {
      x: d => new Date(d.hour),
      y: "pageviews",
      fill: "steelblue",
      fillOpacity: 0.15
    }),
    Plot.ruleY([0])
  ]
})
```

## Interactive Filtering with Observable Inputs

Add interactive controls that re-query ClickHouse.

```javascript
// Observable cell: country selector
const countryInput = Inputs.select(
  ["US", "UK", "DE", "FR", "CA"],
  { label: "Country", value: "US" }
);
const selectedCountry = Generators.input(countryInput);
display(countryInput);
```

```javascript
// Observable cell: query that reacts to the country selector
const countryData = await clickhouseQuery(`
  SELECT
    page,
    count()                          AS pageviews,
    round(avg(duration_s), 1)        AS avg_duration,
    round(avg(is_bounce) * 100, 1)   AS bounce_rate
  FROM analytics.page_events
  WHERE ts >= now() - INTERVAL 30 DAY
    AND country = '${selectedCountry}'
  GROUP BY page
  ORDER BY pageviews DESC
  LIMIT 15
`);
```

```javascript
// Observable cell: bar chart for the country data
Plot.plot({
  title: `Top Pages in ${selectedCountry}`,
  marginLeft: 120,
  width: 800,
  x: { label: "Pageviews", grid: true },
  y: { label: "Page" },
  marks: [
    Plot.barX(countryData, {
      x: "pageviews",
      y: "page",
      fill: "steelblue",
      sort: { y: "-x" }
    }),
    Plot.text(countryData, {
      x: "pageviews",
      y: "page",
      text: d => d.pageviews.toLocaleString(),
      dx: 4,
      textAnchor: "start"
    })
  ]
})
```

## Building a D3 Heatmap

Create a day-of-week, hour-of-day heatmap with D3.

```javascript
// Observable cell: fetch heatmap data
const heatmapData = await clickhouseQuery(`
  SELECT
    toDayOfWeek(ts) AS day_of_week,
    toHour(ts)      AS hour_of_day,
    count()         AS pageviews
  FROM analytics.page_events
  WHERE ts >= now() - INTERVAL 30 DAY
  GROUP BY day_of_week, hour_of_day
  ORDER BY day_of_week, hour_of_day
`);
```

```javascript
// Observable cell: D3 heatmap
{
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const cellSize = 32;
  const margin = { top: 30, right: 20, bottom: 20, left: 50 };
  const width  = hours.length * cellSize + margin.left + margin.right;
  const height = days.length  * cellSize + margin.top  + margin.bottom;

  const svg = d3.create("svg").attr("width", width).attr("height", height);

  const color = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, d3.max(heatmapData, d => +d.pageviews)]);

  // Build lookup map
  const lookup = new Map(
    heatmapData.map(d => [`${d.day_of_week}-${d.hour_of_day}`, +d.pageviews])
  );

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  days.forEach((day, di) => {
    hours.forEach((hour) => {
      g.append("rect")
        .attr("x", hour * cellSize)
        .attr("y", di * cellSize)
        .attr("width",  cellSize - 2)
        .attr("height", cellSize - 2)
        .attr("rx", 3)
        .attr("fill", color(lookup.get(`${di + 1}-${hour}`) || 0));
    });
  });

  // Axis labels
  g.selectAll(".day-label")
    .data(days)
    .join("text")
    .attr("class", "day-label")
    .attr("x", -8)
    .attr("y", (_, i) => i * cellSize + cellSize / 2)
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .attr("font-size", 11)
    .text(d => d);

  return svg.node();
}
```

## Connecting Observable via a Proxy

For production use, route ClickHouse requests through a lightweight proxy.

```javascript
// observable-ch-proxy.js (Node.js proxy)
const express    = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

app.use("/clickhouse", createProxyMiddleware({
  target: "https://clickhouse.example.com:8443",
  changeOrigin: true,
  pathRewrite: { "^/clickhouse": "/" },
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader("X-ClickHouse-User",     "observable_user");
      proxyReq.setHeader("X-ClickHouse-Key",      process.env.CH_PASSWORD);
      proxyReq.setHeader("X-ClickHouse-Database", "analytics");
    }
  }
}));

app.listen(3001, () => console.log("Proxy running on :3001"));
```

## Summary

Observable notebooks connect to ClickHouse via the HTTP API using `fetch` with ClickHouse authentication headers. Configure CORS in ClickHouse to allow requests from `observablehq.com`, and use a proxy server in production to avoid embedding credentials in notebook cells. Observable Plot works well for time-series line charts and bar charts, while D3 handles custom visualizations like heatmaps. Reactive cells automatically re-query ClickHouse when input controls change, making it easy to build interactive exploratory dashboards.
