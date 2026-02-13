# How to Connect Amazon Managed Grafana to Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Grafana, Prometheus, Monitoring, Observability, AMP, Metrics

Description: Learn how to connect Amazon Managed Grafana to Amazon Managed Prometheus for querying and visualizing Prometheus metrics in dashboards

---

Amazon Managed Prometheus (AMP) collects and stores your Prometheus metrics. Amazon Managed Grafana visualizes them. Connecting the two gives you a fully managed monitoring stack where you write PromQL queries in Grafana dashboards and get real-time visibility into your applications.

This integration is one of the strongest reasons to use managed services for monitoring on AWS. You get the power of the Prometheus + Grafana ecosystem without managing either service yourself. No Prometheus servers to scale, no Grafana instances to patch.

This guide walks through connecting Managed Grafana to Managed Prometheus, writing PromQL queries in Grafana, and building dashboards that make your metrics useful.

## Prerequisites

You need:

- An Amazon Managed Grafana workspace. See our guide on [setting up Amazon Managed Grafana](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-managed-grafana/view).
- An Amazon Managed Prometheus workspace with metrics flowing in. See our guide on [setting up Amazon Managed Prometheus](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-managed-prometheus-amp/view).
- IAM permissions configured for cross-service access.

## Step 1: Configure IAM Permissions

Your Grafana workspace role needs permission to query the Managed Prometheus workspace.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AMPQueryAccess",
      "Effect": "Allow",
      "Action": [
        "aps:QueryMetrics",
        "aps:GetLabels",
        "aps:GetSeries",
        "aps:GetMetricMetadata",
        "aps:ListWorkspaces",
        "aps:DescribeWorkspace"
      ],
      "Resource": "arn:aws:aps:us-east-1:123456789012:workspace/*"
    }
  ]
}
```

If you want to restrict access to a specific AMP workspace, replace the wildcard with the workspace ARN.

```bash
# Attach the policy to the Grafana workspace role
aws iam put-role-policy \
  --role-name GrafanaWorkspaceRole \
  --policy-name AMPQueryAccess \
  --policy-document file://amp-query-policy.json
```

## Step 2: Get the AMP Workspace Endpoint

You need the remote query endpoint of your AMP workspace.

```bash
# Get the AMP workspace details
aws amp describe-workspace \
  --workspace-id ws-abc123-def456

# The endpoint will look like:
# https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-abc123-def456/
```

The query endpoint is the workspace endpoint with `/api/v1/query` appended, but Grafana handles this automatically. You just need the base workspace URL.

## Step 3: Add Prometheus Data Source in Grafana

In the Grafana UI:

1. Navigate to **Configuration > Data Sources > Add data source**
2. Select **Prometheus**
3. Configure:

| Setting | Value |
|---------|-------|
| Name | Amazon Managed Prometheus |
| URL | `https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-abc123-def456/` |
| Auth | SigV4 auth (enable this) |
| SigV4 Auth Details - Default Region | us-east-1 |
| SigV4 Auth Details - Auth Provider | AWS SDK Default (workspace role) |

4. Click **Save & Test**

The SigV4 authentication is the key setting. It tells Grafana to sign requests with AWS credentials, which is how AMP authenticates queries.

### Adding via Grafana API

```bash
# Add Prometheus data source via API
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://g-abc123.grafana-workspace.us-east-1.amazonaws.com/api/datasources" \
  -d '{
    "name": "Amazon Managed Prometheus",
    "type": "prometheus",
    "url": "https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-abc123-def456/",
    "access": "proxy",
    "jsonData": {
      "httpMethod": "POST",
      "sigV4Auth": true,
      "sigV4AuthType": "default",
      "sigV4Region": "us-east-1"
    }
  }'
```

## Step 4: Verify the Connection

After adding the data source, test it with a simple query.

1. Go to **Explore** (compass icon)
2. Select your Prometheus data source
3. Enter a query: `up`
4. Click **Run query**

The `up` metric shows all targets that Prometheus is scraping. If you see results, the connection is working.

## Step 5: Build Prometheus Dashboards

Now the fun part. Build dashboards using PromQL queries.

### Example: Kubernetes Pod Monitoring

If your AMP workspace is scraping EKS pods, you can build container monitoring dashboards.

**CPU Usage by Pod:**

```promql
sum(rate(container_cpu_usage_seconds_total{namespace="production"}[5m])) by (pod)
```

**Memory Usage by Pod:**

```promql
sum(container_memory_working_set_bytes{namespace="production"}) by (pod) / 1024 / 1024
```

**Pod Restart Count:**

```promql
sum(kube_pod_container_status_restarts_total{namespace="production"}) by (pod)
```

### Example: Application Metrics

If your application exposes custom Prometheus metrics, query them directly.

**HTTP Request Rate:**

```promql
sum(rate(http_requests_total{service="order-api"}[5m])) by (method, status_code)
```

**Request Latency Percentiles:**

```promql
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service="order-api"}[5m])) by (le))
```

**Error Rate:**

```promql
sum(rate(http_requests_total{service="order-api", status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total{service="order-api"}[5m]))
* 100
```

### Example: Node Metrics

If you are scraping node-exporter metrics:

**CPU Usage per Node:**

```promql
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Disk Usage:**

```promql
(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"})
/ node_filesystem_size_bytes{mountpoint="/"} * 100
```

## Step 6: Use Template Variables

Make dashboards dynamic with variables that pull values from Prometheus.

1. Dashboard Settings > Variables > New Variable
2. Type: Query
3. Data source: Amazon Managed Prometheus

**Namespace variable:**

```promql
label_values(kube_pod_info, namespace)
```

**Pod variable (filtered by namespace):**

```promql
label_values(kube_pod_info{namespace="$namespace"}, pod)
```

**Service variable:**

```promql
label_values(http_requests_total, service)
```

Now use `$namespace`, `$pod`, and `$service` in your panel queries. Users can filter dashboards using dropdowns.

## Step 7: Import Community Dashboards

Grafana has thousands of pre-built dashboards that work with Prometheus metrics. You can import them directly.

1. Go to **Dashboards > Import**
2. Enter a dashboard ID from grafana.com:
   - **315**: Kubernetes cluster monitoring
   - **3119**: Kubernetes cluster monitoring (via Prometheus)
   - **1860**: Node Exporter Full
   - **7362**: MySQL Overview

3. Select your Prometheus data source
4. Click Import

These give you a solid starting point that you can customize.

## Step 8: Configure Recording Rules

For complex queries that run frequently across dashboards, create recording rules in AMP to pre-compute results.

```yaml
# recording-rules.yaml
groups:
  - name: aggregated_metrics
    rules:
      - record: job:http_requests_total:rate5m
        expr: sum(rate(http_requests_total[5m])) by (job)

      - record: job:http_request_errors:rate5m
        expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (job)

      - record: job:http_error_rate:ratio5m
        expr: job:http_request_errors:rate5m / job:http_requests_total:rate5m
```

Recording rules reduce query load on both AMP and Grafana by pre-computing expensive queries into simple metrics.

For more on PromQL queries, see our guide on [using PromQL queries in Amazon Managed Prometheus](https://oneuptime.com/blog/post/2026-02-12-use-promql-queries-in-amazon-managed-prometheus/view).

## Multi-Account and Multi-Region Setup

For organizations with multiple AWS accounts, set up cross-account access.

1. In the target account, create a role with AMP query permissions and a trust policy for the Grafana account.
2. In Grafana, add a new Prometheus data source for each account, using the **Assume Role ARN** field.

For multi-region, add a separate data source for each region's AMP workspace. Use dashboard variables to switch between regions.

## Wrapping Up

Connecting Managed Grafana to Managed Prometheus gives you the industry-standard monitoring stack without any infrastructure to manage. The combination of PromQL's query power and Grafana's visualization capabilities covers most monitoring needs. Start with importing community dashboards for common infrastructure metrics, then build custom dashboards for your application-specific metrics. The key is keeping queries efficient - use recording rules for expensive calculations and template variables to make dashboards reusable across teams.
