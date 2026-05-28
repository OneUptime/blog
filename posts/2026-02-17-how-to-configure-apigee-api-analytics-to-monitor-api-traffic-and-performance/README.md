# How to Configure Apigee API Analytics to Monitor API Traffic and Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apigee, GCP, API Analytics, Monitoring, API Management

Description: Learn how to use Apigee's built-in analytics to monitor API traffic patterns, track performance metrics, and gain insights into how developers use your APIs.

---

Apigee collects analytics data on every API request that passes through your proxies. This data tells you how many calls each developer is making, which endpoints are most popular, what the average response time is, and where errors are happening. The challenge is not collecting the data - Apigee handles that automatically. The challenge is configuring dashboards, custom reports, and alerts that surface the insights you actually need.

## What Apigee Analytics Collects Automatically

Out of the box, Apigee captures these metrics for every API call:

- Request timestamp
- Response status code
- Response time (total, proxy processing, target processing)
- Request and response message size
- API proxy name
- Developer app and API product
- Client IP address
- Request URI and verb
- Target URL
- Error codes and fault details

Analytics retention depends on your Apigee plan and whether the Apigee API Analytics add-on is enabled. For Pay-as-you-go organizations with the add-on enabled, analytics data is retained for 14 months.

## Accessing Analytics Through the API

The Apigee Analytics API lets you query traffic data programmatically. This is useful for building custom dashboards or integrating with other monitoring tools.

This query gets total traffic by API proxy for the past week:

```bash
# Get traffic volume per proxy for the last 7 days

curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/stats/apiproxy?select=sum(message_count)&timeRange=02/10/2026+00:00~02/17/2026+23:59&timeUnit=day" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

Query response times by proxy:

```bash
# Get average response time per proxy
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/stats/apiproxy?select=avg(total_response_time)&timeRange=02/10/2026+00:00~02/17/2026+23:59&timeUnit=hour" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

Get error rates:

```bash
# Get error count by response code
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/stats/response_status_code?select=sum(message_count)&timeRange=02/10/2026+00:00~02/17/2026+23:59&filter=(response_status_code+ge+400)" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Building Custom Reports

The Apigee Console includes a report builder, but you can also create reports programmatically.

### Traffic Overview Report

This report shows overall API health:

```bash
# Create a custom report for API health overview
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/reports" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "API Health Overview",
    "metrics": [
      {"name": "message_count", "function": "sum"},
      {"name": "is_error", "function": "sum"},
      {"name": "total_response_time", "function": "avg"},
      {"name": "total_response_time", "function": "max"}
    ],
    "dimensions": ["apiproxy"],
    "timeUnit": "hour",
    "sortByCols": ["sum(message_count)"],
    "sortOrder": "DESC",
    "limit": 10
  }'
```

### Developer Activity Report

Track how individual developers are using your API:

```bash
# Create a developer activity report
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/reports" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Developer Activity",
    "metrics": [
      {"name": "message_count", "function": "sum"},
      {"name": "total_response_time", "function": "avg"},
      {"name": "is_error", "function": "sum"}
    ],
    "dimensions": ["developer_email", "developer_app", "apiproduct"],
    "timeUnit": "day",
    "sortByCols": ["sum(message_count)"],
    "sortOrder": "DESC"
  }'
```

## Adding Custom Analytics Variables

You can enrich the default analytics with custom data from your API proxy. Use data collector resources with the DataCapture policy to capture custom dimensions and metrics.

Create the data collectors first:

```bash
# Create data collector resources for custom analytics fields
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/datacollectors" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dc_api_version",
    "description": "API version from the request header",
    "type": "STRING"
  }'

curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/datacollectors" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dc_client_platform",
    "description": "Client platform from the request header",
    "type": "STRING"
  }'

curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/datacollectors" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dc_client_region",
    "description": "Client region from the request header",
    "type": "STRING"
  }'
```

This policy collects custom analytics data:

```xml
<!-- apiproxy/policies/CollectAnalytics.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<DataCapture name="CollectAnalytics">
    <DisplayName>Collect Custom Analytics</DisplayName>
    <Capture>
        <!-- Custom dimension: API version from the request path -->
        <DataCollector>dc_api_version</DataCollector>
        <Collect ref="request.header.api-version" default="v1"/>
    </Capture>

    <Capture>
        <!-- Custom dimension: client platform from request header -->
        <DataCollector>dc_client_platform</DataCollector>
        <Collect ref="request.header.x-client-platform" default="unknown"/>
    </Capture>

    <Capture>
        <!-- Custom dimension: geographic region from request -->
        <DataCollector>dc_client_region</DataCollector>
        <Collect ref="request.header.x-client-region" default="unknown"/>
    </Capture>
</DataCapture>
```

Attach this policy to the response PostFlow so it captures data after the request is processed:

```xml
<PostFlow name="PostFlow">
    <Request/>
    <Response>
        <Step>
            <Name>CollectAnalytics</Name>
        </Step>
    </Response>
</PostFlow>
```

Now you can query these custom dimensions in your analytics reports:

```bash
# Query traffic by custom dc_api_version dimension
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/stats/dc_api_version?select=sum(message_count)&timeRange=02/10/2026+00:00~02/17/2026+23:59" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Exporting Analytics to BigQuery

For deeper analysis, export Apigee analytics data to BigQuery. This lets you run complex SQL queries, join with other data sources, and build dashboards in Looker Studio or Looker.

Create a datastore for the export destination with the API:

```bash
# Create a BigQuery export configuration
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/analytics/datastores" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "BigQuery Export",
    "targetType": "bigquery",
    "datastoreConfig": {
      "projectId": "YOUR_PROJECT_ID",
      "datasetName": "apigee_analytics",
      "tablePrefix": "api_"
    }
  }'
```

This creates the BigQuery datastore. To export analytics data, submit an export request that references the datastore returned by the API.

Once exported, run SQL queries against your API data:

```sql
-- Find the top 10 developers by API call volume this month
SELECT
  developer_email,
  developer_app,
  COUNT(*) as total_calls,
  AVG(total_response_time) as avg_response_ms,
  SUM(CASE WHEN response_status_code >= 400 THEN 1 ELSE 0 END) as error_count,
  ROUND(SUM(CASE WHEN response_status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as error_rate
FROM
  `YOUR_PROJECT_ID.apigee_analytics.api_*`
WHERE
  _TABLE_SUFFIX >= '20260201'
GROUP BY
  developer_email, developer_app
ORDER BY
  total_calls DESC
LIMIT 10;
```

```sql
-- Identify slow endpoints (p95 response time)
SELECT
  apiproxy,
  proxy_pathsuffix,
  request_verb,
  COUNT(*) as call_count,
  APPROX_QUANTILES(total_response_time, 100)[OFFSET(95)] as p95_response_ms,
  AVG(total_response_time) as avg_response_ms
FROM
  `YOUR_PROJECT_ID.apigee_analytics.api_*`
WHERE
  _TABLE_SUFFIX >= '20260210'
GROUP BY
  apiproxy, proxy_pathsuffix, request_verb
HAVING
  call_count > 100
ORDER BY
  p95_response_ms DESC
LIMIT 20;
```

## Setting Up Alerts

Configure alerts to notify you when API metrics cross thresholds. For Apigee X and supported Apigee hybrid versions, create alerting policies in Cloud Monitoring by using the `apigee.googleapis.com` metric types.

### Alert for High Error Rate

```bash
# Create an alert for any 5xx proxy responses
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/YOUR_PROJECT_ID/alertPolicies" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Apigee 5xx Response Alert",
    "conditions": [
      {
        "displayName": "5xx responses in prod",
        "conditionThreshold": {
          "filter": "resource.type=\"apigee.googleapis.com/Proxy\" AND metric.type=\"apigee.googleapis.com/proxy/response_count\" AND metric.labels.response_code >= 500 AND metric.labels.response_code < 600 AND resource.labels.env = \"prod\"",
          "aggregations": [
            {
              "alignmentPeriod": "60s",
              "perSeriesAligner": "ALIGN_RATE",
              "crossSeriesReducer": "REDUCE_SUM"
            }
          ],
          "comparison": "COMPARISON_GT",
          "thresholdValue": 0,
          "duration": "300s"
        }
      }
    ],
    "combiner": "OR",
    "documentation": {
      "content": "Check backend health, review recent deployments, and check target server connectivity.",
      "mimeType": "text/markdown"
    },
    "enabled": true
  }'
```

### Alert for Latency Spike

```bash
# Create an alert for p95 latency exceeding 2 seconds
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/YOUR_PROJECT_ID/alertPolicies" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Apigee P95 Latency Alert",
    "conditions": [
      {
        "displayName": "P95 proxy latency exceeds 2000ms",
        "conditionThreshold": {
          "filter": "resource.type=\"apigee.googleapis.com/Proxy\" AND metric.type=\"apigee.googleapis.com/proxy/latencies\" AND resource.labels.env = \"prod\"",
          "aggregations": [
            {
              "alignmentPeriod": "60s",
              "perSeriesAligner": "ALIGN_PERCENTILE_95",
              "crossSeriesReducer": "REDUCE_MAX"
            }
          ],
          "comparison": "COMPARISON_GT",
          "thresholdValue": 2000,
          "duration": "300s"
        }
      }
    ],
    "combiner": "OR",
    "enabled": true
  }'
```

## Visualizing Analytics with Dashboards

For a comprehensive view, create a dashboard that combines multiple metrics.

In the Google Cloud console, go to Apigee > Analytics > Custom reports and build a dashboard with these panels:

1. **Traffic Volume** - total requests over time, grouped by proxy
2. **Error Rate** - percentage of 4xx and 5xx responses over time
3. **Response Time** - average and p95 latency over time
4. **Top Developers** - ranking by call volume
5. **Geographic Distribution** - requests by region (if using custom analytics)
6. **Endpoint Popularity** - most called paths

## Integrating with Cloud Monitoring

You can also send Apigee metrics to Google Cloud Monitoring for unified observability.

Apigee metrics appear under the `apigee.googleapis.com` metric namespace in Cloud Monitoring. From there, you can create dashboards and alerts that combine Apigee metrics with metrics from your backend services running on Cloud Run, GKE, or Compute Engine.

## Summary

Apigee analytics gives you deep visibility into API usage without any manual instrumentation. The built-in metrics cover traffic volume, response times, error rates, and developer activity. Extend the defaults with the DataCapture policy for custom dimensions, export to BigQuery for advanced SQL analysis, and set up alerts for error rate and latency thresholds. The combination of real-time dashboards in the Apigee Console and deep analysis in BigQuery gives you both operational awareness and strategic insights into how your APIs are being used.
