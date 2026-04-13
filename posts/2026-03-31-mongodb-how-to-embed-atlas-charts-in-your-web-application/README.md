# How to Embed Atlas Charts in Your Web Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Charts, Embedding, JavaScript, Data Visualization

Description: Learn how to embed MongoDB Atlas Charts in a web application using the Charts Embed SDK with authenticated and unauthenticated rendering modes.

---

## Embedding Options in Atlas Charts

Atlas Charts provides two embedding modes:

- **Unauthenticated** - chart is publicly accessible (for public dashboards)
- **Authenticated** - requires a token or SDK-based authentication for private data

The Embed SDK (`@mongodb-js/charts-embed-dom`) is the recommended approach for both modes.

## Prerequisites

- A MongoDB Atlas account with Charts enabled
- A published chart (from your Charts dashboard)
- Node.js project with npm/yarn

## Installation

```bash
npm install @mongodb-js/charts-embed-dom
```

## Step 1 - Enable Embedding on a Chart

1. Open your chart in Atlas Charts
2. Click the **...** menu on the chart
3. Select **Embed Chart**
4. Choose **Unauthenticated** or **Authenticated** mode
5. Copy the **Chart ID** and **Base URL**

## Step 2 - Basic Unauthenticated Embed

For public dashboards with no sensitive data:

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>MongoDB Charts Embed</title>
  <style>
    #chart { width: 100%; height: 400px; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script type="module" src="app.js"></script>
</body>
</html>
```

```javascript
// app.js
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';

const sdk = new ChartsEmbedSDK({
  baseUrl: 'https://charts.mongodb.com/charts-project-xxxxx'
});

const chart = sdk.createChart({
  chartId: 'your-chart-id-here',
  height: '400px',
  width: '100%',
  theme: 'light'   // 'light' or 'dark'
});

chart.render(document.getElementById('chart'))
  .then(() => console.log('Chart rendered'))
  .catch(err => console.error('Render failed:', err));
```

## Step 3 - Authenticated Embed with JWT

For private data, use JWT-based authentication:

### Backend - Generate a Chart Token

```javascript
// server.js (Node.js / Express)
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

const CHARTS_SIGNING_KEY = process.env.CHARTS_SIGNING_KEY; // from Atlas Charts settings

app.get('/api/charts-token', (req, res) => {
  // Verify the user is authenticated first
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const payload = {
    sub: req.user.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,  // 1 hour expiry
    // Include claims your charts filter on
    role: req.user.role,
    organizationId: req.user.orgId
  };

  const token = jwt.sign(payload, CHARTS_SIGNING_KEY, { algorithm: 'HS256' });
  res.json({ token });
});

app.listen(3000);
```

### Frontend - Use Token for Chart Auth

```javascript
// authenticatedChart.js
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';

async function getChartsToken() {
  const response = await fetch('/api/charts-token', { credentials: 'include' });
  const { token } = await response.json();
  return token;
}

const sdk = new ChartsEmbedSDK({
  baseUrl: 'https://charts.mongodb.com/charts-project-xxxxx',
  getUserToken: getChartsToken  // called automatically before rendering
});

const chart = sdk.createChart({
  chartId: 'your-chart-id-here',
  height: '400px'
});

await chart.render(document.getElementById('chart'));
```

## Step 4 - Applying Filters at Render Time

Pass dynamic filters to scope the chart data:

```javascript
const userId = getCurrentUser().id;
const chart = sdk.createChart({
  chartId: 'your-chart-id',
  filter: {
    // Only show data belonging to the current user's organization
    organizationId: getCurrentUser().orgId,
    // Only show last 30 days
    createdAt: {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  }
});

await chart.render(document.getElementById('chart'));

// Update filter dynamically
document.getElementById('region-select').addEventListener('change', async (e) => {
  await chart.setFilter({
    organizationId: getCurrentUser().orgId,
    region: e.target.value
  });
});
```

## Step 5 - Embedding Multiple Charts

```javascript
// dashboard.js - embed multiple charts in a grid
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';

const sdk = new ChartsEmbedSDK({
  baseUrl: 'https://charts.mongodb.com/charts-project-xxxxx',
  getUserToken: getChartsToken
});

const chartConfigs = [
  { id: 'revenue-trend-id',    container: 'chart-revenue',    height: '300px' },
  { id: 'orders-by-region-id', container: 'chart-region',     height: '300px' },
  { id: 'top-products-id',     container: 'chart-products',   height: '400px' },
  { id: 'customer-gauge-id',   container: 'chart-customers',  height: '200px' }
];

async function renderDashboard(orgId) {
  const charts = chartConfigs.map(({ id, container, height }) => {
    const chart = sdk.createChart({
      chartId: id,
      height,
      filter: { organizationId: orgId }
    });
    return chart.render(document.getElementById(container));
  });

  await Promise.all(charts);
  console.log('All charts rendered');
}
```

## Step 6 - Refreshing Charts

```javascript
// Refresh a chart manually
await chart.refresh();

// Set up auto-refresh every 5 minutes
setInterval(() => chart.refresh(), 5 * 60 * 1000);

// Refresh all charts when user navigates back to tab
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) chart.refresh();
});
```

## Step 7 - React Component Wrapper

```javascript
// ChartEmbed.jsx
import { useEffect, useRef, useState } from 'react';
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';

const sdk = new ChartsEmbedSDK({
  baseUrl: process.env.REACT_APP_CHARTS_BASE_URL,
  getUserToken: () => fetch('/api/charts-token').then(r => r.json()).then(d => d.token)
});

export function ChartEmbed({ chartId, filter, height = '400px' }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    chartRef.current = sdk.createChart({ chartId, height, filter });
    chartRef.current.render(containerRef.current).catch(setError);
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [chartId]);

  useEffect(() => {
    if (chartRef.current && filter) {
      chartRef.current.setFilter(filter);
    }
  }, [filter]);

  if (error) return <div>Chart failed to load: {error.message}</div>;
  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
```

## Summary

Embedding MongoDB Atlas Charts in a web application involves installing the `@mongodb-js/charts-embed-dom` SDK, creating chart instances with your Chart ID and base URL, and choosing between unauthenticated (public) or JWT-authenticated (private) rendering. Use the `filter` option to scope chart data to the current user's context, and combine multiple chart embeds in a single page to build full analytics dashboards inside your application without maintaining a separate BI tool.
