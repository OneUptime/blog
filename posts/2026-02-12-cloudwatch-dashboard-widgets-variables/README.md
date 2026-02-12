# How to Use CloudWatch Dashboard Widgets and Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Dashboards, Monitoring

Description: A deep dive into CloudWatch dashboard widget types, configuration options, and dynamic variables that make your dashboards flexible and interactive.

---

CloudWatch dashboards become truly powerful when you go beyond basic line charts and start using the full range of widget types and dashboard variables. Variables let you create a single dashboard that can switch between environments, regions, or services with a dropdown. Widgets let you present data in the format that makes the most sense - sometimes a number, sometimes a chart, sometimes a table of log entries.

This post covers every widget type available, their configuration options, and how to set up dashboard variables for dynamic filtering.

## Widget Types Overview

CloudWatch supports these widget types as of early 2026:

- **Line** - time series line charts for trends
- **Stacked area** - like line but filled, good for showing composition
- **Number** - single value display, great for KPIs
- **Gauge** - circular gauge with min/max range
- **Bar** - horizontal or vertical bar charts
- **Pie** - percentage-based breakdowns
- **Text** - markdown content for headers and documentation
- **Alarm status** - shows red/green/gray for alarm states
- **Log table** - results of Logs Insights queries
- **Explorer** - auto-discovering resource groups

## Configuring Line Chart Widgets

Line charts are the workhorse of most dashboards. Here's a fully configured example showing all the options:

```json
{
  "type": "metric",
  "x": 0,
  "y": 0,
  "width": 12,
  "height": 6,
  "properties": {
    "metrics": [
      ["AWS/EC2", "CPUUtilization", "InstanceId", "i-1234567890abcdef0",
        { "stat": "Average", "period": 300, "label": "Web Server 1", "color": "#1f77b4" }],
      ["AWS/EC2", "CPUUtilization", "InstanceId", "i-0987654321fedcba0",
        { "stat": "Average", "period": 300, "label": "Web Server 2", "color": "#ff7f0e" }]
    ],
    "title": "CPU Utilization - Web Tier",
    "view": "timeSeries",
    "stacked": false,
    "region": "us-east-1",
    "period": 300,
    "yAxis": {
      "left": { "min": 0, "max": 100, "label": "Percent", "showUnits": false },
      "right": { "min": 0, "label": "Count" }
    },
    "annotations": {
      "horizontal": [
        { "label": "Warning", "value": 70, "color": "#ff9900", "fill": "above" },
        { "label": "Critical", "value": 90, "color": "#d62728", "fill": "above" }
      ]
    },
    "legend": { "position": "bottom" },
    "liveData": true
  }
}
```

Key options to know:

- `stacked: true` turns it into a stacked area chart
- `annotations.horizontal` adds threshold lines with optional fill
- `legend.position` can be `bottom`, `right`, or `hidden`
- `liveData: true` enables live updating without page refresh

## Number Widgets for KPIs

Number widgets show a single large value, perfect for at-a-glance metrics:

```json
{
  "type": "metric",
  "x": 0,
  "y": 0,
  "width": 6,
  "height": 3,
  "properties": {
    "metrics": [
      ["MyApp/Production", "ActiveUsers", "Environment", "prod",
        { "stat": "Maximum", "period": 60 }]
    ],
    "title": "Active Users",
    "view": "singleValue",
    "region": "us-east-1",
    "sparkline": true,
    "trend": true
  }
}
```

The `sparkline: true` option adds a mini chart behind the number so you can see the recent trend. The `trend: true` option shows whether the value is going up or down compared to the previous period.

## Gauge Widgets

Gauges work well when a metric has clear healthy and unhealthy ranges:

```json
{
  "type": "metric",
  "x": 0,
  "y": 0,
  "width": 6,
  "height": 6,
  "properties": {
    "metrics": [
      ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "my-database"]
    ],
    "title": "Database CPU",
    "view": "gauge",
    "region": "us-east-1",
    "stat": "Average",
    "period": 300,
    "yAxis": {
      "left": { "min": 0, "max": 100 }
    },
    "annotations": {
      "horizontal": [
        { "color": "#2ca02c", "value": 0 },
        { "color": "#ff9900", "value": 60 },
        { "color": "#d62728", "value": 85 }
      ]
    }
  }
}
```

The horizontal annotations define the color bands on the gauge - green up to 60%, yellow up to 85%, and red above that.

## Alarm Status Widgets

These give you a traffic-light view of your alarm states:

```json
{
  "type": "alarm",
  "x": 0,
  "y": 0,
  "width": 24,
  "height": 3,
  "properties": {
    "title": "Service Health",
    "alarms": [
      "arn:aws:cloudwatch:us-east-1:123456789012:alarm:HighCPU",
      "arn:aws:cloudwatch:us-east-1:123456789012:alarm:HighErrorRate",
      "arn:aws:cloudwatch:us-east-1:123456789012:alarm:HighLatency",
      "arn:aws:cloudwatch:us-east-1:123456789012:alarm:LowDiskSpace"
    ],
    "sortBy": "stateUpdatedTimestamp",
    "states": [
      { "value": "ALARM", "label": "In Alarm" },
      { "value": "OK", "label": "Healthy" },
      { "value": "INSUFFICIENT_DATA", "label": "No Data" }
    ]
  }
}
```

## Text Widgets for Documentation

Text widgets accept markdown, which makes them perfect for section headers, runbook links, and inline documentation:

```json
{
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 24,
  "height": 2,
  "properties": {
    "markdown": "# Order Processing Service\n**Runbook:** [Link](https://wiki.example.com/runbooks/order-service) | **On-call:** [PagerDuty](https://pagerduty.example.com) | **Last deploy:** Check [CI/CD](https://ci.example.com)\n\n> If error rate exceeds 5%, check the DLQ first."
  }
}
```

## Log Table Widgets

Embed Logs Insights query results directly in your dashboard:

```json
{
  "type": "log",
  "x": 0,
  "y": 6,
  "width": 24,
  "height": 6,
  "properties": {
    "query": "SOURCE '/aws/lambda/order-processor'\n| filter @message like /ERROR|WARN/\n| parse @message 'level=* msg=\"*\" orderId=*' as level, msg, orderId\n| fields @timestamp, level, msg, orderId\n| sort @timestamp desc\n| limit 10",
    "region": "us-east-1",
    "title": "Recent Errors and Warnings",
    "view": "table"
  }
}
```

## Dashboard Variables

Variables are what transform a static dashboard into a dynamic, interactive one. You define variables that appear as dropdown menus at the top of the dashboard, and then reference them in widget definitions.

Here's how to set up a variable for environment selection:

```json
{
  "variables": [
    {
      "type": "property",
      "property": "Environment",
      "inputType": "select",
      "id": "env",
      "label": "Environment",
      "defaultValue": "prod",
      "visible": true,
      "values": [
        { "label": "Production", "value": "prod" },
        { "label": "Staging", "value": "staging" },
        { "label": "Development", "value": "dev" }
      ]
    },
    {
      "type": "property",
      "property": "ServiceName",
      "inputType": "select",
      "id": "service",
      "label": "Service",
      "defaultValue": "order-api",
      "visible": true,
      "values": [
        { "value": "order-api" },
        { "value": "payment-service" },
        { "value": "notification-service" }
      ]
    }
  ],
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["MyApp/Metrics", "RequestCount", "Environment", "${env}", "ServiceName", "${service}"]
        ],
        "title": "Request Count - ${service} (${env})",
        "view": "timeSeries"
      }
    }
  ]
}
```

When someone opens this dashboard, they see dropdowns for Environment and Service at the top. Changing the selection immediately updates all widgets that reference those variables.

## Dynamic Variables with Search Expressions

For even more flexibility, use search expression-based widgets that automatically discover metrics:

```json
{
  "type": "metric",
  "x": 0,
  "y": 0,
  "width": 24,
  "height": 6,
  "properties": {
    "metrics": [
      [{ "expression": "SEARCH('{MyApp/Production,ServiceName} MetricName=\"RequestCount\" Environment=\"${env}\"', 'Sum', 300)", "id": "e1" }]
    ],
    "title": "Request Count by Service",
    "view": "timeSeries"
  }
}
```

The SEARCH expression finds all metrics matching the pattern and plots them all. Combined with a variable for environment, this automatically adapts to show whatever services exist in that environment.

## Putting It All Together

A complete dashboard definition with variables might look like this in your CloudFormation or CLI deployment:

```bash
# Deploy a dashboard with variables
aws cloudwatch put-dashboard \
  --dashboard-name "app-overview" \
  --dashboard-body file://dashboard-with-vars.json
```

Variables save you from creating separate dashboards for every environment. One dashboard, many views. It's a much better approach than duplicating dashboard definitions.

## Wrapping Up

CloudWatch dashboard widgets and variables give you the tools to build dashboards that are both informative and flexible. Start with the basics - line charts, number widgets, and alarm status widgets. Then add variables to make your dashboards reusable across environments and services. For the full walkthrough on creating dashboards from scratch, see our [CloudWatch dashboards guide](https://oneuptime.com/blog/post/create-cloudwatch-dashboards-application-monitoring/view). And if you need to share these dashboards across AWS accounts, check out [sharing CloudWatch dashboards across accounts](https://oneuptime.com/blog/post/share-cloudwatch-dashboards-across-accounts/view).
