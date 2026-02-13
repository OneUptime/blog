# How to Use QuickSight with Athena

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, QuickSight, Athena, Analytics, Data Lake

Description: A detailed guide on connecting Amazon QuickSight to Athena for querying S3 data lakes, building datasets with custom SQL, and optimizing performance with SPICE and partitions.

---

Athena and QuickSight are a natural pair. Athena gives you SQL access to data in S3 without managing any servers, and QuickSight turns those query results into interactive dashboards. Together, they form the analytics layer for AWS data lakes.

The combination is particularly powerful because you can query terabytes of data in S3 using standard SQL, import the results into QuickSight's SPICE engine for fast interactivity, and schedule refreshes to keep everything current. No ETL pipelines, no data warehouses, no infrastructure to manage.

## Setting Up the Athena Workgroup

Before connecting QuickSight, create a dedicated Athena workgroup. This isolates QuickSight queries from ad-hoc analyst queries and lets you control costs independently.

```bash
# Create a workgroup specifically for QuickSight
aws athena create-work-group \
  --name quicksight-workgroup \
  --configuration '{
    "ResultConfiguration": {
      "OutputLocation": "s3://my-athena-results/quicksight/"
    },
    "EnforceWorkGroupConfiguration": true,
    "PublishCloudWatchMetricsEnabled": true,
    "BytesScannedCutoffPerQuery": 10737418240,
    "EngineVersion": {
      "SelectedEngineVersion": "Athena engine version 3"
    }
  }' \
  --description "Dedicated workgroup for QuickSight queries"
```

The `BytesScannedCutoffPerQuery` setting (10 GB in this example) prevents runaway queries from scanning your entire data lake and blowing up your Athena bill.

## Granting QuickSight Access to Athena

QuickSight needs IAM permissions to use Athena and access the underlying S3 data. Attach these permissions to QuickSight's service role.

```bash
# Create the QuickSight-Athena policy
cat > quicksight-athena-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "athena:BatchGetQueryExecution",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "athena:GetWorkGroup",
        "athena:ListQueryExecutions",
        "athena:StartQueryExecution",
        "athena:StopQueryExecution"
      ],
      "Resource": [
        "arn:aws:athena:us-east-1:123456789012:workgroup/quicksight-workgroup"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::my-data-lake-bucket",
        "arn:aws:s3:::my-data-lake-bucket/*",
        "arn:aws:s3:::my-athena-results",
        "arn:aws:s3:::my-athena-results/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-athena-results/quicksight/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:GetTable",
        "glue:GetTables",
        "glue:GetDatabase",
        "glue:GetDatabases",
        "glue:GetPartitions"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name aws-quicksight-service-role-v0 \
  --policy-name AthenaAccess \
  --policy-document file://quicksight-athena-policy.json
```

## Creating the Athena Data Source

Register Athena as a data source in QuickSight.

```bash
# Create the Athena data source
aws quicksight create-data-source \
  --aws-account-id 123456789012 \
  --data-source-id athena-datalake \
  --name "Data Lake - Athena" \
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

## Building Datasets with Custom SQL

Custom SQL queries give you the most control over what data QuickSight sees. You can join tables, filter, aggregate, and transform data before it enters SPICE.

Here's a real-world example - a dataset for an e-commerce analytics dashboard.

```bash
# Create a dataset with a custom Athena query
aws quicksight create-data-set \
  --aws-account-id 123456789012 \
  --data-set-id ecommerce-metrics \
  --name "E-Commerce Daily Metrics" \
  --import-mode SPICE \
  --physical-table-map '{
    "athena-ecommerce": {
      "CustomSql": {
        "DataSourceArn": "arn:aws:quicksight:us-east-1:123456789012:datasource/athena-datalake",
        "Name": "DailyMetrics",
        "SqlQuery": "SELECT DATE(event_timestamp) as event_date, channel, device_type, country, COUNT(DISTINCT session_id) as sessions, COUNT(DISTINCT user_id) as unique_users, COUNT(CASE WHEN event_type = '\''purchase'\'' THEN 1 END) as purchases, SUM(CASE WHEN event_type = '\''purchase'\'' THEN revenue ELSE 0 END) as total_revenue, SUM(CASE WHEN event_type = '\''purchase'\'' THEN items_count ELSE 0 END) as items_sold FROM analytics_db.clickstream WHERE year >= '\''2025'\'' AND month >= '\''01'\'' GROUP BY DATE(event_timestamp), channel, device_type, country",
        "Columns": [
          {"Name": "event_date", "Type": "DATETIME"},
          {"Name": "channel", "Type": "STRING"},
          {"Name": "device_type", "Type": "STRING"},
          {"Name": "country", "Type": "STRING"},
          {"Name": "sessions", "Type": "INTEGER"},
          {"Name": "unique_users", "Type": "INTEGER"},
          {"Name": "purchases", "Type": "INTEGER"},
          {"Name": "total_revenue", "Type": "DECIMAL"},
          {"Name": "items_sold", "Type": "INTEGER"}
        ]
      }
    }
  }' \
  --logical-table-map '{
    "metrics-logical": {
      "Alias": "Daily Metrics",
      "Source": {"PhysicalTableId": "athena-ecommerce"},
      "DataTransforms": [
        {
          "CreateColumnsOperation": {
            "Columns": [
              {
                "ColumnName": "conversion_rate",
                "ColumnId": "conversion_rate",
                "Expression": "ifelse(sessions > 0, (purchases / sessions) * 100, 0)"
              },
              {
                "ColumnName": "avg_order_value",
                "ColumnId": "avg_order_value",
                "Expression": "ifelse(purchases > 0, total_revenue / purchases, 0)"
              },
              {
                "ColumnName": "revenue_per_session",
                "ColumnId": "revenue_per_session",
                "Expression": "ifelse(sessions > 0, total_revenue / sessions, 0)"
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

## Optimizing Athena Queries for QuickSight

The biggest cost and performance lever with Athena is how much data your queries scan. Here are practical optimizations.

**Use partition filters in your SQL.** If your data is partitioned by date, always include partition columns in your WHERE clause.

```sql
-- Good: Uses partition pruning, scans only relevant partitions
SELECT * FROM analytics_db.clickstream
WHERE year = '2025' AND month = '12'
  AND event_type = 'purchase';

-- Bad: Scans entire table, costs 100x more
SELECT * FROM analytics_db.clickstream
WHERE event_timestamp >= '2025-12-01'
  AND event_type = 'purchase';
```

**Use columnar formats.** If your data is in CSV, convert it to Parquet or ORC. The difference is dramatic.

```bash
# Create an Athena table that reads Parquet data
# Parquet stores data in columns, so QuickSight queries that
# only need a few columns scan much less data
aws athena start-query-execution \
  --work-group quicksight-workgroup \
  --query-string "
    CREATE TABLE analytics_db.clickstream_parquet
    WITH (
      format = 'PARQUET',
      parquet_compression = 'SNAPPY',
      partitioned_by = ARRAY['year', 'month'],
      external_location = 's3://my-data-lake-bucket/optimized/clickstream/'
    ) AS
    SELECT event_timestamp, session_id, user_id, event_type,
           channel, device_type, country, revenue, items_count,
           year, month
    FROM analytics_db.clickstream_csv
  "
```

**Pre-aggregate when possible.** If your dashboard only shows daily or weekly summaries, aggregate in the SQL query rather than pulling row-level data into SPICE.

## Scheduling SPICE Refreshes

Set up automated refreshes to keep your dashboard data current.

```bash
# Refresh twice daily
aws quicksight create-refresh-schedule \
  --aws-account-id 123456789012 \
  --data-set-id ecommerce-metrics \
  --schedule '{
    "ScheduleId": "morning-refresh",
    "ScheduleFrequency": {
      "Interval": "DAILY",
      "TimeOfTheDay": "06:00"
    },
    "RefreshType": "FULL_REFRESH"
  }'

aws quicksight create-refresh-schedule \
  --aws-account-id 123456789012 \
  --data-set-id ecommerce-metrics \
  --schedule '{
    "ScheduleId": "afternoon-refresh",
    "ScheduleFrequency": {
      "Interval": "DAILY",
      "TimeOfTheDay": "14:00"
    },
    "RefreshType": "FULL_REFRESH"
  }'
```

## Monitoring Costs

Athena charges per terabyte scanned. Keep an eye on costs, especially during SPICE refreshes.

```bash
# Check recent Athena query costs for the QuickSight workgroup
aws athena list-query-executions \
  --work-group quicksight-workgroup \
  --max-results 10

# Get details on data scanned
aws athena get-query-execution \
  --query-execution-id "abc-123-def" \
  --query 'QueryExecution.Statistics.DataScannedInBytes'
```

For ongoing cost monitoring, set up a [CloudWatch alarm](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-ec2-cpu-and-memory/view) on the `DataScannedInBytes` metric for your Athena workgroup. This catches unexpected cost spikes from poorly written queries or data growth.

The Athena-QuickSight combination gives you a serverless analytics stack that scales from gigabytes to petabytes. The key is designing your queries carefully, using partitions and columnar formats, and letting SPICE handle the caching so you're not scanning the same data over and over.
