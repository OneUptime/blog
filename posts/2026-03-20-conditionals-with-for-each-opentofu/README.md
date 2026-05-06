# How to Use Conditionals with for_each in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, for_each, Conditional, HCL, Filtering

Description: Learn how to combine conditional expressions with for_each in OpenTofu to create only the resources that meet specific criteria from a larger collection.

## Introduction

`for_each` on resources and modules accepts a map or set of strings and creates one instance per item. When combined with conditional filtering, you can selectively create resources from a larger dataset - creating S3 buckets only for enabled features, security group rules only for certain environments, or DNS records only for active services.

## Filtering with for Expression

Use a `for` expression with `if` to filter the collection before passing it to `for_each`.

```hcl
variable "services" {
  type = map(object({
    enabled       = bool
    port          = number
    health_path   = string
    public        = bool
  }))
  default = {
    "api"     = { enabled = true,  port = 8080, health_path = "/health", public = true  }
    "worker"  = { enabled = true,  port = 0,    health_path = "",        public = false }
    "admin"   = { enabled = false, port = 8081, health_path = "/ready",  public = false }
    "metrics" = { enabled = true,  port = 9090, health_path = "/metrics",public = false }
  }
}

# Create target groups only for enabled services that have a port

resource "aws_lb_target_group" "services" {
  for_each = {
    for name, svc in var.services : name => svc
    if svc.enabled && svc.port > 0
  }

  name     = "tg-${each.key}"
  port     = each.value.port
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path = each.value.health_path
  }
}

# Create DNS records only for enabled public services
resource "aws_route53_record" "public_services" {
  for_each = {
    for name, svc in var.services : name => svc
    if svc.enabled && svc.public
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.key
  type    = "A"
  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
```

## Conditional for_each Based on Environment

Create different resources per environment tier.

```hcl
variable "subnets" {
  type = map(object({
    cidr             = string
    availability_zone = string
    tier             = string  # "public", "private", "database"
    nat_required     = bool
  }))
}

variable "environment" { type = string }

locals {
  # Only create database subnets in non-dev environments
  db_subnets = {
    for name, subnet in var.subnets : name => subnet
    if subnet.tier == "database" && var.environment != "dev"
  }

  # NAT gateways only for subnets that need them
  nat_subnets = {
    for name, subnet in var.subnets : name => subnet
    if subnet.nat_required
  }
}

resource "aws_subnet" "database" {
  for_each = local.db_subnets

  vpc_id            = var.vpc_id
  cidr_block        = each.value.cidr
  availability_zone = each.value.availability_zone
  tags              = { Name = each.key, Tier = "database" }
}
```

## Conditional for_each with toset

Filter a list, convert it to a set, and use the filtered result with `for_each`.

```hcl
variable "regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
}

variable "active_regions" {
  description = "Regions to actually deploy to"
  type        = list(string)
  default     = ["us-east-1"]
}

provider "aws" {
  alias    = "regional"
  for_each = toset(var.regions)
  region   = each.key
}

resource "aws_s3_bucket" "regional_artifacts" {
  # Create only in active regions
  for_each = toset([
    for region in var.regions : region
    if contains(var.active_regions, region)
  ])

  provider = aws.regional[each.key]
  bucket   = "myapp-artifacts-${each.key}"
}
```

## Combining Multiple Conditions

```hcl
variable "alarms" {
  type = map(object({
    enabled     = bool
    threshold   = number
    severity    = string  # "critical", "warning", "info"
    notify_pagerduty = bool
  }))
}

# Create SNS notifications only for critical, enabled alarms that use PagerDuty
resource "aws_sns_topic_subscription" "pagerduty_alarms" {
  for_each = {
    for name, alarm in var.alarms : name => alarm
    if alarm.enabled && alarm.severity == "critical" && alarm.notify_pagerduty
  }

  topic_arn = aws_cloudwatch_metric_alarm.alarms[each.key].alarm_actions[0]
  protocol  = "https"
  endpoint  = var.pagerduty_endpoint
}
```

## Conclusion

Combining `for_each` with conditional `for` expressions gives you precise control over which resources get created from a larger dataset. This pattern is more maintainable than separate resource blocks with different `count` conditions, because all the logic stays together in a single resource block with a filtered iterator.
