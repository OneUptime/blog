# How to Use Conditional Resource Creation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Conditional, Count, For Each, Infrastructure as Code

Description: Learn how to conditionally create or skip resources in OpenTofu using count, for_each, and variable-driven expressions.

---

OpenTofu does not have an `if` statement for resources, but you can achieve conditional creation using `count = 0` or `1`, the ternary operator, and `for_each` with empty collections.

---

## count-Based Conditional

```hcl
variable "create_bastion" {
  type    = bool
  default = false
}

resource "aws_instance" "bastion" {
  count = var.create_bastion ? 1 : 0

  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  tags = {
    Name = "bastion"
  }
}

# Reference conditionally created resources safely

output "bastion_ip" {
  value = var.create_bastion ? aws_instance.bastion[0].public_ip : null
}
```

---

## for_each with an Empty Set

```hcl
variable "enable_monitoring" {
  type    = bool
  default = true
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  for_each = var.enable_monitoring ? toset(["web", "api", "db"]) : toset([])

  alarm_name          = "${each.key}-cpu-alarm"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  period              = 120
  statistic           = "Average"
}
```

---

## Conditional Module

```hcl
module "waf" {
  count  = var.environment == "production" ? 1 : 0
  source = "./modules/waf"

  alb_arn = aws_lb.main.arn
}
```

---

## Conditional Based on Variable Value

```hcl
locals {
  create_nat = var.environment != "development"
}

resource "aws_nat_gateway" "main" {
  count         = local.create_nat ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
}
```

---

## Avoid Conditional Anti-Patterns

```hcl
# DON'T: This causes a plan error if count = 0
output "bad_output" {
  value = aws_instance.bastion[0].public_ip  # Will fail if count = 0
}

# DO: Use one-element tuple access with conditional
output "good_output" {
  value = length(aws_instance.bastion) > 0 ? aws_instance.bastion[0].public_ip : null
}
```

---

## Summary

Use `count = condition ? 1 : 0` to conditionally create a single resource, and `for_each = condition ? toset([...]) : toset([])` for conditional sets. Reference conditionally created resources with index notation (`[0]`) and always guard outputs with a ternary. Use `locals` to compute complex conditions once and reuse them across multiple resources.
