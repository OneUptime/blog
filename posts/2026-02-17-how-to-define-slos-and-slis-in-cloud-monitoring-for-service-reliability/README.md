# How to Define SLOs and SLIs in Cloud Monitoring for Service Reliability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, SLO, SLI, Site Reliability Engineering

Description: Define Service Level Objectives and Service Level Indicators in Google Cloud Monitoring to measure and track the reliability of your services programmatically.

---

Service Level Objectives (SLOs) and Service Level Indicators (SLIs) are the foundation of reliability engineering. An SLI measures how well your service is performing from the user's perspective. An SLO sets a target for that measurement. Together they answer the question: "Is this service reliable enough?" Google Cloud Monitoring has built-in support for defining SLOs and SLIs, tracking error budgets, and alerting when your service is burning through its budget too fast.

Let me show you how to set this up.

## SLI and SLO Basics

An SLI is a quantitative measure of service performance. Common SLIs include:

- Availability: The proportion of requests that succeed
- Latency: The proportion of requests served faster than a threshold
- Throughput: The proportion of time the service can handle expected load

An SLO is a target value for an SLI. For example: "99.9% of requests should succeed" or "95% of requests should complete in under 200ms."

The error budget is the gap between perfect (100%) and your SLO. A 99.9% availability SLO gives you a 0.1% error budget - that is how much downtime or errors are acceptable.

## Defining a Service in Cloud Monitoring

Before creating SLOs, you need a service defined in Cloud Monitoring. Cloud Monitoring can automatically detect services from GKE, Cloud Run, App Engine, and others. You can also create custom services.

```bash
# List auto-detected services
gcloud monitoring services list --project=my-project

# Create a custom service if yours is not auto-detected
gcloud monitoring services create my-api-service \
  --display-name="My API Service" \
  --project=my-project
```

## Creating an Availability SLO

The most common SLO is availability - the percentage of successful requests. Here is how to create one.

```bash
# Create a request-based availability SLO: 99.9% of requests should succeed
gcloud monitoring slos create \
  --service=my-api-service \
  --display-name="API Availability SLO" \
  --goal=0.999 \
  --rolling-period=30d \
  --request-based-sli \
  --project=my-project
```

For more control, define the SLO as JSON.

```json
{
  "displayName": "API Availability - 99.9%",
  "goal": 0.999,
  "rollingPeriod": "2592000s",
  "serviceLevelIndicator": {
    "basicSli": {
      "availability": {}
    }
  }
}
```

The `basicSli` with `availability` automatically uses the default good/total request metrics for the service type. For Cloud Run, this means successful HTTP responses divided by total HTTP responses.

## Creating a Latency SLO

A latency SLO targets the proportion of requests that complete within a time threshold.

```json
{
  "displayName": "API Latency - 95% under 200ms",
  "goal": 0.95,
  "rollingPeriod": "2592000s",
  "serviceLevelIndicator": {
    "basicSli": {
      "latency": {
        "threshold": "0.2s"
      }
    }
  }
}
```

This SLO says 95% of requests should complete in under 200 milliseconds over a 30-day rolling window.

## Using Request-Based SLIs with Custom Metrics

If the basic SLI does not fit your needs, you can define a request-based SLI using custom metrics or filtered built-in metrics.

```json
{
  "displayName": "Payment API Availability - 99.95%",
  "goal": 0.9995,
  "rollingPeriod": "2592000s",
  "serviceLevelIndicator": {
    "requestBased": {
      "goodTotalRatio": {
        "goodServiceFilter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"2xx\" AND resource.labels.service_name = \"payment-api\"",
        "totalServiceFilter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND resource.labels.service_name = \"payment-api\""
      }
    }
  }
}
```

The `goodServiceFilter` captures requests that are considered "good" (2xx responses), and `totalServiceFilter` captures all requests. The SLI is the ratio of good to total.

## Using Distribution-Based SLIs

For latency SLOs where you need to count the proportion of requests below a threshold from a distribution metric.

```json
{
  "displayName": "API Latency P95 Under 500ms",
  "goal": 0.95,
  "rollingPeriod": "2592000s",
  "serviceLevelIndicator": {
    "requestBased": {
      "distributionCut": {
        "distributionFilter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_latencies\" AND resource.labels.service_name = \"my-api\"",
        "range": {
          "min": 0,
          "max": 500
        }
      }
    }
  }
}
```

This counts the proportion of requests with latency between 0 and 500 milliseconds from the latency distribution metric.

## Window-Based SLIs

Instead of looking at individual requests, window-based SLIs evaluate whether each time window (like each minute) is "good" or "bad".

```json
{
  "displayName": "Service Uptime - 99.9%",
  "goal": 0.999,
  "rollingPeriod": "2592000s",
  "serviceLevelIndicator": {
    "windowsBased": {
      "windowPeriod": "60s",
      "goodBadMetricFilter": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class != \"5xx\" AND resource.labels.service_name = \"my-api\"",
      "metricMeanInRange": {
        "timeSeries": "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_latencies\" AND resource.labels.service_name = \"my-api\"",
        "range": {
          "max": 500
        }
      }
    }
  }
}
```

## Applying the SLO Configuration

Create the SLO using the API.

```bash
# Create an SLO from a JSON file
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/my-project/services/my-api-service/serviceLevelObjectives" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @slo-definition.json
```

## Viewing SLO Status and Error Budget

Once your SLO is defined, Cloud Monitoring tracks the current SLI value and error budget consumption.

```bash
# List SLOs for a service
gcloud monitoring slos list \
  --service=my-api-service \
  --project=my-project

# Describe a specific SLO to see current status
gcloud monitoring slos describe SLO_ID \
  --service=my-api-service \
  --project=my-project
```

The Google Cloud Console provides a dedicated SLO dashboard that shows:

- Current SLI compliance (are you meeting the target?)
- Error budget remaining (how much budget is left?)
- Error budget burn rate (how fast are you consuming the budget?)
- Historical compliance over the rolling window

## Creating Error Budget Burn Rate Alerts

The most useful alert for SLOs is a burn rate alert. Instead of alerting on raw metrics, it alerts when you are consuming your error budget faster than sustainable.

```json
{
  "displayName": "Fast Error Budget Burn - API Availability",
  "combiner": "AND",
  "conditions": [
    {
      "displayName": "Burn rate exceeds 10x in 1h window",
      "conditionThreshold": {
        "filter": "select_slo_burn_rate(\"projects/my-project/services/my-api-service/serviceLevelObjectives/SLO_ID\", \"3600s\")",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 10,
        "duration": "0s"
      }
    },
    {
      "displayName": "Burn rate exceeds 1x in 6h window",
      "conditionThreshold": {
        "filter": "select_slo_burn_rate(\"projects/my-project/services/my-api-service/serviceLevelObjectives/SLO_ID\", \"21600s\")",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 1,
        "duration": "0s"
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"],
  "documentation": {
    "content": "The API availability SLO error budget is being consumed at a high rate. At the current burn rate, the error budget will be exhausted before the end of the rolling window.\n\nCheck the SLO dashboard for details.",
    "mimeType": "text/markdown"
  }
}
```

This uses the multi-window, multi-burn-rate approach recommended by the Google SRE handbook. The 1-hour window with 10x burn rate catches fast-burning incidents. The 6-hour window with 1x burn rate catches slow burns that would eventually exhaust the budget.

## Choosing SLO Targets

Setting the right SLO target requires understanding your users and your system. Here are guidelines:

- Start with what you can actually achieve. If your service currently runs at 99.5% availability, setting a 99.99% SLO is not realistic.
- Consider user expectations. An internal tool might be fine at 99%. A payment processing service might need 99.99%.
- Account for dependencies. Your service cannot be more reliable than its dependencies.
- Leave room for error. If your infrastructure can deliver 99.95%, set the SLO at 99.9% to give yourself a buffer.

## Summary

SLOs and SLIs in Cloud Monitoring give you a structured way to measure and manage service reliability. By defining what "good" looks like for your service and setting targets, you create a shared understanding across your team. Error budget tracking tells you when to push for features versus when to invest in reliability. Burn rate alerts catch problems before they drain your budget. Start with a simple availability SLO, observe how it behaves, and refine from there.
