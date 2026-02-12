# How to Use Redshift with QuickSight for BI Dashboards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, QuickSight, Business Intelligence

Description: A step-by-step guide to connecting Amazon Redshift to Amazon QuickSight for building interactive BI dashboards with real-time data warehouse insights.

---

Amazon QuickSight is AWS's cloud-native business intelligence service, and when you pair it with Redshift, you get a powerful combination for building dashboards that pull directly from your data warehouse. Unlike traditional BI tools that require you to manage servers and licenses, QuickSight scales automatically and charges per session - so you only pay when people actually look at the dashboards.

This guide walks through connecting Redshift to QuickSight, building your first dashboard, and a few performance tricks that'll keep things snappy.

## Prerequisites

Before you get started, make sure you have:

- An Amazon Redshift cluster (or Redshift Serverless) with data loaded
- An Amazon QuickSight account (Enterprise edition recommended for row-level security)
- Network connectivity between QuickSight and your Redshift cluster

The network piece trips up a lot of people. If your Redshift cluster is in a VPC, QuickSight needs a VPC connection to reach it.

## Setting Up the VPC Connection

If your Redshift cluster is in a private subnet, you'll need to configure a VPC connection in QuickSight first.

```json
// QuickSight VPC connection configuration
// This goes in the AWS CLI or CloudFormation template
{
    "VPCConnectionId": "redshift-vpc-connection",
    "Name": "Redshift VPC Connection",
    "SubnetIds": [
        "subnet-0abc123def456789a",
        "subnet-0def456789abc1230"
    ],
    "SecurityGroupIds": [
        "sg-0abc123def456789a"
    ],
    "RoleArn": "arn:aws:iam::123456789012:role/QuickSightVPCRole"
}
```

You can create the VPC connection using the CLI:

```bash
# Create a VPC connection so QuickSight can reach your private Redshift cluster
aws quicksight create-vpc-connection \
    --aws-account-id 123456789012 \
    --vpc-connection-id redshift-vpc-connection \
    --name "Redshift VPC Connection" \
    --subnet-ids subnet-0abc123def456789a subnet-0def456789abc1230 \
    --security-group-ids sg-0abc123def456789a \
    --role-arn arn:aws:iam::123456789012:role/QuickSightVPCRole
```

Make sure the security group allows inbound traffic on port 5439 (Redshift's default port) from QuickSight's security group.

## Creating a Redshift Data Source

With network connectivity sorted, you can create a data source in QuickSight. You can do this through the console or the CLI:

```bash
# Register Redshift as a data source in QuickSight
aws quicksight create-data-source \
    --aws-account-id 123456789012 \
    --data-source-id my-redshift-source \
    --name "Production Redshift" \
    --type REDSHIFT \
    --data-source-parameters '{
        "RedshiftParameters": {
            "Host": "my-cluster.abc123.us-east-1.redshift.amazonaws.com",
            "Port": 5439,
            "Database": "analytics",
            "ClusterId": "my-cluster"
        }
    }' \
    --credentials '{
        "CredentialPair": {
            "Username": "quicksight_reader",
            "Password": "your-secure-password"
        }
    }' \
    --vpc-connection-properties '{"VpcConnectionArn": "arn:aws:quicksight:us-east-1:123456789012:vpcConnection/redshift-vpc-connection"}'
```

I'd strongly recommend creating a dedicated read-only Redshift user for QuickSight rather than using your admin credentials:

```sql
-- Create a read-only user specifically for QuickSight
CREATE USER quicksight_reader PASSWORD 'YourSecurePassword123!';
GRANT USAGE ON SCHEMA public TO quicksight_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO quicksight_reader;

-- Make sure future tables are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO quicksight_reader;
```

## Building a Dataset with SPICE

QuickSight has an in-memory engine called SPICE (Super-fast, Parallel, In-memory Calculation Engine). When you import data into SPICE, dashboards load much faster because they don't query Redshift every time someone opens a dashboard.

You can create a dataset from a custom SQL query:

```bash
# Create a dataset that imports data into SPICE for fast dashboards
aws quicksight create-data-set \
    --aws-account-id 123456789012 \
    --data-set-id sales-summary-dataset \
    --name "Sales Summary" \
    --import-mode SPICE \
    --physical-table-map '{
        "SalesSummary": {
            "CustomSql": {
                "DataSourceArn": "arn:aws:quicksight:us-east-1:123456789012:datasource/my-redshift-source",
                "Name": "Sales Summary Query",
                "SqlQuery": "SELECT sale_date, region, product_category, SUM(amount) as total_sales, COUNT(*) as transaction_count FROM sales s JOIN products p ON s.product_id = p.product_id WHERE sale_date >= DATEADD(month, -12, CURRENT_DATE) GROUP BY 1, 2, 3",
                "Columns": [
                    {"Name": "sale_date", "Type": "DATETIME"},
                    {"Name": "region", "Type": "STRING"},
                    {"Name": "product_category", "Type": "STRING"},
                    {"Name": "total_sales", "Type": "DECIMAL"},
                    {"Name": "transaction_count", "Type": "INTEGER"}
                ]
            }
        }
    }'
```

For large datasets, pre-aggregating in the SQL query (like we did above with `GROUP BY`) is really important. You don't want to import 500 million raw rows into SPICE when a summary with 50,000 rows will do.

## SPICE vs Direct Query Mode

You've got two options for how QuickSight accesses data:

| Feature | SPICE | Direct Query |
|---------|-------|-------------|
| Speed | Very fast - data is cached in memory | Depends on Redshift query performance |
| Freshness | Updated on schedule | Always current |
| Cost | Included SPICE capacity, then pay per GB | No SPICE cost, but Redshift usage |
| Best for | Dashboards viewed frequently | Dashboards needing real-time data |

For most BI dashboards, SPICE with a scheduled refresh is the right call. You can set up refreshes to run every hour, daily, or weekly.

```bash
# Schedule a daily SPICE refresh at 6 AM UTC
aws quicksight create-refresh-schedule \
    --aws-account-id 123456789012 \
    --data-set-id sales-summary-dataset \
    --schedule '{
        "ScheduleId": "daily-refresh",
        "ScheduleFrequency": {
            "Interval": "DAILY",
            "TimeOfTheDay": "06:00"
        },
        "RefreshType": "FULL_REFRESH",
        "StartAfterDateTime": "2026-02-13T06:00:00Z"
    }'
```

## Building the Dashboard

Once your dataset is ready, the actual dashboard building happens in the QuickSight console. But you can also define analyses and dashboards programmatically using the QuickSight API, which is useful for deploying dashboards across environments.

Here's a simplified template definition:

```json
{
    "AnalysisId": "sales-analysis",
    "Name": "Sales Performance Analysis",
    "ThemeArn": "arn:aws:quicksight::aws:theme/MIDNIGHT",
    "Sheets": [
        {
            "SheetId": "overview",
            "Name": "Sales Overview",
            "Visuals": [
                {
                    "LineChartVisual": {
                        "VisualId": "sales-trend",
                        "Title": "Monthly Sales Trend",
                        "XAxis": "sale_date",
                        "Values": "total_sales",
                        "GroupBy": "region"
                    }
                },
                {
                    "BarChartVisual": {
                        "VisualId": "category-breakdown",
                        "Title": "Sales by Category",
                        "Category": "product_category",
                        "Values": "total_sales"
                    }
                }
            ]
        }
    ]
}
```

## Row-Level Security

If different users should see different data, QuickSight's row-level security (RLS) is essential. You define rules that map QuickSight users or groups to filter values:

```sql
-- Create an RLS rules table in Redshift
-- QuickSight will use this to filter data per user
CREATE TABLE quicksight_rls_rules (
    username VARCHAR(256),
    region VARCHAR(50)
);

-- User alice can only see US data
INSERT INTO quicksight_rls_rules VALUES ('alice@company.com', 'US');

-- User bob can see both US and EU data
INSERT INTO quicksight_rls_rules VALUES ('bob@company.com', 'US');
INSERT INTO quicksight_rls_rules VALUES ('bob@company.com', 'EU');
```

Then apply the RLS dataset to your main dataset through the QuickSight API or console. This way, when Alice opens the dashboard, she only sees US sales figures without needing separate dashboards.

## Performance Optimization Tips

A few tricks to keep your QuickSight dashboards running smoothly:

**1. Use materialized views in Redshift.** Instead of having QuickSight run complex joins, pre-compute them in Redshift:

```sql
-- Create a materialized view for QuickSight to query
-- Refreshes incrementally so it's always fast
CREATE MATERIALIZED VIEW mv_sales_dashboard AS
SELECT
    DATE_TRUNC('day', s.sale_date) AS sale_day,
    r.region_name,
    p.category_name,
    COUNT(*) AS num_transactions,
    SUM(s.amount) AS total_revenue,
    AVG(s.amount) AS avg_transaction
FROM sales s
JOIN regions r ON s.region_id = r.region_id
JOIN products p ON s.product_id = p.product_id
GROUP BY 1, 2, 3;

-- Refresh the materialized view before SPICE pulls data
REFRESH MATERIALIZED VIEW mv_sales_dashboard;
```

**2. Limit the date range.** Don't import 10 years of data when the dashboard only shows last 12 months. Filter in your SQL query.

**3. Use calculated fields in SPICE.** Instead of complex SQL expressions, use QuickSight's calculated field feature for formatting and simple transformations - it runs in SPICE and is very fast.

**4. Monitor SPICE usage.** You get a fixed amount of SPICE capacity per author. Keep an eye on it:

```bash
# Check your SPICE capacity and usage
aws quicksight describe-account-settings \
    --aws-account-id 123456789012
```

The combination of Redshift's data warehouse capabilities and QuickSight's visualization engine gives you a fully managed BI stack. For monitoring how your Redshift cluster is performing under these dashboard workloads, consider setting up proper [query performance tracking](https://oneuptime.com/blog/post/optimize-redshift-distribution-and-sort-keys/view) alongside your BI deployment.
