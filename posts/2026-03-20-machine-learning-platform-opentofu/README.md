# How to Build a Machine Learning Platform with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Machine Learning, SageMaker, MLOps, AWS, Infrastructure as Code

Description: Learn how to build a machine learning platform on AWS with OpenTofu using SageMaker Domain, Studio, model registry, and automated training pipelines.

## Introduction

A machine learning platform provides data scientists and ML engineers with managed tools for experimentation, training, model registry, and deployment. On AWS, SageMaker Domain is the central hub. This guide provisions a production-ready SageMaker environment with proper networking, IAM controls, and MLOps infrastructure.

## S3 Buckets for ML Data and Artifacts

```hcl
resource "aws_s3_bucket" "ml_data" {
  bucket = "myapp-ml-data-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "ml_artifacts" {
  bucket = "myapp-ml-artifacts-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "ml_models" {
  bucket = "myapp-ml-models-${data.aws_caller_identity.current.account_id}"
}
```

## SageMaker Domain

```hcl
resource "aws_sagemaker_domain" "ml_platform" {
  domain_name = "myapp-ml-platform"
  auth_mode   = "IAM"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnets
  app_network_access_type = "VpcOnly"

  default_user_settings {
    execution_role = aws_iam_role.sagemaker_user.arn

    sharing_settings {
      notebook_output_option = "Disabled"
    }

    security_groups = [aws_security_group.sagemaker.id]
  }

  default_space_settings {
    execution_role = aws_iam_role.sagemaker_user.arn
    security_groups = [aws_security_group.sagemaker.id]
  }

  domain_settings {
    security_group_ids = [aws_security_group.sagemaker.id]
  }
}
```

## SageMaker User Profiles

```hcl
resource "aws_sagemaker_user_profile" "data_scientist" {
  domain_id         = aws_sagemaker_domain.ml_platform.id
  user_profile_name = "data-scientist"

  user_settings {
    execution_role = aws_iam_role.sagemaker_user.arn

    jupyter_server_app_settings {
      default_resource_spec {
        instance_type = "system"
      }
    }

    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type       = "ml.t3.medium"
        lifecycle_config_arn = aws_sagemaker_studio_lifecycle_config.default.arn
      }
    }
  }
}
```

## Model Registry

```hcl
resource "aws_sagemaker_model_package_group" "main" {
  model_package_group_name        = "myapp-models"
  model_package_group_description = "MyApp production models"
}
```

## SageMaker Feature Store

```hcl
resource "aws_sagemaker_feature_group" "user_features" {
  feature_group_name             = "user-features"
  record_identifier_feature_name = "user_id"
  event_time_feature_name        = "event_time"
  role_arn                       = aws_iam_role.sagemaker_feature_store.arn

  feature_definition {
    feature_name = "user_id"
    feature_type = "String"
  }

  feature_definition {
    feature_name = "purchase_count_30d"
    feature_type = "Integral"
  }

  feature_definition {
    feature_name = "avg_order_value"
    feature_type = "Fractional"
  }

  feature_definition {
    feature_name = "event_time"
    feature_type = "String"
  }

  online_store_config {
    enable_online_store = true
  }

  offline_store_config {
    s3_storage_config {
      s3_uri = "s3://${aws_s3_bucket.ml_data.bucket}/feature-store/"
    }
  }
}
```

## SageMaker Pipeline for Training

```hcl
resource "aws_sagemaker_pipeline" "training" {
  pipeline_name         = "myapp-training-pipeline"
  pipeline_display_name = "MyApp Training Pipeline"
  role_arn              = aws_iam_role.sagemaker_pipeline.arn

  pipeline_definition = jsonencode({
    Version = "2020-12-01"
    Metadata = {}
    Parameters = [
      { Name = "TrainingInstanceType", Type = "String", DefaultValue = "ml.m5.xlarge" }
    ]
    Steps = [
      {
        Name = "TrainingStep"
        Type = "Training"
        Arguments = {
          AlgorithmSpecification = {
            TrainingImage     = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com/myapp-training:latest"
            TrainingInputMode = "File"
          }
          InputDataConfig = [
            {
              ChannelName = "training"
              ContentType = "text/csv"
              DataSource = {
                S3DataSource = {
                  S3DataType             = "S3Prefix"
                  S3Uri                  = "s3://${aws_s3_bucket.ml_data.bucket}/training/"
                  S3DataDistributionType = "FullyReplicated"
                }
              }
            }
          ]
          OutputDataConfig = {
            S3OutputPath = "s3://${aws_s3_bucket.ml_artifacts.bucket}/training-output/"
          }
          ResourceConfig = {
            InstanceType  = { Get = "Parameters.TrainingInstanceType" }
            InstanceCount = 1
            VolumeSizeInGB = 50
          }
          RoleArn = aws_iam_role.sagemaker_pipeline.arn
          StoppingCondition = {
            MaxRuntimeInSeconds = 3600
          }
        }
      }
    ]
  })
}
```

## Summary

A machine learning platform on AWS uses SageMaker Domain as the central workspace, separate S3 buckets for training data, artifacts, and model storage, SageMaker Feature Store for feature engineering, Model Package Groups for the model registry, and SageMaker Pipelines for automated training workflows. Enforce networking through private VPC configuration and security groups - in production, set the SageMaker Domain `app_network_access_type` to `VpcOnly` so Studio traffic stays in your VPC and provide the required VPC endpoints or NAT connectivity.
