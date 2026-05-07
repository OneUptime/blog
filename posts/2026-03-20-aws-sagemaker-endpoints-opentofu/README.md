# How to Create AWS SageMaker Endpoints with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SageMaker, Machine Learning, MLOps, Infrastructure as Code

Description: Learn how to create AWS SageMaker model endpoints for real-time ML inference using endpoint configurations and auto-scaling with OpenTofu.

## Introduction

SageMaker endpoints host your trained models for real-time inference. They consist of a model definition, an endpoint configuration (instance type and count), and the endpoint itself. OpenTofu manages the full deployment pipeline as code.

## IAM Role for SageMaker

```hcl
resource "aws_iam_role" "sagemaker" {
  name = "${var.app_name}-sagemaker-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sagemaker.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "sagemaker_full" {
  role       = aws_iam_role.sagemaker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy" "sagemaker_model_bucket" {
  name = "${var.app_name}-sagemaker-model-bucket"
  role = aws_iam_role.sagemaker.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "arn:aws:s3:::${var.model_bucket}/models/classifier/${var.model_version}/model.tar.gz"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::${var.model_bucket}/data-capture/*"
      }
    ]
  })
}
```

## Model Definition

```hcl
data "aws_sagemaker_prebuilt_ecr_image" "xgboost" {
  repository_name = "sagemaker-xgboost"
  image_tag       = "1.7-1"
  region          = var.region
}

resource "aws_sagemaker_model" "classifier" {
  name               = "${var.app_name}-classifier-${var.model_version}"
  execution_role_arn = aws_iam_role.sagemaker.arn

  primary_container {
    # Pre-built SageMaker container for XGBoost
    image          = data.aws_sagemaker_prebuilt_ecr_image.xgboost.registry_path
    model_data_url = "s3://${var.model_bucket}/models/classifier/${var.model_version}/model.tar.gz"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Endpoint Configuration

```hcl
resource "aws_sagemaker_endpoint_configuration" "classifier" {
  name = "${var.app_name}-classifier-config-${var.model_version}"

  production_variants {
    variant_name           = "AllTraffic"
    model_name             = aws_sagemaker_model.classifier.name
    initial_instance_count = 1
    instance_type          = "ml.m5.xlarge"
    initial_variant_weight = 1
  }

  # Data capture for monitoring and drift detection
  data_capture_config {
    enable_capture              = true
    initial_sampling_percentage = 10
    destination_s3_uri          = "s3://${var.model_bucket}/data-capture"

    capture_options {
      capture_mode = "Input"
    }

    capture_options {
      capture_mode = "Output"
    }
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Creating the Endpoint

```hcl
resource "aws_sagemaker_endpoint" "classifier" {
  name                 = "${var.app_name}-classifier-${var.environment}"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.classifier.name

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Auto-Scaling

```hcl
resource "aws_appautoscaling_target" "sagemaker" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "endpoint/${aws_sagemaker_endpoint.classifier.name}/variant/AllTraffic"
  scalable_dimension = "sagemaker:variant:DesiredInstanceCount"
  service_namespace  = "sagemaker"
}

resource "aws_appautoscaling_policy" "sagemaker_scale" {
  name               = "${var.app_name}-sagemaker-scale"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sagemaker.resource_id
  scalable_dimension = aws_appautoscaling_target.sagemaker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.sagemaker.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70  # target 70 average invocations per instance
    predefined_metric_specification {
      predefined_metric_type = "SageMakerVariantInvocationsPerInstance"
    }
  }
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

SageMaker endpoints provide managed, scalable ML model serving. OpenTofu manages the model definition, endpoint configuration with data capture, the endpoint itself, and auto-scaling - creating a complete, reproducible MLOps deployment pipeline.
