# How to Use PromQL Queries in Cloud Monitoring Alerting Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, PromQL, Alerting, Observability

Description: Learn how to write PromQL queries for Google Cloud Monitoring alerting policies to build flexible, powerful alerts for your infrastructure and applications.

---

If you have been working with Prometheus or any Prometheus-compatible monitoring system, you probably already know PromQL - the Prometheus Query Language. Google Cloud Monitoring now supports PromQL natively in alerting policies, which means you can bring your existing PromQL knowledge directly into GCP without having to learn the Monitoring Query Language (MQL) from scratch.

In this post, I will walk you through how to set up alerting policies using PromQL queries in Cloud Monitoring, complete with practical examples you can adapt for your own projects.

## Why PromQL in Cloud Monitoring?

Before PromQL support was added, you had two main options for building alerting conditions in Cloud Monitoring: the visual metric selector (point-and-click) or MQL. Both work fine, but if your team already uses Prometheus or if you are running workloads on GKE with Managed Prometheus, PromQL lets you reuse the query patterns you already know.

A few reasons to consider PromQL for your alerting policies:

- Familiar syntax if you come from a Prometheus background
- Easier to share alert definitions across hybrid environments
- Works seamlessly with Google Cloud Managed Service for Prometheus
- Supports complex aggregations and mathematical operations

## Prerequisites

Before diving in, make sure you have:

- A GCP project with Cloud Monitoring enabled
- IAM role `roles/monitoring.alertPolicyEditor` or equivalent
- The `gcloud` CLI installed and configured
- Some metrics flowing into Cloud Monitoring (any will do for testing)

## Creating a PromQL-Based Alerting Policy via the Console

The most straightforward way to get started is through the Cloud Console.

1. Navigate to **Monitoring** > **Alerting** > **Create Policy**
2. Click **Select a metric** and switch to the **PromQL** tab
3. Write your PromQL query
4. Configure the alert duration and notification channels

Here is a simple example query that fires when CPU utilization on any Compute Engine instance exceeds 80 percent for more than 5 minutes:

```promql
# Alert when any VM instance CPU usage goes above 80%
compute_googleapis_com:instance_cpu_utilization
  > 0.80
```

The duration and evaluation window are configured separately in the alerting policy settings, not inside the query itself.

## Creating a PromQL-Based Alerting Policy with gcloud

For reproducibility and infrastructure-as-code workflows, you can define your alerting policy in JSON and apply it with `gcloud`. Here is an example JSON file that creates a PromQL-based alert for high CPU utilization.

The following JSON defines a complete alerting policy with a PromQL condition:

```json
{
  "displayName": "High CPU Utilization (PromQL)",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "CPU above 80%",
      "conditionPrometheusQueryLanguage": {
        "query": "avg by (instance_name)(compute_googleapis_com:instance_cpu_utilization) > 0.80",
        "duration": "300s",
        "evaluationInterval": "60s",
        "alertRule": "AlwaysOn"
      }
    }
  ],
  "notificationChannels": [],
  "alertStrategy": {
    "autoClose": "604800s"
  }
}
```

Apply this policy with the following command:

```bash
# Create the alerting policy from a JSON file
gcloud alpha monitoring policies create --policy-from-file=cpu-alert-policy.json
```

Note the `conditionPrometheusQueryLanguage` field - this is what tells Cloud Monitoring to treat the query as PromQL rather than MQL or a metric filter.

## Practical PromQL Query Examples for Alerting

Let me share some real-world queries I have used in production environments.

### Alerting on Memory Usage

This query calculates available memory as a percentage and fires when it drops below 20 percent:

```promql
# Alert when available memory drops below 20% of total
(compute_googleapis_com:instance_memory_available
  / compute_googleapis_com:instance_memory_total) < 0.20
```

### Alerting on HTTP Error Rates

If you are running a service and tracking HTTP requests, you can alert on error rates using a ratio:

```promql
# Alert when more than 5% of requests return 5xx errors
sum(rate(http_requests_total{response_code=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m])) > 0.05
```

### Alerting on GKE Pod Restart Rates

For GKE workloads, tracking pod restarts helps catch crashlooping containers early:

```promql
# Alert when any pod has restarted more than 5 times in the last hour
increase(kubernetes_io:container_restart_count[1h]) > 5
```

### Alerting on Disk Usage

This one watches for disks filling up:

```promql
# Alert when disk utilization exceeds 90%
compute_googleapis_com:instance_disk_utilization > 0.90
```

## Using Aggregation Functions

PromQL aggregation functions work as expected in Cloud Monitoring. You can use `sum`, `avg`, `min`, `max`, `count`, and others. Here is an example that averages CPU usage across all instances in a specific zone:

```promql
# Average CPU utilization across all VMs in us-central1-a
avg by (zone)(
  compute_googleapis_com:instance_cpu_utilization{zone="us-central1-a"}
)
```

You can also use the `without` clause to aggregate across everything except certain labels:

```promql
# Sum request counts across all dimensions except instance name
sum without (instance_name)(
  compute_googleapis_com:instance_network_received_bytes_count
)
```

## Key Differences from Standard Prometheus

While PromQL in Cloud Monitoring is largely compatible with standard Prometheus PromQL, there are a few things to keep in mind:

1. **Metric names use underscores and colons**: GCP metrics follow the format `service_googleapis_com:metric_name` rather than the typical Prometheus naming convention.

2. **Label names differ**: GCP uses its own label names like `project_id`, `zone`, and `instance_name` instead of what you might find in a standard Prometheus setup.

3. **Recording rules are not supported**: You cannot define recording rules in Cloud Monitoring. If you need pre-computed metrics, consider using Managed Prometheus with recording rules configured on the Prometheus side.

4. **Some functions have limitations**: While most PromQL functions work, some advanced functions may have partial support. Check the documentation for specifics.

## Using the Terraform Provider

If you manage your infrastructure with Terraform, you can define PromQL alerting policies using the `google_monitoring_alert_policy` resource. Here is an example:

```hcl
# Terraform resource for a PromQL-based alerting policy
resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "High CPU Utilization (PromQL)"
  combiner     = "OR"

  conditions {
    display_name = "CPU above 80%"

    condition_prometheus_query_language {
      query               = "avg by (instance_name)(compute_googleapis_com:instance_cpu_utilization) > 0.80"
      duration            = "300s"
      evaluation_interval = "60s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]
}
```

This approach keeps your alerting definitions version-controlled alongside your infrastructure code.

## Debugging PromQL Queries

When your alert is not firing as expected - or is firing too often - debugging the PromQL query is the first step.

Use the **Metrics Explorer** in Cloud Monitoring to test your PromQL queries interactively. Switch to the PromQL tab, paste your query, and you can see the results graphed over time. This is a fast way to validate that your query selects the right time series and that your thresholds make sense.

You can also use the Cloud Monitoring API to evaluate a query programmatically:

```bash
# Test a PromQL query using the API
curl -X POST \
  "https://monitoring.googleapis.com/v1/projects/YOUR_PROJECT_ID/location/global/prometheus/api/v1/query" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -d "query=compute_googleapis_com:instance_cpu_utilization"
```

## Best Practices

From my experience running PromQL-based alerts in production, here are a few tips:

- **Set reasonable evaluation intervals**: Too frequent evaluations create noise. For most infrastructure metrics, 60 seconds is a good starting point.
- **Use `for` durations wisely**: A 5-minute duration prevents transient spikes from triggering alerts, but delays notification of real problems. Balance based on the metric's volatility.
- **Label your alerts clearly**: Use descriptive display names so that on-call engineers can understand what triggered without reading the query.
- **Start with existing Prometheus alerts**: If you already have Prometheus alerting rules, port them over as a starting point and adjust metric names for GCP.

## Wrapping Up

PromQL support in Cloud Monitoring alerting policies bridges the gap between Prometheus-native workflows and GCP's managed monitoring stack. If your team already thinks in PromQL, you do not need to context-switch to MQL. You can write the same style of queries you are used to, with GCP handling the evaluation, notification, and incident management around them.

The key is remembering the metric naming differences and testing your queries in Metrics Explorer before wiring them into alerting policies. Once you have that workflow down, building and iterating on alerts becomes a lot faster.
