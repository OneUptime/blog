# How to Use Terraform for Complex Conditional Resource Creation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Conditional Logic, Dynamic Blocks, For_each, Infrastructure as Code

Description: Master advanced conditional resource creation in Terraform using count, for_each, dynamic blocks, and local value composition for sophisticated infrastructure logic.

---

Basic conditional resource creation in Terraform is straightforward - use `count = var.enabled ? 1 : 0`. But real-world infrastructure needs go far beyond that. You might need to create different resource combinations based on multiple conditions, generate resources from filtered maps, or conditionally configure nested blocks. This guide covers the advanced patterns that handle these situations.

## Beyond Simple Count Conditions

The basic pattern everyone learns first:

```hcl
# Simple: create or skip a single resource
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name = "${var.app_name}-cpu-high"
  # ...
}
```

This works for on/off toggles. But what about creating a resource only when multiple conditions are all true?

```hcl
# Multiple conditions must all be true
resource "aws_wafv2_web_acl_association" "alb" {
  count = var.enable_waf && var.environment == "production" && var.expose_public ? 1 : 0

  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main[0].arn
}
```

When conditions get complex, move them to locals:

```hcl
locals {
  # Clearly named conditions are easier to understand
  is_production    = var.environment == "production"
  is_public_facing = var.expose_public
  needs_waf        = local.is_production && local.is_public_facing && var.enable_waf
  needs_cdn        = local.is_public_facing && var.enable_cdn
  needs_ssl        = local.is_public_facing || var.force_ssl

  # Complex condition: monitoring is required in production,
  # optional elsewhere
  needs_monitoring = local.is_production || var.enable_monitoring
}

resource "aws_wafv2_web_acl" "main" {
  count = local.needs_waf ? 1 : 0
  # ...
}

resource "aws_cloudfront_distribution" "cdn" {
  count = local.needs_cdn ? 1 : 0
  # ...
}
```

## Conditional for_each with Filtered Maps

`for_each` with filtering is more powerful than `count` for conditional creation because it handles multiple instances:

```hcl
variable "services" {
  type = map(object({
    enabled       = bool
    instance_type = string
    port          = number
    public        = bool
    replicas      = number
  }))
}

# Only create resources for enabled services
resource "aws_ecs_service" "services" {
  for_each = {
    for name, config in var.services :
    name => config if config.enabled
  }

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.replicas
}

# Only create load balancer targets for public services
resource "aws_lb_target_group" "services" {
  for_each = {
    for name, config in var.services :
    name => config if config.enabled && config.public
  }

  name     = each.key
  port     = each.value.port
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
}
```

The filtering happens in the `for` expression. Only services matching the condition get resources created.

## Conditional Nested Blocks with Dynamic

`dynamic` blocks let you conditionally include nested configuration:

```hcl
variable "enable_access_logs" {
  type    = bool
  default = true
}

variable "enable_stickiness" {
  type    = bool
  default = false
}

variable "ssl_certificate_arn" {
  type    = string
  default = ""
}

resource "aws_lb" "main" {
  name               = var.app_name
  internal           = !var.expose_public
  load_balancer_type = "application"
  subnets            = var.subnet_ids

  # Conditionally include access log configuration
  dynamic "access_logs" {
    for_each = var.enable_access_logs ? [1] : []
    content {
      bucket  = aws_s3_bucket.lb_logs[0].id
      prefix  = var.app_name
      enabled = true
    }
  }
}

resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn

  # Port and protocol depend on whether SSL is configured
  port     = var.ssl_certificate_arn != "" ? 443 : 80
  protocol = var.ssl_certificate_arn != "" ? "HTTPS" : "HTTP"

  # SSL certificate only included when provided
  certificate_arn = var.ssl_certificate_arn != "" ? var.ssl_certificate_arn : null

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn

    # Conditional stickiness in the forward action
    dynamic "stickiness" {
      for_each = var.enable_stickiness ? [1] : []
      content {
        duration = 3600
        enabled  = true
      }
    }
  }
}
```

## Multi-Condition Resource Sets

Sometimes a single condition triggers the creation of several related resources. Group them together:

```hcl
locals {
  # Define feature flags
  features = {
    redis_cache = {
      enabled = var.enable_caching
      resources = var.enable_caching ? {
        cluster        = true
        subnet_group   = true
        security_group = true
        parameter_group = true
      } : {}
    }
    search = {
      enabled = var.enable_search
      resources = var.enable_search ? {
        domain         = true
        security_group = true
        log_group      = true
      } : {}
    }
  }
}

# Redis resources - all created or none
resource "aws_elasticache_subnet_group" "redis" {
  count = local.features.redis_cache.enabled ? 1 : 0

  name       = "${var.app_name}-redis"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_parameter_group" "redis" {
  count = local.features.redis_cache.enabled ? 1 : 0

  name   = "${var.app_name}-redis"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
}

resource "aws_security_group" "redis" {
  count = local.features.redis_cache.enabled ? 1 : 0

  name   = "${var.app_name}-redis"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

resource "aws_elasticache_replication_group" "redis" {
  count = local.features.redis_cache.enabled ? 1 : 0

  replication_group_id = var.app_name
  description          = "Redis cache for ${var.app_name}"
  node_type            = var.redis_node_type
  num_cache_clusters   = var.environment == "production" ? 2 : 1

  subnet_group_name  = aws_elasticache_subnet_group.redis[0].name
  security_group_ids = [aws_security_group.redis[0].id]
  parameter_group_name = aws_elasticache_parameter_group.redis[0].name
}
```

## Conditional Resource Variants

Create different versions of a resource based on conditions:

```hcl
variable "db_type" {
  description = "Database deployment type"
  type        = string
  default     = "single"

  validation {
    condition     = contains(["single", "multi-az", "cluster"], var.db_type)
    error_message = "DB type must be single, multi-az, or cluster."
  }
}

# Single instance - for dev/test
resource "aws_db_instance" "single" {
  count = var.db_type == "single" ? 1 : 0

  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.db_instance_class
  multi_az       = false

  # No deletion protection in single mode
  deletion_protection = false

  tags = local.common_tags
}

# Multi-AZ instance - for staging/production
resource "aws_db_instance" "multi_az" {
  count = var.db_type == "multi-az" ? 1 : 0

  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.db_instance_class
  multi_az       = true

  deletion_protection      = true
  backup_retention_period  = 30
  performance_insights_enabled = true

  tags = local.common_tags
}

# Aurora cluster - for high-performance production
resource "aws_rds_cluster" "cluster" {
  count = var.db_type == "cluster" ? 1 : 0

  cluster_identifier = "${var.app_name}-db"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"

  deletion_protection     = true
  backup_retention_period = 35

  tags = local.common_tags
}

resource "aws_rds_cluster_instance" "cluster" {
  count = var.db_type == "cluster" ? var.cluster_instance_count : 0

  identifier         = "${var.app_name}-db-${count.index}"
  cluster_identifier = aws_rds_cluster.cluster[0].id
  instance_class     = var.db_instance_class
  engine             = "aurora-postgresql"
}

# Unified output
locals {
  db_endpoint = (
    var.db_type == "single" ? aws_db_instance.single[0].endpoint :
    var.db_type == "multi-az" ? aws_db_instance.multi_az[0].endpoint :
    aws_rds_cluster.cluster[0].endpoint
  )
}
```

## Chaining Conditional Resources

When conditional resources depend on other conditional resources, keep the dependency chain clean:

```hcl
locals {
  # The CDN needs a certificate, and the certificate needs DNS validation
  needs_cdn         = var.enable_cdn && var.domain_name != ""
  needs_certificate = local.needs_cdn
  needs_dns_records = local.needs_certificate
}

# Step 1: Certificate (conditional)
resource "aws_acm_certificate" "cdn" {
  count = local.needs_certificate ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"
}

# Step 2: DNS validation records (conditional, depends on step 1)
resource "aws_route53_record" "cert_validation" {
  for_each = local.needs_dns_records ? {
    for dvo in aws_acm_certificate.cdn[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Step 3: Certificate validation (conditional, depends on step 2)
resource "aws_acm_certificate_validation" "cdn" {
  count = local.needs_certificate ? 1 : 0

  certificate_arn         = aws_acm_certificate.cdn[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Step 4: CDN distribution (conditional, depends on step 3)
resource "aws_cloudfront_distribution" "main" {
  count = local.needs_cdn ? 1 : 0

  # ... distribution config
  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate_validation.cdn[0].certificate_arn
    ssl_support_method  = "sni-only"
  }
}
```

## Avoiding Common Pitfalls

1. Do not mix `count` and `for_each` on the same resource. Pick one approach.

2. When referencing conditional resources, always use the index: `aws_lb.main[0].arn`, not `aws_lb.main.arn`. Better yet, use `one()`: `one(aws_lb.main[*].arn)`.

3. Avoid deeply nested ternaries. If you have more than two levels, use a local map lookup instead.

4. Be careful with `count` and resource ordering. If you add a resource between two counted resources, indexes shift and Terraform wants to recreate things. Prefer `for_each` for collections.

5. Test both branches of every condition. It is easy to write code that works when `enabled = true` but crashes when `enabled = false` due to a missing index reference.

## Wrapping Up

Complex conditional resource creation is where Terraform configurations either stay clean or become a nightmare. The key techniques are: use named locals for complex conditions, filter maps with `for_each`, use `dynamic` blocks for conditional nested configuration, group related conditional resources together, and test both enabled and disabled states. Keep the conditional logic in locals and let your resources be straightforward consumers of those decisions. This separation makes your configurations readable and maintainable even as the conditional logic grows.
