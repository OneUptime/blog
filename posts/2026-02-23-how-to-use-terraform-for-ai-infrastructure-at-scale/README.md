# How to Use Terraform for AI Infrastructure at Scale

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AI, Machine Learning, GPU, Infrastructure as Code

Description: Learn how to use Terraform to provision and manage AI and machine learning infrastructure at scale, including GPU clusters, training pipelines, model serving endpoints, and data processing infrastructure.

---

AI and machine learning workloads have unique infrastructure requirements - GPU instances for training, high-throughput storage for datasets, model serving endpoints for inference, and data pipelines for feature engineering. Terraform manages this infrastructure as code, enabling reproducible environments for training and deployment.

In this guide, we will cover how to build AI infrastructure at scale with Terraform.

## GPU Training Cluster

```hcl
# ai/training-cluster.tf
# GPU cluster for model training

resource "aws_sagemaker_domain" "ml" {
  domain_name = "ml-${var.environment}"
  auth_mode   = "IAM"
  vpc_id      = var.vpc_id
  subnet_ids  = var.private_subnet_ids

  default_user_settings {
    execution_role = aws_iam_role.sagemaker.arn

    jupyter_server_app_settings {
      default_resource_spec {
        instance_type = "system"
      }
    }

    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type = "ml.g5.2xlarge"
      }
    }
  }

  default_space_settings {
    execution_role = aws_iam_role.sagemaker.arn
  }
}

# EC2-based training cluster for custom frameworks
resource "aws_instance" "training_node" {
  count = var.training_node_count

  ami           = data.aws_ami.deep_learning.id
  instance_type = "p4d.24xlarge"  # 8x A100 GPUs

  subnet_id              = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]
  vpc_security_group_ids = [aws_security_group.training.id]

  root_block_device {
    volume_type = "gp3"
    volume_size = 500
    iops        = 16000
    throughput  = 1000
    encrypted   = true
  }

  user_data = templatefile("training-init.sh", {
    cluster_name = "training-${var.environment}"
    nccl_config  = "enabled"
    efa_enabled  = true
  })

  tags = {
    Name        = "training-node-${count.index}"
    Environment = var.environment
    Purpose     = "ml-training"
  }
}
```

## Model Serving Infrastructure

```hcl
# ai/model-serving.tf
# Model serving endpoints for inference

resource "aws_sagemaker_endpoint_configuration" "model" {
  name = "model-${var.model_name}-${var.model_version}"

  production_variants {
    variant_name           = "primary"
    model_name             = aws_sagemaker_model.main.name
    initial_instance_count = var.environment == "production" ? 3 : 1
    instance_type          = "ml.g5.xlarge"
    initial_variant_weight = 1.0

    # Enable auto-scaling
    managed_instance_scaling {
      min_instance_count = var.environment == "production" ? 2 : 1
      max_instance_count = var.environment == "production" ? 20 : 3
      status             = "ENABLED"
    }
  }

  # Shadow variant for A/B testing new models
  dynamic "production_variants" {
    for_each = var.shadow_model_name != null ? [1] : []

    content {
      variant_name           = "shadow"
      model_name             = var.shadow_model_name
      initial_instance_count = 1
      instance_type          = "ml.g5.xlarge"
      initial_variant_weight = 0.0  # No traffic, just shadow testing
    }
  }

  tags = {
    Model       = var.model_name
    Version     = var.model_version
    Environment = var.environment
  }
}

resource "aws_sagemaker_endpoint" "model" {
  name                 = "model-${var.model_name}-${var.environment}"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.model.name

  tags = {
    Model       = var.model_name
    Environment = var.environment
  }
}
```

## Data Pipeline Infrastructure

```hcl
# ai/data-pipeline.tf
# Data processing pipeline for feature engineering

# S3 buckets for ML data lifecycle
resource "aws_s3_bucket" "ml_data" {
  for_each = toset(["raw", "processed", "features", "models", "artifacts"])

  bucket = "ml-${each.key}-${var.environment}"

  tags = {
    DataStage   = each.key
    Environment = var.environment
    Purpose     = "ml-pipeline"
  }
}

# Glue job for data processing
resource "aws_glue_job" "feature_engineering" {
  name     = "feature-engineering-${var.environment}"
  role_arn = aws_iam_role.glue.arn

  command {
    script_location = "s3://${aws_s3_bucket.ml_data["artifacts"].id}/scripts/feature_engineering.py"
    python_version  = "3"
  }

  default_arguments = {
    "--TempDir"          = "s3://${aws_s3_bucket.ml_data["artifacts"].id}/temp/"
    "--job-language"     = "python"
    "--input-path"       = "s3://${aws_s3_bucket.ml_data["raw"].id}/"
    "--output-path"      = "s3://${aws_s3_bucket.ml_data["features"].id}/"
    "--enable-metrics"   = "true"
  }

  glue_version      = "4.0"
  worker_type       = "G.2X"
  number_of_workers = 10
  timeout           = 120

  tags = {
    Environment = var.environment
    Purpose     = "feature-engineering"
  }
}

# Step Functions for orchestrating the ML pipeline
resource "aws_sfn_state_machine" "ml_pipeline" {
  name     = "ml-pipeline-${var.environment}"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    StartAt = "ProcessData"
    States = {
      ProcessData = {
        Type     = "Task"
        Resource = "arn:aws:states:::glue:startJobRun.sync"
        Parameters = {
          JobName = aws_glue_job.feature_engineering.name
        }
        Next = "TrainModel"
      }
      TrainModel = {
        Type     = "Task"
        Resource = "arn:aws:states:::sagemaker:createTrainingJob.sync"
        Parameters = {
          TrainingJobName = "train-${var.model_name}"
          AlgorithmSpecification = {
            TrainingImage     = var.training_image
            TrainingInputMode = "File"
          }
          ResourceConfig = {
            InstanceType  = "ml.p4d.24xlarge"
            InstanceCount = var.training_instance_count
            VolumeSizeInGB = 500
          }
        }
        Next = "EvaluateModel"
      }
      EvaluateModel = {
        Type     = "Task"
        Resource = aws_lambda_function.evaluate_model.arn
        Next     = "DeployModel"
      }
      DeployModel = {
        Type     = "Task"
        Resource = "arn:aws:states:::sagemaker:createEndpoint"
        Parameters = {
          EndpointName       = "model-${var.model_name}-${var.environment}"
          EndpointConfigName = aws_sagemaker_endpoint_configuration.model.name
        }
        End = true
      }
    }
  })
}
```

## Best Practices

Use spot instances for training workloads when possible. Training jobs can be checkpointed and resumed, making them well-suited for spot instances at 60-90% savings.

Separate training and serving infrastructure. Training needs maximum compute power temporarily, while serving needs consistent, lower-latency capacity.

Use auto-scaling for model endpoints. Inference traffic varies throughout the day, and auto-scaling keeps costs proportional to demand.

Version everything - models, datasets, and infrastructure. Reproducibility is essential for ML experiments and auditing.

Monitor model serving latency and throughput. Set up alerts for inference latency increases that could indicate model or infrastructure issues.

## Conclusion

AI infrastructure at scale with Terraform provides the reproducibility and automation that machine learning operations demand. By managing GPU clusters, model serving endpoints, and data pipelines as code, you create an ML platform that scales efficiently and reliably. The key is designing infrastructure that can scale up for training and scale down when idle, keeping costs proportional to the value being generated.
