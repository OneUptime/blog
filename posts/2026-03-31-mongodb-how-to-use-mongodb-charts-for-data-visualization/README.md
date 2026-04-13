# How to Use MongoDB Charts for Data Visualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB Atlas, Charts, Data Visualization, Dashboard, Analytics

Description: Learn how to create dashboards and visualizations with MongoDB Charts using chart types, aggregation pipelines, filters, and embedding options.

---

## Introduction

MongoDB Charts is a native data visualization tool built into MongoDB Atlas. It connects directly to your MongoDB collections without requiring data export or ETL pipelines. You can build interactive dashboards with bar charts, line charts, scatter plots, heatmaps, and more. Charts support aggregation pipeline customization, dashboard-level filters, and secure embedding into external applications.

## Connecting a Data Source

1. Navigate to Atlas - Charts
2. Click "Add Data Source"
3. Select your cluster and database
4. Choose the collections to expose

All collections in the selected database become available for chart creation.

## Creating Your First Chart

1. Click "Add Chart" in a new or existing dashboard
2. Select a data source (database and collection)
3. Drag fields from the Fields panel to the Encode panel
4. Choose a chart type

## Chart Type Reference

```text
Bar/Column Chart    - Compare categories, group by field values
Line Chart          - Time-series trends, sequential data
Scatter Plot        - Correlations between two numeric fields
Pie/Donut Chart     - Part-to-whole proportions
Heat Map            - Density by two categorical dimensions
Geo Map             - GeoJSON point data on a map
Table               - Tabular display with sorting
Number Chart        - Single KPI metric
```

## Building a Time-Series Line Chart

To visualize order counts over time:

```text
Chart Type: Line
X-Axis: createdAt (date field, binned by day/week/month)
Y-Axis: COUNT of documents
Series: (optional) status field to show breakdown by status
```

Enable date binning in the X-axis settings to group timestamps into daily or weekly buckets.

## Using Aggregation Pipelines in Charts

For complex calculations, use a custom aggregation pipeline as the chart data source:

```javascript
[
  {
    $match: {
      status: "completed",
      createdAt: { $gte: new Date("2026-01-01") }
    }
  },
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      },
      revenue: { $sum: "$amount" },
      orderCount: { $sum: 1 }
    }
  },
  {
    $sort: { "_id.year": 1, "_id.month": 1 }
  }
]
```

Enter this pipeline in the "Aggregate" tab of the chart builder.

## Dashboard-Level Filters

Add interactive filters that apply across all charts in a dashboard:

1. Click "Add Filter" in the dashboard toolbar
2. Select the field (e.g., `status`, `region`, `category`)
3. Charts with matching fields in the same data source react to filter changes

Example: A `status` filter lets users toggle between "completed", "pending", and "refunded" orders across all charts simultaneously.

## Calculated Fields

Create computed fields in Charts without modifying your data:

```javascript
// Custom field: revenue per order
{
  "revenuePerOrder": {
    "$divide": ["$revenue", "$orderCount"]
  }
}
```

In the chart builder, click "+" next to the Fields section to add a calculated field using aggregation expressions.

## Embedding Charts in External Applications

Generate an embeddable chart URL from the Charts UI:

1. Open a chart, click the "..." menu
2. Select "Embed Chart"
3. Choose "Authenticated" or "Unauthenticated" embedding
4. Copy the embed URL

Embed in HTML:

```html
<iframe
  style="border: none; border-radius: 2px; box-shadow: 0 2px 10px 0 rgba(70,76,79,0.2);"
  width="640"
  height="480"
  src="https://charts.mongodb.com/charts-myproject-abc/embed/charts?id=chart-id&maxDataAge=300&theme=light&autoRefresh=true"
></iframe>
```

## Embedding with JavaScript SDK for Dynamic Filtering

```javascript
import ChartsEmbedSDK from "@mongodb-js/charts-embed-dom";

const sdk = new ChartsEmbedSDK({
  baseUrl: "https://charts.mongodb.com/charts-myproject-abc"
});

const chart = sdk.createChart({
  chartId: "your-chart-id",
  height: "400px",
  theme: "light",
  autoRefresh: true,
  maxDataAge: 60 // Cache TTL in seconds
});

await chart.render(document.getElementById("chart-container"));

// Dynamically filter the embedded chart
await chart.setFilter({ region: "North America" });
```

## Role-Based Access Control for Charts

Control who can view or edit dashboards:

```text
Atlas Roles for Charts:
- Project Owner: Full access to all Charts
- Charts Admin: Create/edit/delete all dashboards
- Charts Data Analyst: View all, create own charts
- Charts Viewer: View shared dashboards only
```

Assign roles in Atlas - Access Manager - Project Access.

## Sharing Dashboards

1. Open a dashboard
2. Click "Share" in the top right
3. Add Atlas users or set dashboard visibility to "Organization" or "Project"

For public sharing, enable unauthenticated embedding and set an appropriate cache TTL.

## Summary

MongoDB Charts provides native, zero-ETL data visualization directly from your Atlas collections. Build charts using the drag-and-drop interface or custom aggregation pipelines for complex metrics, add dashboard-level filters for interactive exploration, and embed charts in your application using the JavaScript SDK with dynamic filter support. Role-based access control ensures that sensitive business data is only visible to authorized team members.
