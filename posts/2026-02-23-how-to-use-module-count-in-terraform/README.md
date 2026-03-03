# How to Use Module count in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Count, Infrastructure as Code, DevOps, Conditional Resources

Description: Learn how to use the count meta-argument with Terraform modules for conditional module creation and simple repetition, including when to prefer count over for_each.

---

The `count` meta-argument on module blocks lets you create zero or more instances of a module based on a number. Its most valuable use is conditional creation - deploying a module when a condition is true and skipping it entirely when the condition is false. While `for_each` is generally preferred for creating multiple instances, `count` has a specific niche that it fills well.

This guide covers the syntax, the right use cases, and the common pitfalls to avoid.

## Basic Syntax

The `count` argument accepts a whole number:

```hcl
# Create exactly 3 instances of the module
module "worker" {
  source = "./modules/worker"
  count  = 3

  worker_id = count.index
  queue_url = aws_sqs_queue.tasks.url
}
```

Inside the module block, `count.index` gives you the current iteration number, starting at 0.

## Conditional Module Creation

This is by far the most common and most useful application of `count` on modules. Using `count` with a boolean expression creates zero or one instance:

```hcl
variable "enable_monitoring" {
  description = "Whether to deploy the monitoring stack"
  type        = bool
  default     = true
}

# The monitoring module is only created when enable_monitoring is true
module "monitoring" {
  source = "./modules/monitoring"
  count  = var.enable_monitoring ? 1 : 0

  vpc_id      = module.vpc.vpc_id
  environment = var.environment
}
```

When `enable_monitoring` is `true`, `count = 1` and the module is created. When it is `false`, `count = 0` and the module is completely skipped - no resources are created, no providers are initialized for it.

## Common Conditional Patterns

### Environment-Based Conditionals

```hcl
# Only create NAT gateways in production
module "nat_gateway" {
  source = "./modules/nat-gateway"
  count  = var.environment == "prod" ? 1 : 0

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids
}

# Only create a bastion host in non-production environments
module "bastion" {
  source = "./modules/bastion"
  count  = var.environment != "prod" ? 1 : 0

  vpc_id    = module.vpc.vpc_id
  subnet_id = module.vpc.public_subnet_ids[0]
  key_name  = var.ssh_key_name
}
```

### Feature Flag Conditionals

```hcl
variable "features" {
  type = object({
    enable_cdn        = bool
    enable_waf        = bool
    enable_redis      = bool
    enable_read_replica = bool
  })
  default = {
    enable_cdn          = false
    enable_waf          = false
    enable_redis        = true
    enable_read_replica = false
  }
}

module "cdn" {
  source = "./modules/cloudfront"
  count  = var.features.enable_cdn ? 1 : 0

  domain_name = var.domain_name
  origin      = module.alb.dns_name
}

module "waf" {
  source = "./modules/waf"
  count  = var.features.enable_waf ? 1 : 0

  alb_arn = module.alb.arn
}

module "redis" {
  source = "./modules/elasticache"
  count  = var.features.enable_redis ? 1 : 0

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.cache_subnet_ids
}

module "read_replica" {
  source = "./modules/rds-replica"
  count  = var.features.enable_read_replica ? 1 : 0

  source_db_identifier = module.database.db_identifier
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.database_subnet_ids
}
```

## Accessing Outputs from count Modules

When a module uses `count`, its output becomes a list. For conditional modules (count 0 or 1), you need to handle the empty list case:

```hcl
# Conditional module
module "redis" {
  source = "./modules/elasticache"
  count  = var.enable_caching ? 1 : 0

  vpc_id = module.vpc.vpc_id
}

# Access the output - use index [0] for the single instance
output "redis_endpoint" {
  description = "Redis endpoint (null if caching is disabled)"
  value       = var.enable_caching ? module.redis[0].endpoint : null
}

# Or use try() for a more concise approach
output "redis_endpoint_v2" {
  value = try(module.redis[0].endpoint, null)
}
```

### Passing Conditional Outputs to Other Modules

```hcl
module "application" {
  source = "./modules/ecs-service"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  # Handle optional Redis endpoint
  environment_variables = merge(
    {
      DB_HOST = module.database.endpoint
    },
    var.enable_caching ? {
      REDIS_URL = module.redis[0].endpoint
    } : {},
  )
}
```

## Multiple Instances with count

While `for_each` is usually better for multiple instances, `count` works for simple cases where instances are truly identical except for an index:

```hcl
# Create multiple identical worker pools
module "worker_pool" {
  source = "./modules/worker-pool"
  count  = var.worker_pool_count

  pool_name = "worker-pool-${count.index}"
  queue_url = aws_sqs_queue.tasks.url
  vpc_id    = module.vpc.vpc_id
}
```

## State Addresses with count

Resources inside a `count` module have numeric indices in their state addresses:

```text
module.worker_pool[0].aws_ecs_service.this
module.worker_pool[1].aws_ecs_service.this
module.worker_pool[2].aws_ecs_service.this
```

This is where `count` becomes risky for multiple instances. If you change `count` from 3 to 2, Terraform destroys `module.worker_pool[2]`. But if you need to remove the middle instance (index 1), Terraform's behavior is less intuitive - it effectively shifts indices, potentially destroying and recreating resources.

## Why for_each Is Usually Better for Multiple Instances

Consider this scenario with `count`:

```hcl
# Using count for multiple services
variable "services" {
  default = ["api", "web", "worker"]
}

module "service" {
  source = "./modules/ecs-service"
  count  = length(var.services)

  service_name = var.services[count.index]
}

# State addresses:
# module.service[0] -> api
# module.service[1] -> web
# module.service[2] -> worker
```

If you remove "web" from the list:

```hcl
variable "services" {
  default = ["api", "worker"]  # removed "web"
}
```

Now `module.service[1]` shifts from "web" to "worker", and Terraform tries to:
1. Update module.service[1] from "web" to "worker" configuration
2. Destroy module.service[2] (old "worker")

This is messy and potentially destructive. With `for_each`, removing "web" only destroys the "web" instance - everything else stays untouched.

**Use count for:** conditional (0 or 1) module creation, or truly identical instances where you never remove from the middle.

**Use for_each for:** named instances, heterogeneous configurations, or any case where you might add/remove specific instances.

## Combining count with depends_on

```hcl
module "database" {
  source = "./modules/rds"
  count  = var.create_database ? 1 : 0

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids
}

module "application" {
  source = "./modules/ecs-service"

  vpc_id     = module.vpc.vpc_id
  db_endpoint = var.create_database ? module.database[0].endpoint : var.external_db_endpoint

  # Explicit dependency since the conditional reference might not capture it
  depends_on = [module.database]
}
```

## Converting count to for_each

If you started with `count` and want to migrate to `for_each`, use `moved` blocks:

```hcl
# Before
module "service" {
  source = "./modules/ecs-service"
  count  = 3
  service_name = var.service_names[count.index]
}

# After
module "service" {
  source   = "./modules/ecs-service"
  for_each = toset(var.service_names)
  service_name = each.key
}

# Migration moves
moved {
  from = module.service[0]
  to   = module.service["api"]
}
moved {
  from = module.service[1]
  to   = module.service["web"]
}
moved {
  from = module.service[2]
  to   = module.service["worker"]
}
```

## A Complete Conditional Infrastructure Example

```hcl
# main.tf - Infrastructure with optional components

variable "environment" {
  type = string
}

variable "options" {
  type = object({
    disaster_recovery = bool
    cdn               = bool
    waf               = bool
  })
}

# Always created
module "vpc" {
  source      = "./modules/vpc"
  environment = var.environment
  cidr        = "10.0.0.0/16"
}

module "database" {
  source     = "./modules/rds"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids
}

module "application" {
  source      = "./modules/ecs-service"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  db_endpoint = module.database.endpoint
}

# Conditionally created based on options
module "dr_replica" {
  source = "./modules/rds-replica"
  count  = var.options.disaster_recovery ? 1 : 0

  source_db_id = module.database.db_identifier
  vpc_id       = module.vpc.vpc_id
}

module "cdn" {
  source = "./modules/cloudfront"
  count  = var.options.cdn ? 1 : 0

  origin_domain = module.application.alb_dns_name
}

module "waf" {
  source = "./modules/waf"
  count  = var.options.waf ? 1 : 0

  alb_arn = module.application.alb_arn
}

# Outputs handle the optional modules
output "cdn_domain" {
  value = try(module.cdn[0].domain_name, "CDN not enabled")
}

output "dr_endpoint" {
  value = try(module.dr_replica[0].endpoint, "DR not enabled")
}
```

## Summary

Module `count` is best used for conditional creation - the pattern of `count = var.enable_x ? 1 : 0` to optionally include or exclude an entire module. For creating multiple named instances, `for_each` is almost always the better choice because it avoids the index-shifting problem. When using conditional modules, remember that outputs become lists, so you need `module.name[0].output` or `try()` to access them safely. The combination of `count` for optional components and `for_each` for multiple instances covers virtually every real-world scenario.

For the recommended alternative for multiple instances, see [How to Use Module for_each in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-for-each-in-terraform/view). For managing dependencies, check out [How to Use Module depends_on in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-depends-on-in-terraform/view).
