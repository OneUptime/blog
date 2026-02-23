# How to Build an AI/ML Pipeline Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AI, Machine Learning, MLOps, SageMaker, AWS, Infrastructure as Code

Description: Learn how to build AI and machine learning pipeline infrastructure on AWS using Terraform with SageMaker, S3 feature stores, model registries, and training jobs.

---

Machine learning projects fail more often due to infrastructure problems than model quality. Data scientists spend a huge amount of time wrestling with environments, data access, and deployment instead of focusing on models. A well-designed ML infrastructure built with Terraform eliminates these problems by providing reproducible, self-service environments for the entire ML lifecycle.

In this guide, we will build the infrastructure for an end-to-end ML pipeline on AWS using Terraform. This covers everything from data storage and feature engineering to model training, evaluation, and deployment.

## ML Pipeline Architecture

Our ML infrastructure supports these stages:

1. **Data storage**: S3 data lake with organized datasets
2. **Feature store**: SageMaker Feature Store for reusable features
3. **Training**: SageMaker training jobs with GPU instances
4. **Model registry**: Version-controlled model artifacts
5. **Serving**: Real-time and batch inference endpoints
6. **Monitoring**: Model performance and data drift detection

## Data Storage Layer

ML projects need large volumes of training data stored efficiently.

```hcl
# data.tf - ML data storage
resource "aws_s3_bucket" "ml_data" {
  bucket = "${var.project_name}-ml-data-${var.environment}"

  tags = {
    Purpose = "MLData"
    Project = var.project_name
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ml_data" {
  bucket = aws_s3_bucket.ml_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.ml.arn
    }
  }
}

# Organize data by stage
resource "aws_s3_object" "data_folders" {
  for_each = toset(["raw/", "processed/", "features/", "training/", "validation/", "test/"])

  bucket = aws_s3_bucket.ml_data.id
  key    = each.value
}

# Model artifacts bucket
resource "aws_s3_bucket" "model_artifacts" {
  bucket = "${var.project_name}-model-artifacts-${var.environment}"

  tags = {
    Purpose = "ModelArtifacts"
  }
}

resource "aws_s3_bucket_versioning" "model_artifacts" {
  bucket = aws_s3_bucket.model_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## SageMaker Domain and User Profiles

SageMaker Studio provides an IDE for data scientists. The domain and user profiles set up the environment.

```hcl
# sagemaker.tf - SageMaker Studio setup
resource "aws_sagemaker_domain" "ml" {
  domain_name = "${var.project_name}-ml-studio"
  auth_mode   = "IAM"
  vpc_id      = var.vpc_id
  subnet_ids  = var.private_subnet_ids

  default_user_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn

    security_groups = [aws_security_group.sagemaker.id]

    sharing_settings {
      notebook_output_option = "Allowed"
      s3_output_path         = "s3://${aws_s3_bucket.ml_data.id}/studio-output/"
    }

    jupyter_server_app_settings {
      default_resource_spec {
        instance_type       = "system"
        sagemaker_image_arn = data.aws_sagemaker_prebuilt_ecr_image.pytorch.id
      }
    }

    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type       = "ml.t3.medium"
        sagemaker_image_arn = data.aws_sagemaker_prebuilt_ecr_image.pytorch.id
      }
    }
  }

  default_space_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn
    security_groups = [aws_security_group.sagemaker.id]
  }

  tags = {
    Project = var.project_name
  }
}

# User profiles for team members
resource "aws_sagemaker_user_profile" "data_scientist" {
  for_each = var.data_scientists

  domain_id         = aws_sagemaker_domain.ml.id
  user_profile_name = each.key

  user_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn
  }

  tags = {
    Role = "DataScientist"
  }
}
```

## Feature Store

SageMaker Feature Store provides a centralized repository for ML features that can be shared across teams and models.

```hcl
# feature-store.tf - SageMaker Feature Store
resource "aws_sagemaker_feature_group" "customer_features" {
  feature_group_name             = "customer-features"
  record_identifier_feature_name = "customer_id"
  event_time_feature_name        = "event_time"
  role_arn                       = aws_iam_role.sagemaker_execution.arn

  feature_definition {
    feature_name = "customer_id"
    feature_type = "String"
  }

  feature_definition {
    feature_name = "event_time"
    feature_type = "String"
  }

  feature_definition {
    feature_name = "total_orders"
    feature_type = "Integral"
  }

  feature_definition {
    feature_name = "avg_order_value"
    feature_type = "Fractional"
  }

  feature_definition {
    feature_name = "days_since_last_order"
    feature_type = "Integral"
  }

  feature_definition {
    feature_name = "customer_segment"
    feature_type = "String"
  }

  # Online store for real-time feature serving
  online_store_config {
    enable_online_store = true

    security_config {
      kms_key_id = aws_kms_key.ml.arn
    }
  }

  # Offline store for batch training
  offline_store_config {
    s3_storage_config {
      s3_uri                    = "s3://${aws_s3_bucket.ml_data.id}/features/"
      kms_key_id                = aws_kms_key.ml.arn
      resolved_output_s3_uri    = "s3://${aws_s3_bucket.ml_data.id}/features/resolved/"
    }

    table_format = "Glue"

    data_catalog_config {
      catalog    = "AwsDataCatalog"
      database   = aws_glue_catalog_database.features.name
      table_name = "customer_features"
    }
  }

  tags = {
    Project = var.project_name
    Type    = "FeatureGroup"
  }
}

resource "aws_glue_catalog_database" "features" {
  name = "${var.project_name}_features"
}
```

## Model Registry

The model registry tracks model versions, their metadata, and approval status.

```hcl
# model-registry.tf - SageMaker Model Registry
resource "aws_sagemaker_model_package_group" "main" {
  model_package_group_name        = "${var.project_name}-models"
  model_package_group_description = "Model package group for ${var.project_name}"

  tags = {
    Project = var.project_name
  }
}

# ECR repository for custom training containers
resource "aws_ecr_repository" "training" {
  name = "${var.project_name}/training"

  image_scanning_configuration {
    scan_on_push = true
  }

  image_tag_mutability = "IMMUTABLE"
}

resource "aws_ecr_repository" "inference" {
  name = "${var.project_name}/inference"

  image_scanning_configuration {
    scan_on_push = true
  }

  image_tag_mutability = "IMMUTABLE"
}
```

## SageMaker Pipeline

SageMaker Pipelines orchestrate the ML workflow from data processing to model deployment.

```hcl
# pipeline.tf - ML Pipeline infrastructure
# Pipeline execution role
resource "aws_iam_role" "pipeline_execution" {
  name = "${var.project_name}-pipeline-execution"

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

resource "aws_iam_role_policy" "pipeline_execution" {
  name = "pipeline-execution-policy"
  role = aws_iam_role.pipeline_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.ml_data.arn,
          "${aws_s3_bucket.ml_data.arn}/*",
          aws_s3_bucket.model_artifacts.arn,
          "${aws_s3_bucket.model_artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sagemaker:CreateTrainingJob",
          "sagemaker:CreateProcessingJob",
          "sagemaker:CreateModel",
          "sagemaker:CreateEndpoint",
          "sagemaker:CreateEndpointConfig",
          "sagemaker:DescribeTrainingJob",
          "sagemaker:DescribeProcessingJob"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
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
      }
    ]
  })
}
```

## Model Serving Infrastructure

Deploy models as real-time endpoints with auto-scaling.

```hcl
# serving.tf - Model serving endpoints
resource "aws_sagemaker_endpoint_configuration" "production" {
  name = "${var.project_name}-production-endpoint-config"

  production_variants {
    variant_name           = "primary"
    model_name             = var.model_name
    initial_instance_count = 2
    instance_type          = "ml.m5.xlarge"
    initial_variant_weight = 1.0
  }

  # Data capture for monitoring
  data_capture_config {
    enable_capture              = true
    initial_sampling_percentage = 100

    destination_s3_uri = "s3://${aws_s3_bucket.ml_data.id}/data-capture/"

    capture_options {
      capture_mode = "Input"
    }
    capture_options {
      capture_mode = "Output"
    }

    capture_content_type_header {
      json_content_types = ["application/json"]
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Auto-scaling for the endpoint
resource "aws_appautoscaling_target" "sagemaker" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "endpoint/${var.project_name}-production/variant/primary"
  scalable_dimension = "sagemaker:variant:DesiredInstanceCount"
  service_namespace  = "sagemaker"
}

resource "aws_appautoscaling_policy" "sagemaker" {
  name               = "${var.project_name}-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sagemaker.resource_id
  scalable_dimension = aws_appautoscaling_target.sagemaker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.sagemaker.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "SageMakerVariantInvocationsPerInstance"
    }
    target_value = 1000
  }
}
```

## Model Monitoring

Detect data drift and model quality degradation in production.

```hcl
# monitoring.tf - Model monitoring
resource "aws_sagemaker_model_quality_job_definition" "main" {
  name     = "${var.project_name}-model-quality-monitor"
  role_arn = aws_iam_role.sagemaker_execution.arn

  model_quality_app_specification {
    image_uri       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/monitoring:latest"
    problem_type    = "BinaryClassification"
  }

  model_quality_job_input {
    end_time_offset   = "-PT1H"
    start_time_offset = "-PT2H"

    endpoint_input {
      endpoint_name          = "${var.project_name}-production"
      local_path             = "/opt/ml/processing/input"
      inference_attribute    = "prediction"
      probability_attribute  = "probability"
    }

    ground_truth_s3_input {
      s3_uri = "s3://${aws_s3_bucket.ml_data.id}/ground-truth/"
    }
  }

  model_quality_job_output_config {
    monitoring_outputs {
      s3_output {
        s3_uri        = "s3://${aws_s3_bucket.ml_data.id}/monitoring-output/"
        local_path    = "/opt/ml/processing/output"
        s3_upload_mode = "EndOfJob"
      }
    }
  }

  job_resources {
    cluster_config {
      instance_count    = 1
      instance_type     = "ml.m5.large"
      volume_size_in_gb = 50
    }
  }
}
```

## Summary

An ML pipeline infrastructure built with Terraform provides a structured, reproducible environment for the entire machine learning lifecycle. SageMaker Studio gives data scientists a collaborative workspace. The Feature Store ensures features are reusable. The Model Registry tracks model versions. And the serving infrastructure handles production deployment with auto-scaling.

The most important thing is making the infrastructure self-service. Data scientists should be able to run experiments, train models, and deploy to production without filing infrastructure tickets.

For monitoring your ML models in production and detecting issues like latency spikes or error rate increases, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) provides the observability you need to keep your ML services healthy.
