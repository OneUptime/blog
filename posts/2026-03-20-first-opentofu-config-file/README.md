# How to Write Your First OpenTofu Configuration File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Getting Started, HCL, Infrastructure as Code, DevOps

Description: A beginner-friendly guide to writing your first OpenTofu configuration file using HCL syntax.

## Introduction

OpenTofu uses HashiCorp Configuration Language (HCL) to define infrastructure as code. HCL is designed to be human-readable and writable while also being machine-parseable. This guide walks you through writing your very first OpenTofu configuration file.

## Understanding HCL Basics

An OpenTofu configuration consists of one or more `.tf` or `.tofu` files containing:
- **Blocks**: Named containers for configuration (`terraform`, `provider`, `resource`, `variable`, `output`)
- **Arguments**: Key-value pairs within blocks
- **Expressions**: Values computed from other values

## Your First Configuration File

Create a new directory and a file called `main.tf`:

```hcl
# main.tf - Your first OpenTofu configuration

# The terraform block configures OpenTofu behavior

terraform {
  # Specify minimum OpenTofu version required
  required_version = ">= 1.6.0"

  # Declare providers your configuration needs
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# The provider block configures a specific provider
# The local provider works with local files - no credentials needed
provider "local" {}

# A resource block declares a managed object
# Format: resource "<TYPE>" "<NAME>"
resource "local_file" "greeting" {
  # Arguments configure the resource
  content  = "Hello, OpenTofu! This is my first configuration."
  filename = "${path.module}/hello.txt"
}

# An output block exposes values after apply
output "file_path" {
  description = "The path to the created file"
  value       = local_file.greeting.filename
}

output "file_content" {
  description = "The content written to the file"
  value       = local_file.greeting.content
}
```

## Understanding Each Block

### The terraform Block

```hcl
terraform {
  # required_version: minimum OpenTofu version
  required_version = ">= 1.6.0"

  # required_providers: external plugins needed
  required_providers {
    aws = {
      source  = "hashicorp/aws"  # registry.opentofu.org/hashicorp/aws
      version = "~> 5.0"
    }
  }
}
```

### The provider Block

```hcl
# Configure how OpenTofu connects to a provider
provider "aws" {
  region = "us-east-1"

  # Credentials are usually set via environment variables
  # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
}
```

### The resource Block

```hcl
# resource "<PROVIDER>_<TYPE>" "<LOCAL_NAME>"
resource "aws_instance" "web_server" {
  # Configuration arguments
  ami           = "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
  instance_type = "t2.micro"

  # Tags are common for resource organization
  tags = {
    Name        = "web-server"
    Environment = "development"
    ManagedBy   = "OpenTofu"
  }
}
```

### The variable Block

```hcl
# Input variables make configurations reusable
variable "environment" {
  type        = string
  description = "The deployment environment (dev, staging, prod)"
  default     = "dev"
}

# Reference with: var.environment
```

### The output Block

```hcl
# Output values expose information after apply
output "server_ip" {
  description = "The public IP of the server"
  value       = aws_instance.web_server.public_ip
}
```

## Running Your First Configuration

```bash
# Create a directory for your first project
mkdir ~/first-tofu-project && cd ~/first-tofu-project

# Create main.tf with the configuration above
# (copy the first code block)

# Step 1: Initialize - downloads providers
tofu init

# Step 2: Plan - shows what will be created
tofu plan

# Step 3: Apply - creates the infrastructure
tofu apply

# Review the plan and type 'yes' when prompted
# Or auto-approve with:
tofu apply -auto-approve

# Step 4: View outputs
tofu output

# Step 5: Clean up when done
tofu destroy -auto-approve
```

## Conclusion

Your first OpenTofu configuration file introduces the fundamental concepts: terraform blocks, provider configuration, resource definitions, and outputs. HCL's readable syntax makes it easy to understand what infrastructure will be created. From here, you can explore more complex configurations with variables, modules, and remote state management.
