# How to Connect Amazon Managed Grafana to CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Grafana, CloudWatch, Monitoring, Observability, Dashboards

Description: Connect Amazon Managed Grafana to CloudWatch for building real-time monitoring dashboards with metrics, logs, and alarms visualization

---

CloudWatch is the default monitoring service for everything on AWS. Every Lambda invocation, every EC2 instance, every API Gateway request pushes metrics to CloudWatch. The data is already there. The challenge is making it visible and actionable.

Amazon Managed Grafana with a CloudWatch data source gives you the best of both worlds: CloudWatch's comprehensive data collection and Grafana's powerful visualization. You can build dashboards that pull metrics from multiple AWS services, overlay them, set up alerts, and share them with your team.

This guide covers connecting Managed Grafana to CloudWatch, writing CloudWatch queries in Grafana, building useful dashboards, and optimizing for cost and performance.

## Prerequisites

You need:

- An Amazon Managed Grafana workspace (see our guide on [setting up Amazon Managed Grafana](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-managed-grafana/view))
- CloudWatch metrics being collected (this happens automatically for most AWS services)
- Appropriate IAM permissions for the Grafana workspace role

## Step 1: Verify IAM Permissions

Your Grafana workspace's IAM role needs CloudWatch and CloudWatch Logs permissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:DescribeAlarmsForMetric",
        "cloudwatch:DescribeAlarmHistory",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:ListMetrics",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:GetInsightRuleReport"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:DescribeLogGroups",
        "logs:GetLogGroupFields",
        "logs:StartQuery",
        "logs:StopQuery",
        "logs:GetQueryResults",
        "logs:GetLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EC2DescribeForRegions",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeRegions"
      ],
      "Resource": "*"
    },
    {
      "Sid": "TagsForFiltering",
      "Effect": "Allow",
      "Action": [
        "tag:GetResources"
      ],
      "Resource": "*"
    }
  ]
}
```

The `tag:GetResources` permission is optional but highly recommended. It lets you filter metrics by resource tags in Grafana, which is incredibly useful for large environments.

## Step 2: Add the CloudWatch Data Source

In your Grafana workspace:

1. Go to **Configuration** (gear icon) > **Data Sources**
2. Click **Add data source**
3. Select **Amazon CloudWatch**
4. Configure the settings:

| Setting | Value |
|---------|-------|
| Auth Provider | AWS SDK Default |
| Default Region | us-east-1 (or your primary region) |
| Custom Metrics Namespace | Leave empty (discovers automatically) |
| Assume Role ARN | Leave empty (uses workspace role) |

5. Click **Save & Test**

If the test succeeds, you will see "Data source is working."

### Multi-Region Setup

You can query CloudWatch across multiple regions from a single data source. Set your default region, and then override per-panel when building dashboards.

For cross-account monitoring, use the **Assume Role ARN** field to assume a role in the target account.

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

## Step 3: Build CloudWatch Metric Panels

Grafana's CloudWatch query editor lets you browse namespaces, metrics, and dimensions visually.

### Example: Lambda Function Monitoring Panel

Create a new panel and configure the query:

- **Namespace**: AWS/Lambda
- **Metric name**: Invocations
- **Statistic**: Sum
- **Dimensions**: FunctionName = your-function-name
- **Period**: 5m

You can add multiple queries to the same panel. Add a second query for Errors, and you can see invocations and errors overlaid on the same graph.

### Using Math Expressions

CloudWatch Metrics Insights lets you calculate derived metrics directly in Grafana.

```
# Error rate as a percentage
# Query A: Errors (Sum)
# Query B: Invocations (Sum)
# Expression C:
METRICS("A") / METRICS("B") * 100
```

This gives you an error rate panel without needing to create a custom CloudWatch metric.

### CloudWatch Metrics Insights Queries

For more complex queries, use the Metrics Insights query language directly.

```sql
SELECT AVG(Duration)
FROM "AWS/Lambda"
WHERE FunctionName = 'order-processor'
GROUP BY FunctionName
ORDER BY AVG() DESC
LIMIT 10
```

This query shows the average duration for your Lambda function, which is useful for tracking performance trends.

## Step 4: Build CloudWatch Logs Panels

Grafana can query CloudWatch Logs using CloudWatch Logs Insights syntax.

### Example: Lambda Error Logs Panel

Create a panel with the CloudWatch Logs data source:

```
# Find all Lambda errors in the last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

### Example: API Gateway Request Analysis

```
# Top 10 most called API paths
fields @timestamp, httpMethod, resourcePath, status
| stats count(*) as requestCount by resourcePath, httpMethod
| sort requestCount desc
| limit 10
```

### Example: Slow Lambda Invocations

```
# Find Lambda invocations that took more than 5 seconds
filter @type = "REPORT"
| fields @requestId, @duration, @billedDuration, @memorySize, @maxMemoryUsed
| filter @duration > 5000
| sort @duration desc
| limit 20
```

## Step 5: Create a Comprehensive Dashboard

Here is a dashboard layout for monitoring a serverless application.

**Row 1: Overview Stats (Stat panels)**
- Total Lambda Invocations (last 24h)
- Total Errors (last 24h)
- Error Rate (percentage)
- Average Duration

**Row 2: Lambda Performance (Time series panels)**
- Invocations over time (per function)
- Error count over time
- Duration p50, p90, p99

**Row 3: API Gateway (Time series panels)**
- Request count by endpoint
- 4XX and 5XX error rates
- Latency distribution

**Row 4: DynamoDB (Time series panels)**
- Consumed Read/Write Capacity Units
- Throttled requests
- Successful request latency

**Row 5: SQS Queues (Stat + Time series)**
- Queue depth per queue
- Messages sent/received over time
- Age of oldest message

### Using Template Variables

Template variables make dashboards reusable. Create a variable that pulls Lambda function names dynamically.

1. Go to **Dashboard Settings > Variables > New**
2. Name: `function_name`
3. Type: Query
4. Data source: CloudWatch
5. Query type: Dimension Values
6. Region: us-east-1
7. Namespace: AWS/Lambda
8. Dimension Key: FunctionName

Now use `$function_name` in your panel queries. A dropdown at the top of the dashboard lets you switch between functions.

## Step 6: Configure Alerting

Set up alerts directly in Grafana panels.

1. Open a panel in edit mode
2. Go to the **Alert** tab
3. Define the alert condition:
   - **Evaluate every**: 1m
   - **For**: 5m (alert fires after condition is true for 5 minutes)
   - **Condition**: When the query result is above 10

4. Configure notification channels (SNS, Slack, PagerDuty)

### Example Alert: High Error Rate

```
Query A: CloudWatch - AWS/Lambda - Errors - Sum - 1m
Query B: CloudWatch - AWS/Lambda - Invocations - Sum - 1m
Expression C: A / B * 100

Alert condition: C > 5 (error rate above 5%)
For: 5m
```

## Cost Optimization

CloudWatch API calls from Grafana are not free. Each `GetMetricData` call costs $0.01 per 1,000 metrics requested. A dashboard with 20 panels, each querying 5 metrics, refreshing every 30 seconds, makes 24,000 API calls per hour.

Tips to reduce costs:

- **Increase refresh intervals**: Change from 30s to 5m for non-critical dashboards.
- **Use longer periods**: Query 5-minute or 15-minute periods instead of 1-minute.
- **Limit time ranges**: Default to last 3 hours instead of last 24 hours.
- **Use Metric Streams**: For high-frequency querying, push metrics to Managed Prometheus via CloudWatch Metric Streams and query Prometheus instead.

## Wrapping Up

CloudWatch and Managed Grafana together give you a powerful monitoring stack that requires zero infrastructure management. CloudWatch collects the metrics automatically from your AWS services, and Grafana provides the visualization layer. The key to a great dashboard is starting with the metrics that matter most to your team and iterating from there. Do not try to build the perfect dashboard on day one. Start with error rates and latency, then add deeper metrics as you learn what questions you need to answer.
