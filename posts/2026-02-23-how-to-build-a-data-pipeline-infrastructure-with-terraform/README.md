# How to Build a Data Pipeline Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Pipeline, AWS, ETL, Data Engineering, Infrastructure as Code, Glue

Description: Learn how to build a data pipeline infrastructure on AWS using Terraform with S3 data lakes, Glue ETL jobs, Athena queries, and step function orchestration.

---

Data pipelines are the backbone of any data-driven organization. They move data from sources to destinations, transform it along the way, and make it available for analytics and machine learning. Building this infrastructure by hand is tedious and error-prone. With Terraform, you can define your entire data pipeline infrastructure as code, making it reproducible and version-controlled.

In this guide, we will build a complete data pipeline on AWS using Terraform. The pipeline will ingest raw data into S3, transform it with Glue, catalog it for querying, and orchestrate the workflow with Step Functions.

## Pipeline Architecture

Our data pipeline has these stages:

1. **Ingestion**: Data lands in a raw S3 bucket
2. **Cataloging**: Glue crawlers discover the schema
3. **Transformation**: Glue ETL jobs clean and transform the data
4. **Storage**: Processed data goes to a curated S3 bucket
5. **Querying**: Athena provides SQL access to the data
6. **Orchestration**: Step Functions coordinate the workflow

## Data Lake Storage

The foundation is a set of S3 buckets organized by data stage.

```hcl
# storage.tf - Data lake S3 buckets
# Raw data landing zone
resource "aws_s3_bucket" "raw" {
  bucket = "${var.project_name}-data-raw-${var.environment}"

  tags = {
    DataStage = "raw"
    Pipeline  = var.project_name
  }
}

resource "aws_s3_bucket_versioning" "raw" {
  bucket = aws_s3_bucket.raw.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data_pipeline.arn
    }
    bucket_key_enabled = true
  }
}

# Lifecycle policy to manage storage costs
resource "aws_s3_bucket_lifecycle_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id

  rule {
    id     = "archive-old-data"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# Processed/curated data bucket
resource "aws_s3_bucket" "curated" {
  bucket = "${var.project_name}-data-curated-${var.environment}"

  tags = {
    DataStage = "curated"
    Pipeline  = var.project_name
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "curated" {
  bucket = aws_s3_bucket.curated.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data_pipeline.arn
    }
    bucket_key_enabled = true
  }
}

# Athena query results bucket
resource "aws_s3_bucket" "athena_results" {
  bucket = "${var.project_name}-athena-results-${var.environment}"

  tags = {
    Purpose = "AthenaQueryResults"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    id     = "cleanup-query-results"
    status = "Enabled"

    expiration {
      days = 7
    }
  }
}
```

## Glue Data Catalog and Crawlers

Glue crawlers automatically discover the schema of your data and create tables in the Glue Data Catalog.

```hcl
# catalog.tf - Glue Data Catalog
resource "aws_glue_catalog_database" "pipeline" {
  name = "${var.project_name}_${var.environment}"

  description = "Data catalog for ${var.project_name} pipeline"
}

# Crawler for raw data
resource "aws_glue_crawler" "raw" {
  database_name = aws_glue_catalog_database.pipeline.name
  name          = "${var.project_name}-raw-crawler"
  role          = aws_iam_role.glue.arn
  description   = "Crawls raw data to discover schema"

  s3_target {
    path = "s3://${aws_s3_bucket.raw.id}/data/"
  }

  schema_change_policy {
    delete_behavior = "LOG"
    update_behavior = "UPDATE_IN_DATABASE"
  }

  configuration = jsonencode({
    Version = 1.0
    Grouping = {
      TableGroupingPolicy = "CombineCompatibleSchemas"
    }
  })

  schedule = "cron(0 */6 * * ? *)" # Run every 6 hours

  tags = {
    Pipeline  = var.project_name
    DataStage = "raw"
  }
}

# Crawler for curated data
resource "aws_glue_crawler" "curated" {
  database_name = aws_glue_catalog_database.pipeline.name
  name          = "${var.project_name}-curated-crawler"
  role          = aws_iam_role.glue.arn
  description   = "Crawls curated data"

  s3_target {
    path = "s3://${aws_s3_bucket.curated.id}/data/"
  }

  schema_change_policy {
    delete_behavior = "LOG"
    update_behavior = "UPDATE_IN_DATABASE"
  }

  tags = {
    Pipeline  = var.project_name
    DataStage = "curated"
  }
}
```

## Glue ETL Jobs

Glue ETL jobs transform the raw data into a clean, structured format.

```hcl
# etl.tf - Glue ETL jobs
# S3 bucket for ETL scripts
resource "aws_s3_bucket" "scripts" {
  bucket = "${var.project_name}-etl-scripts-${var.environment}"
}

resource "aws_s3_object" "transform_script" {
  bucket = aws_s3_bucket.scripts.id
  key    = "scripts/transform.py"
  source = "${path.module}/scripts/transform.py"
  etag   = filemd5("${path.module}/scripts/transform.py")
}

resource "aws_glue_job" "transform" {
  name     = "${var.project_name}-transform"
  role_arn = aws_iam_role.glue.arn

  command {
    script_location = "s3://${aws_s3_bucket.scripts.id}/scripts/transform.py"
    python_version  = "3"
  }

  default_arguments = {
    "--job-language"          = "python"
    "--job-bookmark-option"   = "job-bookmark-enable"
    "--TempDir"               = "s3://${aws_s3_bucket.scripts.id}/temp/"
    "--source_database"       = aws_glue_catalog_database.pipeline.name
    "--source_table"          = "raw_events"
    "--target_bucket"         = aws_s3_bucket.curated.id
    "--enable-metrics"        = "true"
    "--enable-continuous-cloudwatch-log" = "true"
  }

  # Worker configuration
  glue_version      = "4.0"
  worker_type       = "G.1X"
  number_of_workers = 5

  # Timeout after 2 hours
  timeout = 120

  # Retry once on failure
  max_retries = 1

  execution_property {
    max_concurrent_runs = 1
  }

  tags = {
    Pipeline = var.project_name
    Stage    = "transform"
  }
}

# Data quality check job
resource "aws_glue_job" "quality_check" {
  name     = "${var.project_name}-quality-check"
  role_arn = aws_iam_role.glue.arn

  command {
    script_location = "s3://${aws_s3_bucket.scripts.id}/scripts/quality_check.py"
    python_version  = "3"
  }

  default_arguments = {
    "--job-language"        = "python"
    "--database"            = aws_glue_catalog_database.pipeline.name
    "--enable-metrics"      = "true"
  }

  glue_version      = "4.0"
  worker_type       = "G.1X"
  number_of_workers = 2
  timeout           = 30

  tags = {
    Pipeline = var.project_name
    Stage    = "quality"
  }
}
```

## Athena for Querying

Athena lets analysts query the data using standard SQL without running any servers.

```hcl
# athena.tf - Query layer
resource "aws_athena_workgroup" "pipeline" {
  name = "${var.project_name}-${var.environment}"

  configuration {
    enforce_workgroup_configuration = true

    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.id}/results/"

      encryption_configuration {
        encryption_option = "SSE_KMS"
        kms_key_arn       = aws_kms_key.data_pipeline.arn
      }
    }

    # Limit query costs
    bytes_scanned_cutoff_per_query = 10737418240 # 10 GB
  }

  tags = {
    Pipeline = var.project_name
  }
}

# Named queries for common operations
resource "aws_athena_named_query" "daily_summary" {
  name      = "daily-summary"
  workgroup = aws_athena_workgroup.pipeline.name
  database  = aws_glue_catalog_database.pipeline.name

  query = <<-SQL
    SELECT
      date_trunc('day', event_time) as day,
      event_type,
      count(*) as event_count
    FROM curated_events
    WHERE event_time >= current_date - interval '7' day
    GROUP BY 1, 2
    ORDER BY 1 DESC, 3 DESC
  SQL
}
```

## Step Functions Orchestration

Step Functions coordinates the pipeline stages, handling retries and error conditions.

```hcl
# orchestration.tf - Step Functions workflow
resource "aws_sfn_state_machine" "pipeline" {
  name     = "${var.project_name}-pipeline"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Data pipeline orchestration"
    StartAt = "RunCrawler"
    States = {
      RunCrawler = {
        Type     = "Task"
        Resource = "arn:aws:states:::glue:startCrawler.sync"
        Parameters = {
          Name = aws_glue_crawler.raw.name
        }
        Next  = "TransformData"
        Catch = [
          {
            ErrorEquals = ["States.ALL"]
            Next        = "PipelineFailed"
          }
        ]
      }
      TransformData = {
        Type     = "Task"
        Resource = "arn:aws:states:::glue:startJobRun.sync"
        Parameters = {
          JobName = aws_glue_job.transform.name
        }
        Next  = "QualityCheck"
        Catch = [
          {
            ErrorEquals = ["States.ALL"]
            Next        = "PipelineFailed"
          }
        ]
      }
      QualityCheck = {
        Type     = "Task"
        Resource = "arn:aws:states:::glue:startJobRun.sync"
        Parameters = {
          JobName = aws_glue_job.quality_check.name
        }
        Next  = "UpdateCatalog"
        Catch = [
          {
            ErrorEquals = ["States.ALL"]
            Next        = "PipelineFailed"
          }
        ]
      }
      UpdateCatalog = {
        Type     = "Task"
        Resource = "arn:aws:states:::glue:startCrawler.sync"
        Parameters = {
          Name = aws_glue_crawler.curated.name
        }
        Next = "PipelineSucceeded"
      }
      PipelineSucceeded = {
        Type = "Succeed"
      }
      PipelineFailed = {
        Type  = "Fail"
        Cause = "Pipeline stage failed"
      }
    }
  })

  tags = {
    Pipeline = var.project_name
  }
}

# Schedule the pipeline to run daily
resource "aws_cloudwatch_event_rule" "pipeline_schedule" {
  name                = "${var.project_name}-daily-run"
  schedule_expression = "cron(0 2 * * ? *)" # Run at 2 AM UTC
}

resource "aws_cloudwatch_event_target" "pipeline" {
  rule     = aws_cloudwatch_event_rule.pipeline_schedule.name
  arn      = aws_sfn_state_machine.pipeline.arn
  role_arn = aws_iam_role.eventbridge.arn
}
```

## Summary

A data pipeline built with Terraform gives you a fully automated, reproducible data processing system. The S3 data lake provides cost-effective storage with lifecycle management. Glue handles schema discovery and ETL transformations. Athena provides serverless SQL querying. And Step Functions orchestrates everything with proper error handling.

The key design decisions are separating raw and curated data into different buckets, using Glue job bookmarks to avoid reprocessing, and adding quality checks before data reaches the curated layer.

For monitoring your data pipeline and getting alerted when jobs fail or run longer than expected, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) provides monitoring and alerting that can track pipeline execution metrics across all your data workflows.
