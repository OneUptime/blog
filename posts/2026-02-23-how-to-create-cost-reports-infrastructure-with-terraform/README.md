# How to Create Cost Reports Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Reports, AWS Cost Explorer, FinOps, Cloud Cost Management

Description: Learn how to set up cloud cost reporting infrastructure with Terraform including Cost and Usage Reports, export pipelines, and visualization dashboards.

---

Visibility into cloud spending requires proper reporting infrastructure. Raw billing data needs to be collected, processed, and visualized for teams to make informed decisions. Terraform can provision this entire pipeline, from cost data exports to analytics databases and dashboards. This guide covers how to build cost reporting infrastructure across major cloud providers.

## AWS Cost and Usage Reports

Set up the AWS Cost and Usage Report (CUR) with Terraform:

```hcl
# S3 bucket for CUR data
resource "aws_s3_bucket" "cur" {
  bucket = "company-cost-reports"
}

resource "aws_s3_bucket_policy" "cur" {
  bucket = aws_s3_bucket.cur.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = { Service = "billingreports.amazonaws.com" }
        Action    = ["s3:GetBucketAcl", "s3:GetBucketPolicy"]
        Resource  = aws_s3_bucket.cur.arn
      },
      {
        Effect = "Allow"
        Principal = { Service = "billingreports.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cur.arn}/*"
      }
    ]
  })
}

# Create the Cost and Usage Report
resource "aws_cur_report_definition" "main" {
  report_name                = "company-cur"
  time_unit                  = "HOURLY"
  format                     = "Parquet"
  compression                = "Parquet"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                  = aws_s3_bucket.cur.id
  s3_region                  = "us-east-1"
  s3_prefix                  = "cur"
  report_versioning          = "OVERWRITE_REPORT"
  refresh_closed_reports     = true
}
```

## Athena for CUR Analysis

Set up Athena to query CUR data:

```hcl
# Athena workgroup for cost queries
resource "aws_athena_workgroup" "cost_analysis" {
  name = "cost-analysis"

  configuration {
    enforce_workgroup_configuration = true

    result_configuration {
      output_location = "s3://${aws_s3_bucket.cur.id}/athena-results/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }
  }
}

# Glue database for CUR data
resource "aws_glue_catalog_database" "cur" {
  name = "cost_reports"
}

# Glue crawler to catalog CUR data
resource "aws_glue_crawler" "cur" {
  name          = "cur-crawler"
  database_name = aws_glue_catalog_database.cur.name
  role          = aws_iam_role.glue_crawler.arn

  s3_target {
    path = "s3://${aws_s3_bucket.cur.id}/cur/company-cur/"
  }

  schedule = "cron(0 1 * * ? *)"  # Daily at 1 AM

  schema_change_policy {
    update_behavior = "UPDATE_IN_DATABASE"
    delete_behavior = "DELETE_FROM_DATABASE"
  }
}

# IAM role for Glue crawler
resource "aws_iam_role" "glue_crawler" {
  name = "cur-glue-crawler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "glue.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "glue_service" {
  role       = aws_iam_role.glue_crawler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}

resource "aws_iam_role_policy" "glue_s3" {
  name = "glue-s3-access"
  role = aws_iam_role.glue_crawler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = "${aws_s3_bucket.cur.arn}/*"
    }]
  })
}
```

## Azure Cost Export

Set up automated cost exports in Azure:

```hcl
resource "azurerm_subscription_cost_management_export" "daily" {
  name                    = "daily-cost-export"
  subscription_id         = data.azurerm_subscription.current.id
  recurrence_type         = "Daily"
  recurrence_period_start_date = "2026-01-01T00:00:00Z"
  recurrence_period_end_date   = "2027-01-01T00:00:00Z"

  export_data_storage_location {
    container_id = azurerm_storage_container.cost_exports.resource_manager_id
    root_folder_path = "exports"
  }

  export_data_options {
    type       = "ActualCost"
    time_frame = "MonthToDate"
  }
}

# Storage for cost exports
resource "azurerm_storage_account" "cost_exports" {
  name                     = "costexports${random_id.suffix.hex}"
  resource_group_name      = azurerm_resource_group.finops.name
  location                 = "eastus"
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "cost_exports" {
  name                  = "cost-data"
  storage_account_name  = azurerm_storage_account.cost_exports.name
  container_access_type = "private"
}
```

## GCP BigQuery Cost Export

Set up billing export to BigQuery:

```hcl
# BigQuery dataset for billing data
resource "google_bigquery_dataset" "billing" {
  dataset_id    = "billing_data"
  friendly_name = "Billing Data"
  description   = "Exported GCP billing data"
  location      = "US"
  project       = var.project_id

  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "READER"
    special_group = "projectReaders"
  }
}

# Note: The actual billing export is configured in the
# GCP Console under Billing > Billing export
# Terraform cannot directly create billing exports
# but can create the destination dataset

# Create views for common cost queries
resource "google_bigquery_table" "daily_costs" {
  dataset_id = google_bigquery_dataset.billing.dataset_id
  table_id   = "daily_costs_view"
  project    = var.project_id

  view {
    query          = <<-SQL
      SELECT
        DATE(usage_start_time) as date,
        service.description as service,
        SUM(cost) as total_cost,
        SUM(credits.amount) as total_credits
      FROM `${var.project_id}.billing_data.gcp_billing_export_v1_*`
      LEFT JOIN UNNEST(credits) as credits
      GROUP BY date, service
      ORDER BY date DESC, total_cost DESC
    SQL
    use_legacy_sql = false
  }
}
```

## QuickSight Dashboard for AWS Costs

Provision a QuickSight dashboard for cost visualization:

```hcl
# QuickSight data source
resource "aws_quicksight_data_source" "cur" {
  data_source_id = "cur-data-source"
  name           = "Cost and Usage Reports"
  type           = "ATHENA"

  parameters {
    athena {
      work_group = aws_athena_workgroup.cost_analysis.name
    }
  }

  permission {
    actions   = ["quicksight:DescribeDataSource", "quicksight:PassDataSource"]
    principal = "arn:aws:quicksight:us-east-1:${data.aws_caller_identity.current.account_id}:user/default/admin"
  }
}
```

## Automated Cost Report Email

Send cost summaries via email using Lambda:

```hcl
# Lambda function for cost report generation
resource "aws_lambda_function" "cost_report" {
  function_name = "weekly-cost-report"
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 120

  filename         = data.archive_file.cost_report.output_path
  source_code_hash = data.archive_file.cost_report.output_base64sha256
  role             = aws_iam_role.cost_report_lambda.arn

  environment {
    variables = {
      RECIPIENTS = "finance@company.com,engineering@company.com"
      SES_SENDER = "cost-reports@company.com"
    }
  }
}

# Schedule weekly execution
resource "aws_cloudwatch_event_rule" "weekly_report" {
  name                = "weekly-cost-report"
  description         = "Trigger weekly cost report"
  schedule_expression = "cron(0 9 ? * MON *)"  # Every Monday at 9 AM
}

resource "aws_cloudwatch_event_target" "cost_report" {
  rule = aws_cloudwatch_event_rule.weekly_report.name
  arn  = aws_lambda_function.cost_report.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_report.arn
}
```

## Best Practices

Set up cost exports in every cloud account and subscription. Use Parquet format for CUR data to optimize query performance. Schedule regular crawlers to keep Athena tables current. Create standard views for common cost queries. Automate cost report distribution to stakeholders. Retain cost data for at least 12 months for trend analysis. Use tags to enable dimensional cost breakdowns in reports.

## Conclusion

Building cost reporting infrastructure with Terraform ensures consistent, automated cost visibility across your cloud environment. From raw data exports to analytics databases and visualization dashboards, Terraform provisions the entire pipeline. This infrastructure gives finance and engineering teams the data they need to optimize spending and make informed decisions.

For related guides, see [How to Create AWS Budget Alerts with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-aws-budget-alerts-with-terraform/view) and [How to Use Terraform for FinOps Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-for-finops-best-practices/view).
