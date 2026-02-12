# How to Set Up AWS Cost and Usage Reports (CUR)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CUR, Cost Management, Billing

Description: A complete guide to setting up AWS Cost and Usage Reports for detailed billing data, including S3 delivery, Athena integration, and report configuration.

---

Cost Explorer gives you a good overview, but if you need granular, line-item billing data, you need Cost and Usage Reports (CUR). CUR delivers your complete billing data to an S3 bucket in CSV or Parquet format, updated multiple times per day. Every API call, every data transfer byte, every EC2 hour is accounted for in the report. It's the most detailed view of your AWS spending that exists.

The tradeoff is complexity. CUR files are large and dense. But once you set them up with Athena or QuickSight, the analysis possibilities are endless.

## Creating the CUR Report

You can create a CUR report through the console or CLI. The CLI approach is more reproducible.

First, create the S3 bucket that will store your reports.

```bash
# Create the bucket
aws s3 mb s3://my-company-cur-reports --region us-east-1

# Add the required bucket policy for CUR to write to it
aws s3api put-bucket-policy \
  --bucket my-company-cur-reports \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "billingreports.amazonaws.com"
        },
        "Action": [
          "s3:GetBucketAcl",
          "s3:GetBucketPolicy"
        ],
        "Resource": "arn:aws:s3:::my-company-cur-reports",
        "Condition": {
          "StringEquals": {
            "aws:SourceAccount": "123456789012",
            "aws:SourceArn": "arn:aws:cur:us-east-1:123456789012:definition/*"
          }
        }
      },
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "billingreports.amazonaws.com"
        },
        "Action": "s3:PutObject",
        "Resource": "arn:aws:s3:::my-company-cur-reports/*",
        "Condition": {
          "StringEquals": {
            "aws:SourceAccount": "123456789012",
            "aws:SourceArn": "arn:aws:cur:us-east-1:123456789012:definition/*"
          }
        }
      }
    ]
  }'
```

Now create the report definition.

```bash
aws cur put-report-definition \
  --report-definition '{
    "ReportName": "monthly-cur",
    "TimeUnit": "HOURLY",
    "Format": "Parquet",
    "Compression": "Parquet",
    "S3Bucket": "my-company-cur-reports",
    "S3Prefix": "cur",
    "S3Region": "us-east-1",
    "AdditionalSchemaElements": ["RESOURCES"],
    "RefreshClosedReports": true,
    "ReportVersioning": "OVERWRITE_REPORT",
    "AdditionalArtifacts": ["ATHENA"]
  }'
```

Key configuration choices:

- **TimeUnit HOURLY**: Gives the most granular data. Use DAILY if you don't need hourly detail.
- **Format Parquet**: Much smaller files and faster queries than CSV. Always use Parquet if you're going to query with Athena.
- **AdditionalSchemaElements RESOURCES**: Includes individual resource IDs. This makes the report larger but lets you see costs per resource.
- **AdditionalArtifacts ATHENA**: Automatically creates Athena integration files (CloudFormation template and SQL files).
- **RefreshClosedReports**: Updates previous months' reports when adjustments occur (refunds, credits, etc.).

## Terraform Configuration

Here's the complete Terraform setup for CUR with all the necessary permissions.

```hcl
resource "aws_s3_bucket" "cur" {
  bucket = "my-company-cur-reports"
}

resource "aws_s3_bucket_policy" "cur" {
  bucket = aws_s3_bucket.cur.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action = ["s3:GetBucketAcl", "s3:GetBucketPolicy"]
        Resource = aws_s3_bucket.cur.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.cur.arn}/*"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "cur" {
  bucket = aws_s3_bucket.cur.id

  rule {
    id     = "archive-old-reports"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

resource "aws_cur_report_definition" "monthly" {
  report_name                = "monthly-cur"
  time_unit                  = "HOURLY"
  format                     = "Parquet"
  compression                = "Parquet"
  s3_bucket                  = aws_s3_bucket.cur.id
  s3_prefix                  = "cur"
  s3_region                  = "us-east-1"
  additional_schema_elements = ["RESOURCES"]
  additional_artifacts       = ["ATHENA"]
  refresh_closed_reports     = true
  report_versioning          = "OVERWRITE_REPORT"
}
```

## Understanding the Report Structure

Once the report starts generating (it takes up to 24 hours for the first delivery), your S3 bucket will have this structure:

```
s3://my-company-cur-reports/
  cur/
    monthly-cur/
      20260201-20260301/
        monthly-cur-00001.snappy.parquet
        monthly-cur-00002.snappy.parquet
        monthly-cur-Manifest.json
        cost_and_usage_data_status/
        crawler-cfn.yml
        monthly-cur-create-table.sql
```

The report is split into multiple Parquet files for parallel processing. The manifest file lists all the data files for the period.

## Key Columns in CUR

CUR has hundreds of columns. Here are the ones you'll use most:

| Column | Description |
|---|---|
| line_item_usage_start_date | When the usage started |
| line_item_usage_end_date | When the usage ended |
| line_item_product_code | The AWS service (e.g., AmazonEC2) |
| line_item_usage_type | Specific usage type (e.g., BoxUsage:m5.xlarge) |
| line_item_operation | The operation (e.g., RunInstances) |
| line_item_resource_id | The specific resource (e.g., i-0abc123def) |
| line_item_unblended_cost | The actual cost |
| line_item_usage_amount | Units consumed |
| product_region | AWS region |
| resource_tags_user_* | Your custom tags |

## Quick Verification

After the report is delivered, verify it's working by checking the S3 bucket.

```bash
# List the report files
aws s3 ls s3://my-company-cur-reports/cur/monthly-cur/ --recursive

# Check the manifest
aws s3 cp s3://my-company-cur-reports/cur/monthly-cur/$(date +%Y%m)01-*/monthly-cur-Manifest.json - | python3 -m json.tool
```

## Setting Up Lifecycle Policies

CUR data accumulates over time. Set up lifecycle policies to move older reports to cheaper storage.

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-company-cur-reports \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "archive-old-reports",
        "Status": "Enabled",
        "Transitions": [
          {
            "Days": 90,
            "StorageClass": "STANDARD_IA"
          },
          {
            "Days": 365,
            "StorageClass": "GLACIER"
          }
        ],
        "Filter": {
          "Prefix": "cur/"
        }
      }
    ]
  }'
```

## What to Do Next

Setting up CUR is just the first step. The real value comes from querying it. Here's where to go from here:

- **Query with Athena**: Run SQL queries against your billing data. See our guide on [analyzing CUR with Athena](https://oneuptime.com/blog/post/analyze-aws-cost-usage-reports-athena/view).
- **Visualize with QuickSight**: Build interactive dashboards. See [visualizing AWS costs with QuickSight](https://oneuptime.com/blog/post/visualize-aws-costs-quicksight/view).
- **Automate reports**: Build Lambda functions that query CUR data and send summaries.

For organizations with many accounts, CUR from the management account includes all linked account data. You don't need to set up CUR in every account - just the management account covers everything.

## Wrapping Up

AWS Cost and Usage Reports give you the most detailed billing data available. Set them up in Parquet format with resource IDs enabled, configure Athena integration for easy querying, and add lifecycle policies to manage storage costs. The initial setup takes about 30 minutes, and the first report arrives within 24 hours. Once you have CUR data flowing, you can build any cost analysis tool your organization needs.
