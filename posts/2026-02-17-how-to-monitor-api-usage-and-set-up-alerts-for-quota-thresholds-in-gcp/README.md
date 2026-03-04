# How to Monitor API Usage and Set Up Alerts for Quota Thresholds in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, API Monitoring, Quotas, Cloud Monitoring, Google Cloud

Description: Learn how to monitor GCP API usage, track quota consumption, and set up alerts that notify you before hitting quota limits to prevent service disruptions.

---

Running into a GCP API quota limit in production is one of those problems that should never happen but keeps happening. Your application starts throwing 429 errors, users see failures, and it takes you a while to figure out that you hit the Compute Engine API's requests-per-minute limit. The fix is proactive monitoring - track your API usage and get alerted when you approach quota thresholds, not after you have blown past them.

This post covers how to monitor API usage in GCP, set up meaningful alerts for quota consumption, and request quota increases before they become emergencies.

## Understanding GCP Quotas

GCP quotas come in two flavors:

- **Rate quotas** - Limit the number of requests per time period (e.g., 100 requests per second to the Compute Engine API)
- **Allocation quotas** - Limit the total number of resources you can have (e.g., maximum 24 CPUs per region)

Both types can be monitored through Cloud Monitoring.

## Viewing Current Quota Usage

Start by checking what quotas you have and how much you are using:

```bash
# List all quotas for a specific service
gcloud services quotas list \
  --service=compute.googleapis.com \
  --project=my-project \
  --format="table(metric,unit,values.map().list())"
```

For a broader view across all services:

```bash
# Check quota usage for all services in a project
gcloud compute project-info describe \
  --project=my-project \
  --format="table(quotas.metric,quotas.limit,quotas.usage)"
```

For regional quotas:

```bash
# Check regional quota usage
gcloud compute regions describe us-central1 \
  --project=my-project \
  --format="table(quotas.metric,quotas.limit,quotas.usage)"
```

## Monitoring API Request Counts

Track how many API calls your project makes over time:

```bash
# Query API request counts for the last hour
gcloud monitoring time-series list \
  --project=my-project \
  --filter='metric.type="serviceruntime.googleapis.com/api/request_count"' \
  --interval-start-time=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --format="table(metric.labels.service,metric.labels.method,points.value.int64Value)" \
  --sort-by="~points.value.int64Value"
```

To focus on a specific API:

```bash
# Query request counts for Cloud Storage API specifically
gcloud monitoring time-series list \
  --project=my-project \
  --filter='metric.type="serviceruntime.googleapis.com/api/request_count" AND
            resource.labels.service="storage.googleapis.com"' \
  --interval-start-time=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --format="table(metric.labels.method,points.value.int64Value)"
```

## Monitoring Quota Usage Metrics

GCP provides specific metrics for quota monitoring:

```bash
# Query quota usage as a ratio (0 to 1, where 1 means 100% used)
gcloud monitoring time-series list \
  --project=my-project \
  --filter='metric.type="serviceruntime.googleapis.com/quota/allocation/usage" AND
            resource.labels.service="compute.googleapis.com"' \
  --interval-start-time=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --format="table(metric.labels.quota_metric,points.value)"
```

For rate quotas:

```bash
# Monitor rate quota consumption
gcloud monitoring time-series list \
  --project=my-project \
  --filter='metric.type="serviceruntime.googleapis.com/quota/rate/net_usage" AND
            resource.labels.service="compute.googleapis.com"' \
  --interval-start-time=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --format="table(metric.labels.quota_metric,points.value)"
```

## Creating Quota Alerts

### Alert When Approaching Allocation Quotas

Set up alerts at 80% utilization so you have time to react:

```bash
# Alert when Compute Engine CPU quota reaches 80% in a region
gcloud monitoring policies create \
  --display-name="CPU Quota 80% Alert" \
  --condition-display-name="CPU quota usage exceeds 80%" \
  --condition-filter='metric.type="compute.googleapis.com/quota/cpus_per_vm_family/usage" AND
                      resource.type="compute.googleapis.com/Location"' \
  --condition-threshold-value=0.8 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=my-project
```

### Alert on API Request Rate Spikes

Detect unusual spikes in API usage:

```bash
# Alert when API request count spikes above normal levels
gcloud monitoring policies create \
  --display-name="API Request Spike Alert" \
  --condition-display-name="Unusually high API request rate" \
  --condition-filter='metric.type="serviceruntime.googleapis.com/api/request_count" AND
                      resource.labels.service="compute.googleapis.com"' \
  --condition-threshold-value=1000 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=60s \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=my-project
```

### Alert on API Errors

Monitor for 429 errors (rate limit exceeded) so you know when throttling starts:

```bash
# Alert on API quota exceeded errors
gcloud monitoring policies create \
  --display-name="API Quota Exceeded Alert" \
  --condition-display-name="API returning 429 errors" \
  --condition-filter='metric.type="serviceruntime.googleapis.com/api/request_count" AND
                      metric.labels.response_code="429"' \
  --condition-threshold-value=0 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=60s \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=my-project
```

## Building a Quota Dashboard

Create a dashboard that shows quota utilization at a glance:

```bash
# Create a comprehensive quota monitoring dashboard
gcloud monitoring dashboards create --config='{
  "displayName": "API Usage and Quotas",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 12,
        "height": 4,
        "widget": {
          "title": "API Request Count by Service",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"serviceruntime.googleapis.com/api/request_count\""
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 4,
        "width": 12,
        "height": 4,
        "widget": {
          "title": "API Error Rate (4xx and 5xx)",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"serviceruntime.googleapis.com/api/request_count\" AND metric.labels.response_code>=monitoring.regex.full_match(\"4.*|5.*\")"
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 8,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Compute Engine CPU Quota Usage",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"compute.googleapis.com/quota/cpus_per_vm_family/usage\""
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 8,
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Cloud Storage API Request Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"serviceruntime.googleapis.com/api/request_count\" AND resource.labels.service=\"storage.googleapis.com\""
                }
              }
            }]
          }
        }
      }
    ]
  }
}'
```

## Requesting Quota Increases

When you see you are approaching a limit, request an increase before hitting it:

```bash
# View the current limit for a specific quota
gcloud compute project-info describe \
  --project=my-project \
  --format="table(quotas.metric,quotas.limit,quotas.usage)" \
  --flatten="quotas[]" \
  --filter="quotas.metric=CPUS"
```

Request an increase through the Console (IAM and Admin -> Quotas) or contact GCP support. Some quotas can be adjusted via self-service, while others require a support request.

## Automating Quota Monitoring

Create a script that generates a weekly quota report:

```bash
#!/bin/bash
# quota-report.sh - Generate a weekly quota utilization report

PROJECT="my-project"
echo "Quota Utilization Report for $PROJECT"
echo "Generated: $(date)"
echo "========================================="

# Check Compute Engine quotas
echo ""
echo "Compute Engine Quotas (regions with >50% usage):"
for region in us-central1 us-east1 europe-west1; do
  gcloud compute regions describe "$region" \
    --project="$PROJECT" \
    --format="csv[no-heading](quotas.metric,quotas.limit,quotas.usage)" | \
  while IFS=',' read -r metric limit usage; do
    if [ "$limit" != "0" ] && [ -n "$usage" ]; then
      pct=$(echo "scale=0; $usage * 100 / $limit" | bc 2>/dev/null)
      if [ -n "$pct" ] && [ "$pct" -gt 50 ]; then
        echo "  $region/$metric: $usage/$limit ($pct%)"
      fi
    fi
  done
done

# Check API request rates from the last day
echo ""
echo "Top API Consumers (last 24 hours):"
gcloud monitoring time-series list \
  --project="$PROJECT" \
  --filter='metric.type="serviceruntime.googleapis.com/api/request_count"' \
  --interval-start-time=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --format="table(resource.labels.service,points.value.int64Value)" 2>/dev/null | \
  sort -t$'\t' -k2 -rn | head -10
```

## Best Practices

Set alert thresholds at multiple levels: informational at 70% (for planning), warning at 85% (time to act), and critical at 95% (immediate action needed).

Monitor quotas across all regions where you deploy, not just your primary region. A new deployment in a secondary region might hit an untouched quota limit.

Keep a record of your quota increase requests and their outcomes. Some increases take days to process, so factor that into your planning.

Review API usage patterns monthly. A sudden increase in API calls might indicate a bug (like a retry loop without backoff) rather than legitimate growth.

## Summary

Proactive quota monitoring prevents the kind of outage where your application stops working because you hit an API rate limit or resource cap. Use Cloud Monitoring to track API request counts and quota utilization, set alerts at 80% thresholds, and build dashboards for visibility. Request quota increases ahead of time when you see growth trends. The goal is to never be surprised by a quota limit in production.
