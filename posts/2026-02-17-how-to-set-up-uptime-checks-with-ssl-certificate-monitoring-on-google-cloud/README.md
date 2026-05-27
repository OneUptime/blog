# How to Set Up Uptime Checks with SSL Certificate Monitoring on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Uptime Checks, SSL Monitoring, Google Cloud Monitoring, HTTPS, Certificate Expiry

Description: Learn how to configure uptime checks and SSL certificate monitoring in Google Cloud Monitoring to detect outages and expiring certificates before they impact users.

---

SSL certificate expiration is one of those problems that should never cause an outage but regularly does. The certificate was set up months or years ago, the renewal reminder email went to someone who left the company, and suddenly your users are seeing "Your connection is not private" warnings. Combined with basic uptime monitoring, SSL certificate checks give you early warning of both availability issues and certificate problems.

Google Cloud Monitoring has built-in support for uptime checks that include SSL certificate validation and expiration monitoring. This post walks through setting them up, configuring alerts for both downtime and certificate expiration, and automating the whole thing across multiple endpoints.

## What Uptime Checks Do

An uptime check is a periodic probe that sends requests to your endpoint from multiple locations around the world. Cloud Monitoring supports HTTP, HTTPS, and TCP uptime checks. For HTTPS checks, the system also validates the SSL certificate and reports the number of days until expiration.

Each check runs every 1, 5, 10, or 15 minutes from up to 6 global locations. If the check fails from a configurable number of locations, it generates an alert.

## Creating a Basic HTTPS Uptime Check

Here is how to create an uptime check using the gcloud CLI:

```bash
# Create an HTTPS uptime check for your production website

gcloud monitoring uptime create \
  "Production Website - HTTPS" \
  --resource-type=uptime-url \
  --resource-labels=host=www.example.com,project_id=my-project \
  --path="/" \
  --port=443 \
  --protocol=https \
  --validate-ssl=true \
  --period=1 \
  --timeout=10 \
  --content-type=unspecified \
  --regions=usa-iowa,usa-oregon,usa-virginia,europe,asia-pacific,south-america \
  --project=my-project
```

You can also create uptime checks through the Cloud Console by navigating to Monitoring, then Uptime checks, and clicking "Create Uptime Check."

## Creating Uptime Checks with the API

For more control, use the Monitoring API directly. Here is a Python example:

```python
from google.cloud import monitoring_v3

def create_uptime_check(project_id, display_name, hostname, path="/"):
    """Create an HTTPS uptime check with SSL validation."""
    client = monitoring_v3.UptimeCheckServiceClient()
    project_name = f"projects/{project_id}"

    # Define the uptime check configuration
    config = monitoring_v3.UptimeCheckConfig()
    config.display_name = display_name

    # Set the monitored resource
    config.monitored_resource = {
        "type": "uptime_url",
        "labels": {
            "host": hostname,
        },
    }

    # Configure the HTTP check
    config.http_check = {
        "path": path,
        "port": 443,
        "use_ssl": True,
        "validate_ssl": True,
    }

    # Set accepted response codes
    config.http_check.accepted_response_status_codes = [
        monitoring_v3.UptimeCheckConfig.HttpCheck.ResponseStatusCode(
            status_class=monitoring_v3.UptimeCheckConfig.HttpCheck.ResponseStatusCode.StatusClass.STATUS_CLASS_2XX
        )
    ]

    # Check every 60 seconds
    config.period = {"seconds": 60}

    # Timeout after 10 seconds
    config.timeout = {"seconds": 10}

    # Check from multiple regions
    config.selected_regions = [
        monitoring_v3.UptimeCheckRegion.USA,
        monitoring_v3.UptimeCheckRegion.EUROPE,
        monitoring_v3.UptimeCheckRegion.ASIA_PACIFIC,
        monitoring_v3.UptimeCheckRegion.SOUTH_AMERICA,
    ]

    # Create the check
    result = client.create_uptime_check_config(
        parent=project_name,
        uptime_check_config=config,
    )

    print(f"Created uptime check: {result.name}")
    return result

# Create checks for multiple endpoints
endpoints = [
    ("Production Website", "www.example.com", "/"),
    ("API Endpoint", "api.example.com", "/health"),
    ("Admin Dashboard", "admin.example.com", "/login"),
    ("CDN Endpoint", "cdn.example.com", "/status"),
]

for display_name, hostname, path in endpoints:
    create_uptime_check("my-project", display_name, hostname, path)
```

## Setting Up SSL Certificate Expiration Alerts

When you enable SSL validation on an uptime check, Cloud Monitoring tracks the `monitoring.googleapis.com/uptime_check/time_until_ssl_cert_expires` metric. You can alert when the certificate is approaching expiration.

```bash
# Alert when SSL certificate expires within 30 days
cat > ssl-cert-expiring-30-days.json <<'EOF'
{
  "displayName": "SSL Certificate Expiring Soon",
  "documentation": {
    "content": "An SSL certificate is expiring within 30 days. Renew it immediately.",
    "mimeType": "text/markdown"
  },
  "notificationChannels": [
    "projects/my-project/notificationChannels/12345"
  ],
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "SSL cert expires within 30 days",
      "conditionThreshold": {
        "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/time_until_ssl_cert_expires\" AND resource.type=\"uptime_url\"",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_NEXT_OLDER"
          }
        ],
        "comparison": "COMPARISON_LT",
        "thresholdValue": 30,
        "duration": "600s",
        "trigger": {
          "count": 1
        }
      }
    }
  ]
}
EOF

gcloud monitoring policies create \
  --policy-from-file=ssl-cert-expiring-30-days.json \
  --project=my-project
```

It is a good practice to set up multiple alerts at different thresholds:

- **30 days**: Informational - creates a ticket
- **14 days**: Warning - notifies the team lead
- **7 days**: Critical - pages the on-call engineer

```bash
# Critical alert: SSL certificate expires within 7 days
cat > ssl-cert-expiring-7-days.json <<'EOF'
{
  "displayName": "CRITICAL: SSL Certificate Expiring in 7 Days",
  "notificationChannels": [
    "projects/my-project/notificationChannels/PAGERDUTY_CHANNEL"
  ],
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "SSL cert expires within 7 days",
      "conditionThreshold": {
        "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/time_until_ssl_cert_expires\" AND resource.type=\"uptime_url\"",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_NEXT_OLDER"
          }
        ],
        "comparison": "COMPARISON_LT",
        "thresholdValue": 7,
        "duration": "600s",
        "trigger": {
          "count": 1
        }
      }
    }
  ]
}
EOF

gcloud monitoring policies create \
  --policy-from-file=ssl-cert-expiring-7-days.json \
  --project=my-project
```

## Setting Up Downtime Alerts

Besides SSL monitoring, configure alerts for actual downtime:

```bash
# Alert when uptime check fails from multiple regions
cat > website-down.json <<'EOF'
{
  "displayName": "Website Down",
  "notificationChannels": [
    "projects/my-project/notificationChannels/12345"
  ],
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Uptime check failing",
      "conditionThreshold": {
        "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND resource.labels.host=\"www.example.com\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_NEXT_OLDER",
            "crossSeriesReducer": "REDUCE_COUNT_FALSE"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 1,
        "duration": "300s",
        "trigger": {
          "count": 1
        }
      }
    }
  ]
}
EOF

gcloud monitoring policies create \
  --policy-from-file=website-down.json \
  --project=my-project
```

## Building an SSL Certificate Dashboard

Create a dashboard that shows the SSL certificate status for all your monitored endpoints:

```json
{
  "displayName": "SSL Certificate Status",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 12,
        "height": 4,
        "widget": {
          "title": "Days Until SSL Certificate Expiry",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/time_until_ssl_cert_expires\" AND resource.type=\"uptime_url\"",
                    "aggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_NEXT_OLDER",
                      "groupByFields": ["resource.labels.host"]
                    }
                  }
                },
                "plotType": "LINE"
              }
            ],
            "yAxis": {
              "label": "Days until expiry",
              "scale": "LINEAR"
            }
          }
        }
      },
      {
        "width": 12,
        "yPos": 4,
        "height": 4,
        "widget": {
          "title": "Uptime Check Pass Rate",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\"",
                    "aggregation": {
                      "alignmentPeriod": "3600s",
                      "perSeriesAligner": "ALIGN_FRACTION_TRUE",
                      "groupByFields": ["resource.labels.host"]
                    }
                  }
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      }
    ]
  }
}
```

## Checking Uptime Check Status Programmatically

Build a script that reports on all your uptime checks and their SSL validation settings:

```python
def list_uptime_checks_with_ssl_status(project_id):
    """List all uptime checks and their SSL validation settings."""
    client = monitoring_v3.UptimeCheckServiceClient()

    project_name = f"projects/{project_id}"

    # List all uptime checks
    checks = client.list_uptime_check_configs(parent=project_name)

    for check in checks:
        hostname = check.monitored_resource.labels.get("host", "unknown")
        print(f"\nUptime Check: {check.display_name}")
        print(f"  Host: {hostname}")
        print(f"  SSL Validation: {check.http_check.validate_ssl}")
        print(f"  Period: {check.period.seconds}s")
        print(f"  Check ID: {check.name.split('/')[-1]}")

list_uptime_checks_with_ssl_status("my-project")
```

## Content Matching

You can also configure uptime checks to verify that the response body contains expected content. This catches cases where your server is responding with 200 OK but serving an error page:

```python
# Add content matching to the uptime check
config.content_matchers = [
    monitoring_v3.UptimeCheckConfig.ContentMatcher(
        content="Welcome to Example",
        matcher=monitoring_v3.UptimeCheckConfig.ContentMatcher.ContentMatcherOption.CONTAINS_STRING,
    )
]
```

## Summary

Uptime checks with SSL certificate monitoring give you a proactive way to catch both availability problems and certificate expiration before they impact users. Set up HTTPS uptime checks for every public endpoint, enable SSL validation, create alerts at 30-day, 14-day, and 7-day thresholds for certificate expiration, and build a dashboard that gives you a quick view of certificate status across all your domains. It takes less than an hour to set up and can prevent some of the most embarrassing and avoidable outages.
