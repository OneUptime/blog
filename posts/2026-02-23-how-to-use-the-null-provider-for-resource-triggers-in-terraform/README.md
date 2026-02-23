# How to Use the Null Provider for Resource Triggers in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Null Provider, Provisioners, Triggers, Infrastructure as Code

Description: Learn how to use the Terraform null_resource and terraform_data for triggering provisioners, running scripts conditionally, and managing dependencies between resources.

---

The null provider in Terraform provides a resource called null_resource that implements the standard resource lifecycle but does not manage any actual infrastructure. Its primary purpose is to run provisioners in response to changes and to serve as a dependency anchor between resources. In Terraform 1.4 and later, terraform_data serves as a built-in replacement with similar functionality.

In this guide, we will explore both null_resource and terraform_data. We will cover trigger-based provisioner execution, conditional script running, dependency management, and migration from null_resource to terraform_data.

## Understanding null_resource and terraform_data

The null_resource with its triggers argument lets you run provisioners whenever specific values change. When any trigger value changes, Terraform destroys and recreates the null_resource, causing its provisioners to run again. The newer terraform_data resource provides the same capability without requiring the null provider.

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Basic null_resource with Triggers

```hcl
# basic-trigger.tf - Run a command when a value changes
resource "null_resource" "config_update" {
  triggers = {
    # Recreate when the config file changes
    config_hash = md5(file("${path.module}/config.json"))
  }

  provisioner "local-exec" {
    command = "echo 'Configuration updated. Hash: ${self.triggers.config_hash}'"
  }
}
```

## Using terraform_data (Modern Approach)

```hcl
# terraform-data.tf - Built-in replacement for null_resource
resource "terraform_data" "config_update" {
  triggers_replace = [
    md5(file("${path.module}/config.json"))
  ]

  provisioner "local-exec" {
    command = "echo 'Configuration updated via terraform_data'"
  }
}
```

## Running Scripts After Resource Creation

```hcl
# post-create.tf - Run a script after infrastructure is created
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = {
    Name = "app-${var.environment}"
  }
}

variable "ami_id" {
  type    = string
  default = "ami-12345678"
}

resource "null_resource" "configure_app" {
  triggers = {
    instance_id = aws_instance.app.id
    config_hash = md5(file("${path.module}/config.json"))
  }

  provisioner "local-exec" {
    command = <<-CMD
      echo "Configuring instance ${aws_instance.app.id}"
      echo "Instance IP: ${aws_instance.app.private_ip}"
      # Run your configuration script here
      # ./configure.sh ${aws_instance.app.private_ip}
    CMD
  }

  depends_on = [aws_instance.app]
}
```

## Conditional Execution

```hcl
# conditional.tf - Run provisioners conditionally
variable "run_migrations" {
  description = "Whether to run database migrations"
  type        = bool
  default     = false
}

resource "null_resource" "db_migration" {
  count = var.run_migrations ? 1 : 0

  triggers = {
    migration_version = var.migration_version
  }

  provisioner "local-exec" {
    command = "echo 'Running migration version ${var.migration_version}'"
  }
}

variable "migration_version" {
  type    = string
  default = "v1"
}
```

## Running Commands on Destroy

```hcl
# destroy-hooks.tf - Run cleanup on resource destruction
resource "null_resource" "with_cleanup" {
  triggers = {
    environment = var.environment
  }

  # Run on creation
  provisioner "local-exec" {
    command = "echo 'Resource created in ${var.environment}'"
  }

  # Run on destruction
  provisioner "local-exec" {
    when    = destroy
    command = "echo 'Cleaning up resources in ${self.triggers.environment}'"
  }
}
```

## Dependency Anchor Pattern

```hcl
# dependency.tf - Use null_resource as a dependency anchor
resource "aws_iam_role" "app" {
  name = "app-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
  ])

  role       = aws_iam_role.app.name
  policy_arn = each.value
}

# Anchor that depends on all policy attachments being complete
resource "null_resource" "iam_ready" {
  triggers = {
    role_arn = aws_iam_role.app.arn
    policies = join(",", [for p in aws_iam_role_policy_attachment.policies : p.policy_arn])
  }

  # Wait for IAM propagation
  provisioner "local-exec" {
    command = "sleep 10"
  }
}

# Resources that need IAM to be fully ready
resource "aws_instance" "app" {
  depends_on = [null_resource.iam_ready]

  ami                  = var.ami_id
  instance_type        = "t3.medium"
  iam_instance_profile = aws_iam_instance_profile.app.name
}

resource "aws_iam_instance_profile" "app" {
  name = "app-profile-${var.environment}"
  role = aws_iam_role.app.name
}
```

## Multi-Step Provisioning

```hcl
# multi-step.tf - Ordered provisioning steps
resource "null_resource" "step_1" {
  triggers = {
    deploy_version = var.deploy_version
  }

  provisioner "local-exec" {
    command = "echo 'Step 1: Preparing deployment ${var.deploy_version}'"
  }
}

variable "deploy_version" {
  type    = string
  default = "1.0.0"
}

resource "null_resource" "step_2" {
  depends_on = [null_resource.step_1]

  triggers = {
    deploy_version = var.deploy_version
  }

  provisioner "local-exec" {
    command = "echo 'Step 2: Running database migrations'"
  }
}

resource "null_resource" "step_3" {
  depends_on = [null_resource.step_2]

  triggers = {
    deploy_version = var.deploy_version
  }

  provisioner "local-exec" {
    command = "echo 'Step 3: Deploying application'"
  }
}
```

## Storing Data with terraform_data

```hcl
# store-data.tf - terraform_data can store arbitrary values
resource "terraform_data" "build_info" {
  input = {
    version    = var.deploy_version
    built_at   = timestamp()
    commit_sha = var.commit_sha
  }
}

variable "commit_sha" {
  type    = string
  default = "abc1234"
}

output "build_info" {
  value = terraform_data.build_info.output
}
```

## Conclusion

The null_resource and terraform_data resources are essential tools for running provisioners, managing complex dependencies, and handling operations that do not fit neatly into Terraform's resource model. While null_resource remains widely used, terraform_data is the modern replacement that does not require an external provider. Use these resources when you need to run scripts in response to infrastructure changes, but remember that they should be a last resort after exploring native resource dependencies and lifecycle rules. For more automation patterns, see our guide on [the external provider](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-external-provider-for-custom-scripts-in-terraform/view).
