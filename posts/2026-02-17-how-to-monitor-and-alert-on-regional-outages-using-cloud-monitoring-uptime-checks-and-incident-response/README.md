# How to Monitor and Alert on Regional Outages Using Cloud Monitoring Uptime Checks and Incident Response

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Uptime Checks, Incident Response, Alerting

Description: Learn how to set up comprehensive regional outage monitoring on GCP using Cloud Monitoring uptime checks, alerting policies, and automated incident response workflows.

---

Regional outages on cloud platforms are rare, but they happen. When they do, the teams that recover fastest are the ones with monitoring and alerting already in place. You should not find out about an outage from your customers complaining on Twitter. You should know within seconds, and your incident response should kick in automatically.

In this post, I will show you how to set up a robust monitoring and alerting system on GCP that detects regional outages quickly and triggers the right response.

## Setting Up Multi-Region Uptime Checks

Uptime checks are the foundation of outage detection. They probe your endpoints from multiple global locations, so even if one region is down, the checks from other regions will detect it.

```bash
# Create an HTTPS uptime check that runs from all available checker regions
gcloud monitoring uptime create \
  --display-name="Production API - Primary Region" \
  --uri="https://api.example.com/health" \
  --http-method=GET \
  --period=60 \
  --timeout=10 \
  --regions=USA,EUROPE,SOUTH_AMERICA,ASIA_PACIFIC \
  --matcher-content="healthy" \
  --matcher-type=CONTAINS_STRING \
  --project=my-project
```

But a single uptime check only tells you if the public endpoint is reachable. To detect specifically which region is having issues, create region-specific checks:

```bash
# Check each regional deployment directly using internal or region-specific URLs
gcloud monitoring uptime create \
  --display-name="API - us-central1" \
  --uri="https://us-central1-api.example.com/health" \
  --http-method=GET \
  --period=60 \
  --timeout=10 \
  --regions=USA,EUROPE,ASIA_PACIFIC

gcloud monitoring uptime create \
  --display-name="API - europe-west1" \
  --uri="https://europe-west1-api.example.com/health" \
  --http-method=GET \
  --period=60 \
  --timeout=10 \
  --regions=USA,EUROPE,ASIA_PACIFIC

gcloud monitoring uptime create \
  --display-name="API - asia-east1" \
  --uri="https://asia-east1-api.example.com/health" \
  --http-method=GET \
  --period=60 \
  --timeout=10 \
  --regions=USA,EUROPE,ASIA_PACIFIC
```

## Creating Alerting Policies for Outage Detection

Uptime checks generate metrics that you can build alerting policies around. The key is setting thresholds that avoid false positives while catching real outages quickly:

```bash
# Create an alerting policy that fires when an uptime check fails
# from more than one checker region for 2 consecutive checks
gcloud alpha monitoring policies create \
  --display-name="Regional Outage - us-central1" \
  --condition-display-name="us-central1 health check failing" \
  --condition-filter='resource.type="uptime_url" AND metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND metric.labels.check_id="us-central1-check"' \
  --condition-threshold-value=1 \
  --condition-threshold-comparison=COMPARISON_LT \
  --condition-threshold-duration=120s \
  --combiner=OR \
  --notification-channels=projects/my-project/notificationChannels/pagerduty-channel,projects/my-project/notificationChannels/slack-oncall
```

For a more sophisticated approach, use Terraform to define alerting policies with multiple conditions:

```hcl
# terraform/monitoring.tf
resource "google_monitoring_alert_policy" "regional_outage" {
  display_name = "Regional Outage Detection"
  combiner     = "OR"

  # Condition: us-central1 is down
  conditions {
    display_name = "us-central1 uptime check failing"

    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.us_central1.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "120s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }
    }
  }

  # Condition: europe-west1 is down
  conditions {
    display_name = "europe-west1 uptime check failing"

    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.europe_west1.uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "120s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.name,
    google_monitoring_notification_channel.slack.name,
  ]

  alert_strategy {
    auto_close = "1800s"
  }
}
```

## Building a Health Check Endpoint That Reports Regional Status

Your application health endpoint should do more than return 200 OK. It should check the health of regional dependencies:

```python
# health.py - Comprehensive health check endpoint
import os
import time
import psycopg2
from google.cloud import storage
from flask import Flask, jsonify

app = Flask(__name__)

REGION = os.environ.get('GCP_REGION', 'unknown')

def check_database():
    """Verify database connectivity and query latency."""
    start = time.time()
    try:
        conn = psycopg2.connect(
            os.environ['DATABASE_URL'],
            connect_timeout=3
        )
        cursor = conn.cursor()
        cursor.execute('SELECT 1')
        conn.close()
        latency = (time.time() - start) * 1000
        return {'status': 'healthy', 'latency_ms': round(latency, 2)}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}

def check_storage():
    """Verify Cloud Storage access from this region."""
    start = time.time()
    try:
        client = storage.Client()
        bucket = client.bucket(os.environ['HEALTH_CHECK_BUCKET'])
        blob = bucket.blob('health-check-marker')
        blob.download_as_text()
        latency = (time.time() - start) * 1000
        return {'status': 'healthy', 'latency_ms': round(latency, 2)}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}

@app.route('/health', methods=['GET'])
def health():
    """Full health check including all regional dependencies."""
    db_health = check_database()
    storage_health = check_storage()

    all_healthy = (
        db_health['status'] == 'healthy' and
        storage_health['status'] == 'healthy'
    )

    result = {
        'status': 'healthy' if all_healthy else 'degraded',
        'region': REGION,
        'timestamp': time.time(),
        'checks': {
            'database': db_health,
            'storage': storage_health
        }
    }

    status_code = 200 if all_healthy else 503
    return jsonify(result), status_code
```

## Automating Incident Response with Cloud Functions

When an alert fires, you want automated actions to start before a human even looks at the incident. Use Cloud Functions triggered by Pub/Sub to automate the first response:

```javascript
// cloud-function: autoIncidentResponse
// Triggered by alert notifications via Pub/Sub

const { CloudBuildClient } = require('@google-cloud/cloudbuild');
const { WebClient } = require('@slack/web-api');

const buildClient = new CloudBuildClient();
const slack = new WebClient(process.env.SLACK_TOKEN);

exports.handleAlert = async (message, context) => {
  // Parse the alert notification
  const alertData = JSON.parse(
    Buffer.from(message.data, 'base64').toString()
  );

  const incidentState = alertData.incident.state;
  const policyName = alertData.incident.policy_name;

  console.log(`Alert: ${policyName}, State: ${incidentState}`);

  if (incidentState !== 'open') {
    // Incident resolved, no action needed
    return;
  }

  // Determine which region is affected
  const affectedRegion = extractRegionFromPolicy(policyName);

  // Step 1: Post to incident Slack channel
  await slack.chat.postMessage({
    channel: '#incidents',
    text: `Regional outage detected in ${affectedRegion}.\n` +
          `Policy: ${policyName}\n` +
          `Automated failover initiating...`
  });

  // Step 2: Trigger the failover Cloud Build job
  const [operation] = await buildClient.runBuildTrigger({
    projectId: process.env.PROJECT_ID,
    triggerId: process.env.FAILOVER_TRIGGER_ID,
    source: {
      substitutions: {
        _AFFECTED_REGION: affectedRegion
      }
    }
  });

  console.log(`Failover build triggered: ${operation.name}`);

  // Step 3: Create an incident ticket
  await createIncidentTicket(affectedRegion, alertData);
};

function extractRegionFromPolicy(policyName) {
  // Extract region name from the alert policy name
  const regionMatch = policyName.match(/(us-\w+-\d|europe-\w+-\d|asia-\w+-\d)/);
  return regionMatch ? regionMatch[1] : 'unknown';
}
```

## Setting Up an Incident Response Dashboard

Create a custom Cloud Monitoring dashboard that gives your on-call team everything they need at a glance:

```json
{
  "displayName": "Regional Outage Response",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Uptime Check Results by Region",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"uptime_url\" AND metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_FRACTION_TRUE",
                    "groupByFields": ["metric.labels.checker_location"]
                  }
                }
              }
            }]
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Latency by Region",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_99",
                    "groupByFields": ["resource.labels.location"]
                  }
                }
              }
            }]
          }
        }
      },
      {
        "width": 12,
        "height": 4,
        "widget": {
          "title": "Error Rate by Region",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE",
                    "groupByFields": ["resource.labels.location"]
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
```

## Testing Your Alerting Pipeline

Never assume your alerts work. Test them regularly:

```bash
# Simulate a failing health check by deploying a broken version to one region
gcloud run deploy my-app \
  --image=gcr.io/my-project/my-app:broken-health \
  --region=us-central1 \
  --tag=chaos-test \
  --no-traffic

# Route a small percentage of traffic to the broken revision
gcloud run services update-traffic my-app \
  --region=us-central1 \
  --to-tags=chaos-test=10

# Monitor the alerts - they should fire within 2-3 minutes
# Then roll back
gcloud run services update-traffic my-app \
  --region=us-central1 \
  --to-latest
```

## Wrapping Up

Detecting regional outages is not just about having uptime checks - it is about having the right combination of monitoring, alerting, and automated response. Multi-region uptime checks catch failures from different vantage points. Region-specific health endpoints tell you exactly which region is affected. Automated incident response kicks off failover and notifies the right people before they even open their laptops.

Set this up before you need it. Test it quarterly. Update it when your architecture changes. The 30 minutes you spend setting up proper alerting will save you hours during an actual incident.
