# How to Monitor Cloud Function Execution Times and Error Rates with Cloud Monitoring Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Monitoring, Alerts, Cloud Monitoring

Description: Set up comprehensive monitoring and alerting for Google Cloud Functions execution times, error rates, and resource usage using Cloud Monitoring and custom metrics.

---

Deploying a Cloud Function is only half the job. Without monitoring, you are flying blind. Functions can fail silently, gradually slow down, or hit resource limits without anyone noticing until users start complaining. Cloud Monitoring gives you the metrics and alerting you need to catch problems early.

Let me walk through setting up monitoring that actually helps you keep your Cloud Functions healthy in production.

## Key Metrics to Monitor

Cloud Functions automatically reports several metrics to Cloud Monitoring. Here are the ones you should care about most:

### Built-in Metrics

- **cloudfunctions.googleapis.com/function/execution_times** - How long each invocation takes (distribution)
- **cloudfunctions.googleapis.com/function/execution_count** - Number of invocations
- **cloudfunctions.googleapis.com/function/active_instances** - Currently running instances
- **cloudfunctions.googleapis.com/function/user_memory_bytes** - Memory used by the function

For Gen 2 functions (running on Cloud Run), you also get:

- **run.googleapis.com/container/request_latencies** - Request latency distribution
- **run.googleapis.com/container/request_count** - Request count with status codes
- **run.googleapis.com/container/instance_count** - Active instance count
- **run.googleapis.com/container/memory/utilization** - Memory utilization ratio
- **run.googleapis.com/container/cpu/utilization** - CPU utilization ratio

## Setting Up Alerting Policies

### Alert on High Error Rates

This is the most important alert to set up. Create an alerting policy that fires when the error rate exceeds a threshold:

```bash
# Create a YAML file for the error rate alert policy
cat > error-rate-alert.yaml << 'YAMLEOF'
displayName: "Cloud Function High Error Rate"
documentation:
  content: "The error rate for this Cloud Function has exceeded 5% over the last 5 minutes."
  mimeType: "text/markdown"
conditions:
  - displayName: "Error rate > 5%"
    conditionMonitoringQueryLanguage:
      query: |
        fetch cloud_function
        | metric 'cloudfunctions.googleapis.com/function/execution_count'
        | align rate(5m)
        | every 1m
        | group_by [resource.function_name],
            [total: aggregate(val()),
             errors: aggregate(val(), filter(metric.status != 'ok'))]
        | map [error_rate: if(total > 0, errors / total * 100, 0)]
        | condition error_rate > 5
      duration: 300s
      trigger:
        count: 1
combiner: OR
alertStrategy:
  autoClose: 1800s
notificationChannels:
  - projects/my-project/notificationChannels/CHANNEL_ID
YAMLEOF

# Create the alert policy
gcloud monitoring policies create --from-file=error-rate-alert.yaml
```

### Alert on Slow Execution Times

Create an alert when p95 execution time exceeds your SLA:

```bash
# Alert on slow p95 execution times using gcloud
gcloud monitoring policies create \
  --display-name="Cloud Function Slow Execution" \
  --condition-display-name="p95 latency > 3 seconds" \
  --condition-filter='resource.type = "cloud_function" AND metric.type = "cloudfunctions.googleapis.com/function/execution_times"' \
  --condition-threshold-value=3000 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR
```

### Alert on High Memory Usage

Catch functions that are approaching their memory limit before they crash:

```bash
# Create a memory usage alert for Gen 2 functions
cat > memory-alert.yaml << 'YAMLEOF'
displayName: "Cloud Function High Memory Usage"
documentation:
  content: "Memory utilization has exceeded 80% of the allocated memory."
conditions:
  - displayName: "Memory utilization > 80%"
    conditionThreshold:
      filter: 'resource.type = "cloud_run_revision" AND metric.type = "run.googleapis.com/container/memory/utilization"'
      comparison: COMPARISON_GT
      thresholdValue: 0.8
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_PERCENTILE_95
          crossSeriesReducer: REDUCE_MAX
          groupByFields:
            - resource.label.service_name
      trigger:
        count: 1
combiner: OR
notificationChannels:
  - projects/my-project/notificationChannels/CHANNEL_ID
YAMLEOF

gcloud monitoring policies create --from-file=memory-alert.yaml
```

## Setting Up Notification Channels

Before creating alerts, set up where notifications should go:

```bash
# Create an email notification channel
gcloud monitoring channels create \
  --display-name="Team Email" \
  --type=email \
  --channel-labels="email_address=team@example.com"

# Create a Slack notification channel
gcloud monitoring channels create \
  --display-name="Alerts Slack Channel" \
  --type=slack \
  --channel-labels="channel_name=#alerts,auth_token=xoxb-your-token"

# Create a PagerDuty notification channel
gcloud monitoring channels create \
  --display-name="PagerDuty" \
  --type=pagerduty \
  --channel-labels="service_key=YOUR_PAGERDUTY_SERVICE_KEY"

# List all notification channels to get their IDs
gcloud monitoring channels list
```

## Custom Metrics

The built-in metrics cover the basics, but sometimes you need custom metrics for business-specific monitoring.

### Reporting Custom Metrics from Your Function

```javascript
// index.js - Cloud Function with custom metric reporting
const functions = require('@google-cloud/functions-framework');
const monitoring = require('@google-cloud/monitoring');

const metricsClient = new monitoring.MetricServiceClient();
const projectId = process.env.GCP_PROJECT;

// Report a custom metric to Cloud Monitoring
async function reportMetric(metricType, value, labels = {}) {
  const projectPath = metricsClient.projectPath(projectId);

  const timeSeriesData = {
    metric: {
      type: `custom.googleapis.com/${metricType}`,
      labels: labels
    },
    resource: {
      type: 'global',
      labels: { project_id: projectId }
    },
    points: [{
      interval: {
        endTime: { seconds: Math.floor(Date.now() / 1000) }
      },
      value: { doubleValue: value }
    }]
  };

  await metricsClient.createTimeSeries({
    name: projectPath,
    timeSeries: [timeSeriesData]
  });
}

functions.http('processOrder', async (req, res) => {
  const startTime = Date.now();
  let orderValue = 0;

  try {
    const order = req.body;
    orderValue = order.total || 0;

    // Process the order
    await processOrderLogic(order);

    // Report custom business metrics
    const processingTime = Date.now() - startTime;

    // Track order processing time separately from function execution time
    await reportMetric('orders/processing_time_ms', processingTime, {
      order_type: order.type || 'standard'
    });

    // Track order value for business monitoring
    await reportMetric('orders/value', orderValue, {
      currency: order.currency || 'USD'
    });

    // Track successful order count
    await reportMetric('orders/count', 1, {
      status: 'success'
    });

    res.json({ status: 'success', orderId: order.id });
  } catch (error) {
    // Track failed orders
    await reportMetric('orders/count', 1, {
      status: 'failed',
      error_type: error.name
    });

    throw error;
  }
});
```

### Creating the Custom Metric Descriptor

Before reporting custom metrics, create the metric descriptor:

```bash
# Create a custom metric descriptor using the API
gcloud monitoring metrics-descriptors create \
  custom.googleapis.com/orders/processing_time_ms \
  --type=custom.googleapis.com/orders/processing_time_ms \
  --metric-kind=gauge \
  --value-type=double \
  --description="Order processing time in milliseconds" \
  --display-name="Order Processing Time"
```

## Building a Monitoring Dashboard

Create a dashboard that gives you an overview of all your Cloud Functions:

```bash
# Create a monitoring dashboard
cat > dashboard.json << 'JSONEOF'
{
  "displayName": "Cloud Functions Overview",
  "gridLayout": {
    "columns": 2,
    "widgets": [
      {
        "title": "Execution Count by Function",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type = \"cloud_function\" AND metric.type = \"cloudfunctions.googleapis.com/function/execution_count\"",
                "aggregation": {
                  "alignmentPeriod": "300s",
                  "perSeriesAligner": "ALIGN_RATE",
                  "crossSeriesReducer": "REDUCE_SUM",
                  "groupByFields": ["resource.label.function_name"]
                }
              }
            }
          }]
        }
      },
      {
        "title": "Execution Time (p50, p95, p99)",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type = \"cloud_function\" AND metric.type = \"cloudfunctions.googleapis.com/function/execution_times\"",
                "aggregation": {
                  "alignmentPeriod": "300s",
                  "perSeriesAligner": "ALIGN_PERCENTILE_95"
                }
              }
            }
          }]
        }
      },
      {
        "title": "Error Rate by Function",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type = \"cloud_function\" AND metric.type = \"cloudfunctions.googleapis.com/function/execution_count\" AND metric.labels.status != \"ok\"",
                "aggregation": {
                  "alignmentPeriod": "300s",
                  "perSeriesAligner": "ALIGN_RATE",
                  "crossSeriesReducer": "REDUCE_SUM",
                  "groupByFields": ["resource.label.function_name"]
                }
              }
            }
          }]
        }
      },
      {
        "title": "Active Instances",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type = \"cloud_function\" AND metric.type = \"cloudfunctions.googleapis.com/function/active_instances\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_MEAN",
                  "crossSeriesReducer": "REDUCE_SUM",
                  "groupByFields": ["resource.label.function_name"]
                }
              }
            }
          }]
        }
      }
    ]
  }
}
JSONEOF

# Create the dashboard using the Monitoring API
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

## Log-Based Metrics for Custom Alerting

Create metrics from log patterns for more specific alerting:

```bash
# Create a metric that counts specific error types from logs
gcloud logging metrics create payment-processing-errors \
  --description="Count of payment processing failures" \
  --filter='resource.type="cloud_function"
    AND resource.labels.function_name="process-payment"
    AND severity>=ERROR
    AND jsonPayload.errorType="PaymentError"' \
  --metric-kind=delta \
  --value-type=int64

# Create an alert on this log-based metric
gcloud monitoring policies create \
  --display-name="Payment Processing Errors" \
  --condition-display-name="Payment errors > 5 in 10 minutes" \
  --condition-filter='metric.type = "logging.googleapis.com/user/payment-processing-errors"' \
  --condition-threshold-value=5 \
  --condition-threshold-duration=600s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR
```

## Uptime Checks for HTTP Functions

For HTTP-triggered functions, create uptime checks to monitor availability:

```bash
# Create an uptime check for an HTTP Cloud Function
gcloud monitoring uptime create my-api-health \
  --display-name="API Function Health Check" \
  --resource-type=uptime-url \
  --monitored-resource-labels="host=my-api-abc123-uc.a.run.app" \
  --http-request-method=GET \
  --http-request-path="/health" \
  --period=60 \
  --timeout=10s \
  --content-matchers-content="ok" \
  --content-matchers-matcher=CONTAINS_STRING
```

Make sure your function has a health check endpoint:

```javascript
// Add a lightweight health check endpoint
functions.http('handler', async (req, res) => {
  // Health check path returns immediately
  if (req.path === '/health') {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
    return;
  }

  // Regular function logic
  // ...
});
```

## Terraform Alerting Configuration

```hcl
# Notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Team Email"
  type         = "email"

  labels = {
    email_address = "team@example.com"
  }
}

# Error rate alert policy
resource "google_monitoring_alert_policy" "function_error_rate" {
  display_name = "Cloud Function Error Rate > 5%"
  combiner     = "OR"

  conditions {
    display_name = "Error rate exceeds threshold"

    condition_threshold {
      filter          = "resource.type = \"cloud_function\" AND metric.type = \"cloudfunctions.googleapis.com/function/execution_count\" AND metric.labels.status != \"ok\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.id
  ]

  alert_strategy {
    auto_close = "1800s"
  }
}
```

## Combining with OneUptime

While Cloud Monitoring handles GCP-native metrics well, tools like OneUptime provide a more unified monitoring experience across your entire stack. You can correlate Cloud Function performance with your frontend, databases, and external services in a single dashboard. This is especially valuable when debugging issues that span multiple services - a slow Cloud Function might be caused by a slow database query, and seeing both metrics together makes the root cause obvious.

Set up alerts on the metrics that matter most: error rates, latency percentiles, and memory utilization. Start with generous thresholds and tighten them as you learn your function's normal behavior. The goal is to catch problems before your users do.
