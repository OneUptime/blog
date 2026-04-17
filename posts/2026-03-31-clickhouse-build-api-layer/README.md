# How to Build an API Layer Over ClickHouse Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, API, REST, Node.js, Backend

Description: Learn how to build a REST API layer over ClickHouse to expose analytical query results to frontend applications and microservices.

---

## Why Build an API Layer Over ClickHouse

ClickHouse is a powerful analytical database, but directly exposing it to frontend apps or third-party consumers is risky - it bypasses access controls, leaks schema details, and makes it hard to cache results. An API layer adds authentication, rate limiting, query abstraction, and caching on top of raw ClickHouse access.

## Simple Express API with ClickHouse Client

```bash
npm install @clickhouse/client express
```

```javascript
const express = require('express');
const { createClient } = require('@clickhouse/client');

const app = express();
const ch = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: 'analytics',
});

app.get('/api/events/summary', async (req, res) => {
  const { start, end } = req.query;
  const result = await ch.query({
    query: `
      SELECT
        event_type,
        count() AS total,
        uniq(user_id) AS unique_users
      FROM events
      WHERE event_date BETWEEN {start:Date} AND {end:Date}
      GROUP BY event_type
      ORDER BY total DESC
    `,
    query_params: { start, end },
    format: 'JSONEachRow',
  });
  const rows = await result.json();
  res.json(rows);
});

app.listen(3000, () => console.log('API running on port 3000'));
```

## Adding Response Caching

For expensive aggregation queries, cache the results in Redis to avoid repeated full scans.

```javascript
const redis = require('redis').createClient({ url: 'redis://localhost:6379' });
redis.connect();

app.get('/api/daily-stats', async (req, res) => {
  const cacheKey = `daily-stats:${req.query.date}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const result = await ch.query({
    query: `
      SELECT toDate(event_time) AS day, count() AS events
      FROM events
      WHERE event_date = {date:Date}
      GROUP BY day
    `,
    query_params: { date: req.query.date },
    format: 'JSONEachRow',
  });
  const rows = await result.json();
  await redis.setEx(cacheKey, 300, JSON.stringify(rows));
  res.json(rows);
});
```

## Parameterized Queries to Prevent Injection

Always use ClickHouse's named parameters (`{name:Type}`) rather than string interpolation. This prevents SQL injection and ensures correct type casting.

```javascript
// Good - parameterized
query: 'SELECT * FROM events WHERE user_id = {uid:UInt64}',
query_params: { uid: req.query.user_id }

// Bad - string interpolation
query: `SELECT * FROM events WHERE user_id = ${req.query.user_id}`
```

## Adding Authentication Middleware

```javascript
function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use('/api', apiKeyAuth);
```

## Summary

Building an API layer over ClickHouse lets you expose analytical data safely with authentication, parameterized queries to prevent injection, and Redis caching to reduce query load. Use the official `@clickhouse/client` for Node.js with named parameters and structure each endpoint around a specific business question rather than generic query passthrough.
