# How to Access Child Module Outputs in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Output, HCL, Infrastructure as Code, DevOps

Description: Learn how to access output values from child modules in OpenTofu and chain them between modules and resources.

---

Child modules expose values to their callers through `output` blocks. In the calling (parent) module, you reference these values using the `module.<module_name>.<output_name>` syntax. This is how you chain infrastructure components - for example, passing a VPC ID from a networking module to a compute module.

---

## Defining Outputs in the Child Module

```hcl
# modules/networking/outputs.tf - child module outputs

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ip" {
  description = "Public IP of the NAT Gateway"
  value       = aws_eip.nat.public_ip
}
```

---

## Accessing Module Outputs in the Root Module

```hcl
# main.tf - accessing child module outputs

module "networking" {
  source      = "./modules/networking"
  vpc_cidr    = "10.0.0.0/16"
  environment = var.environment
}

# Reference networking module outputs in a resource

resource "aws_eks_cluster" "main" {
  name     = "my-cluster"
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    # Use module output directly
    subnet_ids = module.networking.private_subnet_ids
  }
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  # Use module output for the VPC
  vpc_id = module.networking.vpc_id
}
```

---

## Chaining Module Outputs to Module Inputs

```hcl
# main.tf - chain networking outputs to database module inputs

module "networking" {
  source   = "./modules/networking"
  vpc_cidr = "10.0.0.0/16"
}

module "database" {
  source = "./modules/database"

  # Pass networking module outputs as database module inputs
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
}

module "application" {
  source = "./modules/application"

  # Chain both modules' outputs
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.public_subnet_ids
  db_endpoint = module.database.endpoint
  db_port     = module.database.port
}
```

---

## Forwarding Child Module Outputs to Root Outputs

```hcl
# outputs.tf - expose child module outputs from the root

output "vpc_id" {
  description = "VPC ID (from networking module)"
  value       = module.networking.vpc_id
}

output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = module.application.lb_dns_name
}

output "database_endpoint" {
  description = "Database endpoint"
  value       = module.database.endpoint
  sensitive   = true
}
```

---

## Listing Root Module Outputs

```bash
# After tofu apply, see all root module outputs
tofu output

# Get a specific root output value
tofu output vpc_id
# "vpc-0abc123"

# Show the root module outputs in JSON format
tofu output -json | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))"
```

---

## Debugging Module Output Values

```bash
# Use tofu console to inspect module outputs
tofu console

> module.networking.vpc_id
"vpc-0abc123def456789"

> module.networking.private_subnet_ids
tolist(["subnet-0a1b2c3d4e", "subnet-0f1a2b3c4d"])

> length(module.networking.private_subnet_ids)
2
```

---

## Summary

Access child module outputs using `module.<module_name>.<output_name>`. Chain modules together by passing one module's outputs as another module's inputs. Expose important child module outputs to callers by forwarding them in the parent's `outputs.tf`. Use `tofu console` to inspect module output values interactively when debugging complex module compositions.
