# How to Connect Amazon Managed Grafana to X-Ray

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Grafana, X-Ray, Tracing, Observability, Distributed Tracing

Description: Connect Amazon Managed Grafana to AWS X-Ray for visualizing distributed traces and analyzing service performance in your dashboards

---

AWS X-Ray gives you distributed tracing for your applications. It tracks requests as they flow through your services, showing you where time is spent and where errors occur. Amazon Managed Grafana can connect to X-Ray as a data source, letting you visualize traces, service maps, and latency data directly in your dashboards.

This combination is powerful because you can correlate traces with metrics. See a spike in your CloudWatch error rate? Switch to the X-Ray panel on the same dashboard and drill into the actual traces that caused it. No context switching between tools.

This guide covers setting up the X-Ray data source in Managed Grafana, building trace visualization panels, and using the service map to understand your application topology.

## Prerequisites

You need:

- An Amazon Managed Grafana workspace (see [setting up Amazon Managed Grafana](https://oneuptime.com/blog/post/set-up-amazon-managed-grafana/view))
- Applications instrumented with X-Ray SDK or OpenTelemetry sending traces to X-Ray
- IAM permissions for the Grafana workspace role to query X-Ray

## Step 1: Configure IAM Permissions

Add X-Ray read permissions to your Grafana workspace role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "XRayReadAccess",
      "Effect": "Allow",
      "Action": [
        "xray:GetTraceSummaries",
        "xray:BatchGetTraces",
        "xray:GetServiceGraph",
        "xray:GetTraceGraph",
        "xray:GetInsightSummaries",
        "xray:GetInsight",
        "xray:GetGroups",
        "xray:GetGroup",
        "xray:GetTimeSeriesServiceStatistics",
        "xray:GetSamplingRules",
        "xray:GetSamplingStatisticSummaries"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
# Attach the X-Ray policy to the Grafana workspace role
aws iam put-role-policy \
  --role-name GrafanaWorkspaceRole \
  --policy-name XRayReadAccess \
  --policy-document file://xray-policy.json
```

## Step 2: Add X-Ray Data Source in Grafana

In the Grafana workspace UI:

1. Navigate to **Configuration > Data Sources > Add data source**
2. Select **AWS X-Ray**
3. Configure:

| Setting | Value |
|---------|-------|
| Auth Provider | AWS SDK Default |
| Default Region | us-east-1 |

4. Click **Save & Test**

The data source uses the workspace's IAM role for authentication. If the test succeeds, you are ready to build panels.

### Adding via API

```bash
# Add X-Ray data source via Grafana API
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://g-abc123.grafana-workspace.us-east-1.amazonaws.com/api/datasources" \
  -d '{
    "name": "AWS X-Ray",
    "type": "grafana-x-ray-datasource",
    "access": "proxy",
    "jsonData": {
      "authType": "default",
      "defaultRegion": "us-east-1"
    }
  }'
```

## Step 3: Explore Traces

The easiest way to start is with the Explore view.

1. Click the **Explore** icon (compass) in the left sidebar
2. Select your X-Ray data source
3. Choose a query type:

### Trace List Query

Shows a list of traces matching your filter criteria.

```
# Find traces with errors in the last hour
service("order-api") { error = true }
```

```
# Find slow traces (over 2 seconds)
service("order-api") { responsetime > 2 }
```

```
# Find traces for a specific URL
service("order-api") { http.url CONTAINS "/api/orders" }
```

### Trace Statistics Query

Shows aggregate statistics about your traces.

```
# Average response time by service
service("order-api")
```

### Service Map Query

Renders the X-Ray service map showing how services connect and where errors occur. Simply select "Service Map" as the query type - no filter expression needed.

## Step 4: Build X-Ray Dashboard Panels

Create panels that show trace data alongside your metrics.

### Panel 1: Service Latency Over Time

1. Add a new panel
2. Data source: AWS X-Ray
3. Query type: **Trace Statistics**
4. Filter: `service("order-api")`
5. Visualization: Time series graph

This shows how your service latency changes over time, broken down by the statistics X-Ray provides (average, p50, p90, p99).

### Panel 2: Error Trace List

1. Add a new panel
2. Data source: AWS X-Ray
3. Query type: **Trace List**
4. Filter: `service("order-api") { error = true }`
5. Visualization: Table

This gives you a clickable list of error traces. Click any trace ID to see the full trace waterfall.

### Panel 3: Service Map

1. Add a new panel
2. Data source: AWS X-Ray
3. Query type: **Service Map**
4. Visualization: Node Graph

The service map shows all your services and how they connect. Services with errors are highlighted in red. This is incredibly useful for spotting which downstream dependency is causing problems.

## Step 5: Correlate Metrics and Traces

The real power comes from putting metrics and traces on the same dashboard.

### Dashboard Layout for Debugging

**Row 1: Health Overview (CloudWatch metrics)**
- Lambda Error Rate (time series)
- API Gateway 5XX Count (stat panel)
- Average Response Time (gauge)

**Row 2: X-Ray Traces**
- Service Map (node graph - full width)

**Row 3: Deep Dive**
- Trace Latency Distribution (time series from X-Ray statistics)
- Recent Error Traces (table from X-Ray trace list)

When you spot an issue in the metrics row, scroll down to the trace panels to investigate the root cause. The time range syncs across all panels, so narrowing the time window on a metric spike automatically filters the traces too.

## Step 6: Use Filter Expressions

X-Ray filter expressions let you narrow down traces precisely.

### Common Filter Patterns

**By HTTP method and status:**

```
service("order-api") { http.method = "POST" AND http.status = 500 }
```

**By annotation (custom metadata):**

```
annotation.customer_tier = "premium"
```

**By response time range:**

```
service("order-api") { responsetime >= 1 AND responsetime <= 5 }
```

**By partial service match:**

```
service(id(name: "order", type: "AWS::Lambda::Function"))
```

**Combining multiple services:**

```
service("order-api") OR service("payment-api") { error = true }
```

## Step 7: Set Up Trace-Based Alerts

While X-Ray does not natively support alerting through Grafana, you can set up alerts based on X-Ray trace statistics.

1. Create a panel with X-Ray Trace Statistics query
2. Switch to the Alert tab
3. Set a condition: When average response time exceeds 3 seconds for 5 minutes

This gives you alerting based on actual trace data rather than just CloudWatch metrics.

## Cross-Account Tracing

If your application spans multiple AWS accounts, you can query X-Ray traces across accounts.

1. Set up X-Ray cross-account access with IAM roles
2. Add a separate X-Ray data source in Grafana for each account, using the Assume Role ARN
3. Use template variables to switch between accounts on your dashboard

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/GrafanaWorkspaceRole"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Best Practices

**Keep X-Ray trace volume manageable**: If you trace every single request, X-Ray costs add up and Grafana queries slow down. Use sampling rules to capture a representative sample.

```bash
# Create a sampling rule that captures 5% of requests
aws xray create-sampling-rule --cli-input-json '{
  "SamplingRule": {
    "RuleName": "default-low-rate",
    "Priority": 1000,
    "FixedRate": 0.05,
    "ReservoirSize": 1,
    "ServiceName": "*",
    "ServiceType": "*",
    "Host": "*",
    "ResourceARN": "*",
    "HTTPMethod": "*",
    "URLPath": "*",
    "Version": 1
  }
}'
```

**Use X-Ray groups**: Create X-Ray groups for specific services or error conditions, then filter your Grafana panels by group.

**Combine with CloudWatch Logs**: For the complete picture, add CloudWatch Logs panels to your dashboard. Metrics tell you something is wrong, traces tell you where, and logs tell you why.

For a broader observability setup, see our guide on [connecting Amazon Managed Grafana to Prometheus](https://oneuptime.com/blog/post/connect-amazon-managed-grafana-to-prometheus/view).

## Wrapping Up

X-Ray in Managed Grafana bridges the gap between high-level metrics and low-level traces. The service map gives you instant visibility into your application topology and health. Trace list panels let you drill into specific requests. And having all of this on the same dashboard as your CloudWatch metrics means you can go from detecting an issue to understanding its root cause without leaving Grafana. The setup is minimal - add the data source, build a few panels, and you have a comprehensive observability dashboard.
