# How to Create SageMaker Notebooks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, SageMaker, Machine Learning, Notebooks, Infrastructure as Code

Description: Step-by-step guide to creating Amazon SageMaker notebook instances and Studio domains with Terraform, covering IAM roles, lifecycle configurations, and VPC settings.

---

Amazon SageMaker is AWS's fully managed machine learning platform. At the core of most ML workflows is the notebook - a Jupyter-based environment where data scientists explore data, train models, and run experiments. SageMaker offers two notebook options: classic Notebook Instances and the newer SageMaker Studio.

Setting these up manually is a quick way to end up with inconsistent environments across your team. One data scientist has a GPU instance, another has a tiny CPU instance, one has network access to your data lake, another does not. Terraform solves this by standardizing the notebook configuration, ensuring everyone gets the right instance type, security settings, and network access.

This post covers creating both SageMaker Notebook Instances and SageMaker Studio domains with Terraform, including the IAM roles, VPC configuration, and lifecycle scripts that make them production-ready.

## IAM Role for SageMaker

Every SageMaker notebook needs an execution role. This role determines what AWS services the notebook can access:

```hcl
# Execution role for SageMaker notebooks
resource "aws_iam_role" "sagemaker_execution" {
  name = "sagemaker-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    ManagedBy = "terraform"
  }
}

# Attach the managed SageMaker full access policy
# In production, you should create a more restrictive custom policy
resource "aws_iam_role_policy_attachment" "sagemaker_full_access" {
  role       = aws_iam_role.sagemaker_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

# Allow the notebook to access your S3 data buckets
resource "aws_iam_role_policy" "sagemaker_s3_access" {
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
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::my-ml-data-bucket",
          "arn:aws:s3:::my-ml-data-bucket/*",
          "arn:aws:s3:::my-ml-models-bucket",
          "arn:aws:s3:::my-ml-models-bucket/*"
        ]
      }
    ]
  })
}
```

In production, replace `AmazonSageMakerFullAccess` with a custom policy that grants only the specific permissions your team needs. The full access policy is convenient for getting started but overly permissive.

## Classic Notebook Instance

The classic SageMaker Notebook Instance is the simplest way to get a Jupyter environment running:

```hcl
resource "aws_sagemaker_notebook_instance" "ml_notebook" {
  name                  = "data-science-notebook"
  instance_type         = "ml.t3.medium"
  role_arn              = aws_iam_role.sagemaker_execution.arn
  platform_identifier   = "notebook-al2-v2"

  # Place in your VPC for security
  subnet_id             = var.private_subnet_id
  security_groups       = [aws_security_group.sagemaker.id]
  direct_internet_access = "Disabled"

  # EBS volume for notebook storage
  volume_size = 50

  # Encrypt the EBS volume
  kms_key_id = aws_kms_key.sagemaker.arn

  # Lifecycle configuration for auto-setup
  lifecycle_config_name = aws_sagemaker_notebook_instance_lifecycle_configuration.setup.name

  # Root access - disable in production for security
  root_access = "Disabled"

  tags = {
    Team      = "data-science"
    ManagedBy = "terraform"
  }
}

# KMS key for notebook encryption
resource "aws_kms_key" "sagemaker" {
  description             = "KMS key for SageMaker notebook encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    ManagedBy = "terraform"
  }
}

# Security group for the notebook
resource "aws_security_group" "sagemaker" {
  name        = "sagemaker-notebook-sg"
  description = "Security group for SageMaker notebook instances"
  vpc_id      = var.vpc_id

  # Allow outbound HTTPS for AWS API calls and pip installs
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow outbound to S3 VPC endpoint if you have one
  egress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [aws_vpc_endpoint.s3.prefix_list_id]
  }

  tags = {
    Name      = "sagemaker-notebook-sg"
    ManagedBy = "terraform"
  }
}
```

Setting `direct_internet_access = "Disabled"` is a security best practice. Without direct internet access, the notebook communicates through your VPC. You will need a NAT Gateway or VPC endpoints for the notebook to reach AWS services and install packages.

## Lifecycle Configurations

Lifecycle configurations are scripts that run when the notebook starts or is created. They are ideal for installing packages, configuring git, or setting up the environment:

```hcl
resource "aws_sagemaker_notebook_instance_lifecycle_configuration" "setup" {
  name = "data-science-setup"

  # Runs once when the notebook is first created
  on_create = base64encode(<<-EOF
    #!/bin/bash
    set -e

    # Install conda packages in the default environment
    sudo -u ec2-user -i <<'INNEREOF'
    source activate python3
    pip install pandas==2.1.0 scikit-learn==1.3.0 xgboost==2.0.0 shap==0.43.0
    conda deactivate
    INNEREOF

    # Clone the team's ML repository
    cd /home/ec2-user/SageMaker
    sudo -u ec2-user git clone https://github.com/my-org/ml-pipelines.git
  EOF
  )

  # Runs every time the notebook starts (including restarts)
  on_start = base64encode(<<-EOF
    #!/bin/bash
    set -e

    # Auto-stop idle notebooks after 1 hour to save costs
    IDLE_TIME=3600

    echo "Setting up auto-stop script"
    cat > /usr/local/bin/autostop.py << 'SCRIPT'
    import json
    import time
    import urllib.request
    import sys

    IDLE_TIME = int(sys.argv[1])
    KERNEL_URL = "http://localhost:8888/api/kernels"

    while True:
        response = urllib.request.urlopen(KERNEL_URL)
        kernels = json.loads(response.read())

        busy = False
        for kernel in kernels:
            if kernel["execution_state"] == "busy":
                busy = True
                break

        if not busy:
            idle_time = idle_time + 60 if 'idle_time' in dir() else 60
            if idle_time >= IDLE_TIME:
                print("Stopping notebook due to inactivity")
                import boto3
                client = boto3.client("sagemaker")
                notebook_name = urllib.request.urlopen(
                    "http://169.254.169.254/latest/meta-data/tags/instance/aws:sagemaker:notebook-name"
                ).read().decode()
                client.stop_notebook_instance(NotebookInstanceName=notebook_name)
                break
        else:
            idle_time = 0

        time.sleep(60)
    SCRIPT

    nohup python3 /usr/local/bin/autostop.py $IDLE_TIME &
  EOF
  )
}
```

The auto-stop script is something you absolutely want in production. Without it, data scientists forget to stop their notebooks and you end up paying for idle GPU instances around the clock.

## SageMaker Studio Domain

SageMaker Studio is the newer, more feature-rich option. It provides a full IDE experience with integrated experiment tracking, model registry, and more. The setup requires a Studio Domain:

```hcl
# SageMaker Studio domain
resource "aws_sagemaker_domain" "ml_studio" {
  domain_name = "ml-studio"
  auth_mode   = "IAM"
  vpc_id      = var.vpc_id
  subnet_ids  = var.private_subnet_ids

  default_user_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn

    # Security settings
    security_groups = [aws_security_group.sagemaker.id]

    # Jupyter server app settings
    jupyter_server_app_settings {
      default_resource_spec {
        instance_type = "system"
      }
    }

    # Kernel gateway settings for notebook kernels
    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type = "ml.t3.medium"
      }
    }

    # Sharing settings
    sharing_settings {
      notebook_output_option = "Allowed"
      s3_output_path         = "s3://${aws_s3_bucket.studio_sharing.bucket}/shared-notebooks/"
    }
  }

  # Retention policy for user data when the domain is deleted
  retention_policy {
    home_efs_file_system = "Delete"
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# S3 bucket for shared notebooks
resource "aws_s3_bucket" "studio_sharing" {
  bucket = "my-company-sagemaker-studio-sharing"

  tags = {
    ManagedBy = "terraform"
  }
}
```

## SageMaker Studio User Profiles

Each team member gets their own user profile within the domain:

```hcl
# User profile for a data scientist
resource "aws_sagemaker_user_profile" "data_scientist" {
  domain_id         = aws_sagemaker_domain.ml_studio.id
  user_profile_name = "john-doe"

  user_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn

    # Override default kernel instance type for this user
    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type = "ml.g4dn.xlarge"  # GPU instance for this user
      }
    }
  }

  tags = {
    Team      = "data-science"
    ManagedBy = "terraform"
  }
}

# Create user profiles from a list
variable "studio_users" {
  type = list(object({
    name          = string
    instance_type = string
  }))
  default = [
    { name = "alice", instance_type = "ml.t3.medium" },
    { name = "bob", instance_type = "ml.t3.large" },
    { name = "carol", instance_type = "ml.g4dn.xlarge" },
  ]
}

resource "aws_sagemaker_user_profile" "team" {
  for_each = { for user in var.studio_users : user.name => user }

  domain_id         = aws_sagemaker_domain.ml_studio.id
  user_profile_name = each.value.name

  user_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn

    kernel_gateway_app_settings {
      default_resource_spec {
        instance_type = each.value.instance_type
      }
    }
  }

  tags = {
    ManagedBy = "terraform"
  }
}
```

Using `for_each` with a variable makes it easy to onboard new team members - just add them to the list and run `terraform apply`.

## Notebook Instance with Git Integration

You can configure a notebook to automatically clone a Git repository on creation:

```hcl
# Git repository for the notebook
resource "aws_sagemaker_code_repository" "ml_repo" {
  code_repository_name = "ml-experiments"

  git_config {
    repository_url = "https://github.com/my-org/ml-experiments.git"
    branch         = "main"
  }
}

# Notebook with the git repo attached
resource "aws_sagemaker_notebook_instance" "with_git" {
  name                    = "notebook-with-git"
  instance_type           = "ml.t3.medium"
  role_arn                = aws_iam_role.sagemaker_execution.arn
  platform_identifier     = "notebook-al2-v2"
  default_code_repository = aws_sagemaker_code_repository.ml_repo.code_repository_name
  volume_size             = 50

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Variables and Outputs

Tie it all together with proper variable and output definitions:

```hcl
variable "vpc_id" {
  type        = string
  description = "VPC ID for SageMaker resources"
}

variable "private_subnet_id" {
  type        = string
  description = "Private subnet ID for notebook instances"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for SageMaker Studio"
}

output "notebook_url" {
  value       = "https://${aws_sagemaker_notebook_instance.ml_notebook.name}.notebook.${data.aws_region.current.name}.sagemaker.aws"
  description = "URL to access the SageMaker notebook"
}

output "studio_domain_id" {
  value       = aws_sagemaker_domain.ml_studio.id
  description = "SageMaker Studio domain ID"
}

data "aws_region" "current" {}
```

## Wrapping Up

SageMaker notebooks in Terraform give you consistent, reproducible ML environments. The main decision points are whether to use classic Notebook Instances or SageMaker Studio (Studio is the better choice for teams), which instance types to default to, and how to handle network security.

Always use lifecycle configurations to auto-stop idle instances - it is the single most impactful cost-saving measure for SageMaker notebooks. Place notebooks in your VPC with internet access disabled, and use VPC endpoints for AWS service access.

For the broader ML infrastructure picture, consider combining SageMaker notebooks with [Glue for data preparation](https://oneuptime.com/blog/post/2026-02-12-create-glue-jobs-terraform/view) and S3 for model artifacts to build a complete ML pipeline in Terraform.
