# How to Set Up Uptime Checks in Cloud Monitoring for HTTP and HTTPS Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Uptime Checks, HTTP Monitoring, Availability

Description: Configure uptime checks in Google Cloud Monitoring to continuously monitor HTTP and HTTPS endpoints from multiple global locations and alert on downtime.

---

Knowing that your service is up and responding from the user's perspective is fundamental. Internal metrics might look fine, but if users in Europe cannot reach your API, that is a problem. Google Cloud Monitoring uptime checks probe your endpoints from multiple locations around the world at regular intervals. If an endpoint goes down or responds too slowly, you get an alert.

This guide covers setting up uptime checks for HTTP and HTTPS endpoints.

## How Uptime Checks Work

Cloud Monitoring sends HTTP or HTTPS requests to your specified URL from up to six global regions every 1 to 15 minutes. Each check evaluates whether the endpoint is reachable and whether the response meets your criteria (status code, response body content, latency).

If the check fails from a configurable number of regions, it is considered down. An alerting policy attached to the uptime check triggers your notification channels.

## Creating an Uptime Check via the Console

The quickest way to create an uptime check is through the Console.

1. Go to Monitoring and select Uptime Checks
2. Click Create Uptime Check
3. Choose the protocol (HTTP or HTTPS)
4. Enter the hostname and path
5. Configure the check frequency and regions
6. Set up the alert policy and notification channel

## Creating an Uptime Check via gcloud

For automation and version control, use the gcloud CLI.

```bash
# Create an HTTPS uptime check for your API endpoint
gcloud monitoring uptime create my-api-check \
  --display-name="API Health Check" \
  --resource-type=uptime-url \
  --monitored-resource-labels="host=api.myapp.com" \
  --protocol=HTTPS \
  --path="/health" \
  --port=443 \
  --period=60 \
  --timeout=10s \
  --content-type=TYPE_UNSPECIFIED \
  --regions=USA,EUROPE,ASIA_PACIFIC
```

## Creating Uptime Checks with the API

For full control, define the uptime check as JSON and use the API.

```json
{
  "displayName": "Production API Health Check",
  "monitoredResource": {
    "type": "uptime_url",
    "labels": {
      "project_id": "my-project",
      "host": "api.myapp.com"
    }
  },
  "httpCheck": {
    "requestMethod": "GET",
    "path": "/health",
    "port": 443,
    "useSsl": true,
    "validateSsl": true,
    "acceptedResponseStatusCodes": [
      {
        "statusClass": "STATUS_CLASS_2XX"
      }
    ],
    "headers": {
      "User-Agent": "Google-Cloud-Monitoring-Uptime"
    }
  },
  "period": "60s",
  "timeout": "10s",
  "checkerType": "STATIC_IP_CHECKERS",
  "selectedRegions": [
    "USA",
    "EUROPE",
    "SOUTH_AMERICA",
    "ASIA_PACIFIC"
  ]
}
```

```bash
# Create the uptime check using the REST API
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/my-project/uptimeCheckConfigs" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @uptime-check.json
```

## Checking HTTPS Endpoints with SSL Validation

For HTTPS endpoints, you can validate the SSL certificate as part of the check. This catches expired or misconfigured certificates before they cause browser warnings for your users.

```json
{
  "displayName": "Website SSL Check",
  "monitoredResource": {
    "type": "uptime_url",
    "labels": {
      "project_id": "my-project",
      "host": "www.myapp.com"
    }
  },
  "httpCheck": {
    "path": "/",
    "port": 443,
    "useSsl": true,
    "validateSsl": true
  },
  "period": "300s",
  "timeout": "10s"
}
```

With `validateSsl: true`, the check fails if the SSL certificate is expired, self-signed, or has a hostname mismatch.

## Content Matching

Beyond checking that the endpoint returns a 200 status, you can verify the response body contains specific content. This catches cases where the endpoint is up but returning error pages or cached stale content.

```json
{
  "displayName": "API Content Check",
  "monitoredResource": {
    "type": "uptime_url",
    "labels": {
      "project_id": "my-project",
      "host": "api.myapp.com"
    }
  },
  "httpCheck": {
    "path": "/api/v1/status",
    "port": 443,
    "useSsl": true,
    "validateSsl": true
  },
  "contentMatchers": [
    {
      "content": "\"status\":\"healthy\"",
      "matcher": "CONTAINS_STRING"
    }
  ],
  "period": "60s",
  "timeout": "10s"
}
```

The content matcher checks that the response body includes `"status":"healthy"`. If the response does not contain this string, the check fails.

## Sending Custom Headers

Some endpoints require authentication or custom headers. You can include these in your uptime check.

```json
{
  "httpCheck": {
    "path": "/internal/health",
    "port": 443,
    "useSsl": true,
    "headers": {
      "Authorization": "Bearer your-monitoring-token",
      "X-Custom-Header": "uptime-check"
    }
  }
}
```

Be cautious with sensitive headers. The token value is stored in Cloud Monitoring and visible to anyone with access to the uptime check configuration.

## POST Request Checks

For endpoints that require POST requests, you can configure the method and body.

```json
{
  "httpCheck": {
    "requestMethod": "POST",
    "path": "/api/v1/healthcheck",
    "port": 443,
    "useSsl": true,
    "contentType": "APPLICATION_JSON",
    "body": "eyJ0eXBlIjoiaGVhbHRoY2hlY2sifQ=="
  }
}
```

The body is base64-encoded. The decoded value is `{"type":"healthcheck"}`.

## Creating an Alerting Policy for Uptime Checks

An uptime check by itself just collects data. To get notified when the check fails, create an alerting policy.

```json
{
  "displayName": "API Down Alert",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Uptime check failing",
      "conditionThreshold": {
        "filter": "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"my-api-check\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 1,
        "duration": "60s",
        "aggregations": [
          {
            "alignmentPeriod": "1200s",
            "perSeriesAligner": "ALIGN_NEXT_OLDER",
            "crossSeriesReducer": "REDUCE_COUNT_FALSE",
            "groupByFields": ["resource.label.*"]
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"],
  "documentation": {
    "content": "The API endpoint api.myapp.com/health is failing uptime checks from multiple regions.\n\nImmediate actions:\n1. Check the Cloud Run/GKE service status\n2. Verify the load balancer is routing traffic\n3. Check for recent deployments\n4. Review the uptime check details in Cloud Monitoring",
    "mimeType": "text/markdown"
  }
}
```

## Checking Internal Resources

Uptime checks typically target public endpoints. For internal resources (private IPs, internal load balancers), you can use private uptime checks that run from within your VPC.

```json
{
  "displayName": "Internal Service Check",
  "monitoredResource": {
    "type": "uptime_url",
    "labels": {
      "project_id": "my-project",
      "host": "10.0.1.50"
    }
  },
  "httpCheck": {
    "path": "/health",
    "port": 8080,
    "useSsl": false
  },
  "period": "60s",
  "timeout": "10s",
  "checkerType": "VPC_CHECKERS",
  "internalCheckers": []
}
```

Private uptime checks require a Service Directory service and a Cloud Monitoring uptime check that references it.

## Managing Uptime Checks

List, update, and delete uptime checks with the CLI.

```bash
# List all uptime checks
gcloud monitoring uptime list-configs

# Describe a specific uptime check
gcloud monitoring uptime describe my-api-check

# Delete an uptime check
gcloud monitoring uptime delete my-api-check
```

## Viewing Uptime Check Results

Cloud Monitoring automatically creates metrics for uptime check results. You can view these in the Metrics Explorer or on a dashboard.

The key metrics are:

- `monitoring.googleapis.com/uptime_check/check_passed` - Boolean indicating pass/fail
- `monitoring.googleapis.com/uptime_check/request_latency` - Response time in milliseconds

You can build a dashboard widget that shows uptime percentage over time.

## Best Practices

Here are recommendations from running uptime checks in production:

- Check from multiple regions. A single region might have network issues that do not affect real users.
- Set the check frequency based on your SLA requirements. If your SLA promises 99.9% uptime, checking every 5 minutes gives you enough data points.
- Use content matching for critical endpoints. A 200 status with an error message in the body is still a failure from the user's perspective.
- Keep check timeouts reasonable. 10 seconds is a good default. If your endpoint regularly takes longer than 10 seconds to respond, that is a performance issue worth investigating.
- Create separate checks for different functionality. One check for the homepage, one for the API, one for the admin panel. This helps you pinpoint which part of your system is affected.

## Summary

Uptime checks in Cloud Monitoring give you external visibility into your service health from the user's perspective. By probing your HTTP and HTTPS endpoints from multiple global regions, they catch availability issues that internal monitoring might miss. Combined with alerting policies and notification channels, uptime checks ensure you know about downtime before your users report it.
