# How to Deploy Apache Airflow (MWAA) with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, MWAA, Apache Airflow, Data Engineering, Orchestration, Infrastructure as Code

Description: Learn how to deploy Amazon Managed Workflows for Apache Airflow (MWAA) using OpenTofu with proper S3 DAG storage, VPC networking, and IAM configuration.

---

Amazon MWAA is the fully managed Apache Airflow service that eliminates the operational burden of running Airflow yourself. You focus on writing DAGs; AWS handles the Airflow infrastructure. OpenTofu automates the MWAA environment setup including S3 buckets, IAM roles, VPC configuration, and the environment itself.

## S3 Bucket for DAGs and Plugins

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 bucket for Airflow DAGs, plugins, and requirements
resource "aws_s3_bucket" "airflow" {
  bucket = "${var.environment}-airflow-${data.aws_caller_identity.current.account_id}"

  tags = var.common_tags
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_versioning" "airflow" {
  bucket = aws_s3_bucket.airflow.id
  versioning_configuration {
    status = "Enabled"  # Required by MWAA
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "airflow" {
  bucket = aws_s3_bucket.airflow.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Block public access - DAG bucket must not be public
resource "aws_s3_bucket_public_access_block" "airflow" {
  bucket                  = aws_s3_bucket.airflow.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## IAM Role for MWAA

```hcl
# iam.tf
resource "aws_iam_role" "mwaa" {
  name = "${var.environment}-mwaa-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = [
            "airflow.amazonaws.com",
            "airflow-env.amazonaws.com"
          ]
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "mwaa" {
  name = "MWAAExecutionPolicy"
  role = aws_iam_role.mwaa.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "airflow:PublishMetrics"
        Resource = "arn:aws:airflow:${var.aws_region}:${data.aws_caller_identity.current.account_id}:environment/${var.environment}-airflow"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject*",
          "s3:GetBucket*",
          "s3:List*",
        ]
        Resource = [
          aws_s3_bucket.airflow.arn,
          "${aws_s3_bucket.airflow.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:GetLogRecord",
          "logs:GetLogGroupFields",
          "logs:GetQueryResults",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:airflow-${var.environment}-airflow-*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:DescribeLogGroups"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetAccountPublicAccessBlock"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["cloudwatch:PutMetricData"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ChangeMessageVisibility",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ReceiveMessage",
          "sqs:SendMessage",
        ]
        Resource = "arn:aws:sqs:${var.aws_region}:*:airflow-celery-*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey*",
          "kms:Encrypt",
        ]
        NotResource = "arn:aws:kms:*:${data.aws_caller_identity.current.account_id}:key/*"
        Condition = {
          StringLike = {
            "kms:ViaService" = [
              "sqs.${var.aws_region}.amazonaws.com"
            ]
          }
        }
      }
    ]
  })
}
```

## Creating the MWAA Environment

```hcl
# mwaa.tf
resource "aws_mwaa_environment" "main" {
  name                 = "${var.environment}-airflow"
  airflow_version      = "2.11.0"
  environment_class    = var.environment_class  # Use a supported MWAA environment class
  execution_role_arn   = aws_iam_role.mwaa.arn
  webserver_access_mode = "PRIVATE_ONLY"
  max_workers          = var.max_workers
  min_workers          = var.min_workers

  # S3 configuration
  source_bucket_arn    = aws_s3_bucket.airflow.arn
  dag_s3_path          = "dags/"
  # Optional plugin and requirements files also need their corresponding *_s3_object_version values.

  network_configuration {
    security_group_ids = [aws_security_group.mwaa.id]
    subnet_ids         = var.private_subnet_ids  # Two private subnets in different Availability Zones
  }

  logging_configuration {
    dag_processing_logs {
      enabled   = true
      log_level = "WARNING"
    }
    scheduler_logs {
      enabled   = true
      log_level = "WARNING"
    }
    task_logs {
      enabled   = true
      log_level = "INFO"
    }
    webserver_logs {
      enabled   = true
      log_level = "WARNING"
    }
    worker_logs {
      enabled   = true
      log_level = "WARNING"
    }
  }

  airflow_configuration_options = {
    "core.default_task_retries"     = "3"
    "core.parallelism"              = "32"
    "scheduler.dag_dir_list_interval" = "30"
  }

  depends_on = [
    aws_iam_role_policy.mwaa,
    aws_s3_bucket_versioning.airflow,
    aws_s3_bucket_public_access_block.airflow,
  ]

  tags = var.common_tags
}

resource "aws_security_group" "mwaa" {
  name        = "${var.environment}-mwaa-sg"
  description = "Security group for MWAA environment"
  vpc_id      = var.vpc_id

  # Allow all traffic within the security group (for inter-component communication)
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Best Practices

- Use `mw1.small` for development and `mw1.medium` or larger for production workloads.
- Store DAGs in S3 and use CI/CD to sync them - avoid manual uploads.
- Enable versioning on the S3 bucket (required by MWAA) - this also lets you roll back bad DAG deployments.
- Use two private subnets in different Availability Zones, and keep the webserver in `PRIVATE_ONLY` mode unless you explicitly need public access.
- Monitor the `QueuedTasks` CloudWatch metric to detect when workers are overwhelmed and scale accordingly.
