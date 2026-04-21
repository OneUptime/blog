# How to Use the terraform_remote_state Data Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to use the terraform_remote_state data source in OpenTofu to share output values between separate infrastructure configurations.

## Introduction

Large infrastructure setups are often split across multiple OpenTofu configurations - for example, a networking layer managed separately from application resources. The `terraform_remote_state` data source allows one configuration to read the output values of another, enabling cross-stack data sharing without tight coupling.

## When to Use terraform_remote_state

Use `terraform_remote_state` when:
- Your infrastructure is split across multiple state files
- One stack needs to reference resources created by another (e.g., VPC IDs, subnet IDs)
- You want to avoid hardcoding resource identifiers

## Step 1: Define Outputs in the Source Configuration

The remote configuration must declare outputs for any values you want to share:

```hcl
# networking/outputs.tf

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}
```

## Step 2: Configure the Remote State Data Source

In your consuming configuration, add a `terraform_remote_state` data source pointing to the backend where the source state is stored:

```hcl
# application/main.tf

# Reference the networking stack's state from S3
data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the output values from the remote state
resource "aws_instance" "app" {
  ami           = "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
  instance_type = "t3.micro"

  # Reference subnet from remote state
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]

  tags = {
    Name = "app-server"
  }
}
```

## Step 3: Reference Outputs from Remote State

All root-level outputs from the remote configuration are available under `.outputs`:

```hcl
# Access a single output value
locals {
  vpc_id         = data.terraform_remote_state.networking.outputs.vpc_id
  private_subnets = data.terraform_remote_state.networking.outputs.private_subnet_ids
}

resource "aws_security_group" "app" {
  name   = "app-security-group"
  vpc_id = local.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "app_https" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}
```

## Using with Local Backend

For smaller setups using local state files:

```hcl
data "terraform_remote_state" "database" {
  backend = "local"

  config = {
    path = "../database/terraform.tfstate"
  }
}

output "db_endpoint" {
  value = data.terraform_remote_state.database.outputs.db_endpoint
}
```

## Using with Workspaces

You can target a specific workspace in the remote state:

```hcl
data "terraform_remote_state" "networking" {
  backend   = "s3"
  workspace = terraform.workspace  # Use the same workspace as the current config

  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Handling Optional Outputs with defaults

If a remote output might not exist (for example, during bootstrapping), use the `defaults` argument:

```hcl
data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }

  defaults = {
    vpc_id = "vpc-00000000"  # Fallback if the output doesn't exist yet
  }
}
```

## Access Control Considerations

The identity running OpenTofu must have read access to the backend storing the remote state. For S3:

```hcl
# IAM policy to allow reading remote state
resource "aws_iam_policy" "read_remote_state" {
  name = "ReadRemoteStatePol"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = "arn:aws:s3:::my-terraform-state"
        Condition = {
          StringLike = {
            "s3:prefix" = "networking/*"
          }
        }
      },
      {
        Effect   = "Allow"
        Action   = "s3:GetObject"
        Resource = "arn:aws:s3:::my-terraform-state/networking/terraform.tfstate"
      }
    ]
  })
}
```

## Conclusion

The `terraform_remote_state` data source is a powerful mechanism for sharing infrastructure outputs across OpenTofu configurations. By defining clear outputs in your source configurations and reading them through the data source, you can build modular, loosely coupled infrastructure stacks. Always ensure proper IAM permissions are in place and be mindful that this creates an implicit dependency between stacks.
