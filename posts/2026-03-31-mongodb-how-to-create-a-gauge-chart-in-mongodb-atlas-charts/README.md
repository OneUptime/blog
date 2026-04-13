# How to Create a Gauge Chart in MongoDB Atlas Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Charts, Data Visualization, Dashboard, Analytics

Description: Learn how to create a gauge chart in MongoDB Atlas Charts to display KPIs, utilization rates, and threshold-based metrics with visual color bands.

---

## What Is a Gauge Chart in Atlas Charts

A gauge chart (also called a dial or speedometer chart) in MongoDB Atlas Charts displays a single numeric metric against a defined range, with optional color bands to indicate thresholds such as good, warning, and critical zones. It is ideal for KPIs, utilization percentages, SLA compliance rates, and any metric where you need to show performance against a target at a glance.

## Prerequisites

- A MongoDB Atlas account with a cluster
- Data loaded in a collection
- Atlas Charts enabled (navigate to Charts in the Atlas UI)

## Step 1 - Prepare Your Data

Gauge charts aggregate a single numeric value from your collection. A common pattern is a metrics or KPIs collection:

```javascript
// Sample data: server metrics collection
db.serverMetrics.insertMany([
  { serverId: "web-01", metric: "cpuUtilization", value: 72.4, timestamp: new Date() },
  { serverId: "web-01", metric: "memoryUsage",    value: 85.1, timestamp: new Date() },
  { serverId: "web-01", metric: "diskUsage",      value: 45.3, timestamp: new Date() },
  { serverId: "db-01",  metric: "cpuUtilization", value: 38.9, timestamp: new Date() }
]);

// Or an SLA compliance collection
db.slaMetrics.insertOne({
  service: "payment-api",
  period: "2026-03",
  uptime99th: 99.87,
  p99LatencyMs: 145,
  errorRatePct: 0.03,
  resolvedAt: new Date()
});
```

## Step 2 - Create a New Chart

1. Go to your Atlas project and click **Charts** in the left navigation
2. Select your dashboard (or create one)
3. Click **Add Chart**
4. Choose your data source (your MongoDB cluster and collection)
5. In the chart type selector, choose **Gauge**

## Step 3 - Configure the Value Field

In the Chart Builder:

1. Drag your numeric field (e.g., `value` or `uptime99th`) to the **Value** encoding channel
2. Select the appropriate aggregation:
   - **Mean** for average utilization over multiple documents
   - **Max** for peak values
   - **Last** for the most recent reading

```text
Encoding channels for Gauge chart:
- Value (required): the numeric value to display - aggregated single number
- Filter (optional): restrict which documents are included
```

## Step 4 - Set the Min and Max Range

In the **Customize** tab:

```text
Min value: 0       (e.g., 0% utilization)
Max value: 100     (e.g., 100% utilization)
```

For non-percentage metrics (like latency in ms):

```text
Min value: 0
Max value: 500     (your SLA threshold maximum)
```

## Step 5 - Configure Color Bands (Thresholds)

Color bands visually indicate performance zones. In the **Customize** panel, add threshold bands:

```text
For CPU Utilization:
Band 1: 0  - 60%   Color: Green   Label: Normal
Band 2: 60 - 80%   Color: Yellow  Label: Warning
Band 3: 80 - 100%  Color: Red     Label: Critical

For Uptime SLA (inverted - higher is better):
Band 1: 0     - 99%    Color: Red     Label: SLA Breach
Band 2: 99    - 99.9%  Color: Yellow  Label: At Risk
Band 3: 99.9  - 100%   Color: Green   Label: Healthy
```

## Step 6 - Add a Custom Aggregation Pipeline

For more complex gauge values, use a custom aggregation pipeline in the data source:

```javascript
// Custom pipeline to compute average CPU over last hour
[
  {
    $match: {
      metric: "cpuUtilization",
      $expr: {
        $gte: ["$timestamp", { $subtract: [new Date(), 3600000] }]
      }
    }
  },
  {
    $group: {
      _id: null,
      avgCpu: { $avg: "$value" },
      maxCpu: { $max: "$value" }
    }
  },
  {
    $project: {
      _id: 0,
      avgCpu: { $round: ["$avgCpu", 1] },
      maxCpu: { $round: ["$maxCpu", 1] }
    }
  }
]
```

Then use `avgCpu` as the **Value** field in the gauge.

## Step 7 - Add Filters

Use the **Filter** channel or the dashboard-level filter to scope the gauge:

```text
Examples:
- Filter: serverId = "web-01"
- Filter: metric = "cpuUtilization"
- Dashboard filter: environment = "production"
```

## Step 8 - Configure Display Options

In the **Customize** tab:

```text
Title: "CPU Utilization - web-01"
Value label: "%"
Show value: true (displays number inside gauge)
Decimal places: 1
```

## Step 9 - Set Up Auto-Refresh

For real-time monitoring:

1. Click the **...** (kebab menu) on the chart
2. Select **Auto Refresh**
3. Choose refresh interval: 1 min, 5 min, 30 min, or 1 hour

## Gauge Chart Use Cases

```text
Infrastructure monitoring:
- CPU utilization per server
- Memory usage percentage
- Disk usage per volume

Business KPIs:
- Monthly sales target completion (0 - target amount)
- NPS score (-100 to 100)
- Customer satisfaction score

SLA and reliability:
- Service uptime percentage
- Error rate (inverted - lower is better)
- Response time vs SLA threshold
```

## Summary

Creating a gauge chart in MongoDB Atlas Charts involves selecting the Gauge chart type, mapping a numeric field to the Value encoding channel with an appropriate aggregation, setting min/max range boundaries, and configuring color bands for threshold-based visual feedback. For dynamic real-time gauges, combine custom aggregation pipelines with dashboard-level filters and auto-refresh intervals to keep KPI dashboards current without manual intervention.
