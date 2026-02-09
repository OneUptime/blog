# How to Use Kibana Lens for Creating Custom Log Visualizations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kibana, Lens, Visualization, Logging, Analytics

Description: Master Kibana Lens to build powerful log visualizations through drag-and-drop interfaces, including time series charts, breakdowns by field, metric displays, and custom log analytics dashboards.

---

Kibana Lens revolutionizes how you visualize log data by providing an intuitive drag-and-drop interface that automatically suggests appropriate chart types based on your data. Unlike traditional Kibana visualizations that require understanding specific chart configurations, Lens adapts to your data structure and makes visualization creation accessible to everyone on your team.

## Understanding Lens Capabilities

Lens works by analyzing your log data structure and offering visualization options that make sense for the fields you select. When you drag a timestamp field, Lens suggests time series charts. When you add a keyword field, it offers bar charts and pie charts showing value distributions. This intelligent suggestion system reduces the learning curve dramatically.

The tool supports all common visualization types including line charts, bar charts, area charts, pie charts, data tables, metric displays, and heatmaps. You can layer multiple data series, apply filters, split visualizations by dimensions, and customize colors and formatting without writing any code or queries.

## Accessing Lens and Basic Setup

Navigate to Lens through the Kibana menu under Visualize. When you first open Lens, you'll see a blank canvas with a data panel on the left showing fields from your default index pattern.

If you need to change the data source:

```bash
# Click on the index pattern dropdown at the top
# Select your log index pattern (e.g., "application-logs-*")
# The field list updates to show available fields
```

The field list categorizes fields by type - date fields, numeric fields, keyword fields, and text fields. Each type works best with specific visualization types. Date fields drive time series analysis. Numeric fields work for metrics and aggregations. Keyword fields enable grouping and categorization.

## Creating a Time Series Error Rate Visualization

Let's build a visualization showing error rates over time. This demonstrates the core Lens workflow:

Start by dragging the timestamp field (usually @timestamp) to the canvas. Lens automatically creates a time series chart counting documents over time. This gives you total log volume.

To focus on errors specifically:

```bash
# Click "Add filter" at the top
# Set field: log.level
# Operator: is
# Value: ERROR
# Click Save
```

Now your chart shows only ERROR level logs over time. The chart updates automatically, and Lens adjusts the Y-axis scale to fit your data.

To compare error rates across services:

```bash
# Drag the "service.name" field to the "Break down by" drop zone
# Lens creates a multi-line chart with one line per service
# Each service gets a different color automatically
```

Change the chart type by clicking the visualization type selector in the top right. Try switching between line chart, area chart, and bar chart to see which presents your data most clearly.

## Building a Log Level Distribution Pie Chart

Pie charts work well for showing proportional breakdowns. Create a pie chart showing the distribution of log levels:

```bash
# Start with a fresh Lens workspace
# Drag "log.level" to the canvas
# Lens suggests a bar chart by default
# Click the chart type selector
# Choose "Pie" or "Donut"
```

The chart now shows what percentage of your logs fall into each level category. To make this more meaningful, filter to a specific time range:

```bash
# Click the time picker in the top right
# Select "Last 24 hours" or your desired range
# The chart updates to show that period
```

Add a second dimension to see log levels broken down by environment:

```bash
# Drag "environment" field to "Break down by"
# Lens creates nested rings in the donut chart
# Inner ring shows log levels
# Outer ring shows environments within each level
```

This multi-level breakdown reveals patterns like whether production generates more errors than staging.

## Creating Metric Displays for Key Indicators

Metric visualizations display large numbers front and center, perfect for dashboards showing current values. Create a metric showing total error count in the last hour:

```bash
# Start fresh in Lens
# Drag any field to canvas (we'll change this)
# Click the chart type selector
# Choose "Metric"
# In the data panel, configure the metric:
#   - Function: Count
#   - Display name: "Errors (Last Hour)"
```

Add the error filter:

```bash
# Add filter: log.level is ERROR
# Set time range to "Last 1 hour"
```

The metric now shows a single large number representing current error count. This works great in dashboards where you want at-a-glance status.

To add context, create a comparison to the previous period:

```bash
# In the metric configuration panel
# Enable "Compare to previous period"
# Lens shows the current value and percentage change
```

Now you can see if errors are increasing or decreasing relative to the previous hour.

## Building a Data Table for Detailed Log Analysis

Tables provide detailed views of log data with sorting and pagination. Create a table showing top error messages:

```bash
# Start with a new Lens visualization
# Click chart type selector
# Choose "Table"
# Configure columns:
#   - Drag "message" to "Rows"
#   - Drag any field to "Metrics"
#   - Set metric function to "Count"
#   - Name it "Occurrences"
```

Add the error filter so you're only seeing error messages. The table now shows each unique error message and how many times it occurred, sorted by frequency.

Add more columns for context:

```bash
# Drag "service.name" to "Rows" (below message)
# This breaks down each message by service
# Drag "@timestamp" to "Metrics"
# Set function to "Max"
# Name it "Last Seen"
```

Your table now shows error messages, which services generated them, how often they occurred, and when they were last seen. This provides actionable troubleshooting information.

## Creating Heatmaps for Pattern Detection

Heatmaps reveal patterns in multidimensional data using color intensity. Create a heatmap showing request response times by hour and endpoint:

```bash
# Create new Lens visualization
# Select "Heatmap" chart type
# Configure axes:
#   - X-axis: Drag "@timestamp", set interval to "1 hour"
#   - Y-axis: Drag "http.request.path"
#   - Cell value: Drag "http.response.time", set to "Average"
```

The resulting heatmap uses color intensity to show average response times. Dark colors indicate slow responses. This makes it easy to spot which endpoints have performance issues and whether they're consistent or time-based.

Add filters to focus on specific scenarios:

```bash
# Filter: http.response.status_code is one of 500, 502, 503, 504
# This shows heatmap of server errors only
```

## Using Formula Functions for Complex Calculations

Lens includes a formula feature for custom calculations. Calculate error rate as a percentage:

```bash
# Create new visualization
# Click "Add layer" in the data panel
# Choose "Formula"
# Enter formula:
#   count(kql='log.level: ERROR') / count() * 100
# Name the result "Error Rate %"
```

This divides error count by total count and multiplies by 100 to get a percentage. The formula updates in real-time as data changes.

Common useful formulas:

```bash
# Average response time in seconds
average(http.response.time) / 1000

# Success rate percentage
count(kql='http.response.status_code < 400') / count() * 100

# Requests per second
count() / 60

# 95th percentile response time
percentile(http.response.time, percentile=95)
```

Formulas unlock advanced analytics without requiring separate aggregation pipelines.

## Combining Multiple Layers for Rich Visualizations

Layers let you overlay different data series on the same chart. Create a chart comparing successful vs failed requests:

```bash
# Create line chart with @timestamp
# Click "Add layer"
# Configure first layer:
#   - Filter: http.response.status_code < 400
#   - Label: "Successful Requests"
#   - Color: Green
# Click "Add layer" again
# Configure second layer:
#   - Filter: http.response.status_code >= 400
#   - Label: "Failed Requests"
#   - Color: Red
```

The chart now shows two lines tracking successful and failed requests over time. This visualization immediately reveals when error rates spike relative to normal traffic.

## Customizing Appearance and Formatting

Lens provides extensive formatting options. Access them through the panel on the right:

```bash
# Axis settings:
#   - Change axis labels
#   - Set min/max values
#   - Choose linear or logarithmic scale
#   - Format numbers (decimal places, units)

# Legend settings:
#   - Position (right, left, top, bottom)
#   - Show/hide legend
#   - Truncate long labels

# Color settings:
#   - Choose color palette
#   - Set custom colors per series
#   - Adjust color ranges for heatmaps
```

For time series charts, adjust the time interval:

```bash
# Click the "@timestamp" field in your configuration
# Change "Minimum interval" (auto, minute, hour, day, etc.)
# This controls the granularity of your chart
```

## Saving and Sharing Visualizations

Once you've created a useful visualization, save it for reuse:

```bash
# Click "Save" in the top right
# Enter a title: "Error Rate by Service"
# Optionally add to a dashboard
# Click "Save"
```

The visualization appears in your saved objects and can be added to any dashboard. To share with team members:

```bash
# Open the saved visualization
# Click "Share" in the top menu
# Choose "Copy link" or "Generate PDF report"
# Send the link to colleagues
```

Links preserve filters and time ranges, so recipients see exactly what you see.

## Conclusion

Kibana Lens democratizes log visualization by removing technical barriers. The drag-and-drop interface, intelligent suggestions, and automatic chart generation mean anyone can create insightful visualizations. Start with simple time series and pie charts to understand your log patterns, then progress to formulas and multi-layer charts for deeper analysis. The visualizations you build become the foundation of effective monitoring dashboards that keep your team informed.
