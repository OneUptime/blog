# How to Visualize AWS Costs with QuickSight

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, QuickSight, Cost Visualization, FinOps

Description: Learn how to build interactive cost dashboards in Amazon QuickSight connected to your AWS Cost and Usage Report data for visual spending analysis.

---

Numbers in a spreadsheet only tell part of the story. When you're presenting cloud costs to leadership or trying to spot trends across months of data, visualizations are far more effective. QuickSight is AWS's business intelligence service, and it integrates directly with your CUR data through Athena. You can build interactive dashboards that update automatically as new billing data arrives.

Let's set up QuickSight for cost visualization from scratch.

## Prerequisites

Before starting, you need:

1. **CUR configured with Athena integration**: If you haven't done this yet, follow our guide on [setting up CUR](https://oneuptime.com/blog/post/setup-aws-cost-usage-reports-cur/view) and [analyzing CUR with Athena](https://oneuptime.com/blog/post/analyze-aws-cost-usage-reports-athena/view).
2. **QuickSight account**: Sign up for QuickSight Enterprise Edition (required for row-level security and some advanced features).

## Setting Up QuickSight

If QuickSight isn't already set up in your account, enable it.

```bash
# Check if QuickSight is already configured
aws quicksight describe-account-settings --aws-account-id 123456789012
```

During setup, make sure QuickSight has access to:
- Your S3 bucket containing CUR data
- Athena (for querying the data)

## Creating a Dataset from Athena

The dataset connects QuickSight to your CUR data in Athena.

First, create a data source pointing to Athena.

```bash
aws quicksight create-data-source \
  --aws-account-id 123456789012 \
  --data-source-id "cur-athena-source" \
  --name "CUR Athena Data" \
  --type ATHENA \
  --data-source-parameters '{
    "AthenaParameters": {
      "WorkGroup": "primary"
    }
  }' \
  --permissions '[{
    "Principal": "arn:aws:quicksight:us-east-1:123456789012:user/default/admin",
    "Actions": [
      "quicksight:DescribeDataSource",
      "quicksight:DescribeDataSourcePermissions",
      "quicksight:PassDataSource",
      "quicksight:UpdateDataSource",
      "quicksight:DeleteDataSource",
      "quicksight:UpdateDataSourcePermissions"
    ]
  }]'
```

Now create a dataset using a custom SQL query that pre-aggregates the data for dashboard performance.

This SQL query creates a daily cost summary suitable for QuickSight dashboards.

```sql
SELECT
  DATE(line_item_usage_start_date) AS usage_date,
  DATE_FORMAT(line_item_usage_start_date, '%Y-%m') AS billing_month,
  line_item_usage_account_id AS account_id,
  line_item_product_code AS service,
  product_region AS region,
  COALESCE(resource_tags_user_environment, 'Untagged') AS environment,
  COALESCE(resource_tags_user_team, 'Untagged') AS team,
  CASE
    WHEN savings_plan_savings_plan_a_r_n != '' THEN 'Savings Plan'
    WHEN reservation_reservation_a_r_n != '' THEN 'Reserved'
    WHEN line_item_usage_type LIKE '%Spot%' THEN 'Spot'
    ELSE 'On-Demand'
  END AS pricing_model,
  SUM(line_item_unblended_cost) AS total_cost,
  SUM(line_item_usage_amount) AS total_usage
FROM cur_db.cost_and_usage
WHERE
  line_item_usage_start_date >= DATE_ADD('month', -6, CURRENT_DATE)
  AND line_item_line_item_type IN ('Usage', 'DiscountedUsage', 'SavingsPlanCoveredUsage')
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
HAVING SUM(line_item_unblended_cost) > 0.01
```

## Building the Dashboard

QuickSight dashboards are built from analyses. Let's create the key visualizations.

### Visualization 1: Monthly Cost Trend

A line chart showing total costs by month. This is the first thing leadership looks at.

In QuickSight:
1. Create a new analysis from your dataset
2. Add a Line Chart visual
3. Set X-axis to `billing_month`
4. Set Value to `total_cost` (Sum)
5. Optionally add `service` to Color/Group

### Visualization 2: Cost by Service (Treemap)

A treemap shows proportional spending across services at a glance. Large boxes = expensive services.

Configuration:
- Visual type: Tree Map
- Group by: `service`
- Size: `total_cost` (Sum)
- Color: `total_cost` (Sum)

### Visualization 3: Environment Comparison

A stacked bar chart comparing production, staging, and dev costs.

Configuration:
- Visual type: Stacked Bar Chart
- X-axis: `billing_month`
- Value: `total_cost` (Sum)
- Color: `environment`

### Visualization 4: Pricing Model Breakdown

A donut chart showing what percentage of spend is On-Demand vs Reserved vs Savings Plan.

Configuration:
- Visual type: Donut Chart
- Group by: `pricing_model`
- Value: `total_cost` (Sum)

## Creating the Dashboard via CLI

You can also create dashboards programmatically. This is useful for deploying consistent dashboards across multiple accounts.

This Python script creates a QuickSight dashboard template.

```python
import boto3
import json

quicksight = boto3.client("quicksight")
account_id = "123456789012"

# Create the analysis
quicksight.create_analysis(
    AwsAccountId=account_id,
    AnalysisId="cost-analysis",
    Name="AWS Cost Analysis",
    SourceEntity={
        "SourceTemplate": {
            "DataSetReferences": [
                {
                    "DataSetPlaceholder": "CostData",
                    "DataSetArn": f"arn:aws:quicksight:us-east-1:{account_id}:dataset/cur-dataset"
                }
            ],
            "Arn": f"arn:aws:quicksight:us-east-1:{account_id}:template/cost-template"
        }
    },
    Permissions=[
        {
            "Principal": f"arn:aws:quicksight:us-east-1:{account_id}:user/default/admin",
            "Actions": [
                "quicksight:RestoreAnalysis",
                "quicksight:UpdateAnalysis",
                "quicksight:DeleteAnalysis",
                "quicksight:QueryAnalysis",
                "quicksight:DescribeAnalysis",
                "quicksight:DescribeAnalysisPermissions",
                "quicksight:UpdateAnalysisPermissions"
            ]
        }
    ]
)

# Publish as dashboard
quicksight.create_dashboard(
    AwsAccountId=account_id,
    DashboardId="cost-dashboard",
    Name="AWS Cost Dashboard",
    SourceEntity={
        "SourceTemplate": {
            "DataSetReferences": [
                {
                    "DataSetPlaceholder": "CostData",
                    "DataSetArn": f"arn:aws:quicksight:us-east-1:{account_id}:dataset/cur-dataset"
                }
            ],
            "Arn": f"arn:aws:quicksight:us-east-1:{account_id}:template/cost-template"
        }
    },
    Permissions=[
        {
            "Principal": f"arn:aws:quicksight:us-east-1:{account_id}:group/default/finance",
            "Actions": [
                "quicksight:DescribeDashboard",
                "quicksight:ListDashboardVersions",
                "quicksight:QueryDashboard"
            ]
        }
    ],
    DashboardPublishOptions={
        "AdHocFilteringOption": {"AvailabilityStatus": "ENABLED"},
        "ExportToCSVOption": {"AvailabilityStatus": "ENABLED"},
        "SheetControlsOption": {"VisibilityState": "EXPANDED"}
    }
)
```

## Adding Calculated Fields

QuickSight supports calculated fields that add derived metrics to your dashboard.

**Daily Average**:
```
total_cost / distinctCountOver(usage_date, [billing_month])
```

**Month-over-Month Change**:
```
percentDifference(sum(total_cost), [billing_month], -1, ASC)
```

**Cost per Unit**:
```
ifelse(total_usage > 0, total_cost / total_usage, 0)
```

## Setting Up SPICE for Performance

SPICE (Super-fast, Parallel, In-memory Calculation Engine) caches your data in memory for fast dashboard loading. This is essential for large CUR datasets.

```bash
# Check SPICE capacity
aws quicksight describe-account-settings \
  --aws-account-id 123456789012

# Purchase additional SPICE capacity if needed (in GB)
aws quicksight update-account-settings \
  --aws-account-id 123456789012 \
  --default-namespace default
```

When creating your dataset, select SPICE as the import mode. Then schedule daily refreshes so the dashboard stays current.

```bash
# Schedule daily SPICE refresh
aws quicksight create-refresh-schedule \
  --aws-account-id 123456789012 \
  --data-set-id "cur-dataset" \
  --schedule '{
    "ScheduleId": "daily-refresh",
    "ScheduleFrequency": {
      "Interval": "DAILY",
      "TimeOfDay": "06:00"
    },
    "StartAfterDateTime": "2026-02-12T06:00:00Z",
    "RefreshType": "FULL_REFRESH"
  }'
```

## Sharing Dashboards

Share your cost dashboards with the people who need them.

```bash
# Share with specific users
aws quicksight update-dashboard-permissions \
  --aws-account-id 123456789012 \
  --dashboard-id "cost-dashboard" \
  --grant-permissions '[{
    "Principal": "arn:aws:quicksight:us-east-1:123456789012:group/default/finance",
    "Actions": ["quicksight:DescribeDashboard", "quicksight:QueryDashboard"]
  }]'
```

You can also embed QuickSight dashboards in your internal tools using the embedding API. This lets non-AWS users access cost data without logging into the AWS console.

## Dashboard Design Tips

1. **Start with a summary page**: Total cost, month-over-month change, and top 5 services.
2. **Add filters at the top**: Let users filter by account, environment, team, and date range.
3. **Use consistent colors**: Map production to one color, staging to another, across all visuals.
4. **Include targets**: Add reference lines showing budget limits so viewers can instantly see if they're on track.
5. **Keep it to 3-4 pages**: Executive summary, service breakdown, team breakdown, and trend analysis.

## Wrapping Up

QuickSight transforms your CUR data from raw numbers into visual stories that anyone can understand. Connect it to Athena, build the key visualizations (cost trends, service breakdown, environment comparison, and pricing model split), and share with your team. Use SPICE for fast loading and schedule daily refreshes to keep the data current. A well-built cost dashboard is one of the most effective tools for driving cost awareness across your organization.
