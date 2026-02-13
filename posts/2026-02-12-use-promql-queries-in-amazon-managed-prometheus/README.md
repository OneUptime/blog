# How to Use PromQL Queries in Amazon Managed Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Prometheus, PromQL, Monitoring, Metrics, Observability, AMP

Description: A practical guide to writing PromQL queries in Amazon Managed Prometheus for analyzing application and infrastructure metrics effectively

---

PromQL is the query language for Prometheus. It is how you turn raw metrics into meaningful insights. You can calculate error rates, compute percentiles, aggregate across dimensions, and build the queries that power your Grafana dashboards and alerting rules.

Amazon Managed Prometheus (AMP) supports the full PromQL specification. Every query that works with open-source Prometheus works with AMP. The only difference is how you authenticate - AMP uses AWS SigV4 instead of open network access.

This guide covers practical PromQL patterns for the metrics you actually care about: request rates, error rates, latency, resource utilization, and alerting thresholds.

## Querying AMP

You can query AMP from Managed Grafana (the most common approach), from the command line using `awscurl`, or programmatically from your applications.

### From the Command Line

```bash
# Install awscurl for SigV4-authenticated requests
pip install awscurl

# Run a simple query
awscurl --service aps \
  --region us-east-1 \
  "https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-abc123/api/v1/query?query=up"

# Run a range query (for time series data)
awscurl --service aps \
  --region us-east-1 \
  "https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-abc123/api/v1/query_range?query=up&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z&step=60s"
```

### From Grafana

In Managed Grafana with a Prometheus data source connected to AMP, you write PromQL directly in the panel query editor. See [connecting Managed Grafana to Prometheus](https://oneuptime.com/blog/post/2026-02-12-connect-amazon-managed-grafana-to-prometheus/view) for setup details.

## PromQL Fundamentals

Before diving into patterns, here is a quick refresher on PromQL concepts.

**Instant vector**: A single value per time series at a given moment.

```promql
http_requests_total{service="order-api"}
```

**Range vector**: A series of values over a time window.

```promql
http_requests_total{service="order-api"}[5m]
```

**Scalar**: A single numeric value.

```promql
42
```

**Functions**: Transform vectors. `rate()`, `sum()`, `avg()`, `histogram_quantile()` are the most common.

## Request Rate Patterns

### Total Request Rate

The most basic and useful query. Calculate the per-second request rate over a 5-minute window.

```promql
# Total HTTP request rate across all services
sum(rate(http_requests_total[5m]))

# Request rate per service
sum(rate(http_requests_total[5m])) by (service)

# Request rate per endpoint
sum(rate(http_requests_total[5m])) by (service, method, path)
```

The `rate()` function calculates the per-second rate of increase for a counter metric. Always use `rate()` with counters - never display a raw counter value.

### Request Rate by Status Code

```promql
# Requests per second grouped by status code
sum(rate(http_requests_total[5m])) by (status_code)

# Only successful requests
sum(rate(http_requests_total{status_code=~"2.."}[5m]))

# Only error requests (4xx and 5xx)
sum(rate(http_requests_total{status_code=~"[45].."}[5m]))
```

## Error Rate Patterns

### Error Rate as a Percentage

```promql
# Error rate (5xx responses as a percentage of total requests)
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
* 100
```

This is one of the most important metrics for any service. If this number goes above your SLO threshold, something is wrong.

### Error Rate Per Service

```promql
# Error rate per service
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)
/
sum(rate(http_requests_total[5m])) by (service)
* 100
```

### Error Count with Rate

```promql
# Absolute error count per minute (easier to set alert thresholds)
sum(increase(http_requests_total{status_code=~"5.."}[1m])) by (service)
```

`increase()` is similar to `rate()` but gives you the total increase over the window rather than a per-second rate. It is more intuitive for alerting ("alert if more than 50 errors in 1 minute").

## Latency Patterns

### Latency Percentiles from Histograms

If your application exposes histogram metrics for request duration:

```promql
# 50th percentile (median) response time
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# 90th percentile
histogram_quantile(0.90, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# 99th percentile
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

The `le` label (less than or equal) is required in `histogram_quantile()`. It represents the bucket boundaries defined in your histogram.

### Latency Percentiles Per Service

```promql
# p99 latency per service
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

### Average Latency

```promql
# Average request duration
rate(http_request_duration_seconds_sum[5m])
/
rate(http_request_duration_seconds_count[5m])
```

Averages can be misleading because they hide outliers, but they are useful as a general trend indicator alongside percentiles.

## Resource Utilization Patterns

### CPU Usage

```promql
# CPU usage percentage per pod
sum(rate(container_cpu_usage_seconds_total{namespace="production"}[5m])) by (pod)
/
sum(kube_pod_container_resource_limits{namespace="production", resource="cpu"}) by (pod)
* 100

# CPU usage per node
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

### Memory Usage

```promql
# Memory usage as percentage of limit per pod
sum(container_memory_working_set_bytes{namespace="production"}) by (pod)
/
sum(kube_pod_container_resource_limits{namespace="production", resource="memory"}) by (pod)
* 100

# Memory usage per node in GB
node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes
```

### Disk Usage

```promql
# Disk usage percentage per node
(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"})
/ node_filesystem_size_bytes{mountpoint="/"} * 100
```

## Kubernetes-Specific Patterns

### Pod Restarts

```promql
# Pods that have restarted in the last hour
increase(kube_pod_container_status_restarts_total[1h]) > 0
```

### Pod Status

```promql
# Count of pods by status
sum(kube_pod_status_phase) by (phase)

# Pods not in Running state
kube_pod_status_phase{phase!="Running"} == 1
```

### Deployment Replicas

```promql
# Deployments where desired replicas does not match available
kube_deployment_spec_replicas - kube_deployment_status_available_replicas > 0
```

## Aggregation and Grouping

### sum, avg, min, max, count

```promql
# Total requests across all pods in a namespace
sum(rate(http_requests_total{namespace="production"}[5m]))

# Average CPU across all nodes
avg(rate(node_cpu_seconds_total{mode!="idle"}[5m]))

# Max memory usage across pods
max(container_memory_working_set_bytes{namespace="production"}) by (pod)

# Count of active pods per namespace
count(kube_pod_status_phase{phase="Running"}) by (namespace)
```

### topk and bottomk

```promql
# Top 5 pods by CPU usage
topk(5, sum(rate(container_cpu_usage_seconds_total[5m])) by (pod))

# Bottom 3 services by request rate (find underutilized services)
bottomk(3, sum(rate(http_requests_total[5m])) by (service))
```

## Alerting Query Patterns

These queries are designed for use in alerting rules.

### High Error Rate Alert

```promql
# Alert when error rate exceeds 5% for 5 minutes
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)
/
sum(rate(http_requests_total[5m])) by (service)
> 0.05
```

### High Latency Alert

```promql
# Alert when p99 latency exceeds 2 seconds
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))
> 2
```

### Pod Memory Pressure

```promql
# Alert when pod memory exceeds 90% of its limit
sum(container_memory_working_set_bytes) by (pod, namespace)
/
sum(kube_pod_container_resource_limits{resource="memory"}) by (pod, namespace)
> 0.9
```

For setting up these alerting rules in AMP, see our guide on [setting up alerting rules in Amazon Managed Prometheus](https://oneuptime.com/blog/post/2026-02-12-set-up-alerting-rules-in-amazon-managed-prometheus/view).

## Performance Tips for AMP Queries

1. **Always use label matchers**: `http_requests_total{service="order-api"}` is faster than `http_requests_total` followed by a `{service="order-api"}` filter.
2. **Avoid regex when possible**: Exact matches (`=`) are faster than regex (`=~`).
3. **Use recording rules for expensive queries**: If a query is used in multiple dashboards or alerts, pre-compute it with a recording rule.
4. **Mind the time range**: Querying 30 days of data with a 1-second step is expensive. Use appropriate step sizes for your time range.
5. **Limit label cardinality**: Metrics with high-cardinality labels (request IDs, user IDs) explode storage and slow down queries.

## Wrapping Up

PromQL is the foundation of your monitoring system. These patterns cover the most common use cases: request rates, error rates, latency percentiles, and resource utilization. Start with the basics, build dashboards around the RED method (Rate, Errors, Duration), and add complexity as needed. The key to effective PromQL is knowing which function to use: `rate()` for counters, `histogram_quantile()` for latency, and aggregation operators like `sum()` and `avg()` to roll up across dimensions.
