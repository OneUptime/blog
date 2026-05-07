# How to Access Child Module Outputs in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Output, Infrastructure as Code, DevOps

Description: A guide to accessing and using output values from child modules in OpenTofu parent configurations.

## Introduction

When using modules in OpenTofu, child modules expose their outputs which can then be used by the parent module and passed to other child modules. Accessing module outputs correctly is fundamental to composing complex infrastructure from smaller, reusable components.

## Module Output Syntax

```hcl
# Syntax: module.<MODULE_NAME>.<OUTPUT_NAME>

# Example child module call

module "networking" {
  source = "./modules/networking"

  vpc_cidr    = "10.0.0.0/16"
  environment = var.environment
}

# Access outputs from the module
resource "aws_security_group" "web" {
  vpc_id = module.networking.vpc_id  # Access vpc_id output from networking module
  name   = "web-sg"
}
```

## Setting Up Module Outputs

```hcl
# modules/networking/outputs.tf
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "default_security_group_id" {
  description = "ID of the default security group"
  value       = aws_vpc.this.default_security_group_id
}
```

## Using Module Outputs in Parent

```hcl
# main.tf - Parent module
module "networking" {
  source = "./modules/networking"

  vpc_cidr     = "10.0.0.0/16"
  environment  = var.environment
  project_name = var.project_name
}

module "compute" {
  source = "./modules/compute"

  # Pass networking outputs to compute module
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.public_subnet_ids

  instance_type = var.instance_type
  environment   = var.environment
}

module "database" {
  source = "./modules/rds"

  # Private subnets for database
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids

  db_instance_class = var.db_instance_class
  environment       = var.environment
}
```

## Chaining Module Outputs

```hcl
# Module A: Creates VPC
module "vpc" {
  source = "./modules/vpc"
  # ...
}

# Module B: Creates EKS (needs VPC from A)
module "eks" {
  source = "./modules/eks"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}

# Module C: Deploys apps (needs EKS endpoint from B)
module "apps" {
  source = "./modules/k8s-apps"

  cluster_name       = module.eks.cluster_name
  cluster_endpoint   = module.eks.cluster_endpoint
  cluster_ca_cert    = module.eks.cluster_ca_certificate
}
```

## Exposing Module Outputs in Root

```hcl
# outputs.tf - Root module re-exposing child module outputs

output "vpc_id" {
  description = "VPC ID from networking module"
  value       = module.networking.vpc_id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.compute.alb_dns_name
}

output "database_endpoint" {
  description = "Database endpoint for application configuration"
  value       = module.database.endpoint
  sensitive   = false
}

output "kubeconfig_command" {
  description = "Command to configure kubectl access"
  value       = module.eks.kubeconfig_command
}
```

## Accessing Complex Module Outputs

```hcl
# If module output is a list:
output "public_subnet_ids" {
  value = aws_subnet.public[*].id
  # Returns: ["subnet-123", "subnet-456"]
}

# Access in parent:
resource "aws_lb" "main" {
  subnets = module.networking.public_subnet_ids  # Entire list
}

# Access specific element:
resource "aws_instance" "bastion" {
  subnet_id = module.networking.public_subnet_ids[0]  # First subnet
}

# If module output is a map:
# Access in parent:
locals {
  server_ips = module.compute.server_ips  # Map of server_name -> ip
  first_server_ip = values(module.compute.server_ips)[0]
}
```

## Debugging Module Outputs

```bash
# View all root outputs, including child outputs re-exposed by the root module
tofu output

# Review how module outputs affect planned resources
tofu plan

# View a specific root output (after apply)
tofu output vpc_id

# Check state for module resources
tofu state list | grep module.networking
tofu state show module.networking.aws_vpc.this
```

## Conclusion

Accessing child module outputs is how you compose complex infrastructure from reusable components. The `module.<name>.<output>` syntax makes dependencies between components explicit and readable. Using outputs to pass values between modules (rather than querying resources directly from child modules) creates clean boundaries between infrastructure components and enables independent module testing and reuse.
