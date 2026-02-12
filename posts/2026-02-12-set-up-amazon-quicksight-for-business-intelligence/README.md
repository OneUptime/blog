# How to Set Up Amazon QuickSight for Business Intelligence

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, QuickSight, Business Intelligence, Analytics

Description: A hands-on guide to setting up Amazon QuickSight for business intelligence, covering account setup, data source connections, SPICE datasets, and creating your first visualizations.

---

Amazon QuickSight is AWS's cloud-native BI service. It's not trying to be Tableau or Power BI - it has its own approach, particularly around SPICE (Super-fast, Parallel, In-memory Calculation Engine) and pay-per-session pricing. For teams already running on AWS, QuickSight integrates natively with services like Athena, RDS, Redshift, and S3, which means fewer data pipelines to maintain.

This guide walks you through setting up QuickSight from scratch, connecting data sources, and building your first dashboard.

## Step 1: Create a QuickSight Account

QuickSight has its own account system separate from your AWS account. You need to sign up for it explicitly.

```bash
# Create a QuickSight account (Enterprise Edition)
aws quicksight create-account-subscription \
  --edition ENTERPRISE \
  --authentication-method IAM_AND_QUICKSIGHT \
  --aws-account-id 123456789012 \
  --account-name "my-company-analytics" \
  --notification-email "admin@mycompany.com" \
  --region us-east-1
```

Enterprise Edition gives you features like row-level security, private VPC connectivity, and hourly SPICE refresh. Standard Edition works for basic BI but lacks these governance features.

Wait for the account to become active.

```bash
# Check account status
aws quicksight describe-account-subscription \
  --aws-account-id 123456789012
```

## Step 2: Configure VPC Connectivity

If your data sources live in a VPC (like RDS instances or Redshift clusters), you need a VPC connection so QuickSight can reach them.

```bash
# Create a VPC connection for QuickSight
aws quicksight create-vpc-connection \
  --aws-account-id 123456789012 \
  --vpc-connection-id my-vpc-connection \
  --name "Production VPC" \
  --subnet-ids '["subnet-abc123", "subnet-def456"]' \
  --security-group-ids '["sg-abc123"]' \
  --role-arn "arn:aws:iam::123456789012:role/QuickSightVPCRole"
```

Make sure the security group allows outbound traffic to your data sources and that the subnets have proper routing.

## Step 3: Register Data Sources

QuickSight supports a wide range of data sources. Let's connect a few common ones.

Connect to an RDS PostgreSQL database.

```bash
# Register an RDS PostgreSQL data source
aws quicksight create-data-source \
  --aws-account-id 123456789012 \
  --data-source-id rds-postgres-prod \
  --name "Production PostgreSQL" \
  --type POSTGRESQL \
  --data-source-parameters '{
    "RdsParameters": {
      "InstanceId": "my-prod-db",
      "Database": "analytics"
    }
  }' \
  --credentials '{
    "CredentialPair": {
      "Username": "quicksight_reader",
      "Password": "SecurePassword123!"
    }
  }' \
  --vpc-connection-properties '{
    "VpcConnectionArn": "arn:aws:quicksight:us-east-1:123456789012:vpcConnection/my-vpc-connection"
  }' \
  --ssl-properties '{"DisableSsl": false}'
```

Connect to Athena for querying your data lake.

```bash
# Register an Athena data source
aws quicksight create-data-source \
  --aws-account-id 123456789012 \
  --data-source-id athena-data-lake \
  --name "Data Lake via Athena" \
  --type ATHENA \
  --data-source-parameters '{
    "AthenaParameters": {
      "WorkGroup": "quicksight-workgroup"
    }
  }' \
  --permissions '[{
    "Principal": "arn:aws:quicksight:us-east-1:123456789012:user/default/admin",
    "Actions": [
      "quicksight:DescribeDataSource",
      "quicksight:DescribeDataSourcePermissions",
      "quicksight:PassDataSource",
      "quicksight:UpdateDataSource",
      "quicksight:UpdateDataSourcePermissions"
    ]
  }]'
```

## Step 4: Create a Dataset with SPICE

SPICE is QuickSight's in-memory engine. When you import data into SPICE, queries run against the cached copy instead of hitting your source database directly. This makes dashboards fast and reduces load on your production systems.

```bash
# Create a dataset that imports into SPICE
aws quicksight create-data-set \
  --aws-account-id 123456789012 \
  --data-set-id sales-overview \
  --name "Sales Overview" \
  --import-mode SPICE \
  --physical-table-map '{
    "sales-table": {
      "RelationalTable": {
        "DataSourceArn": "arn:aws:quicksight:us-east-1:123456789012:datasource/rds-postgres-prod",
        "Schema": "public",
        "Name": "orders",
        "InputColumns": [
          {"Name": "order_id", "Type": "INTEGER"},
          {"Name": "customer_id", "Type": "STRING"},
          {"Name": "product", "Type": "STRING"},
          {"Name": "quantity", "Type": "INTEGER"},
          {"Name": "revenue", "Type": "DECIMAL"},
          {"Name": "order_date", "Type": "DATETIME"},
          {"Name": "region", "Type": "STRING"}
        ]
      }
    }
  }' \
  --logical-table-map '{
    "sales-logical": {
      "Alias": "Sales Data",
      "Source": {
        "PhysicalTableId": "sales-table"
      },
      "DataTransforms": [
        {
          "ProjectOperation": {
            "ProjectedColumns": ["order_id", "customer_id", "product", "quantity", "revenue", "order_date", "region"]
          }
        },
        {
          "CreateColumnsOperation": {
            "Columns": [{
              "ColumnName": "order_month",
              "ColumnId": "order_month",
              "Expression": "formatDate(order_date, '\''yyyy-MM'\'')"
            }]
          }
        }
      ]
    }
  }' \
  --permissions '[{
    "Principal": "arn:aws:quicksight:us-east-1:123456789012:user/default/admin",
    "Actions": [
      "quicksight:DescribeDataSet",
      "quicksight:DescribeDataSetPermissions",
      "quicksight:PassDataSet",
      "quicksight:DescribeIngestion",
      "quicksight:ListIngestions",
      "quicksight:UpdateDataSet",
      "quicksight:DeleteDataSet",
      "quicksight:CreateIngestion",
      "quicksight:CancelIngestion",
      "quicksight:UpdateDataSetPermissions"
    ]
  }]'
```

## Step 5: Schedule SPICE Refreshes

SPICE data doesn't update automatically. You need to schedule refreshes.

```bash
# Create a refresh schedule - daily at 6 AM UTC
aws quicksight create-refresh-schedule \
  --aws-account-id 123456789012 \
  --data-set-id sales-overview \
  --schedule '{
    "ScheduleId": "daily-refresh",
    "ScheduleFrequency": {
      "Interval": "DAILY",
      "TimeOfTheDay": "06:00"
    },
    "StartAfterDateTime": "2026-02-13T06:00:00Z",
    "RefreshType": "FULL_REFRESH"
  }'
```

For datasets that are too large for full refreshes, you can use incremental refreshes with a lookback window.

```bash
# Create an incremental refresh schedule
aws quicksight create-refresh-schedule \
  --aws-account-id 123456789012 \
  --data-set-id sales-overview \
  --schedule '{
    "ScheduleId": "hourly-incremental",
    "ScheduleFrequency": {
      "Interval": "HOURLY"
    },
    "RefreshType": "INCREMENTAL_REFRESH"
  }'
```

## Step 6: Manage Users and Groups

QuickSight has its own user management. You'll want to set up groups and assign them to shared resources.

```bash
# Register a QuickSight user from IAM
aws quicksight register-user \
  --aws-account-id 123456789012 \
  --namespace default \
  --identity-type IAM \
  --iam-arn "arn:aws:iam::123456789012:user/jane-analyst" \
  --email "jane@mycompany.com" \
  --user-role READER \
  --session-name jane-analyst

# Create a group for the analytics team
aws quicksight create-group \
  --aws-account-id 123456789012 \
  --namespace default \
  --group-name "analytics-team"

# Add user to group
aws quicksight create-group-membership \
  --aws-account-id 123456789012 \
  --namespace default \
  --group-name "analytics-team" \
  --member-name "jane-analyst"
```

## Step 7: Set Up Row-Level Security

Row-level security in QuickSight lets you control which rows each user or group sees in a dataset.

```bash
# Create an RLS dataset - a CSV or table that maps users to filter values
cat > /tmp/rls_rules.csv << 'EOF'
UserName,region
jane-analyst,US-East
bob-analyst,US-West
analytics-team,US-East
analytics-team,US-West
EOF

# Upload to S3
aws s3 cp /tmp/rls_rules.csv s3://my-quicksight-config/rls/sales-rls.csv
```

Then create an RLS dataset and attach it to your main dataset through the QuickSight console or API. The `region` column in your RLS rules must match a column in your sales dataset.

## SPICE Capacity Management

SPICE capacity is allocated per region and shared across all datasets. Monitor your usage to avoid running out.

```bash
# Check SPICE capacity
aws quicksight describe-account-settings \
  --aws-account-id 123456789012

# List ingestion history for a dataset
aws quicksight list-ingestions \
  --aws-account-id 123456789012 \
  --data-set-id sales-overview
```

Each QuickSight author gets 10 GB of SPICE by default. You can purchase additional capacity in 1 GB increments.

## Cost Optimization Tips

QuickSight's pricing is per-user, which is great for organizations with many occasional viewers. A few ways to keep costs down:

- **Use Reader sessions wisely.** Readers are charged per session (30-minute blocks), not monthly. If someone only checks a dashboard once a week, that's much cheaper than a full BI license.
- **Import into SPICE when possible.** Direct query mode hits your source databases and can be slower. SPICE is faster and reduces load on production systems.
- **Use calculated fields in SPICE.** Pre-compute aggregations during import rather than at query time.
- **Monitor SPICE refresh failures.** A failed refresh means stale data. Set up monitoring to catch failures quickly - tools like [OneUptime](https://oneuptime.com/blog/post/set-up-aws-cloudwatch-alarms/view) can alert you when refresh jobs fail.

QuickSight isn't the flashiest BI tool, but it's deeply integrated with AWS and the pricing model works well for organizations where most users just need to view dashboards occasionally. Start with a single dashboard, prove the value, and expand from there.
