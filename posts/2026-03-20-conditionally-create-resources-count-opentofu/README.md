# How to Conditionally Create Resources with count in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Count, Conditional, HCL, Resource Management

Description: Learn how to use the count meta-argument in OpenTofu to conditionally create resources based on boolean variables and conditional expressions.

## Introduction

The `count` meta-argument is a straightforward way to conditionally create a resource in OpenTofu. Setting `count = 1` creates the resource; `count = 0` skips it. This pattern enables feature flags, environment-specific resources, and optional infrastructure components.

## Basic Conditional Resource Creation

```hcl
variable "create_bastion" {
  description = "Whether to create a bastion host"
  type        = bool
  default     = false
}

# The bastion host is created only when create_bastion = true

resource "aws_instance" "bastion" {
  count = var.create_bastion ? 1 : 0

  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = var.public_subnet_id
  key_name      = var.key_pair_name

  tags = {
    Name = "bastion-host"
    Role = "bastion"
  }
}

# Reference the bastion conditionally with a conditional expression or try()
output "bastion_public_ip" {
  value = var.create_bastion ? aws_instance.bastion[0].public_ip : null
}
```

## Environment-Based Conditional Resources

Create resources that only exist in specific environments.

```hcl
variable "environment" {
  type = string
}

locals {
  is_production = var.environment == "prod"
  is_dev        = var.environment == "dev"
}

# WAF only in production to save costs
resource "aws_wafv2_web_acl_association" "app" {
  count        = local.is_production ? 1 : 0
  resource_arn = aws_lb.app.arn
  web_acl_arn  = aws_wafv2_web_acl.app.arn
}

# Debug logging only in dev
resource "aws_cloudwatch_log_group" "debug" {
  count             = local.is_dev ? 1 : 0
  name              = "/app/debug"
  retention_in_days = 7
}
```

## Conditional Count Based on Variable Presence

Create a resource only when a variable is non-empty.

```hcl
variable "custom_domain" {
  description = "Custom domain for the CloudFront distribution. Empty = skip."
  type        = string
  default     = ""
}

# Route53 record only created when a custom domain is specified
resource "aws_route53_record" "cdn" {
  count   = var.custom_domain != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.custom_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

# ACM certificate only when custom domain is set
resource "aws_acm_certificate" "custom" {
  count             = var.custom_domain != "" ? 1 : 0
  domain_name       = var.custom_domain
  validation_method = "DNS"
}
```

## Referencing count-Based Resources Safely

When a resource uses `count`, reference its outputs carefully to avoid errors when count = 0.

```hcl
variable "enable_nat" {
  type    = bool
  default = true
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = var.public_subnet_id
}

resource "aws_eip" "nat" {
  count  = var.enable_nat ? 1 : 0
  domain = "vpc"
}

resource "aws_route" "private_internet" {
  count = var.enable_nat ? 1 : 0

  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[0].id
}

output "nat_gateway_ip" {
  # Use one() to safely get the single element or null
  value = one(aws_eip.nat[*].public_ip)
}
```

## Multiple Optional Resources Linked Together

```hcl
variable "enable_monitoring" {
  type    = bool
  default = true
}

# Create CloudWatch alarms only when monitoring is enabled
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name          = "cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization is above 80%"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
}

resource "aws_sns_topic" "alerts" {
  count = var.enable_monitoring ? 1 : 0
  name  = "app-alerts"
}
```

## Conclusion

The `count = condition ? 1 : 0` pattern is a common way to toggle resources on and off. Use `one()` or guard index access with `[0]` behind the same condition to safely reference outputs from conditional resources. For resources that need unique identifiers (not just numbers), prefer `for_each` with a filtered set.
