# How to Use OpenSearch Dashboards for Visualization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Dashboards, Visualization, Monitoring

Description: Learn how to build dashboards and visualizations in OpenSearch Dashboards for log analytics, application monitoring, and business intelligence use cases.

---

OpenSearch Dashboards (formerly Kibana) is the visualization layer for your OpenSearch data. It turns raw indexed documents into charts, graphs, tables, and dashboards that actually tell you something useful. Whether you're tracking application errors, monitoring infrastructure metrics, or building business analytics, Dashboards gives you the tools to visualize it all without writing code.

Let's go from zero to a production-grade monitoring dashboard.

## Accessing OpenSearch Dashboards

When you create an OpenSearch Service domain, Dashboards is automatically available at a URL like:

```
https://vpc-my-domain.us-east-1.es.amazonaws.com/_dashboards
```

For VPC-based domains, you need network access to the VPC. Options include:

- SSH tunnel through a bastion host
- VPN connection
- Reverse proxy with authentication
- AWS Cognito integration (for web-based access)

Here's a quick SSH tunnel setup.

```bash
# Create an SSH tunnel through a bastion host
ssh -i bastion-key.pem -L 9200:vpc-my-domain.us-east-1.es.amazonaws.com:443 ec2-user@bastion-ip

# Then access Dashboards at https://localhost:9200/_dashboards
```

For Cognito-based access (recommended for teams), configure it during domain setup.

```bash
aws opensearch update-domain-config \
  --domain-name my-search-domain \
  --cognito-options '{
    "Enabled": true,
    "UserPoolId": "us-east-1_ABcDeFgHi",
    "IdentityPoolId": "us-east-1:12345678-abcd-efgh-ijkl-123456789",
    "RoleArn": "arn:aws:iam::123456789:role/CognitoAccessForOpenSearch"
  }'
```

## Setting Up Index Patterns

Before you can visualize anything, Dashboards needs to know which indices to query. Create an index pattern.

1. Open Dashboards and go to **Management > Index Patterns**
2. Enter a pattern like `app-logs-*` to match all your log indices
3. Select `@timestamp` as the time field
4. Click **Create index pattern**

You can also create index patterns via the API.

This creates an index pattern programmatically using the Dashboards saved objects API.

```bash
curl -XPOST "https://vpc-my-domain.us-east-1.es.amazonaws.com/_dashboards/api/saved_objects/index-pattern/app-logs" \
  -H "Content-Type: application/json" \
  -H "osd-xsrf: true" \
  -u admin:Admin\$ecure123! \
  -d '{
    "attributes": {
      "title": "app-logs-*",
      "timeFieldName": "@timestamp"
    }
  }'
```

## Discover: Exploring Your Data

The Discover tab is your starting point for data exploration. It shows raw documents with a time histogram and lets you filter, search, and drill down.

Useful search queries in the Discover search bar:

```
# Find all errors
level: "ERROR"

# Find errors in a specific service
level: "ERROR" AND service: "payment-service"

# Find slow requests
response_time_ms > 1000

# Full-text search in messages
message: "connection timeout"

# Combine conditions
level: "ERROR" AND response_time_ms > 500 AND NOT service: "health-check"
```

Save your commonly used searches for quick access later.

## Building Visualizations

Let's build the most useful visualizations for a monitoring dashboard.

### Error Rate Over Time (Line Chart)

Create a line chart showing the error rate per service.

1. Go to **Visualize > Create visualization > Line**
2. Select your index pattern
3. Y-axis: **Count** of documents
4. X-axis: **Date Histogram** on `@timestamp` with 5-minute intervals
5. Split Series: **Terms** on `service.keyword`
6. Add a filter: `level: "ERROR"`

The equivalent can be done through the Vega visualization for more control.

This Vega spec creates a custom error rate chart with better formatting.

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "Error Rate by Service",
  "data": {
    "url": {
      "index": "app-logs-*",
      "body": {
        "size": 0,
        "query": {
          "bool": {
            "filter": [
              {"term": {"level": "ERROR"}},
              {"range": {"@timestamp": {"gte": "now-24h"}}}
            ]
          }
        },
        "aggs": {
          "time_buckets": {
            "date_histogram": {
              "field": "@timestamp",
              "fixed_interval": "5m"
            },
            "aggs": {
              "services": {
                "terms": {"field": "service.keyword", "size": 10}
              }
            }
          }
        }
      }
    },
    "format": {"property": "aggregations.time_buckets.buckets"}
  },
  "transform": [
    {"flatten": ["services.buckets"], "as": ["service_bucket"]},
    {
      "calculate": "datum.service_bucket.key",
      "as": "service"
    },
    {
      "calculate": "datum.service_bucket.doc_count",
      "as": "count"
    }
  ],
  "mark": "line",
  "encoding": {
    "x": {"field": "key", "type": "temporal", "title": "Time"},
    "y": {"field": "count", "type": "quantitative", "title": "Error Count"},
    "color": {"field": "service", "type": "nominal"}
  }
}
```

### Response Time Percentiles (Area Chart)

This shows p50, p95, and p99 response times.

1. Go to **Visualize > Create visualization > Area**
2. Y-axis: **Percentiles** on `response_time_ms` (50, 95, 99)
3. X-axis: **Date Histogram** on `@timestamp`

### Top Errors Table

Create a data table showing the most frequent error messages.

1. Go to **Visualize > Create visualization > Data Table**
2. Metric: **Count**
3. Bucket: **Terms** on `message.keyword`, size 20
4. Filter: `level: "ERROR"`
5. Sort by count descending

### Service Health Metric

A simple metric visualization showing the error percentage.

Use a TSVB (Time Series Visual Builder) for this:

1. Go to **Visualize > Create visualization > TSVB**
2. Add a metric panel
3. Aggregation: **Filter Ratio**
4. Numerator: `level: "ERROR"`
5. Denominator: `*` (all documents)
6. Format as percentage

## Building a Dashboard

Now combine your visualizations into a dashboard.

1. Go to **Dashboard > Create dashboard**
2. Click **Add** and select your saved visualizations
3. Arrange them by dragging and resizing
4. Add a time filter at the top (default to last 24 hours)
5. Save the dashboard

A good monitoring dashboard layout:

```
+-------------------+-------------------+-------------------+
|   Error Rate      |  Request Count    |  Avg Response     |
|   (Big Number)    |  (Big Number)     |  Time (Big Number)|
+-------------------+-------------------+-------------------+
|                                                           |
|              Error Rate Over Time (Line Chart)            |
|                                                           |
+-------------------+-------------------+-------------------+
|                   |                                       |
| Response Time     |     Status Code Distribution          |
| Percentiles       |     (Pie Chart)                       |
|                   |                                       |
+-------------------+-------------------+-------------------+
|                                                           |
|         Top Errors Table                                  |
|                                                           |
+-----------------------------------------------------------+
```

## Saved Queries and Filters

Save commonly used filters so your team can apply them with one click.

Here are some useful saved queries for an application monitoring dashboard:

```
# Production only
NOT environment: "staging" AND NOT environment: "dev"

# Specific service with errors
service: "api-gateway" AND level: "ERROR"

# Slow requests
response_time_ms: [1000 TO *]

# 5xx errors
status_code: [500 TO 599]

# Failed health checks
service: "health-check" AND status_code: [400 TO 599]
```

## Alerting

OpenSearch Dashboards includes an alerting plugin. Set up monitors that trigger when conditions are met.

Create a monitor using the Alerting API.

This creates an alerting monitor that fires when the error rate exceeds a threshold.

```bash
curl -XPOST "https://vpc-my-domain.us-east-1.es.amazonaws.com/_plugins/_alerting/monitors" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "type": "monitor",
    "name": "High Error Rate",
    "monitor_type": "query_level_monitor",
    "enabled": true,
    "schedule": {
      "period": {
        "interval": 5,
        "unit": "MINUTES"
      }
    },
    "inputs": [
      {
        "search": {
          "indices": ["app-logs-*"],
          "query": {
            "size": 0,
            "query": {
              "bool": {
                "filter": [
                  {"term": {"level": "ERROR"}},
                  {"range": {"@timestamp": {"gte": "now-5m"}}}
                ]
              }
            }
          }
        }
      }
    ],
    "triggers": [
      {
        "query_level_trigger": {
          "name": "Error spike",
          "severity": "1",
          "condition": {
            "script": {
              "source": "ctx.results[0].hits.total.value > 100",
              "lang": "painless"
            }
          },
          "actions": [
            {
              "name": "Notify team",
              "destination_id": "slack-destination-id",
              "message_template": {
                "source": "High error rate detected: {{ctx.results.0.hits.total.value}} errors in the last 5 minutes."
              }
            }
          ]
        }
      }
    ]
  }'
```

## Anomaly Detection

OpenSearch has built-in anomaly detection that can automatically find unusual patterns in your data.

```bash
curl -XPOST "https://vpc-my-domain.us-east-1.es.amazonaws.com/_plugins/_anomaly_detection/detectors" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "name": "Response Time Anomaly",
    "description": "Detect unusual response time patterns",
    "time_field": "@timestamp",
    "indices": ["app-logs-*"],
    "feature_attributes": [
      {
        "feature_name": "avg_response_time",
        "feature_enabled": true,
        "aggregation_query": {
          "avg_response": {
            "avg": {
              "field": "response_time_ms"
            }
          }
        }
      }
    ],
    "detection_interval": {
      "period": {
        "interval": 5,
        "unit": "Minutes"
      }
    },
    "category_field": ["service.keyword"]
  }'
```

## Sharing Dashboards

Export dashboards as saved objects for sharing across environments.

```bash
# Export a dashboard and all its dependencies
curl -XPOST "https://vpc-my-domain.us-east-1.es.amazonaws.com/_dashboards/api/saved_objects/_export" \
  -H "Content-Type: application/json" \
  -H "osd-xsrf: true" \
  -u admin:Admin\$ecure123! \
  -d '{
    "type": "dashboard",
    "includeReferencesDeep": true
  }' > dashboard-export.ndjson

# Import into another environment
curl -XPOST "https://vpc-other-domain.us-east-1.es.amazonaws.com/_dashboards/api/saved_objects/_import" \
  -H "osd-xsrf: true" \
  -u admin:Admin\$ecure123! \
  -F file=@dashboard-export.ndjson
```

For more on getting data into OpenSearch for visualization, check out our guide on [indexing data into Amazon OpenSearch](https://oneuptime.com/blog/post/index-data-into-amazon-opensearch/view). And for setting up the streaming pipeline that feeds your dashboards, see [Kinesis Firehose delivery to OpenSearch](https://oneuptime.com/blog/post/kinesis-firehose-data-delivery-to-opensearch/view).

OpenSearch Dashboards is powerful once you invest time in building the right visualizations. Start with a few key metrics, iterate based on what your team actually looks at, and resist the urge to put everything on a single dashboard. Focused dashboards that answer specific questions are far more useful than cluttered ones that try to show everything.
