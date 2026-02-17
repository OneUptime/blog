# How to Monitor and Alert on Log-Based Metrics in Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Cloud Logging, Log-Based Metrics, Alerting

Description: Learn how to create log-based metrics in Cloud Logging and set up alerting policies in Cloud Monitoring to catch issues before they affect your users.

---

There is a gap between reading logs and actually acting on them. You can stare at the Logs Explorer all day, but that does not scale. What you really want is to extract specific signals from your logs - things like error counts, latency values, or specific business events - and turn those into metrics you can chart and alert on.

Cloud Logging lets you do exactly this with log-based metrics. You define a filter and a metric type, and Cloud Logging counts or extracts values from matching log entries. Those metrics then show up in Cloud Monitoring, where you can build dashboards and set up alert policies.

## Types of Log-Based Metrics

There are two categories:

**Counter metrics** count the number of log entries that match a filter. For example, "how many 500 errors did my API return in the last 5 minutes?"

**Distribution metrics** extract numeric values from log entries and track their distribution. For example, "what is the latency distribution for database queries?"

Google also provides a bunch of system-defined log-based metrics out of the box (like `logging.googleapis.com/log_entry_count`), but the real power comes from creating your own.

## Creating a Counter Metric

Let's start with a counter metric that tracks HTTP 500 errors across all your services.

This gcloud command creates a counter metric that increments each time a log entry matches the filter.

```bash
# Create a counter metric for HTTP 500 errors
gcloud logging metrics create http-500-errors \
  --description="Count of HTTP 500 responses across all services" \
  --log-filter='httpRequest.status=500'
```

You can make the filter more specific if you need to. Here is one that only counts 500 errors from a particular Cloud Run service.

```bash
# Create a counter metric scoped to a specific Cloud Run service
gcloud logging metrics create api-500-errors \
  --description="Count of HTTP 500 errors from the API service" \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="api-service" AND httpRequest.status=500'
```

## Creating a Distribution Metric

Distribution metrics are more interesting because they capture the shape of a value, not just a count. Here is how to create one that tracks request latency from your application logs.

This metric extracts the latency value from a JSON field in your log entries and tracks its distribution.

```bash
# Create a distribution metric for API response latency
gcloud logging metrics create api-latency \
  --description="Distribution of API response latency in milliseconds" \
  --log-filter='resource.type="cloud_run_revision" AND jsonPayload.latency_ms IS NOT NULL' \
  --field-name="jsonPayload.latency_ms" \
  --bucket-boundaries="0,50,100,200,500,1000,2000,5000"
```

The `--bucket-boundaries` flag defines the histogram buckets. Choose boundaries that make sense for your use case. For latency, you usually want more granularity at the lower end.

## Adding Labels to Metrics

Labels let you break down metrics by dimensions like service name, endpoint, or environment. This is useful for filtering in dashboards and alerts.

Here is how to create a metric with custom labels using the API. The gcloud CLI has limited support for labels, so using a JSON definition is cleaner.

```bash
# Create a metric definition file with labels
cat > /tmp/metric-definition.json << 'JSONEOF'
{
  "name": "api-errors-by-endpoint",
  "description": "API errors broken down by endpoint and status code",
  "filter": "resource.type=\"cloud_run_revision\" AND httpRequest.status>=500",
  "metricDescriptor": {
    "metricKind": "DELTA",
    "valueType": "INT64",
    "labels": [
      {
        "key": "endpoint",
        "valueType": "STRING",
        "description": "The API endpoint path"
      },
      {
        "key": "status_code",
        "valueType": "STRING",
        "description": "HTTP status code"
      }
    ]
  },
  "labelExtractors": {
    "endpoint": "EXTRACT(httpRequest.requestUrl)",
    "status_code": "EXTRACT(httpRequest.status)"
  }
}
JSONEOF

# Create the metric using the REST API
curl -X POST \
  "https://logging.googleapis.com/v2/projects/YOUR_PROJECT_ID/metrics" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @/tmp/metric-definition.json
```

## Setting Up Alert Policies

Now for the part that actually wakes you up at 3 AM (or ideally prevents the need to). Once your log-based metrics exist in Cloud Monitoring, you can create alert policies against them.

Here is how to create an alert that fires when the HTTP 500 error rate exceeds 10 errors per minute.

```bash
# Create an alerting policy for the HTTP 500 error metric
gcloud monitoring policies create \
  --display-name="High 500 Error Rate" \
  --condition-display-name="500 errors exceed threshold" \
  --condition-filter='resource.type="global" AND metric.type="logging.googleapis.com/user/http-500-errors"' \
  --condition-threshold-value=10 \
  --condition-threshold-duration=60s \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-aggregation='{"alignmentPeriod":"60s","perSeriesAligner":"ALIGN_RATE"}' \
  --notification-channels="projects/YOUR_PROJECT_ID/notificationChannels/CHANNEL_ID"
```

For more complex alert configurations, Terraform gives you better control over all the parameters.

```hcl
# Alert policy that fires when 500 errors exceed 10 per minute
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "High 500 Error Rate"
  combiner     = "OR"

  conditions {
    display_name = "HTTP 500 error count exceeds threshold"

    condition_threshold {
      filter          = "resource.type = \"global\" AND metric.type = \"logging.googleapis.com/user/http-500-errors\""
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      duration        = "60s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  # Reference an existing notification channel
  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  # Alert auto-closes after 30 minutes of no violations
  alert_strategy {
    auto_close = "1800s"
  }
}

# Notification channel for email alerts
resource "google_monitoring_notification_channel" "email" {
  display_name = "Ops Team Email"
  type         = "email"

  labels = {
    email_address = "ops-team@yourcompany.com"
  }
}
```

## Creating a Dashboard

Metrics are more useful when you can see them. Here is how to add your log-based metrics to a Cloud Monitoring dashboard.

```bash
# Create a dashboard definition
cat > /tmp/dashboard.json << 'JSONEOF'
{
  "displayName": "Application Error Dashboard",
  "gridLayout": {
    "columns": 2,
    "widgets": [
      {
        "title": "HTTP 500 Errors per Minute",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"logging.googleapis.com/user/http-500-errors\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "API Latency Distribution",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"logging.googleapis.com/user/api-latency\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_99"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  }
}
JSONEOF

# Create the dashboard
gcloud monitoring dashboards create --config-from-file=/tmp/dashboard.json
```

## Best Practices

From running this in production, here is what I have learned:

1. **Keep filters specific**: Broad filters match more logs and cost more. A filter like `severity="ERROR"` matches everything - narrow it down to the errors you actually care about.

2. **Use rate-based alerts, not count-based**: Alerting on "more than 100 errors total" does not account for traffic volume. Alert on error rate instead.

3. **Set up multi-condition alerts**: Combine conditions like "error rate is high AND request volume is above minimum." This avoids noisy alerts during low-traffic periods where a single error looks like a spike.

4. **Watch your cardinality**: Labels on log-based metrics increase cardinality. If your "endpoint" label has 10,000 unique values, you will create 10,000 time series. That gets expensive.

5. **Test your alerts**: After creating a policy, trigger it deliberately to make sure notifications actually reach the right people.

## Wrapping Up

Log-based metrics bridge the gap between passive log storage and active monitoring. Create counter metrics for things you want to count, distribution metrics for things you want to measure, add labels for dimensions you want to filter by, and wire up alert policies so you know about problems before your users do. The setup takes 15 minutes and it transforms how you respond to incidents.
