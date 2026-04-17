# How to Build a REST API on Top of ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, REST API, Node.js, API Design, Backend

Description: Build a production-ready REST API on top of ClickHouse using Node.js and Express, with query parameterization, error handling, and response formatting.

---

## Architecture Overview

ClickHouse exposes an HTTP interface, but building a REST API layer on top adds authentication, query abstraction, rate limiting, and response formatting that raw ClickHouse HTTP endpoints lack. This guide builds a Node.js/Express REST API that queries ClickHouse safely and efficiently.

## Setup

```bash
npm init -y
npm install express @clickhouse/client dotenv
npm install --save-dev typescript @types/express ts-node
```

## ClickHouse Client Initialization

```javascript
// src/db.js
const { createClient } = require('@clickhouse/client');

const client = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'analytics',
  request_timeout: 30000,
  max_open_connections: 10,
});

module.exports = client;
```

## Express Application

```javascript
// src/app.js
const express = require('express');
const client = require('./db');

const app = express();
app.use(express.json());

// GET /api/events - list events with filters
app.get('/api/events', async (req, res) => {
  const { start_date, end_date, event_type, limit = 100 } = req.query;

  // Validate inputs
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const parsedLimit = Math.min(parseInt(limit, 10) || 100, 10000);

  try {
    const result = await client.query({
      query: `
        SELECT
          event_time,
          event_type,
          user_id,
          count() AS event_count
        FROM events
        WHERE event_time BETWEEN {start_date:DateTime} AND {end_date:DateTime}
          ${event_type ? 'AND event_type = {event_type:String}' : ''}
        GROUP BY event_time, event_type, user_id
        ORDER BY event_time DESC
        LIMIT {limit:UInt32}
      `,
      query_params: {
        start_date,
        end_date,
        ...(event_type && { event_type }),
        limit: parsedLimit,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json();
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error('ClickHouse query error:', err);
    res.status(500).json({ error: 'Query execution failed' });
  }
});

// GET /api/metrics/summary - aggregated metrics
app.get('/api/metrics/summary', async (req, res) => {
  try {
    const result = await client.query({
      query: `
        SELECT
          toDate(event_time) AS date,
          count() AS total_events,
          uniq(user_id) AS unique_users
        FROM events
        WHERE event_time >= today() - 30
        GROUP BY date
        ORDER BY date DESC
      `,
      format: 'JSON',
    });

    const data = await result.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

module.exports = app;
```

## Start the Server

```javascript
// src/server.js
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
```

## Test the API

```bash
# Get events for a date range
curl "http://localhost:3000/api/events?start_date=2026-03-01+00:00:00&end_date=2026-03-31+23:59:59&event_type=purchase"

# Get summary metrics
curl "http://localhost:3000/api/metrics/summary"
```

## Summary

A REST API on top of ClickHouse uses the official `@clickhouse/client` library with parameterized queries to safely expose analytics data. Keep the connection pool small (5-20 connections), always use `query_params` to prevent SQL injection, set response timeouts appropriate for your query complexity, and return formatted JSON with row counts for easy pagination.
