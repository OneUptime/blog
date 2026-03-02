# How to Return Output Values from Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Output, Infrastructure as Code, DevOps

Description: Learn how to define and use output values in Terraform modules to expose resource attributes, computed values, and data to calling configurations.

---

Output values in Terraform modules serve the same purpose as return values in functions. They let a module expose information about the resources it created so that the calling configuration can use those values. Without outputs, the resources inside a module would be invisible to everything outside it - you would have no way to reference a VPC ID, a database endpoint, or a load balancer DNS name created by a module.

This guide covers how to define outputs, what to expose, and the patterns that make outputs most useful.

## Basic Output Definition

Outputs are defined in the module's `outputs.tf` file:

```hcl
# modules/vpc/outputs.tf

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}
```

Each output has three parts:
- **name** - The identifier used to reference this output
- **description** - Documents what the output represents
- **value** - The expression that computes the output's value

## Accessing Module Outputs

From the calling configuration, you access outputs with the `module.<MODULE_NAME>.<OUTPUT_NAME>` syntax:

```hcl
# main.tf - Root module calling the VPC module
module "networking" {
  source = "./modules/vpc"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}

# Use the VPC module's outputs in other resources
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Reference the module output
  subnet_id = module.networking.public_subnet_ids[0]

  tags = {
    Name = "web-server"
  }
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  # Reference another module output
  vpc_id = module.networking.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## What to Expose as Outputs

A good rule of thumb: expose any attribute that another resource or module might reasonably need to reference. Here are the common categories:

### Resource Identifiers

The most important outputs are IDs and ARNs - the values other resources need to establish relationships:

```hcl
output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.this.id
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.this.arn
}

output "security_group_id" {
  description = "ID of the cluster security group"
  value       = aws_security_group.cluster.id
}
```

### Connection Information

For resources like databases and caches, expose the connection details:

```hcl
output "db_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.this.endpoint
}

output "db_port" {
  description = "The port the database is listening on"
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "The name of the database"
  value       = aws_db_instance.this.db_name
}
```

### Computed Values

Sometimes the useful output is not a direct resource attribute but something computed:

```hcl
output "cluster_endpoint_url" {
  description = "Full URL for the cluster endpoint"
  value       = "https://${aws_eks_cluster.this.endpoint}"
}

output "connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${aws_db_instance.this.username}@${aws_db_instance.this.endpoint}/${aws_db_instance.this.db_name}"
}
```

### Lists and Maps

When a module creates multiple resources, return collections:

```hcl
output "instance_ids" {
  description = "Map of instance name to instance ID"
  value       = { for k, v in aws_instance.servers : k => v.id }
}

output "subnet_cidr_blocks" {
  description = "Map of subnet ID to CIDR block"
  value       = { for s in aws_subnet.private : s.id => s.cidr_block }
}
```

## Sensitive Outputs

If an output contains sensitive data, mark it to prevent it from showing in plan output and logs:

```hcl
output "db_password" {
  description = "The master password for the database"
  value       = aws_db_instance.this.password
  sensitive   = true
}

output "tls_private_key" {
  description = "The private key for TLS"
  value       = tls_private_key.this.private_key_pem
  sensitive   = true
}
```

Terraform will display `(sensitive value)` instead of the actual value in plan output. Note that the value is still stored in the state file, so protect your state file accordingly.

## Conditional Outputs

When a module conditionally creates resources (using `count` or `for_each`), the output needs to handle the case where the resource does not exist:

```hcl
# The NAT gateway is only created when enabled
resource "aws_nat_gateway" "this" {
  count = var.enable_nat_gateway ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
}

# Output handles both cases
output "nat_gateway_id" {
  description = "ID of the NAT gateway (null if not created)"
  value       = var.enable_nat_gateway ? aws_nat_gateway.this[0].id : null
}

# Alternative: use try()
output "nat_gateway_ip" {
  description = "Public IP of the NAT gateway"
  value       = try(aws_nat_gateway.this[0].public_ip, null)
}
```

## Exposing Entire Resource Objects

Sometimes it is simpler to expose the entire resource rather than individual attributes:

```hcl
# Expose the full VPC resource
output "vpc" {
  description = "The full VPC resource object"
  value       = aws_vpc.this
}
```

The caller can then access any attribute:

```hcl
# Access any attribute through the full object
resource "aws_subnet" "extra" {
  vpc_id     = module.networking.vpc.id
  cidr_block = "10.0.99.0/24"

  tags = {
    vpc_cidr = module.networking.vpc.cidr_block
  }
}
```

This approach is convenient but less explicit. It also makes refactoring harder because callers might depend on any attribute.

## Output Dependencies

Outputs can include `depends_on` to ensure that all related resources are fully created before the output is considered available:

```hcl
output "cluster_endpoint" {
  description = "Endpoint for the EKS cluster"
  value       = aws_eks_cluster.this.endpoint

  # Make sure the cluster is fully ready before exposing the endpoint
  depends_on = [
    aws_eks_cluster.this,
    aws_eks_node_group.workers,
  ]
}
```

This is rarely needed but can be important when there are implicit dependencies that Terraform cannot detect automatically.

## Outputs with Preconditions

Terraform 1.2+ supports preconditions on outputs to validate assumptions:

```hcl
output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.this.dns_name

  precondition {
    condition     = aws_lb.this.status == "active"
    error_message = "Load balancer is not in active status."
  }
}
```

## Root Module Outputs

In the root module, outputs serve a different purpose - they display values after `terraform apply` and make values available to other tools:

```hcl
# Root module outputs.tf
output "api_endpoint" {
  description = "The API endpoint URL"
  value       = module.api.endpoint_url
}

output "database_endpoint" {
  description = "Database connection endpoint"
  value       = module.database.db_endpoint
}

# You can query these later with:
# terraform output api_endpoint
# terraform output -json
```

These root outputs are also what gets exposed to remote state consumers via `terraform_remote_state`.

## Organizing Outputs

For modules with many outputs, organize them by category:

```hcl
# outputs.tf

# -----------------------------------------------
# VPC outputs
# -----------------------------------------------
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.this.cidr_block
}

# -----------------------------------------------
# Subnet outputs
# -----------------------------------------------
output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

# -----------------------------------------------
# Gateway outputs
# -----------------------------------------------
output "internet_gateway_id" {
  description = "ID of the internet gateway"
  value       = aws_internet_gateway.this.id
}

output "nat_gateway_ids" {
  description = "List of NAT gateway IDs"
  value       = aws_nat_gateway.this[*].id
}
```

## Summary

Output values are the other half of a module's interface - inputs define what goes in, outputs define what comes out. Expose resource IDs, ARNs, connection endpoints, and any computed values that downstream resources will need. Use the `sensitive` flag for credentials and keys. Handle conditional resources with `try()` or ternary expressions. And always add descriptions so module consumers know what each output represents without reading the implementation.

For the input side, see [How to Pass Input Variables to Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-pass-input-variables-to-terraform-modules/view). To learn how outputs connect modules together, check out [How to Chain Module Outputs to Other Module Inputs](https://oneuptime.com/blog/post/2026-02-23-how-to-chain-module-outputs-to-other-module-inputs/view).
