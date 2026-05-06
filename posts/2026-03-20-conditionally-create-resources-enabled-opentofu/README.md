# How to Conditionally Create Resources with the enabled Meta-Argument in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Module, Enabled, Conditional, HCL, Best Practice

Description: Learn how to implement an enabled variable pattern in OpenTofu modules to cleanly toggle entire feature sets on and off without changing module interfaces.

## Introduction

OpenTofu v1.11 introduced a built-in `enabled` meta-argument inside `lifecycle` blocks for resources and module calls. This is OpenTofu-specific; Terraform's current documented meta-arguments for conditional creation are still `count` and `for_each`. In reusable modules, a common pattern is to expose an `enabled` input variable and wire it into that meta-argument so callers can toggle an entire feature on or off without changing the module interface.

## Module-Level enabled Pattern

Define an `enabled` variable and use it as the basis for each resource's `lifecycle.enabled` setting within the module.

```hcl
# modules/monitoring/variables.tf

variable "enabled" {
  description = "Enable or disable all resources in this module"
  type        = bool
  default     = true
}

variable "service_name"    { type = string }
variable "instance_id"     { type = string }
variable "alarm_actions"   { type = list(string); default = [] }
variable "cpu_threshold"   { type = number; default = 80 }
variable "mem_threshold"   { type = number; default = 90 }
```

```hcl
# modules/monitoring/main.tf
resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "${var.service_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_actions       = var.alarm_actions

  dimensions = {
    InstanceId = var.instance_id
  }

  lifecycle {
    enabled = var.enabled
  }
}

resource "aws_cloudwatch_metric_alarm" "memory" {
  alarm_name          = "${var.service_name}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = 300
  statistic           = "Average"
  threshold           = var.mem_threshold
  alarm_actions       = var.alarm_actions

  dimensions = {
    InstanceId = var.instance_id
  }

  lifecycle {
    enabled = var.enabled
  }
}

resource "aws_cloudwatch_dashboard" "service" {
  dashboard_name = "${var.service_name}-overview"
  dashboard_body = jsonencode({
    widgets = []
  })

  lifecycle {
    enabled = var.enabled
  }
}
```

## Calling the Module with enabled Control

```hcl
# Root module: enable monitoring in prod, disable in dev
module "monitoring" {
  source = "./modules/monitoring"

  enabled       = var.environment == "prod"
  service_name  = "web-app"
  instance_id   = aws_instance.web.id
  alarm_actions = var.environment == "prod" ? [aws_sns_topic.alerts.arn] : []
  cpu_threshold = 70
}
```

## enabled with Feature Sub-Modules

Organize optional features as sub-modules, each with their own `enabled` input that the child module maps to `lifecycle.enabled` internally.

```hcl
module "waf" {
  source  = "./modules/waf"
  enabled = var.features.enable_waf

  alb_arn = aws_lb.app.arn
  rules   = var.waf_rules
}

module "shield" {
  source  = "./modules/shield"
  enabled = var.features.enable_shield_advanced

  resource_arn = aws_lb.app.arn
}

module "guardduty" {
  source  = "./modules/guardduty"
  enabled = var.features.enable_guardduty
}
```

## Using enabled alongside count for Scaling

You cannot use `enabled` together with `count` on the same resource or module block. Use `enabled` on the containing module call, and use `count` inside that module for scaling.

```hcl
# Root module
module "workers" {
  source = "./modules/workers"

  replica_count = var.replica_count
  subnet_ids    = var.subnet_ids
  instance_type = var.instance_type

  lifecycle {
    enabled = var.enabled
  }
}

# modules/workers/main.tf
variable "replica_count" { type = number; default = 1 }

resource "aws_instance" "worker" {
  count = var.replica_count

  ami           = data.aws_ami.app.id
  instance_type = var.instance_type
  subnet_id     = element(var.subnet_ids, count.index % length(var.subnet_ids))

  tags = {
    Name  = "worker-${count.index + 1}"
    Index = tostring(count.index)
  }
}
```

## Safe Outputs from enabled Modules

```hcl
# modules/monitoring/outputs.tf
output "dashboard_url" {
  description = "CloudWatch dashboard URL, or null if monitoring is disabled"
  value = aws_cloudwatch_dashboard.service != null ? (
    "https://console.aws.amazon.com/cloudwatch/home#dashboards:name=${aws_cloudwatch_dashboard.service.dashboard_name}"
  ) : null
}

output "alarm_arns" {
  description = "List of created alarm ARNs"
  value = aws_cloudwatch_metric_alarm.cpu != null ? [
    aws_cloudwatch_metric_alarm.cpu.arn,
    aws_cloudwatch_metric_alarm.memory.arn,
  ] : []
}
```

## Conclusion

The `enabled` pattern makes module interfaces self-documenting and easy to use. Module callers can disable entire feature sets with a single flag, and the module maps that flag to OpenTofu's built-in `lifecycle.enabled` behavior for single-instance resources. When you need multiple instances, keep using `count` or `for_each` and put the `enabled` decision on an outer module or separate block.
