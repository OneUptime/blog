# How to Set Up Amazon Managed Grafana

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Grafana, Monitoring, Observability, Managed Service, Dashboards

Description: Step-by-step guide to setting up Amazon Managed Grafana for centralized monitoring dashboards with AWS data sources and SSO authentication

---

Grafana is the go-to open-source tool for building monitoring dashboards. But running your own Grafana server means managing EC2 instances (or ECS tasks), handling upgrades, configuring authentication, setting up backups, and scaling as your team grows. Amazon Managed Grafana takes all of that off your plate.

With Amazon Managed Grafana, AWS hosts and manages Grafana for you. It integrates natively with AWS data sources like CloudWatch, X-Ray, and Amazon Managed Prometheus. Authentication is handled through AWS IAM Identity Center (formerly AWS SSO). Scaling, patching, and availability are all managed by AWS.

This guide walks through setting up a Managed Grafana workspace from scratch, configuring authentication, connecting data sources, and building your first dashboard.

## Prerequisites

Before creating a Managed Grafana workspace, you need:

- **AWS IAM Identity Center (SSO)** enabled in your account. Managed Grafana uses this for user authentication.
- **An AWS Organization** (required for IAM Identity Center).
- Users created in IAM Identity Center that will access Grafana.

If you do not have IAM Identity Center set up yet, you will need to enable it first. This is a one-time setup for your organization.

## Step 1: Create the Grafana Workspace

You can create a workspace through the console or CLI.

```bash
# Create a Managed Grafana workspace
aws grafana create-workspace \
  --account-access-type CURRENT_ACCOUNT \
  --authentication-providers AWS_SSO \
  --permission-type SERVICE_MANAGED \
  --workspace-name "production-monitoring" \
  --workspace-description "Central monitoring dashboard for production services" \
  --workspace-data-sources CLOUDWATCH PROMETHEUS XRAY \
  --workspace-role-arn arn:aws:iam::123456789012:role/GrafanaWorkspaceRole
```

Key parameters:

- **authentication-providers**: AWS_SSO is the recommended option. You can also use SAML for third-party identity providers.
- **permission-type**: SERVICE_MANAGED lets Grafana create the IAM roles it needs automatically. CUSTOMER_MANAGED gives you more control.
- **workspace-data-sources**: Pre-authorize which data sources the workspace can access.

## Step 2: Create the IAM Role for Grafana

Grafana needs an IAM role to access your AWS data sources. If you chose SERVICE_MANAGED permissions, some of this is handled automatically. For more control, create a custom role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:DescribeAlarmsForMetric",
        "cloudwatch:DescribeAlarmHistory",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:ListMetrics",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetInsightRuleReport",
        "cloudwatch:GetMetricStatistics"
      ],
      "Resource": "*"
    },
    {
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
      "Effect": "Allow",
      "Action": [
        "xray:GetTraceSummaries",
        "xray:BatchGetTraces",
        "xray:GetServiceGraph",
        "xray:GetTraceGraph",
        "xray:GetInsightSummaries",
        "xray:GetGroups",
        "xray:GetTimeSeriesServiceStatistics"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "aps:ListWorkspaces",
        "aps:DescribeWorkspace",
        "aps:QueryMetrics",
        "aps:GetLabels",
        "aps:GetSeries",
        "aps:GetMetricMetadata"
      ],
      "Resource": "*"
    }
  ]
}
```

The trust policy for this role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "grafana.amazonaws.com"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "123456789012"
        }
      }
    }
  ]
}
```

```bash
# Create the IAM role
aws iam create-role \
  --role-name GrafanaWorkspaceRole \
  --assume-role-policy-document file://trust-policy.json

# Attach the permissions policy
aws iam put-role-policy \
  --role-name GrafanaWorkspaceRole \
  --policy-name GrafanaDataSourceAccess \
  --policy-document file://grafana-policy.json
```

## Step 3: Configure User Access

Add users from IAM Identity Center to your Grafana workspace and assign them roles.

```bash
# List available SSO users
aws identitystore list-users \
  --identity-store-id d-1234567890

# Grant a user admin access to the Grafana workspace
aws grafana update-permissions \
  --workspace-id g-abc123def456 \
  --update-instruction-batch '[
    {
      "action": "ADD",
      "role": "ADMIN",
      "users": [
        {
          "id": "user-uuid-from-sso",
          "type": "SSO_USER"
        }
      ]
    }
  ]'
```

Grafana has three roles:
- **Admin**: Full access to workspace settings, data sources, and dashboards.
- **Editor**: Can create and edit dashboards but cannot change data sources or workspace settings.
- **Viewer**: Read-only access to dashboards.

## Step 4: Access the Workspace

After creation, your workspace has a URL like:

```
https://g-abc123def456.grafana-workspace.us-east-1.amazonaws.com
```

Navigate to this URL in your browser. You will be redirected to your IAM Identity Center login page. After authenticating, you land in the Grafana interface.

## Step 5: Add Data Sources

The first thing to do in your new workspace is add data sources. Managed Grafana comes with AWS data source plugins pre-installed.

### Adding CloudWatch as a Data Source

In the Grafana UI:

1. Navigate to **Configuration > Data Sources > Add data source**
2. Select **Amazon CloudWatch**
3. Set the default region
4. Authentication should be automatic if your workspace IAM role has the right permissions
5. Click **Save & Test**

You can also configure data sources via the Grafana API.

```bash
# Get the Grafana API key first
aws grafana create-workspace-api-key \
  --workspace-id g-abc123def456 \
  --key-name "setup-key" \
  --key-role ADMIN \
  --seconds-to-live 3600

# Use the API key to add a data source via Grafana HTTP API
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://g-abc123def456.grafana-workspace.us-east-1.amazonaws.com/api/datasources" \
  -d '{
    "name": "CloudWatch",
    "type": "cloudwatch",
    "access": "proxy",
    "jsonData": {
      "authType": "default",
      "defaultRegion": "us-east-1"
    }
  }'
```

For detailed CloudWatch integration, see our guide on [connecting Amazon Managed Grafana to CloudWatch](https://oneuptime.com/blog/post/connect-amazon-managed-grafana-to-cloudwatch/view).

## Step 6: Build Your First Dashboard

Create a dashboard that shows key metrics across your AWS infrastructure.

In the Grafana UI:

1. Click **Create > Dashboard > Add new panel**
2. Select your CloudWatch data source
3. Configure the query:
   - Namespace: `AWS/Lambda`
   - Metric: `Invocations`
   - Stat: `Sum`
   - Period: `5m`
4. Add more panels for other metrics

Here is a useful starter dashboard layout for an AWS serverless application:

| Panel | Data Source | Metric |
|-------|-----------|--------|
| Lambda Invocations | CloudWatch | AWS/Lambda Invocations |
| Lambda Errors | CloudWatch | AWS/Lambda Errors |
| Lambda Duration p99 | CloudWatch | AWS/Lambda Duration |
| API Gateway 4xx/5xx | CloudWatch | AWS/ApiGateway 4XXError, 5XXError |
| DynamoDB Read/Write Capacity | CloudWatch | AWS/DynamoDB ConsumedReadCapacityUnits |
| SQS Queue Depth | CloudWatch | AWS/SQS ApproximateNumberOfMessagesVisible |

## Step 7: Set Up Alerting

Managed Grafana supports alerting through Grafana's built-in alerting system. You can send alerts to SNS, Slack, PagerDuty, and other destinations.

1. Navigate to **Alerting > Alert rules > New alert rule**
2. Define the query and condition (e.g., Lambda Errors > 10 in 5 minutes)
3. Set up a notification channel (SNS topic, Slack webhook, etc.)
4. Configure the evaluation interval and pending period

```bash
# Create an SNS topic for Grafana alerts
aws sns create-topic --name grafana-alerts

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:grafana-alerts \
  --protocol email \
  --notification-endpoint ops-team@example.com
```

## Workspace Configuration Options

### Enabling Plugins

Managed Grafana supports a curated list of community plugins. Enable them in the workspace settings.

```bash
# Update workspace configuration to enable plugins
aws grafana update-workspace-configuration \
  --workspace-id g-abc123def456 \
  --configuration '{
    "plugins": {
      "pluginAdminEnabled": true
    }
  }'
```

### Network Access Control

By default, your workspace is publicly accessible (behind SSO authentication). You can restrict it to specific VPCs or IP ranges.

```bash
# Configure VPC endpoint access
aws grafana update-workspace \
  --workspace-id g-abc123def456 \
  --network-access-control '{
    "prefixListIds": ["pl-abc123"],
    "vpceIds": ["vpce-abc123"]
  }'
```

## Cost Considerations

Managed Grafana pricing is based on:

- **Per active editor/admin user per month**: Users who can create or edit dashboards
- **Per active viewer user per month**: Read-only users (significantly cheaper)
- **No charge for data queries**: You pay for the data sources themselves (CloudWatch API calls, etc.) but not for Grafana querying them

For small teams, the cost is quite reasonable. The savings in operational overhead from not managing your own Grafana server typically outweigh the service fee.

## Wrapping Up

Amazon Managed Grafana gives you enterprise-grade monitoring dashboards without the infrastructure management. The setup is straightforward: create a workspace, connect your AWS data sources, build dashboards, and configure alerts. The tight integration with IAM Identity Center means authentication is handled from day one, and the native AWS data source plugins make connecting to CloudWatch, Prometheus, and X-Ray seamless. From here, explore connecting additional data sources like [Amazon Managed Prometheus](https://oneuptime.com/blog/post/connect-amazon-managed-grafana-to-prometheus/view) and [X-Ray](https://oneuptime.com/blog/post/connect-amazon-managed-grafana-to-x-ray/view) to build comprehensive observability dashboards.
