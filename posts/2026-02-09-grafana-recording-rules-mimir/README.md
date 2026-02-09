# How to configure Grafana recording rules in Mimir

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Mimir, Recording Rules

Description: Learn how to configure and manage Prometheus recording rules in Grafana Mimir to pre-compute expensive queries and improve dashboard performance.

---

Complex PromQL queries can slow down your dashboards, especially when aggregating data across thousands of time series. Recording rules solve this problem by pre-computing query results at regular intervals and storing them as new time series. Grafana Mimir provides a scalable platform for managing recording rules across multi-tenant environments.

## Understanding Recording Rules in Mimir

Recording rules evaluate PromQL expressions at specified intervals and save the results as new metrics. Instead of calculating an expensive aggregation every time someone loads a dashboard, you calculate it once per interval and query the pre-computed result.

Mimir extends Prometheus recording rules with multi-tenancy support, horizontal scalability, and centralized rule management. This makes recording rules practical for large-scale deployments.

## Setting Up Mimir Ruler

The Mimir ruler component evaluates recording and alerting rules. Enable it in your Mimir configuration:

```yaml
# mimir.yaml
ruler:
  enable_api: true
  enable_sharding: true
  rule_path: /data/ruler

  # Configure how often to evaluate rules
  evaluation_interval: 1m

  # Enable rule group sharding for scalability
  enable_sharding: true

  # External labels added to all metrics
  external_labels:
    cluster: production
    region: us-east-1

ruler_storage:
  backend: s3
  s3:
    bucket_name: mimir-rules
    endpoint: s3.amazonaws.com
```

The ruler needs access to the same time series data as query operations, so ensure it can reach your ingesters and store-gateways.

## Creating Your First Recording Rule

Recording rules are organized into rule groups. Each group evaluates at its specified interval.

```yaml
# recording-rules.yaml
name: http_metrics
interval: 30s
rules:
  - record: job:http_requests:rate5m
    expr: |
      sum by (job, status) (
        rate(http_requests_total[5m])
      )

  - record: job:http_request_duration:p95
    expr: |
      histogram_quantile(0.95,
        sum by (job, le) (
          rate(http_request_duration_seconds_bucket[5m])
        )
      )

  - record: instance:node_cpu:ratio
    expr: |
      1 - avg by (instance) (
        rate(node_cpu_seconds_total{mode="idle"}[5m])
      )
```

These rules pre-compute common metrics that would be expensive to calculate on every dashboard load.

## Loading Rules into Mimir

Upload rules to Mimir using the ruler API. Each tenant in Mimir has its own set of rules.

```bash
# Upload rules for a tenant
curl -X POST \
  -H "X-Scope-OrgID: tenant1" \
  -H "Content-Type: application/yaml" \
  --data-binary @recording-rules.yaml \
  http://mimir:8080/prometheus/config/v1/rules/http_metrics

# List all rule groups for a tenant
curl -X GET \
  -H "X-Scope-OrgID: tenant1" \
  http://mimir:8080/prometheus/config/v1/rules

# Get a specific rule group
curl -X GET \
  -H "X-Scope-OrgID: tenant1" \
  http://mimir:8080/prometheus/config/v1/rules/http_metrics
```

The X-Scope-OrgID header identifies which tenant's rules you're managing.

## Designing Effective Recording Rules

Good recording rules reduce query load without creating excessive new time series. Follow naming conventions that make it clear a metric is pre-computed:

```yaml
name: aggregation_rules
interval: 1m
rules:
  # Level 0 - basic aggregations
  - record: job:api_requests:rate1m
    expr: sum by (job) (rate(api_requests_total[1m]))

  # Level 1 - aggregations of level 0 metrics
  - record: service:api_requests:rate1m
    expr: sum by (service) (job:api_requests:rate1m)

  # Level 2 - aggregations of level 1 metrics
  - record: cluster:api_requests:rate1m
    expr: sum(service:api_requests:rate1m)
```

This hierarchical approach builds complex aggregations from simpler ones, reducing computation overhead.

## Managing Rule Groups with Terraform

Use Terraform to manage Mimir rules as code, enabling version control and reproducible deployments.

```hcl
# main.tf
terraform {
  required_providers {
    mimir = {
      source = "grafana/mimir"
      version = "~> 0.2"
    }
  }
}

provider "mimir" {
  ruler_uri = "http://mimir:8080"
  org_id    = "tenant1"
}

resource "mimir_rule_group_recording" "http_metrics" {
  name     = "http_metrics"
  interval = "30s"

  rule {
    record = "job:http_requests:rate5m"
    expr   = <<-EOT
      sum by (job, status) (
        rate(http_requests_total[5m])
      )
    EOT
  }

  rule {
    record = "job:http_request_duration:p95"
    expr   = <<-EOT
      histogram_quantile(0.95,
        sum by (job, le) (
          rate(http_request_duration_seconds_bucket[5m])
        )
      )
    EOT
  }
}
```

This makes rule management part of your infrastructure as code workflow.

## Monitoring Recording Rule Performance

Mimir exposes metrics about rule evaluation that help you understand performance and identify issues.

```promql
# Rule evaluation duration
cortex_ruler_group_evaluation_duration_seconds{rule_group="http_metrics"}

# Failed rule evaluations
rate(cortex_ruler_evaluation_failures_total[5m])

# Number of samples produced by rules
cortex_ruler_group_samples{rule_group="http_metrics"}

# Time since last evaluation
time() - cortex_ruler_group_last_evaluation_timestamp_seconds
```

Monitor these metrics to ensure your rules evaluate successfully and don't create too many time series.

## Optimizing Recording Rule Intervals

Choose evaluation intervals based on your query patterns and data resolution needs.

```yaml
name: high_frequency_rules
interval: 15s
rules:
  - record: instance:cpu:usage
    expr: 1 - rate(node_cpu_seconds_total{mode="idle"}[1m])

---
name: medium_frequency_rules
interval: 1m
rules:
  - record: job:requests:rate5m
    expr: sum by (job) (rate(http_requests_total[5m]))

---
name: low_frequency_rules
interval: 5m
rules:
  - record: daily:requests:total
    expr: sum(increase(http_requests_total[24h]))
```

High-frequency rules consume more resources but provide fresher data. Balance evaluation frequency against resource costs.

## Handling Rule Failures

Recording rules can fail if the underlying query returns unexpected results. Configure rules defensively:

```yaml
name: defensive_rules
interval: 1m
rules:
  # Handle missing labels gracefully
  - record: job:memory:usage_ratio
    expr: |
      (
        sum by (job) (container_memory_usage_bytes)
        /
        sum by (job) (container_memory_limit_bytes)
      ) or vector(0)

  # Clamp values to reasonable ranges
  - record: node:cpu:usage_percent
    expr: |
      clamp_max(
        clamp_min(
          100 - (rate(node_cpu_seconds_total{mode="idle"}[5m]) * 100),
          0
        ),
        100
      )
```

Using `or vector(0)` provides a default value when queries return no results, preventing gaps in recorded metrics.

## Multi-Tenant Rule Management

In multi-tenant Mimir deployments, isolate rules by tenant to prevent cross-tenant data access.

```bash
# Upload rules for tenant 1
curl -X POST \
  -H "X-Scope-OrgID: tenant1" \
  -H "Content-Type: application/yaml" \
  --data-binary @tenant1-rules.yaml \
  http://mimir:8080/prometheus/config/v1/rules/metrics

# Upload rules for tenant 2
curl -X POST \
  -H "X-Scope-OrgID: tenant2" \
  -H "Content-Type: application/yaml" \
  --data-binary @tenant2-rules.yaml \
  http://mimir:8080/prometheus/config/v1/rules/metrics
```

Each tenant's rules can only query their own metrics, maintaining data isolation.

## Testing Rules Before Deployment

Test recording rules in Grafana Explore before deploying them to Mimir.

```promql
# Test the rule query directly
sum by (job, status) (
  rate(http_requests_total[5m])
)

# Verify it returns expected results
# Check cardinality to ensure it won't create too many series
count(
  sum by (job, status) (
    rate(http_requests_total[5m])
  )
)
```

If the query works well in Explore, it will work as a recording rule.

## Querying Recorded Metrics

Once recording rules are active, query the recorded metrics like any other time series:

```promql
# Query the recorded metric instead of the expensive aggregation
job:http_requests:rate5m

# Filter recorded metrics
job:http_requests:rate5m{status="500"}

# Aggregate recorded metrics further
sum by (status) (job:http_requests:rate5m)
```

Dashboard load times improve significantly because you're querying pre-aggregated data instead of computing aggregations on raw metrics.

## Best Practices for Recording Rules

Name rules using the convention `level:metric:aggregation`. This makes it clear what the metric represents and how it was computed.

Keep rule groups small and focused. Large rule groups take longer to evaluate and are harder to debug.

Use recording rules for queries that run frequently across many dashboards, not one-off queries used in a single place.

Monitor the cardinality of recorded metrics. Rules that create millions of new time series can overwhelm your storage.

Document your rules with comments explaining what they compute and why they exist:

```yaml
name: documented_rules
interval: 1m
rules:
  # Pre-compute per-job request rates for the main dashboard
  # Used by: production overview dashboard, SLO calculations
  - record: job:http_requests:rate5m
    expr: sum by (job) (rate(http_requests_total[5m]))
```

Delete recording rules when they're no longer needed. Unused rules waste resources and add confusion.

Recording rules in Mimir provide the performance benefits of pre-aggregation with the scalability and multi-tenancy features needed for production environments. They transform slow dashboards into fast, responsive tools for monitoring your infrastructure.
