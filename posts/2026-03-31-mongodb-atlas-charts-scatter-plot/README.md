# How to Create a Scatter Plot in MongoDB Atlas Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Charts, Visualization, Scatter Plot, Correlation

Description: Learn how to build a scatter plot in MongoDB Atlas Charts to explore correlations and outliers across two numeric dimensions in your data.

---

## When to Use a Scatter Plot

Scatter plots reveal relationships between two numeric variables. They are ideal for spotting correlations (do movies with higher budgets get better ratings?), clustering (which users have both high purchase frequency and high spend?), and outliers (which servers have unusually high latency for their request rate?).

## Setting Up the Scatter Plot

1. In Atlas Charts, click **Add Chart**
2. Select **Chart Type: Scatter**
3. Choose your data source - for this guide, use `sample_mflix.movies`

## Configuring X and Y Axes

Drag numeric fields to the two axes:

```text
X Axis:  tomatoes.viewer.numReviews   (Aggregation: Sum or none)
Y Axis:  tomatoes.viewer.rating       (Aggregation: Average)
```

Each document becomes a point. With an aggregation (like Sum or Average), multiple documents sharing a common key are collapsed to a single point.

## Adding Color Grouping

Drag a categorical field to the **Color** channel to color points by group:

```text
Color:  genres    (one color per genre)
```

This turns the scatter plot into a multi-group comparison, making it easy to see whether different genres cluster in different areas of the plot.

## Sizing Points

Use the **Size** channel to add a third dimension. Drag a numeric field here and each point's radius will scale proportionally to that value:

```text
Size:  runtime    (Aggregation: Average)
```

Larger circles now represent longer movies, adding a third data dimension to the chart.

## Enabling Trend Lines

In the **Customize** tab, enable **Trend Line** to overlay a linear regression line. This makes the correlation direction and strength visually apparent without any additional configuration.

## Zooming and Panning

Atlas Charts scatter plots support zoom and pan interactivity in dashboards. Click and drag to zoom into a dense cluster of points. Double-click to reset the zoom. This is useful for datasets with many overlapping points.

## Handling Overplotting

When thousands of points overlap, individual points become invisible. Address this with:

1. **Opacity reduction**: In Customize, lower the point opacity to 20-40% so overlapping points create darker regions.
2. **Custom pipeline sampling**: Use a pipeline to sample a representative subset:

```javascript
[
  { "$sample": { "size": 1000 } },
  {
    "$project": {
      "budget": 1,
      "rating": "$imdb.rating",
      "genre": { "$arrayElemAt": ["$genres", 0] }
    }
  }
]
```

## Example Use Case - Server Performance Analysis

For an infrastructure monitoring use case, if you log server metrics to MongoDB:

```javascript
// Sample document in server_metrics collection
{
  serverId: "srv-042",
  requestsPerSecond: 1240,
  p99LatencyMs: 45,
  cpuPercent: 62,
  region: "us-east"
}
```

Configure the scatter plot:
```text
X Axis:  requestsPerSecond   (Sum)
Y Axis:  p99LatencyMs        (Average)
Color:   region
Size:    cpuPercent          (Average)
```

This immediately highlights servers that are handling high traffic but suffering unusually high latency - a sign of a bottleneck.

## Summary

Scatter plots in MongoDB Atlas Charts map two numeric fields to X and Y axes to reveal correlations and outliers. The Color and Size channels add two more data dimensions. Built-in trend lines and opacity controls handle overplotting, while zoom and pan interactivity lets dashboard users drill into dense regions. Custom aggregation pipelines provide full control over the data shape before it reaches the chart.
