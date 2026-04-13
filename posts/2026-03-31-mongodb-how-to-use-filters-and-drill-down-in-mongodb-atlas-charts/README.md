# How to Use Filters and Drill-Down in MongoDB Atlas Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Charts, Data Visualization, Filter, Dashboard

Description: Learn how to use dashboard filters, chart-level filters, and drill-down controls in MongoDB Atlas Charts for interactive data exploration.

---

## Types of Filtering in Atlas Charts

Atlas Charts offers three levels of filtering:

1. **Chart-level filters** - static filters baked into individual charts
2. **Dashboard filters** - dynamic controls that affect multiple charts simultaneously
3. **Click-to-filter (drill-down)** - clicking chart elements to filter other charts

## Chart-Level Filters

Chart-level filters are applied in the Chart Builder and restrict which documents a specific chart uses:

### Adding a Filter in the Builder

1. Open the Chart Builder for your chart
2. In the left panel, find the **Filter** section
3. Click **Add Filter**
4. Choose your field and condition

```javascript
// Equivalent MongoDB query for a chart filter
// Only show orders from 2026
{ "orderDate": { "$gte": ISODate("2026-01-01"), "$lt": ISODate("2027-01-01") } }

// Only show completed orders in the US
{
  "$and": [
    { "status": { "$eq": "completed" } },
    { "country": { "$eq": "US" } }
  ]
}
```

### Using a Custom Query Filter

For complex conditions, use the **Query** filter mode:

```javascript
// In the Query filter box (JSON format)
{
  "amount": { "$gte": 100 },
  "tags": { "$in": ["premium", "enterprise"] },
  "createdAt": { "$gte": { "$date": "2026-01-01T00:00:00Z" } }
}
```

## Dashboard Filters

Dashboard filters create interactive filter controls that apply to all charts on a dashboard simultaneously.

### Creating a Dashboard Filter

1. On your dashboard, click **Add Filter**
2. Choose the field to filter on
3. Select filter type:
   - **Checkbox Group** - multi-select from discrete values
   - **Select** - single value dropdown
   - **Date Picker** - date range selector
   - **Number Slider** - numeric range slider
   - **Search** - text search

### Configuring a Region Filter

```text
Filter field: region
Filter type: Checkbox Group
Values: West, East, North, South (auto-populated from data)
Default: All selected
Apply to: All charts in dashboard
```

### Date Range Filter Example

```text
Filter field: orderDate
Filter type: Date Picker
Range type: Relative (e.g., Last 30 days)
Default: Last 7 days
```

### Multiple Filters in Sequence

Filters stack - a region filter AND a date filter both apply simultaneously, narrowing data progressively across all charts.

## Connecting Dashboard Filters to Charts

By default, dashboard filters apply to all charts using the same data source. To control which charts a filter affects:

1. Click the filter control's **...** menu
2. Select **Configure Filter**
3. Under **Apply To**, select specific charts or exclude some

This lets you have a "comparison" chart that ignores the filter while a detail chart responds to it.

## Click-to-Filter (Drill-Down)

Click-to-filter lets users click on a chart element (bar, slice, point) to dynamically filter all other charts to that value.

### Enabling Click-to-Filter

1. In Chart Builder, click the **...** menu on your chart
2. Select **Chart Settings**
3. Toggle on **Enable Click to Filter**

### How It Works in Practice

```text
1. User views a bar chart: Orders by Region (West, East, North, South)
2. User clicks "West" bar
3. All other charts on the dashboard filter to region = "West"
4. Charts now show: top products in West, West revenue trend, West customer count
5. User clicks "West" again to deselect and return to all regions
```

## Drill-Down Hierarchies

For hierarchical data, configure drill-down to expand from category to subcategory:

### Example: Category - Subcategory - Product

```text
Level 1: Category (Electronics, Clothing, Food)
Level 2: Subcategory (Phones, Laptops, Tablets - when Electronics is clicked)
Level 3: Product (specific product names)
```

In the Chart Builder, add multiple fields to the **X Axis** encoding channel with the hierarchy order. Atlas Charts automatically creates expandable drill-down levels.

## URL Parameter Filters

You can pre-filter a dashboard by passing URL parameters when embedding:

```text
https://charts.mongodb.com/charts-xxxx/dashboards/yyyy?filter={"region":"West","status":"active"}
```

Or via the Charts embedding SDK:

```javascript
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';

const sdk = new ChartsEmbedSDK({ baseUrl: 'https://charts.mongodb.com/charts-project-id' });

const dashboard = sdk.createDashboard({
  dashboardId: 'your-dashboard-id',
  filter: {
    region: "West",
    status: "active",
    orderDate: {
      $gte: new Date("2026-01-01"),
      $lt: new Date("2027-01-01")
    }
  }
});
```

## Injecting Filters Dynamically in Embedded Charts

```javascript
// chartsEmbed.js
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';

const sdk = new ChartsEmbedSDK({ baseUrl: 'https://charts.mongodb.com/charts-project-id' });

const chart = sdk.createChart({
  chartId: 'your-chart-id',
  height: '400px',
  filter: { region: 'West' }  // initial filter
});

await chart.render(document.getElementById('chart-container'));

// Dynamically update filter on user interaction
document.getElementById('region-select').addEventListener('change', async (e) => {
  await chart.setFilter({ region: e.target.value });
});

// Get current filter state
const currentFilter = await chart.getFilter();
console.log('Active filter:', currentFilter);
```

## Best Practices

```text
1. Put dashboard filters for high-cardinality fields (date, region) at the top
2. Use chart-level filters for static scoping (e.g., status = "active" always)
3. Enable click-to-filter only on charts that make sense as navigation aids
4. Avoid more than 3-4 simultaneous dashboard filters to prevent confusion
5. Set sensible defaults (e.g., Last 30 days) so dashboards load with meaningful data
6. Use the "Apply To" configuration to prevent filter from breaking comparison charts
```

## Summary

Atlas Charts provides three complementary filtering mechanisms: chart-level filters for static scoping, dashboard filters for interactive multi-chart data exploration, and click-to-filter for drill-down navigation. Combining these allows you to build rich self-service analytics dashboards where users can explore data from summary views down to specific segment details without writing queries. For embedded charts, the SDK supports both initial filters and dynamic filter updates driven by application state.
