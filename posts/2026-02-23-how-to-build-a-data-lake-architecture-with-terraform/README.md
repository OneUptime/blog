# How to Build a Data Lake Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Lake, AWS, S3, Glue, Infrastructure Patterns, Data Engineering

Description: Step-by-step guide to building a production-ready data lake on AWS using Terraform, covering S3 storage tiers, Glue catalogs, Athena queries, and data lifecycle management.

---

Every growing company eventually reaches a point where data is scattered across dozens of systems and nobody can get a clear picture of what is happening. A data lake solves this by centralizing raw and processed data in one place, making it available for analytics, machine learning, and reporting.

Building a data lake by hand through the AWS console is tedious and error-prone. With Terraform, you can define the entire architecture as code, making it reproducible and auditable. In this guide, we will build a complete data lake on AWS using S3, Glue, Athena, and Lake Formation.

## The Data Lake Architecture

Our data lake follows the medallion architecture pattern with three zones:

- **Raw (Bronze)**: Unmodified data exactly as it arrived from source systems
- **Processed (Silver)**: Cleaned, validated, and deduplicated data
- **Curated (Gold)**: Business-level aggregations and datasets ready for consumption

Each zone lives in its own S3 prefix (or bucket, depending on your governance needs).

## S3 Storage Foundation

S3 is the backbone of any AWS data lake. We need buckets with proper encryption, versioning, and lifecycle rules:

```hcl
# modules/data_lake_storage/main.tf

# One bucket per data zone
resource "aws_s3_bucket" "zones" {
  for_each = toset(["raw", "processed", "curated"])
  bucket   = "${var.project_name}-${each.key}-${var.account_id}"

  tags = {
    Zone        = each.key
    Environment = var.environment
  }
}

# Enable versioning for audit trail
resource "aws_s3_bucket_versioning" "zones" {
  for_each = aws_s3_bucket.zones
  bucket   = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption with KMS
resource "aws_s3_bucket_server_side_encryption_configuration" "zones" {
  for_each = aws_s3_bucket.zones
  bucket   = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data_lake.arn
    }
    bucket_key_enabled = true
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "zones" {
  for_each = aws_s3_bucket.zones
  bucket   = each.value.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Lifecycle Policies

Raw data often needs different retention rules than curated data. Use lifecycle policies to move older data to cheaper storage tiers:

```hcl
# Move raw data to Glacier after 90 days, delete after 2 years
resource "aws_s3_bucket_lifecycle_configuration" "raw" {
  bucket = aws_s3_bucket.zones["raw"].id

  rule {
    id     = "archive-old-data"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 730
    }
  }
}

# Keep curated data in Intelligent Tiering
resource "aws_s3_bucket_lifecycle_configuration" "curated" {
  bucket = aws_s3_bucket.zones["curated"].id

  rule {
    id     = "intelligent-tiering"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}
```

## AWS Glue Data Catalog

The Glue Data Catalog acts as the metadata store for your data lake. It keeps track of schemas, partitions, and table definitions so query engines like Athena can find and read the data:

```hcl
# Central database in the Glue catalog
resource "aws_glue_catalog_database" "data_lake" {
  name        = "${var.project_name}_data_lake"
  description = "Central data lake catalog"
}

# Example table definition for raw event data
resource "aws_glue_catalog_table" "raw_events" {
  database_name = aws_glue_catalog_database.data_lake.name
  name          = "raw_events"

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "has_encrypted_data" = "true"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.zones["raw"].id}/events/"
    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "event_id"
      type = "string"
    }

    columns {
      name = "event_type"
      type = "string"
    }

    columns {
      name = "timestamp"
      type = "timestamp"
    }

    columns {
      name = "payload"
      type = "string"
    }
  }

  # Partition by date for query performance
  partition_keys {
    name = "year"
    type = "string"
  }

  partition_keys {
    name = "month"
    type = "string"
  }

  partition_keys {
    name = "day"
    type = "string"
  }
}
```

## Glue ETL Jobs

Glue jobs handle the transformation from raw to processed to curated:

```hcl
# IAM role for Glue jobs
resource "aws_iam_role" "glue" {
  name = "${var.project_name}-glue-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
      }
    ]
  })
}

# Glue job for transforming raw data to processed
resource "aws_glue_job" "raw_to_processed" {
  name     = "${var.project_name}-raw-to-processed"
  role_arn = aws_iam_role.glue.arn

  command {
    script_location = "s3://${aws_s3_bucket.scripts.id}/etl/raw_to_processed.py"
    python_version  = "3"
  }

  default_arguments = {
    "--job-language"         = "python"
    "--job-bookmark-option"  = "job-bookmark-enable"
    "--TempDir"              = "s3://${aws_s3_bucket.scripts.id}/tmp/"
    "--source_bucket"        = aws_s3_bucket.zones["raw"].id
    "--destination_bucket"   = aws_s3_bucket.zones["processed"].id
  }

  glue_version      = "4.0"
  number_of_workers = 10
  worker_type       = "G.1X"
  timeout           = 120
}

# Schedule the job to run daily
resource "aws_glue_trigger" "daily_etl" {
  name     = "${var.project_name}-daily-etl"
  type     = "SCHEDULED"
  schedule = "cron(0 2 * * ? *)" # Run at 2 AM UTC daily

  actions {
    job_name = aws_glue_job.raw_to_processed.name
  }
}
```

## Athena Query Workgroups

Athena lets users query data in the lake using standard SQL. Workgroups help you control costs and manage access:

```hcl
# Athena workgroup with query result encryption and cost controls
resource "aws_athena_workgroup" "analysts" {
  name = "${var.project_name}-analysts"

  configuration {
    enforce_workgroup_configuration = true
    publish_cloudwatch_metrics_enabled = true

    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.id}/results/"

      encryption_configuration {
        encryption_option = "SSE_KMS"
        kms_key_arn       = aws_kms_key.data_lake.arn
      }
    }

    # Prevent runaway queries
    bytes_scanned_cutoff_per_query = 10737418240 # 10 GB limit
  }
}
```

## Data Ingestion with Kinesis Firehose

For streaming data into the raw zone, Kinesis Data Firehose handles buffering and delivery:

```hcl
resource "aws_kinesis_firehose_delivery_stream" "events" {
  name        = "${var.project_name}-events-stream"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.zones["raw"].arn

    # Partition by date automatically
    prefix              = "events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    error_output_prefix = "errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"

    buffering_size     = 128 # MB
    buffering_interval = 300 # seconds

    # Convert to Parquet on the fly
    data_format_conversion_configuration {
      input_format_configuration {
        deserializer {
          open_x_json_ser_de {}
        }
      }

      output_format_configuration {
        serializer {
          parquet_ser_de {
            compression = "SNAPPY"
          }
        }
      }

      schema_configuration {
        database_name = aws_glue_catalog_database.data_lake.name
        table_name    = aws_glue_catalog_table.raw_events.name
        role_arn      = aws_iam_role.firehose.arn
      }
    }
  }
}
```

## Lake Formation for Governance

As your data lake grows, you need fine-grained access control. Lake Formation adds column-level and row-level security:

```hcl
resource "aws_lakeformation_data_lake_settings" "main" {
  admins = [aws_iam_role.data_lake_admin.arn]
}

resource "aws_lakeformation_permissions" "analysts_read" {
  principal   = aws_iam_role.analysts.arn
  permissions = ["SELECT"]

  table {
    database_name = aws_glue_catalog_database.data_lake.name
    name          = aws_glue_catalog_table.raw_events.name
  }
}
```

## Putting It Together

A well-built data lake is not just about storage. It is about making data discoverable, secure, and queryable. The Terraform approach we covered here lets you spin up identical data lakes across environments and keep everything under version control. For related infrastructure, you might also want to look at how to build a [data warehouse architecture with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-data-warehouse-architecture-with-terraform/view) for the consumption layer on top of your lake.

Start with the storage foundation, add the catalog and ETL jobs, and then layer on governance as your data team grows.
