# Designing Reusable Modules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, Best-practices

Description: Learn best practices for designing reusable, composable OpenTofu modules that work across multiple environments and use cases.

A well-designed module is flexible enough to serve multiple use cases without being so abstract that it becomes hard to understand. This guide covers the principles and patterns for creating truly reusable OpenTofu modules.

## Core Principles of Reusable Modules

1. **Single responsibility** - Each module should do one thing well
2. **Configurable defaults** - Sensible defaults with override capability
3. **Minimal assumptions** - Don't hardcode environment-specific values
4. **Clear interfaces** - Well-documented inputs and outputs
5. **Version stability** - Semantic versioning with backward compatibility

## Variable Design Patterns

```hcl
# Bad: too rigid

variable "instance_type" {
  default = "t3.medium"  # Hardcoded assumption
}

# Good: configurable with sensible default
variable "instance_type" {
  description = "EC2 instance type for the application servers"
  type        = string
  default     = "t3.medium"

  validation {
    condition     = can(regex("^[a-z][0-9]+\\.[a-z]+$", var.instance_type))
    error_message = "Must be a valid EC2 instance type (e.g., t3.medium, m5.large)."
  }
}

# Accept complex configuration objects
variable "autoscaling" {
  description = "Auto scaling group configuration"
  type = object({
    min_size         = number
    max_size         = number
    desired_capacity = optional(number)
    scale_in_cooldown  = optional(number, 300)
    scale_out_cooldown = optional(number, 60)
  })
  default = {
    min_size = 1
    max_size = 3
  }
}
```

## Using Optional Variables with Defaults

```hcl
variable "monitoring" {
  description = "Monitoring configuration"
  type = object({
    enabled            = optional(bool, true)
    retention_days     = optional(number, 30)
    alert_email        = optional(string)
    detailed_monitoring = optional(bool, false)
  })
  default = {}
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = var.instance_type
  monitoring    = var.monitoring.detailed_monitoring

  tags = merge(local.default_tags, var.tags)
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.monitoring.enabled ? 1 : 0

  alarm_name  = "${var.name}-cpu-high"
  metric_name = "CPUUtilization"
  threshold   = 80

  alarm_actions = var.monitoring.alert_email != null ? [
    aws_sns_topic.alerts[0].arn
  ] : []
}
```

## Composable Outputs

```hcl
# outputs.tf - expose everything callers might need
output "id" {
  description = "ID of the created resource"
  value       = aws_instance.app.id
}

output "arn" {
  description = "ARN of the created resource"
  value       = aws_instance.app.arn
}

output "private_ip" {
  description = "Private IP address"
  value       = aws_instance.app.private_ip
}

output "security_group_id" {
  description = "ID of the security group - useful for granting access from other modules"
  value       = aws_security_group.app.id
}

# Structured output for easy consumption
output "instance" {
  description = "Full instance details"
  value = {
    id         = aws_instance.app.id
    arn        = aws_instance.app.arn
    private_ip = aws_instance.app.private_ip
    public_ip  = aws_instance.app.public_ip
  }
}
```

## Handling Optional Resources

```hcl
variable "create_dns_record" {
  description = "Whether to create a DNS record for the instance"
  type        = bool
  default     = false
}

variable "dns_zone_id" {
  description = "Route53 hosted zone ID (required if create_dns_record is true)"
  type        = string
  default     = null
}

resource "aws_route53_record" "app" {
  count = var.create_dns_record ? 1 : 0

  zone_id = var.dns_zone_id
  name    = "${var.name}.${var.domain}"
  type    = "A"
  ttl     = 300
  records = [aws_instance.app.private_ip]
}

# Validate dependencies
locals {
  validate_dns = var.create_dns_record && var.dns_zone_id == null ? tobool("dns_zone_id required when create_dns_record is true") : true
}
```

## Tag Management Strategy

```hcl
variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

locals {
  required_tags = {
    ManagedBy  = "opentofu"
    ModuleName = "webapp"
  }

  # Caller tags override defaults, but not required tags
  merged_tags = merge(
    var.tags,
    local.required_tags
  )
}

resource "aws_instance" "app" {
  tags = merge(local.merged_tags, {
    Name = var.name
  })
}

resource "aws_security_group" "app" {
  tags = merge(local.merged_tags, {
    Name = "${var.name}-sg"
  })
}
```

## Version Compatibility

```hcl
# versions.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0, < 6.0"  # Support range, not single version
    }
  }
}
```

## Conclusion

Reusable module design is about finding the right balance between flexibility and simplicity. Use optional variables with defaults, expose comprehensive outputs, handle optional features with count/for_each, and maintain clear documentation. A well-designed module becomes an asset that teams reach for repeatedly.
