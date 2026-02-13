# How to Use Amazon Managed Grafana with CloudWatch Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Grafana, CloudWatch, Dashboards, Visualization

Description: Learn how to set up Amazon Managed Grafana and connect it to CloudWatch for creating rich, customizable monitoring dashboards for your AWS infrastructure.

---

CloudWatch dashboards get the job done, but they can feel limiting when you want rich visualizations, cross-account views, or dashboards that combine AWS metrics with data from other sources. That's where Amazon Managed Grafana comes in. It gives you the full power of Grafana without the operational burden of running it yourself.

Managed Grafana integrates natively with CloudWatch as a data source. You can build dashboards that pull from CloudWatch metrics, CloudWatch Logs, and X-Ray traces - all in a single pane of glass with Grafana's superior visualization capabilities.

## Why Grafana Over Native CloudWatch Dashboards?

Before we dive into setup, here's why you might want Grafana:

- **Better visualizations.** Grafana has more chart types, better styling options, and more flexible layouts
- **Template variables.** Create dynamic dashboards where users can switch between accounts, regions, or services using dropdowns
- **Alerting.** Grafana has its own alerting engine that can complement CloudWatch Alarms
- **Multiple data sources.** Combine CloudWatch data with Prometheus, Elasticsearch, or external APIs on a single dashboard
- **Annotations.** Overlay deployment markers, incident timelines, and other events on your graphs
- **Sharing.** Generate snapshots and links more easily than CloudWatch dashboards

## Setting Up Amazon Managed Grafana

### Step 1: Create a Workspace

```bash
# Create a Managed Grafana workspace
aws grafana create-workspace \
  --account-access-type CURRENT_ACCOUNT \
  --authentication-providers AWS_SSO \
  --permission-type SERVICE_MANAGED \
  --workspace-name "production-monitoring" \
  --workspace-description "Production infrastructure monitoring" \
  --workspace-data-sources CLOUDWATCH XRAY \
  --workspace-notification-destinations SNS
```

Note that `authentication-providers` is set to `AWS_SSO` (IAM Identity Center). This is the recommended auth method. You can also use SAML if your organization uses a different identity provider.

### Step 2: Set Up IAM Identity Center Users

If you haven't already, enable IAM Identity Center and create users who will access Grafana:

```bash
# Associate SSO users with the Grafana workspace
aws grafana update-workspace-authentication \
  --workspace-id g-abc123def4 \
  --authentication-providers AWS_SSO
```

Then in the Grafana workspace settings, assign users as either Viewers, Editors, or Admins.

### Step 3: Configure the CloudWatch Data Source

Amazon Managed Grafana can automatically configure CloudWatch as a data source if you selected it during workspace creation. To verify or add it manually:

1. Log into your Grafana workspace URL
2. Go to Configuration > Data Sources
3. Click "Add data source"
4. Select "CloudWatch"
5. Configure the authentication (service-managed role is simplest)

The service-managed IAM role is created automatically and includes permissions to read CloudWatch metrics, logs, and X-Ray data.

For cross-account access, you'll need to configure assume-role ARNs:

```json
// IAM role in the target account for cross-account Grafana access
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::SOURCE_ACCOUNT:role/AmazonGrafanaServiceRole"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Building CloudWatch Dashboards in Grafana

### Basic Metric Query

In the Grafana panel editor, select the CloudWatch data source and build a query:

- **Namespace:** AWS/EC2
- **Metric Name:** CPUUtilization
- **Dimensions:** InstanceId = i-0123456789abcdef0
- **Statistic:** Average
- **Period:** 5m

You can also write the query in Metric Math mode, which supports the same expressions as CloudWatch:

```
# Grafana CloudWatch query using Metric Math
SEARCH('{AWS/EC2, InstanceId} MetricName="CPUUtilization"', 'Average', 300)
```

### Using Template Variables

Template variables make dashboards reusable. Create a variable for EC2 instances:

1. Go to Dashboard Settings > Variables
2. Add a variable:
   - Name: `instance`
   - Type: Query
   - Data source: CloudWatch
   - Query type: Dimension Values
   - Region: us-east-1
   - Namespace: AWS/EC2
   - Metric: CPUUtilization
   - Dimension Key: InstanceId
   - Multi-value: Yes

Now in your panel queries, use `$instance` as the dimension value. Users can select one or more instances from a dropdown.

Here's a more advanced variable for selecting services:

```
# Variable query to list all ECS service names
namespace: AWS/ECS, metric: CPUUtilization, dimensionKey: ServiceName
```

### Example Dashboard JSON

Here's a Grafana dashboard JSON snippet showing common AWS monitoring panels:

```json
{
  "panels": [
    {
      "title": "EC2 CPU Utilization",
      "type": "timeseries",
      "datasource": "CloudWatch",
      "targets": [
        {
          "namespace": "AWS/EC2",
          "metricName": "CPUUtilization",
          "dimensions": {"InstanceId": ["$instance"]},
          "statistics": ["Average"],
          "period": "300"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"color": "green", "value": null},
              {"color": "yellow", "value": 70},
              {"color": "red", "value": 90}
            ]
          }
        }
      }
    },
    {
      "title": "ALB Request Count",
      "type": "timeseries",
      "datasource": "CloudWatch",
      "targets": [
        {
          "namespace": "AWS/ApplicationELB",
          "metricName": "RequestCount",
          "dimensions": {"LoadBalancer": ["$loadbalancer"]},
          "statistics": ["Sum"],
          "period": "60"
        }
      ]
    },
    {
      "title": "RDS Connections",
      "type": "gauge",
      "datasource": "CloudWatch",
      "targets": [
        {
          "namespace": "AWS/RDS",
          "metricName": "DatabaseConnections",
          "dimensions": {"DBInstanceIdentifier": ["$database"]},
          "statistics": ["Average"],
          "period": "300"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "max": 100,
          "thresholds": {
            "steps": [
              {"color": "green", "value": null},
              {"color": "yellow", "value": 60},
              {"color": "red", "value": 80}
            ]
          }
        }
      }
    }
  ]
}
```

## Querying CloudWatch Logs in Grafana

Grafana also supports CloudWatch Logs Insights queries:

1. Add a new panel
2. Select the CloudWatch data source
3. Switch to "CloudWatch Logs" query mode
4. Select your log group(s)
5. Write a Logs Insights query

```sql
-- Example: Error rate over time from application logs
filter @message like /ERROR/
| stats count(*) as error_count by bin(5m)
```

```sql
-- Example: Slowest Lambda invocations
filter @type = "REPORT"
| stats max(@duration) as max_duration, avg(@duration) as avg_duration by bin(5m)
```

These results render as tables or time series graphs, depending on the query output.

## Adding X-Ray as a Data Source

X-Ray data gives you trace analytics directly in Grafana:

1. Add the X-Ray data source (should be pre-configured if selected during workspace creation)
2. Create a panel with the X-Ray data source
3. Query types include:
   - Trace List: show individual traces
   - Trace Statistics: aggregate trace data
   - Trace Map: show service dependencies

```
# X-Ray query to find slow traces
filter expression: service("order-service") AND responsetime > 5
```

## Setting Up Grafana Alerts

Grafana has its own alerting engine that works alongside CloudWatch Alarms:

1. In the panel editor, go to the Alert tab
2. Click "Create alert rule from this panel"
3. Set conditions, for example: `WHEN avg() OF query(A, 5m, now) IS ABOVE 80`
4. Configure contact points (email, Slack, PagerDuty, etc.)
5. Set notification policies

This is useful when you want to alert on Grafana-specific calculations or combined data from multiple sources.

## Terraform Configuration

Here's a Terraform setup for Managed Grafana:

```hcl
# Terraform for Amazon Managed Grafana workspace
resource "aws_grafana_workspace" "production" {
  name                     = "production-monitoring"
  description              = "Production infrastructure monitoring"
  account_access_type      = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type          = "SERVICE_MANAGED"
  role_arn                 = aws_iam_role.grafana.arn

  data_sources = ["CLOUDWATCH", "XRAY"]

  configuration = jsonencode({
    plugins = {
      pluginAdminEnabled = true
    }
  })
}

resource "aws_iam_role" "grafana" {
  name = "AmazonGrafanaServiceRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "grafana.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "grafana_cloudwatch" {
  role       = aws_iam_role.grafana.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"
}

resource "aws_grafana_role_association" "admin" {
  role         = "ADMIN"
  user_ids     = ["user-id-from-sso"]
  workspace_id = aws_grafana_workspace.production.id
}
```

## Dashboard Design Tips

**Use consistent color schemes.** Green for healthy, yellow for warnings, red for critical. Grafana's threshold coloring makes this easy.

**Group related panels.** Put all database metrics in one row, all compute metrics in another. Use Grafana's collapsible rows to organize large dashboards.

**Set appropriate time ranges.** Default to the last 1 hour for operational dashboards, last 7 days for trend dashboards.

**Add annotations for deployments.** Overlay deployment markers on your graphs so you can correlate performance changes with releases.

**Use stat panels for current values.** Single-value stat panels with sparklines are great for at-a-glance monitoring.

For the Terraform approach to CloudWatch-native dashboards, see our guide on [CloudWatch dashboards with Terraform](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-dashboards-terraform/view).

## Wrapping Up

Amazon Managed Grafana gives you enterprise-grade visualization on top of your CloudWatch data without managing Grafana infrastructure. The native CloudWatch integration means setup is fast, and template variables make dashboards reusable across environments and accounts. If CloudWatch dashboards feel limiting, Managed Grafana is the natural next step - same data, better tools to visualize it.
