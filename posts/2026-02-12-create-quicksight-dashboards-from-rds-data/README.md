# How to Create QuickSight Dashboards from RDS Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, QuickSight, RDS, Dashboards, Business Intelligence

Description: Step-by-step instructions for connecting Amazon QuickSight to RDS databases and building interactive dashboards with SPICE caching, calculated fields, and scheduled refreshes.

---

Most business-critical data lives in relational databases. Orders, customers, inventory, support tickets - it's all in RDS. Building dashboards directly from this data lets your team make decisions based on what's actually happening, not last month's spreadsheet export.

QuickSight connects to RDS natively, supporting MySQL, PostgreSQL, MariaDB, SQL Server, and Aurora. You can either query RDS directly or import data into SPICE for faster dashboards. Let's walk through both approaches.

## Prerequisites

Before connecting QuickSight to RDS, make sure:

1. Your RDS instance is accessible from QuickSight (via VPC connection or public access)
2. You have a read-only database user for QuickSight
3. Your security groups allow traffic from QuickSight

Create a dedicated read-only user for QuickSight. Never use your admin credentials.

```sql
-- For PostgreSQL
CREATE USER quicksight_reader WITH PASSWORD 'SecurePassword123!';
GRANT CONNECT ON DATABASE myapp TO quicksight_reader;
GRANT USAGE ON SCHEMA public TO quicksight_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO quicksight_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO quicksight_reader;

-- For MySQL
CREATE USER 'quicksight_reader'@'%' IDENTIFIED BY 'SecurePassword123!';
GRANT SELECT ON myapp.* TO 'quicksight_reader'@'%';
FLUSH PRIVILEGES;
```

## Step 1: Set Up the VPC Connection

If your RDS instance is in a private subnet (which it should be), you need a VPC connection.

```bash
# Create a security group for QuickSight VPC connection
aws ec2 create-security-group \
  --group-name quicksight-vpc-sg \
  --description "Security group for QuickSight VPC connection" \
  --vpc-id vpc-abc123

# Allow outbound traffic to RDS port
aws ec2 authorize-security-group-egress \
  --group-id sg-quicksight123 \
  --protocol tcp \
  --port 5432 \
  --cidr 10.0.0.0/16

# Allow the QuickSight security group in your RDS security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds456 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-quicksight123

# Create the QuickSight VPC connection
aws quicksight create-vpc-connection \
  --aws-account-id 123456789012 \
  --vpc-connection-id rds-vpc-conn \
  --name "RDS VPC Connection" \
  --subnet-ids '["subnet-private1", "subnet-private2"]' \
  --security-group-ids '["sg-quicksight123"]' \
  --role-arn "arn:aws:iam::123456789012:role/QuickSightVPCRole"
```

## Step 2: Create the Data Source

Register your RDS instance as a QuickSight data source.

```bash
# Create RDS PostgreSQL data source
aws quicksight create-data-source \
  --aws-account-id 123456789012 \
  --data-source-id rds-myapp \
  --name "MyApp Production DB" \
  --type POSTGRESQL \
  --data-source-parameters '{
    "RdsParameters": {
      "InstanceId": "myapp-prod-db",
      "Database": "myapp"
    }
  }' \
  --credentials '{
    "CredentialPair": {
      "Username": "quicksight_reader",
      "Password": "SecurePassword123!"
    }
  }' \
  --vpc-connection-properties '{
    "VpcConnectionArn": "arn:aws:quicksight:us-east-1:123456789012:vpcConnection/rds-vpc-conn"
  }' \
  --ssl-properties '{"DisableSsl": false}' \
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

Test the connection.

```bash
# Verify the data source was created successfully
aws quicksight describe-data-source \
  --aws-account-id 123456789012 \
  --data-source-id rds-myapp \
  --query 'DataSource.{Status:Status,ErrorInfo:ErrorInfo}'
```

## Step 3: Create a Dataset with Custom SQL

While you can select individual tables, custom SQL gives you much more control. You can join tables, filter data, and pre-aggregate results.

```bash
# Create a dataset using custom SQL
aws quicksight create-data-set \
  --aws-account-id 123456789012 \
  --data-set-id orders-dashboard \
  --name "Orders Dashboard" \
  --import-mode SPICE \
  --physical-table-map '{
    "orders-query": {
      "CustomSql": {
        "DataSourceArn": "arn:aws:quicksight:us-east-1:123456789012:datasource/rds-myapp",
        "Name": "OrdersWithCustomers",
        "SqlQuery": "SELECT o.id as order_id, o.created_at as order_date, o.status, o.total_amount, o.currency, c.name as customer_name, c.email, c.country, c.segment, p.name as product_name, p.category, oi.quantity, oi.unit_price FROM orders o JOIN customers c ON o.customer_id = c.id JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE o.created_at >= CURRENT_DATE - INTERVAL '\''12 months'\''",
        "Columns": [
          {"Name": "order_id", "Type": "INTEGER"},
          {"Name": "order_date", "Type": "DATETIME"},
          {"Name": "status", "Type": "STRING"},
          {"Name": "total_amount", "Type": "DECIMAL"},
          {"Name": "currency", "Type": "STRING"},
          {"Name": "customer_name", "Type": "STRING"},
          {"Name": "email", "Type": "STRING"},
          {"Name": "country", "Type": "STRING"},
          {"Name": "segment", "Type": "STRING"},
          {"Name": "product_name", "Type": "STRING"},
          {"Name": "category", "Type": "STRING"},
          {"Name": "quantity", "Type": "INTEGER"},
          {"Name": "unit_price", "Type": "DECIMAL"}
        ]
      }
    }
  }' \
  --logical-table-map '{
    "orders-logical": {
      "Alias": "Orders",
      "Source": {"PhysicalTableId": "orders-query"},
      "DataTransforms": [
        {
          "CreateColumnsOperation": {
            "Columns": [
              {
                "ColumnName": "line_total",
                "ColumnId": "line_total",
                "Expression": "quantity * unit_price"
              },
              {
                "ColumnName": "order_month",
                "ColumnId": "order_month",
                "Expression": "truncDate('\''MM'\'', order_date)"
              },
              {
                "ColumnName": "is_high_value",
                "ColumnId": "is_high_value",
                "Expression": "ifelse(total_amount >= 1000, '\''High Value'\'', '\''Standard'\'')"
              }
            ]
          }
        },
        {
          "TagColumnOperation": {
            "ColumnName": "country",
            "Tags": [{"ColumnGeographicRole": "COUNTRY"}]
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

Notice the `TagColumnOperation` - tagging the country column as geographic enables map visualizations in QuickSight.

## Step 4: Trigger the Initial SPICE Import

After creating the dataset, trigger the first data import.

```bash
# Start the initial data ingestion
aws quicksight create-ingestion \
  --aws-account-id 123456789012 \
  --data-set-id orders-dashboard \
  --ingestion-id "initial-load-$(date +%s)"

# Monitor ingestion progress
aws quicksight describe-ingestion \
  --aws-account-id 123456789012 \
  --data-set-id orders-dashboard \
  --ingestion-id "initial-load-$(date +%s)" \
  --query 'Ingestion.{Status:IngestionStatus,RowsIngested:RowInfo.RowsIngested,Time:IngestionTimeInSeconds}'
```

## Step 5: Set Up Refresh Schedules

For dashboards showing recent data, schedule regular SPICE refreshes.

```bash
# Refresh every 4 hours during business hours
aws quicksight create-refresh-schedule \
  --aws-account-id 123456789012 \
  --data-set-id orders-dashboard \
  --schedule '{
    "ScheduleId": "business-hours-refresh",
    "ScheduleFrequency": {
      "Interval": "DAILY",
      "TimeOfTheDay": "08:00"
    },
    "RefreshType": "FULL_REFRESH"
  }'
```

## Direct Query vs SPICE: When to Use Each

SPICE is the default recommendation, but direct query mode has its place.

**Use SPICE when:**
- Dashboard is used frequently by many people
- Data doesn't need to be real-time
- Your RDS instance can't handle additional query load
- You want sub-second dashboard interactions

**Use direct query when:**
- Data must be real-time (up-to-the-second)
- Dataset is too large for SPICE capacity
- You need to leverage RDS-specific functions

To use direct query mode, change `import-mode` from `SPICE` to `DIRECT_QUERY` when creating the dataset. Just be mindful of the load on your database - every dashboard interaction translates to a query against RDS.

## Performance Tips

A few tricks to keep your dashboards snappy:

- **Pre-aggregate in SQL.** Don't pull row-level data if your dashboard only shows aggregates. Summarize in the custom SQL query.
- **Limit date ranges.** Only pull data you'll actually visualize. A 12-month window is usually enough for operational dashboards.
- **Use calculated fields wisely.** SPICE pre-computes calculated fields during import, so they're free at query time. In direct query mode, they're computed on every request.
- **Create separate datasets for different dashboards.** One giant dataset serving ten dashboards is worse than ten focused datasets.

For monitoring your dashboard refresh health and RDS query performance, you can set up [CloudWatch alarms](https://oneuptime.com/blog/post/set-up-aws-cloudwatch-alarms/view) that notify you when ingestion fails or your RDS CPU spikes during refresh windows.

Building QuickSight dashboards from RDS data is one of the quickest paths from raw database tables to business insights. The SPICE layer means your dashboards stay fast even as your data grows, and scheduled refreshes keep everything current without manual intervention.
