# How to Create AWS SageMaker Notebooks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SageMaker, Notebook, Machine Learning, Infrastructure as Code

Description: Learn how to create AWS SageMaker Notebook Instances and SageMaker Studio domains for machine learning development using OpenTofu.

## Introduction

SageMaker provides two types of notebook environments: classic Notebook Instances (single EC2-backed instances) and SageMaker Studio (a fully managed IDE). OpenTofu manages both, along with the required IAM roles and lifecycle configurations.

## Notebook Instance Lifecycle Configuration

```hcl
resource "aws_sagemaker_notebook_instance_lifecycle_configuration" "setup" {
  name = "${var.app_name}-notebook-setup"

  # Runs when the instance starts
  on_start = base64encode(<<-SCRIPT
    #!/bin/bash
    # Install additional Python packages on every start
    sudo -u ec2-user -i <<'EOF'
    pip install --quiet pandas matplotlib seaborn
    EOF
  SCRIPT
  )

  # Runs only on first creation
  on_create = base64encode(<<-SCRIPT
    #!/bin/bash
    sudo -u ec2-user -i <<'EOF'
    # Sync project notebooks from S3
    aws s3 sync s3://${var.notebooks_bucket}/notebooks ~/SageMaker/
    EOF
  SCRIPT
  )
}
```

## Classic Notebook Instance

```hcl
resource "aws_sagemaker_notebook_instance" "dev" {
  name                    = "${var.app_name}-dev-notebook-${var.environment}"
  role_arn                = aws_iam_role.sagemaker.arn
  instance_type           = "ml.t3.medium"
  volume_size             = 20  # GB

  lifecycle_config_name   = aws_sagemaker_notebook_instance_lifecycle_configuration.setup.name
  default_code_repository = var.code_repository_url  # optional: CodeCommit or GitHub

  subnet_id              = var.private_subnet_id
  security_groups        = [aws_security_group.notebook.id]

  # Stop instance when not in use to save costs
  # Use aws sagemaker stop-notebook-instance in a Lambda schedule

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## SageMaker Studio Domain

```hcl
resource "aws_sagemaker_domain" "studio" {
  domain_name = "${var.app_name}-studio"
  auth_mode   = "IAM"
  vpc_id      = var.vpc_id

  subnet_ids = var.private_subnet_ids

  default_user_settings {
    execution_role = aws_iam_role.sagemaker.arn

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

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Studio User Profile

```hcl
resource "aws_sagemaker_user_profile" "data_scientist" {
  domain_id         = aws_sagemaker_domain.studio.id
  user_profile_name = "data-scientist-1"

  user_settings {
    execution_role = aws_iam_role.sagemaker.arn
  }
}
```

## Security Group

```hcl
resource "aws_security_group" "notebook" {
  name   = "${var.app_name}-notebook-sg"
  vpc_id = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
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

SageMaker Notebook Instances and Studio provide managed Jupyter environments for ML development. OpenTofu manages notebook instances, lifecycle configurations, Studio domains, and user profiles - giving your data science team a consistent, reproducible development environment.
