# How to Create QuickSight Dashboards from S3 Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, QuickSight, S3, Data Visualization, Analytics

Description: Learn how to build interactive QuickSight dashboards from data stored in Amazon S3, covering data preparation with manifests, Athena integration, and visualization best practices.

---

S3 is where most of your data ends up on AWS. Log files, CSV exports, JSON event streams, Parquet files from ETL jobs - it all lands in S3. Turning that raw data into dashboards with QuickSight is one of the fastest ways to get value out of your data without building complex pipelines.

There are two main approaches to getting S3 data into QuickSight: direct S3 file import using manifest files, and querying S3 through Athena. We'll cover both, and I'll show you when to pick each one.

## Approach 1: Direct S3 Import with Manifest Files

For straightforward CSV or TSV files in S3, you can use a manifest file to tell QuickSight which files to import. This works well for smaller datasets that fit comfortably in SPICE.

First, create a manifest file that describes your S3 data.

```json
{
  "fileLocations": [
    {
      "URIPrefixes": [
        "s3://my-analytics-bucket/sales-data/2025/"
      ]
    }
  ],
  "globalUploadSettings": {
    "format": "CSV",
    "delimiter": ",",
    "textqualifier": "\"",
    "containsHeader": "TRUE"
  }
}
```

Upload the manifest to S3.

```bash
# Save and upload the manifest
aws s3 cp /tmp/sales-manifest.json s3://my-analytics-bucket/manifests/sales-manifest.json
```

Now create a QuickSight data source pointing to S3.

```bash
# Create an S3 data source in QuickSight
aws quicksight create-data-source \
  --aws-account-id 123456789012 \
  --data-source-id s3-sales-source \
  --name "S3 Sales Data" \
  --type S3 \
  --data-source-parameters '{
    "S3Parameters": {
      "ManifestFileLocation": {
        "Bucket": "my-analytics-bucket",
        "Key": "manifests/sales-manifest.json"
      }
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

Then create a dataset from this source.

```bash
# Create a dataset from the S3 source
aws quicksight create-data-set \
  --aws-account-id 123456789012 \
  --data-set-id s3-sales-dataset \
  --name "Sales Dashboard Data" \
  --import-mode SPICE \
  --physical-table-map '{
    "s3-sales": {
      "S3Source": {
        "DataSourceArn": "arn:aws:quicksight:us-east-1:123456789012:datasource/s3-sales-source",
        "InputColumns": [
          {"Name": "date", "Type": "STRING"},
          {"Name": "product", "Type": "STRING"},
          {"Name": "category", "Type": "STRING"},
          {"Name": "region", "Type": "STRING"},
          {"Name": "units_sold", "Type": "INTEGER"},
          {"Name": "revenue", "Type": "DECIMAL"},
          {"Name": "cost", "Type": "DECIMAL"}
        ],
        "UploadSettings": {
          "Format": "CSV",
          "StartFromRow": 1,
          "ContainsHeader": true,
          "TextQualifier": "DOUBLE_QUOTE",
          "Delimiter": ","
        }
      }
    }
  }' \
  --logical-table-map '{
    "sales-logical": {
      "Alias": "Sales",
      "Source": {"PhysicalTableId": "s3-sales"},
      "DataTransforms": [
        {
          "CastColumnTypeOperation": {
            "ColumnName": "date",
            "NewColumnType": "DATETIME",
            "Format": "yyyy-MM-dd"
          }
        },
        {
          "CreateColumnsOperation": {
            "Columns": [{
              "ColumnName": "profit",
              "ColumnId": "profit",
              "Expression": "revenue - cost"
            }]
          }
        },
        {
          "CreateColumnsOperation": {
            "Columns": [{
              "ColumnName": "profit_margin",
              "ColumnId": "profit_margin",
              "Expression": "(revenue - cost) / revenue * 100"
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

## Approach 2: S3 Data via Athena (Better for Large Datasets)

For larger datasets, Parquet files, or when you need SQL transformations, use Athena as an intermediary. Athena queries S3 data using standard SQL, and QuickSight connects to Athena natively.

First, set up a Glue table that maps to your S3 data.

```bash
# Create a Glue table for Parquet data in S3
aws glue create-table \
  --database-name analytics \
  --table-input '{
    "Name": "sales_events",
    "StorageDescriptor": {
      "Columns": [
        {"Name": "event_id", "Type": "string"},
        {"Name": "event_date", "Type": "date"},
        {"Name": "product_id", "Type": "string"},
        {"Name": "product_name", "Type": "string"},
        {"Name": "category", "Type": "string"},
        {"Name": "quantity", "Type": "int"},
        {"Name": "unit_price", "Type": "double"},
        {"Name": "total_amount", "Type": "double"},
        {"Name": "customer_region", "Type": "string"}
      ],
      "Location": "s3://my-analytics-bucket/events/sales/",
      "InputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
      "OutputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
      "SerdeInfo": {
        "SerializationLibrary": "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
      }
    },
    "PartitionKeys": [
      {"Name": "year", "Type": "string"},
      {"Name": "month", "Type": "string"}
    ],
    "TableType": "EXTERNAL_TABLE"
  }'
```

Now create a QuickSight dataset using a custom SQL query against Athena.

```bash
# Create the Athena data source (if not already done)
aws quicksight create-data-source \
  --aws-account-id 123456789012 \
  --data-source-id athena-analytics \
  --name "Athena Analytics" \
  --type ATHENA \
  --data-source-parameters '{
    "AthenaParameters": {
      "WorkGroup": "quicksight"
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

Create a dataset using a custom SQL query.

```bash
# Create dataset with custom Athena SQL
aws quicksight create-data-set \
  --aws-account-id 123456789012 \
  --data-set-id athena-sales-summary \
  --name "Sales Summary from Athena" \
  --import-mode SPICE \
  --physical-table-map '{
    "athena-query": {
      "CustomSql": {
        "DataSourceArn": "arn:aws:quicksight:us-east-1:123456789012:datasource/athena-analytics",
        "Name": "SalesSummary",
        "SqlQuery": "SELECT event_date, category, customer_region, COUNT(*) as order_count, SUM(quantity) as total_units, SUM(total_amount) as total_revenue, AVG(unit_price) as avg_price FROM analytics.sales_events WHERE year >= '\''2025'\'' GROUP BY event_date, category, customer_region",
        "Columns": [
          {"Name": "event_date", "Type": "DATETIME"},
          {"Name": "category", "Type": "STRING"},
          {"Name": "customer_region", "Type": "STRING"},
          {"Name": "order_count", "Type": "INTEGER"},
          {"Name": "total_units", "Type": "INTEGER"},
          {"Name": "total_revenue", "Type": "DECIMAL"},
          {"Name": "avg_price", "Type": "DECIMAL"}
        ]
      }
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

## Setting Up Automated Refreshes

Your dashboard is only useful if the data is fresh. Set up a SPICE refresh schedule.

```bash
# Daily refresh at 7 AM UTC
aws quicksight create-refresh-schedule \
  --aws-account-id 123456789012 \
  --data-set-id athena-sales-summary \
  --schedule '{
    "ScheduleId": "daily-7am",
    "ScheduleFrequency": {
      "Interval": "DAILY",
      "TimeOfTheDay": "07:00"
    },
    "RefreshType": "FULL_REFRESH"
  }'
```

## Which Approach Should You Use?

Here's a quick decision framework:

| Factor | Direct S3 | Athena + S3 |
|--------|-----------|-------------|
| File format | CSV, TSV, JSON | Any (Parquet, ORC, CSV, JSON) |
| Data size | Under 10 GB | Any size |
| Need SQL transforms | No | Yes |
| Partitioned data | No | Yes |
| Query cost | Free (SPICE import) | Per-query Athena cost |
| Schema evolution | Manual | Handled by Glue |

For most production use cases, the Athena approach is more flexible. You get SQL transformations, support for columnar formats like Parquet, and partition pruning for cost-efficient queries. The direct S3 approach is great for quick, one-off analyses or small reference datasets.

If you're just getting started with QuickSight, check out our [QuickSight setup guide](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-quicksight-for-business-intelligence/view) for the initial configuration steps, and our guide on [using QuickSight with Athena](https://oneuptime.com/blog/post/2026-02-12-use-quicksight-with-athena/view) for more advanced query patterns.
