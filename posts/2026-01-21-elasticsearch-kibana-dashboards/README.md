# How to Build Log Dashboards in Kibana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kibana, Elasticsearch, Dashboards, Log Analytics, Visualization, Observability

Description: A comprehensive guide to building log dashboards in Kibana, covering data views, visualizations, dashboard design, and best practices for effective log analysis.

---

Kibana provides powerful visualization capabilities for Elasticsearch data. This guide covers building effective log dashboards from data view creation to advanced visualization techniques.

## Setting Up Kibana

### Basic Configuration

```yaml
# kibana.yml
server.host: "0.0.0.0"
server.port: 5601
server.name: "kibana"

elasticsearch.hosts: ["https://elasticsearch:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "${KIBANA_PASSWORD}"
elasticsearch.ssl.certificateAuthorities: ["/etc/kibana/certs/ca.crt"]

# Encryption keys (required for alerting)
xpack.encryptedSavedObjects.encryptionKey: "your-32-char-encryption-key-here"
xpack.reporting.encryptionKey: "your-32-char-reporting-key-here"
xpack.security.encryptionKey: "your-32-char-security-key-here"
```

## Creating Data Views

### Via Kibana UI

1. Navigate to Stack Management > Data Views
2. Click "Create data view"
3. Enter index pattern: `logs-*`
4. Select timestamp field: `@timestamp`
5. Save the data view

### Via API

```bash
curl -u elastic:password -X POST "localhost:5601/api/data_views/data_view" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "data_view": {
      "title": "logs-*",
      "name": "Application Logs",
      "timeFieldName": "@timestamp"
    }
  }'
```

### Runtime Fields

Add computed fields to your data view:

```json
{
  "data_view": {
    "title": "logs-*",
    "timeFieldName": "@timestamp",
    "runtimeFieldMap": {
      "hour_of_day": {
        "type": "long",
        "script": {
          "source": "emit(doc['@timestamp'].value.getHour())"
        }
      },
      "response_time_category": {
        "type": "keyword",
        "script": {
          "source": "if (doc['response_time'].size() == 0) { emit('unknown'); } else if (doc['response_time'].value < 100) { emit('fast'); } else if (doc['response_time'].value < 500) { emit('normal'); } else { emit('slow'); }"
        }
      }
    }
  }
}
```

## Discover - Log Exploration

### Basic Search

In the Discover tab:

```
# KQL Queries
level: error
service.name: "user-service" and level: error
message: "connection timeout"
@timestamp >= "2024-01-21" and @timestamp < "2024-01-22"
response_time > 1000
```

### Lucene Queries

```
# Lucene syntax
level:ERROR AND service.name:"user-service"
message:"connection" AND message:"timeout"
response_time:[1000 TO *]
```

### Saved Searches

Save frequently used queries:

1. Run your query in Discover
2. Click "Save" button
3. Name it descriptively: "Production Errors - Last 24h"
4. Optionally save time filter

## Building Visualizations

### Lens Visualizations

Lens is the recommended way to create visualizations:

#### Error Count Over Time

1. Go to Visualize Library > Create > Lens
2. Select "Line" chart
3. Drag `@timestamp` to X-axis
4. Drag `Records` to Y-axis
5. Add filter: `level: error`
6. Configure:
   - Date histogram interval: Auto
   - Legend position: Right

#### Top Error Services

1. Create new Lens visualization
2. Select "Bar horizontal"
3. Drag `service.name` to Y-axis (Top 10)
4. Add filter: `level: error`
5. Sort by count descending

#### Error Rate Percentage

1. Select "Metric" visualization
2. Configure formula:
   ```
   count(kql='level: error') / count() * 100
   ```
3. Format as percentage

### TSVB (Time Series Visual Builder)

For advanced time series visualizations:

#### Error Rate with Threshold

1. Create TSVB visualization
2. Add data series for errors
3. Add threshold annotation at error rate limit
4. Configure:
   - Panel type: Time Series
   - Data timerange: Last 24 hours
   - Interval: Auto

### Aggregation-Based Visualizations

#### Pie Chart - Errors by Level

```json
{
  "aggs": {
    "error_levels": {
      "terms": {
        "field": "level.keyword",
        "size": 5
      }
    }
  }
}
```

#### Heat Map - Errors by Hour and Day

Configure:
- X-axis: Date histogram (hour)
- Y-axis: Terms (day of week)
- Value: Count

## Dashboard Design

### Creating a Log Analytics Dashboard

#### 1. Overview Section

Add these visualizations at the top:

- **Total Log Volume** (Metric)
- **Error Count** (Metric)
- **Error Rate %** (Metric)
- **Active Services** (Metric)

#### 2. Time Series Section

- **Log Volume Over Time** (Area chart)
- **Error Trend** (Line chart with threshold)

#### 3. Breakdown Section

- **Logs by Service** (Horizontal bar)
- **Logs by Level** (Pie chart)
- **Top Error Messages** (Data table)

#### 4. Details Section

- **Recent Errors** (Saved search embed)
- **Error Details Table** (Data table)

### Dashboard Layout

```
+------------------+------------------+------------------+------------------+
|  Total Logs      |  Error Count     |  Error Rate %    |  Active Services |
|  (Metric)        |  (Metric)        |  (Metric)        |  (Metric)        |
+------------------+------------------+------------------+------------------+
|                                                                           |
|                    Log Volume Over Time (Area Chart)                      |
|                                                                           |
+---------------------------------------------------------------------------+
|                           |                                               |
|   Logs by Service         |              Error Trend                      |
|   (Bar Chart)             |              (Line Chart)                     |
|                           |                                               |
+---------------------------+-----------------------------------------------+
|                           |                                               |
|   Logs by Level           |          Top Error Messages                   |
|   (Pie Chart)             |          (Data Table)                         |
|                           |                                               |
+---------------------------+-----------------------------------------------+
|                                                                           |
|                     Recent Errors (Saved Search)                          |
|                                                                           |
+---------------------------------------------------------------------------+
```

### Adding Controls

Add filter controls to your dashboard:

1. Click "Controls" in dashboard toolbar
2. Add Options List for:
   - `service.name`
   - `level`
   - `host.name`
   - `environment`
3. Add Range Slider for:
   - `response_time`

### Dashboard Variables

Use URL parameters for dynamic dashboards:

```
/app/dashboards#/view/dashboard-id?
  _g=(filters:!(),time:(from:now-24h,to:now))&
  _a=(query:(language:kuery,query:'service.name: user-service'))
```

## Advanced Visualizations

### Vega Visualizations

Create custom visualizations with Vega:

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "Error Heatmap by Service and Hour",
  "data": {
    "url": {
      "index": "logs-*",
      "body": {
        "size": 0,
        "query": {
          "bool": {
            "must": [
              {"term": {"level": "error"}},
              {"range": {"@timestamp": {"gte": "now-7d"}}}
            ]
          }
        },
        "aggs": {
          "by_service": {
            "terms": {"field": "service.name.keyword", "size": 10},
            "aggs": {
              "by_hour": {
                "date_histogram": {
                  "field": "@timestamp",
                  "calendar_interval": "hour"
                }
              }
            }
          }
        }
      }
    },
    "format": {"property": "aggregations.by_service.buckets"}
  },
  "transform": [
    {"flatten": ["by_hour.buckets"], "as": ["hour_data"]},
    {
      "calculate": "datum.key",
      "as": "service"
    },
    {
      "calculate": "datum.hour_data.key_as_string",
      "as": "hour"
    },
    {
      "calculate": "datum.hour_data.doc_count",
      "as": "count"
    }
  ],
  "mark": "rect",
  "encoding": {
    "x": {"field": "hour", "type": "temporal", "timeUnit": "hours"},
    "y": {"field": "service", "type": "nominal"},
    "color": {
      "field": "count",
      "type": "quantitative",
      "scale": {"scheme": "reds"}
    }
  }
}
```

### Maps Visualization

For geographic log data:

1. Create Maps visualization
2. Add layer: "Documents"
3. Select data view: `logs-*`
4. Configure:
   - Geo field: `geoip.location`
   - Scaling: Clusters
   - Tooltip fields: `client.ip`, `country`, `count`

### Canvas

Create pixel-perfect presentations:

```
# Canvas workpad elements
- Metric elements for KPIs
- Time series for trends
- Markdown for annotations
- Images for branding
- Shapes for layout
```

## Alerting

### Create Alert Rule

1. Go to Stack Management > Rules
2. Click "Create rule"
3. Select "Elasticsearch query"

#### Log Error Spike Alert

```json
{
  "name": "High Error Rate Alert",
  "rule_type_id": "xpack.elasticsearch.query",
  "params": {
    "index": ["logs-*"],
    "timeField": "@timestamp",
    "esQuery": {
      "query": {
        "bool": {
          "must": [
            {"term": {"level": "error"}}
          ]
        }
      }
    },
    "threshold": [100],
    "timeWindowSize": 5,
    "timeWindowUnit": "m",
    "thresholdComparator": ">"
  },
  "schedule": {
    "interval": "1m"
  },
  "actions": [
    {
      "group": "threshold met",
      "id": "slack-connector-id",
      "params": {
        "message": "High error rate detected: {{context.value}} errors in last 5 minutes"
      }
    }
  ]
}
```

### Log Threshold Alert

For pattern-based alerts:

1. Select "Log threshold" rule type
2. Configure:
   - When: `count() > 50`
   - Grouped by: `service.name`
   - Filter: `level: error`
   - Time window: 5 minutes

## Dashboard Best Practices

### Design Principles

1. **Start with overview** - Key metrics at the top
2. **Progressive detail** - Drill down as you scroll
3. **Consistent colors** - Same color for same meaning
4. **Clear labels** - Descriptive titles and legends
5. **Appropriate time ranges** - Match visualization to time scale

### Performance Optimization

1. **Limit visualizations** - 10-15 per dashboard
2. **Use appropriate intervals** - Don't over-sample
3. **Filter early** - Add dashboard-level filters
4. **Avoid heavy aggregations** - Limit cardinality
5. **Use saved searches wisely** - They can be expensive

### Sharing Dashboards

#### Export Dashboard

```bash
curl -u elastic:password -X GET "localhost:5601/api/kibana/dashboards/export?dashboard=dashboard-id" \
  -H "kbn-xsrf: true" > dashboard-export.ndjson
```

#### Import Dashboard

```bash
curl -u elastic:password -X POST "localhost:5601/api/kibana/dashboards/import" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  --data-binary @dashboard-export.ndjson
```

### Dashboard Templates

Create reusable templates:

1. **Service Health Dashboard**
   - Error rate by service
   - Response time percentiles
   - Request volume
   - Recent errors

2. **Security Dashboard**
   - Failed login attempts
   - Access denied events
   - Geographic anomalies
   - Suspicious patterns

3. **Infrastructure Dashboard**
   - Log volume by host
   - Disk/CPU correlation
   - Service dependencies
   - Container metrics

## Summary

Building effective Kibana dashboards involves:

1. **Data views** - Define your data sources
2. **Visualizations** - Use Lens for most cases
3. **Dashboard layout** - Overview to detail flow
4. **Controls and filters** - Interactive exploration
5. **Alerting** - Proactive monitoring
6. **Performance** - Optimize for responsiveness

With well-designed dashboards, you can quickly identify issues, analyze trends, and gain insights from your log data.
