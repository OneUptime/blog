# How to Export Outputs from Modules in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Outputs, Infrastructure as Code, Code Reuse

Description: Learn how to define and export output values from Terraform modules so that calling configurations can access resource attributes, IDs, and computed values.

---

Outputs are the way Terraform modules communicate their results back to the calling configuration. When you create a VPC module, the caller needs the VPC ID. When you create a database module, the caller needs the endpoint. Without outputs, modules are black boxes with no way to pass information to other parts of your infrastructure.

This post covers how to define module outputs, access them from the calling configuration, and design output interfaces that make your modules genuinely useful.

## Defining Outputs in a Module

Module outputs are defined with `output` blocks, typically in an `outputs.tf` file within the module directory:

```
modules/
  vpc/
    main.tf
    variables.tf
    outputs.tf     # Output definitions go here
```

```hcl
# modules/vpc/outputs.tf

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ips" {
  description = "Elastic IPs of NAT gateways"
  value       = aws_eip.nat[*].public_ip
}
```

## Accessing Module Outputs

The calling configuration accesses outputs using the syntax `module.<MODULE_NAME>.<OUTPUT_NAME>`:

```hcl
# main.tf (root configuration)

module "vpc" {
  source = "./modules/vpc"

  name        = "production"
  cidr_block  = "10.0.0.0/16"
  azs         = ["us-east-1a", "us-east-1b"]
}

# Use the VPC module's outputs in other resources
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Reference module output
  subnet_id = module.vpc.public_subnet_ids[0]

  tags = {
    Name = "app-server"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "myapp-db"
  engine         = "postgres"
  instance_class = "db.t3.medium"

  # Reference module output for subnet group
  db_subnet_group_name = aws_db_subnet_group.main.name
}

resource "aws_db_subnet_group" "main" {
  name       = "myapp-db-subnets"
  subnet_ids = module.vpc.private_subnet_ids
}
```

## Passing Outputs Between Modules

The most powerful use of module outputs is chaining modules together. One module's outputs become another module's inputs:

```hcl
# Network module
module "network" {
  source = "./modules/network"

  vpc_cidr = "10.0.0.0/16"
  azs      = ["us-east-1a", "us-east-1b"]
}

# Security module uses network outputs
module "security" {
  source = "./modules/security"

  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids
}

# Compute module uses outputs from both
module "compute" {
  source = "./modules/compute"

  vpc_id             = module.network.vpc_id
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = module.security.app_security_group_ids
}

# Database module uses network and security outputs
module "database" {
  source = "./modules/database"

  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = module.security.database_security_group_ids
}
```

This creates a clear dependency graph. Terraform knows to create the network first, then security, then compute and database (which can be created in parallel since they depend on different outputs).

## What to Export

Export every attribute that a consumer might reasonably need. It is better to export too much than too little.

### IDs and ARNs

```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_arn" {
  description = "VPC ARN for use in IAM policies"
  value       = aws_vpc.main.arn
}
```

### Lists of IDs

```hcl
output "instance_ids" {
  description = "IDs of all created instances"
  value       = aws_instance.app[*].id
}

output "subnet_ids" {
  description = "All subnet IDs"
  value       = concat(
    aws_subnet.public[*].id,
    aws_subnet.private[*].id,
  )
}
```

### Connection Information

```hcl
output "endpoint" {
  description = "Database connection endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "address" {
  description = "Database hostname without port"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "Database port"
  value       = aws_db_instance.main.port
}
```

### Computed Values

```hcl
output "cluster_oidc_issuer_url" {
  description = "OIDC issuer URL for IAM roles for service accounts"
  value       = replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")
}

output "kubeconfig_command" {
  description = "AWS CLI command to update kubeconfig"
  value       = "aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region ${var.region}"
}
```

### Structured Objects

```hcl
output "subnets" {
  description = "Map of subnet type to subnet details"
  value = {
    public = {
      ids  = aws_subnet.public[*].id
      cidrs = aws_subnet.public[*].cidr_block
      azs   = aws_subnet.public[*].availability_zone
    }
    private = {
      ids  = aws_subnet.private[*].id
      cidrs = aws_subnet.private[*].cidr_block
      azs   = aws_subnet.private[*].availability_zone
    }
  }
}
```

## Re-Exporting Module Outputs

When you call a module from your root configuration and want to make its outputs available as root-level outputs:

```hcl
# main.tf
module "vpc" {
  source = "./modules/vpc"
  # ...
}

# Re-export module outputs as root outputs
output "vpc_id" {
  description = "VPC ID from the networking module"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs from the networking module"
  value       = module.vpc.private_subnet_ids
}
```

This makes the values available via `terraform output` and to external tools.

## Outputs from for_each Modules

When a module is called with `for_each`, outputs become a map:

```hcl
module "services" {
  for_each = var.services
  source   = "./modules/ecs-service"

  name     = each.key
  port     = each.value.port
  replicas = each.value.replicas
}

# Accessing outputs from for_each modules
output "service_urls" {
  description = "Map of service name to URL"
  value = {
    for name, svc in module.services :
    name => svc.service_url
  }
}

# Using in another resource
resource "aws_route53_record" "services" {
  for_each = module.services

  zone_id = var.zone_id
  name    = "${each.key}.${var.domain}"
  type    = "CNAME"
  ttl     = 300
  records = [each.value.lb_dns_name]
}
```

## Outputs from count Modules

With `count`, outputs become a list:

```hcl
module "workers" {
  count  = var.worker_count
  source = "./modules/worker"

  name = "worker-${count.index}"
}

# Accessing outputs from count modules
output "worker_ips" {
  description = "IP addresses of all worker instances"
  value       = module.workers[*].private_ip
}
```

## Sensitive Module Outputs

Mark module outputs as sensitive when they contain secrets:

```hcl
# modules/database/outputs.tf

output "password" {
  description = "Generated database password"
  value       = random_password.db.result
  sensitive   = true
}

# The sensitivity carries through to the consumer
# main.tf
output "db_password" {
  value     = module.database.password
  sensitive = true  # Required because the source is sensitive
}
```

## A Complete Module Example

```hcl
# modules/web-app/main.tf

resource "aws_ecs_cluster" "main" {
  name = var.name
}

resource "aws_ecs_service" "app" {
  name            = var.name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.replicas
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = [aws_security_group.app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.name
    container_port   = var.port
  }
}

resource "aws_lb" "app" {
  name               = "${var.name}-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
  security_groups    = [aws_security_group.lb.id]
}
```

```hcl
# modules/web-app/outputs.tf

# Primary identifiers
output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "service_id" {
  description = "ECS service ID"
  value       = aws_ecs_service.app.id
}

# Load balancer
output "lb_dns_name" {
  description = "DNS name of the application load balancer"
  value       = aws_lb.app.dns_name
}

output "lb_zone_id" {
  description = "Zone ID of the load balancer for Route 53 alias records"
  value       = aws_lb.app.zone_id
}

output "lb_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.app.arn
}

# Security
output "app_security_group_id" {
  description = "Security group ID attached to the ECS tasks"
  value       = aws_security_group.app.id
}

output "lb_security_group_id" {
  description = "Security group ID attached to the load balancer"
  value       = aws_security_group.lb.id
}

# Convenience
output "app_url" {
  description = "Application URL via the load balancer"
  value       = "http://${aws_lb.app.dns_name}"
}
```

```hcl
# main.tf (consuming the module)

module "web_app" {
  source = "./modules/web-app"

  name              = "my-app"
  port              = 8080
  replicas          = 3
  subnet_ids        = module.vpc.private_subnet_ids
  public_subnet_ids = module.vpc.public_subnet_ids
}

# Create DNS record using module outputs
resource "aws_route53_record" "app" {
  zone_id = var.zone_id
  name    = "app.${var.domain}"
  type    = "A"

  alias {
    name                   = module.web_app.lb_dns_name
    zone_id                = module.web_app.lb_zone_id
    evaluate_target_health = true
  }
}

# Display the URL
output "application_url" {
  description = "Application URL"
  value       = "https://app.${var.domain}"
}
```

## Best Practices

1. **Export everything useful.** You cannot predict exactly what consumers will need. Export IDs, ARNs, endpoints, and computed values.

2. **Use consistent naming.** Follow a pattern: `resource_attribute` (e.g., `vpc_id`, `cluster_arn`, `lb_dns_name`).

3. **Always add descriptions.** Module outputs are part of the module's API. Document them.

4. **Mark sensitive outputs.** Passwords, keys, and tokens should always have `sensitive = true`.

5. **Use depends_on when needed.** If a resource needs to be fully configured before the output is useful, add explicit dependencies.

## Wrapping Up

Module outputs are the return values of your Terraform modules. They are how modules share information with the rest of your infrastructure code. Well-designed outputs make modules composable - you can chain them together naturally, with one module's outputs flowing into another module's inputs. Take the time to export comprehensive outputs with clear descriptions, and your modules will be reusable building blocks rather than isolated configurations.

For more on working with outputs, see our posts on [defining output values](https://oneuptime.com/blog/post/2026-02-23-how-to-define-output-values-in-terraform/view) and [accessing outputs from other configurations](https://oneuptime.com/blog/post/2026-02-23-how-to-access-outputs-from-other-terraform-configurations/view).
