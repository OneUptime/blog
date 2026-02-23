# How to Build a Machine Learning Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Machine Learning, SageMaker, AWS, Infrastructure Patterns, MLOps

Description: Build production machine learning infrastructure with Terraform using SageMaker, S3 data stores, model registries, and automated training pipelines on AWS.

---

Machine learning projects fail not because of bad models, but because of bad infrastructure. Data scientists spend weeks getting a model to work on their laptop, only to discover that deploying it to production requires an entirely different set of tools and skills. ML infrastructure bridges that gap.

In this guide, we will build a complete ML infrastructure on AWS using Terraform. We will cover data storage, training environments, model registries, and inference endpoints, giving your ML team a solid platform to work from.

## Architecture Overview

Our ML infrastructure includes:

- S3 buckets for training data, model artifacts, and experiment tracking
- SageMaker domain for notebooks and experimentation
- SageMaker training jobs and processing jobs
- Model registry for versioning
- SageMaker endpoints for real-time inference
- IAM roles following least-privilege principles

## Data Storage Layer

ML workloads need several storage buckets with different access patterns:

```hcl
# Training data bucket
resource "aws_s3_bucket" "training_data" {
  bucket = "${var.project_name}-training-data-${var.account_id}"

  tags = {
    Purpose = "ml-training-data"
  }
}

# Model artifacts bucket
resource "aws_s3_bucket" "model_artifacts" {
  bucket = "${var.project_name}-model-artifacts-${var.account_id}"

  tags = {
    Purpose = "ml-model-artifacts"
  }
}

# Experiment tracking and logs
resource "aws_s3_bucket" "experiments" {
  bucket = "${var.project_name}-experiments-${var.account_id}"

  tags = {
    Purpose = "ml-experiments"
  }
}

# Versioning on model artifacts for reproducibility
resource "aws_s3_bucket_versioning" "model_artifacts" {
  bucket = aws_s3_bucket.model_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle policy - move old training data to IA
resource "aws_s3_bucket_lifecycle_configuration" "training_data" {
  bucket = aws_s3_bucket.training_data.id

  rule {
    id     = "archive-old-data"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

# Encryption for all buckets
resource "aws_s3_bucket_server_side_encryption_configuration" "ml_buckets" {
  for_each = {
    training  = aws_s3_bucket.training_data.id
    artifacts = aws_s3_bucket.model_artifacts.id
    experiments = aws_s3_bucket.experiments.id
  }

  bucket = each.value

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.ml.arn
    }
  }
}
```

## SageMaker Domain

The SageMaker domain provides managed Jupyter notebooks and a collaboration environment:

```hcl
resource "aws_sagemaker_domain" "ml_platform" {
  domain_name = "${var.project_name}-ml-platform"
  auth_mode   = "IAM"
  vpc_id      = var.vpc_id
  subnet_ids  = var.private_subnet_ids

  default_user_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn

    sharing_settings {
      notebook_output_option = "Allowed"
      s3_output_path         = "s3://${aws_s3_bucket.experiments.id}/shared/"
    }

    jupyter_server_app_settings {
      default_resource_spec {
        instance_type = "system"
      }
    }

    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type = "ml.t3.medium"
      }
    }
  }

  default_space_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn
  }

  tags = {
    Environment = var.environment
  }
}

# User profiles for data scientists
resource "aws_sagemaker_user_profile" "data_scientists" {
  for_each = toset(var.data_scientist_usernames)

  domain_id         = aws_sagemaker_domain.ml_platform.id
  user_profile_name = each.key

  user_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn
  }
}
```

## SageMaker Execution Role

The execution role needs access to S3, ECR, CloudWatch, and other services:

```hcl
resource "aws_iam_role" "sagemaker_execution" {
  name = "${var.project_name}-sagemaker-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "sagemaker_s3" {
  name = "sagemaker-s3-access"
  role = aws_iam_role.sagemaker_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.training_data.arn,
          "${aws_s3_bucket.training_data.arn}/*",
          aws_s3_bucket.model_artifacts.arn,
          "${aws_s3_bucket.model_artifacts.arn}/*",
          aws_s3_bucket.experiments.arn,
          "${aws_s3_bucket.experiments.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.ml.arn
      }
    ]
  })
}
```

## ECR Repositories for Custom Containers

Data scientists often need custom training containers:

```hcl
# Repository for custom training containers
resource "aws_ecr_repository" "training" {
  name                 = "${var.project_name}-training"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Repository for inference containers
resource "aws_ecr_repository" "inference" {
  name                 = "${var.project_name}-inference"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
```

## Model Registry

The SageMaker Model Registry tracks model versions and their approval status:

```hcl
resource "aws_sagemaker_model_package_group" "main" {
  model_package_group_name = "${var.project_name}-models"

  model_package_group_description = "Registry for ${var.project_name} ML models"

  tags = {
    Project = var.project_name
  }
}
```

## Real-Time Inference Endpoint

Deploy models for real-time predictions:

```hcl
# Model configuration
resource "aws_sagemaker_model" "production" {
  name               = "${var.project_name}-production-model"
  execution_role_arn = aws_iam_role.sagemaker_execution.arn

  primary_container {
    image          = "${aws_ecr_repository.inference.repository_url}:latest"
    model_data_url = "s3://${aws_s3_bucket.model_artifacts.id}/production/model.tar.gz"
  }

  vpc_config {
    subnets            = var.private_subnet_ids
    security_group_ids = [aws_security_group.sagemaker.id]
  }
}

# Endpoint configuration with auto-scaling
resource "aws_sagemaker_endpoint_configuration" "production" {
  name = "${var.project_name}-production-endpoint-config"

  production_variants {
    variant_name           = "primary"
    model_name             = aws_sagemaker_model.production.name
    initial_instance_count = 2
    instance_type          = "ml.m5.xlarge"

    initial_variant_weight = 1.0
  }

  # Enable data capture for monitoring model quality
  data_capture_config {
    enable_capture              = true
    initial_sampling_percentage = 10
    destination_s3_uri          = "s3://${aws_s3_bucket.experiments.id}/data-capture/"

    capture_options {
      capture_mode = "Input"
    }

    capture_options {
      capture_mode = "Output"
    }
  }
}

# The endpoint itself
resource "aws_sagemaker_endpoint" "production" {
  name                 = "${var.project_name}-production"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.production.name
}

# Auto-scaling for the endpoint
resource "aws_appautoscaling_target" "sagemaker" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "endpoint/${aws_sagemaker_endpoint.production.name}/variant/primary"
  scalable_dimension = "sagemaker:variant:DesiredInstanceCount"
  service_namespace  = "sagemaker"
}

resource "aws_appautoscaling_policy" "sagemaker" {
  name               = "${var.project_name}-endpoint-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sagemaker.resource_id
  scalable_dimension = aws_appautoscaling_target.sagemaker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.sagemaker.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "SageMakerVariantInvocationsPerInstance"
    }
    target_value       = 1000
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

## Monitoring

Monitor your ML endpoints and training jobs. For a complete observability setup, see [building a monitoring and alerting stack with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

```hcl
resource "aws_cloudwatch_metric_alarm" "endpoint_latency" {
  alarm_name          = "${var.project_name}-endpoint-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ModelLatency"
  namespace           = "AWS/SageMaker"
  period              = 60
  statistic           = "Average"
  threshold           = 1000000 # 1 second in microseconds
  alarm_description   = "Model inference latency exceeds 1 second"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    EndpointName = aws_sagemaker_endpoint.production.name
    VariantName  = "primary"
  }
}
```

## Wrapping Up

ML infrastructure is a platform problem, not a one-off project. The Terraform approach we covered here gives your data science team a consistent, secure environment for experimentation, training, and deployment. S3 handles data and artifacts, SageMaker provides the compute and collaboration layer, and the model registry tracks what goes to production. Build this foundation once, and your ML team can focus on models instead of fighting with infrastructure.
