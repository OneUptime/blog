# How to Use the count Meta-Argument in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Count, Meta-Arguments, Infrastructure as Code

Description: Learn how to use the Terraform count meta-argument to create multiple resource instances, conditionally create resources, and understand the index-based addressing model with practical examples.

---

The `count` meta-argument is one of the simplest ways to create multiple resources from a single block in Terraform. You set `count` to a number, and Terraform creates that many instances. You can also set it to 0 or 1 to conditionally create or skip a resource.

While `for_each` has largely replaced `count` for collection-based resource creation, `count` remains the go-to choice for two specific patterns: creating N identical resources and conditional resource creation.

## Creating Multiple Resources

Set `count` to any non-negative integer:

```hcl
resource "aws_instance" "worker" {
  count = 5

  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name = "worker-${count.index}"
  }
}
```

This creates five instances named worker-0 through worker-4. Each instance is addressed as `aws_instance.worker[0]`, `aws_instance.worker[1]`, etc.

The `count.index` gives you the zero-based index of the current instance. Use it for unique naming, subnet distribution, or any attribute that should vary per instance.

## Using count with Variables

Make the count configurable:

```hcl
variable "worker_count" {
  description = "Number of worker instances"
  type        = number
  default     = 3
}

resource "aws_instance" "worker" {
  count = var.worker_count

  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name  = "worker-${format("%02d", count.index + 1)}"
    Index = count.index
  }
}
```

The `format("%02d", count.index + 1)` produces zero-padded numbers starting from 01: worker-01, worker-02, worker-03.

## Distributing Across Subnets

A common pattern is distributing instances across availability zones using the modulo operator:

```hcl
variable "instance_count" {
  type    = number
  default = 6
}

variable "subnet_ids" {
  type = list(string)
}

resource "aws_instance" "app" {
  count = var.instance_count

  ami           = var.ami_id
  instance_type = var.instance_type

  # Distribute across subnets in a round-robin fashion
  # If there are 3 subnets and 6 instances:
  #   Instance 0 -> subnet 0
  #   Instance 1 -> subnet 1
  #   Instance 2 -> subnet 2
  #   Instance 3 -> subnet 0
  #   Instance 4 -> subnet 1
  #   Instance 5 -> subnet 2
  subnet_id = var.subnet_ids[count.index % length(var.subnet_ids)]

  tags = {
    Name = "app-${count.index}"
    AZ   = data.aws_subnet.selected[count.index % length(var.subnet_ids)].availability_zone
  }
}
```

## Conditional Resource Creation

The most powerful use of `count` is the conditional pattern: `count = condition ? 1 : 0`.

```hcl
variable "enable_monitoring" {
  type    = bool
  default = false
}

variable "enable_bastion" {
  type    = bool
  default = false
}

# Only create the CloudWatch dashboard if monitoring is enabled
resource "aws_cloudwatch_dashboard" "main" {
  count = var.enable_monitoring ? 1 : 0

  dashboard_name = "${var.project}-${var.environment}"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [["AWS/EC2", "CPUUtilization"]]
          period  = 300
          stat    = "Average"
          region  = var.aws_region
          title   = "EC2 CPU"
        }
      }
    ]
  })
}

# Only create the bastion host if enabled
resource "aws_instance" "bastion" {
  count = var.enable_bastion ? 1 : 0

  ami           = var.ami_id
  instance_type = "t3.micro"
  subnet_id     = var.public_subnet_id
  key_name      = var.ssh_key_name

  tags = {
    Name = "${var.project}-bastion"
  }
}
```

## Referencing Conditional Resources

When a resource uses `count`, you must reference it with an index, even if count is 0 or 1. This gets tricky with conditional resources:

```hcl
# The bastion might or might not exist
resource "aws_instance" "bastion" {
  count = var.enable_bastion ? 1 : 0
  # ...
}

# Wrong - this fails if count is 0
output "bastion_ip" {
  value = aws_instance.bastion[0].public_ip
}

# Right - handle the case where the resource does not exist
output "bastion_ip" {
  value = var.enable_bastion ? aws_instance.bastion[0].public_ip : null
}

# Alternative - use one() to get the single element or null
output "bastion_ip" {
  value = one(aws_instance.bastion[*].public_ip)
}
```

The `one()` function returns the single element from a list, or `null` if the list is empty. The splat expression `aws_instance.bastion[*].public_ip` collects the attribute from all instances (0 or 1 in this case).

## Using count with Lists

You can iterate over a list using `count` and index into the list:

```hcl
variable "ebs_volumes" {
  type = list(object({
    size = number
    type = string
    az   = string
  }))
  default = [
    { size = 100, type = "gp3", az = "us-east-1a" },
    { size = 200, type = "gp3", az = "us-east-1b" },
    { size = 500, type = "io2", az = "us-east-1a" },
  ]
}

resource "aws_ebs_volume" "data" {
  count = length(var.ebs_volumes)

  size              = var.ebs_volumes[count.index].size
  type              = var.ebs_volumes[count.index].type
  availability_zone = var.ebs_volumes[count.index].az

  tags = {
    Name = "data-vol-${count.index}"
  }
}
```

This works, but be aware of the index-based problem: if you remove the second item from the list, the third item shifts to index 1, and Terraform will want to destroy and recreate it. For collection-based resources, `for_each` is usually a better choice.

## count with Modules

You can use `count` with modules too:

```hcl
module "app" {
  source = "./modules/app"
  count  = var.deploy_app ? 1 : 0

  project     = var.project
  environment = var.environment
  vpc_id      = module.networking.vpc_id
}

# Reference the conditional module's outputs
output "app_url" {
  value = var.deploy_app ? module.app[0].url : null
}
```

## The Index Problem

The biggest drawback of `count` is the index-based addressing. Consider this:

```hcl
variable "users" {
  default = ["alice", "bob", "charlie"]
}

resource "aws_iam_user" "this" {
  count = length(var.users)
  name  = var.users[count.index]
}
```

This creates:
- `aws_iam_user.this[0]` = alice
- `aws_iam_user.this[1]` = bob
- `aws_iam_user.this[2]` = charlie

If you remove "bob" from the list:
- `aws_iam_user.this[0]` = alice (no change)
- `aws_iam_user.this[1]` = charlie (was bob, now charlie - Terraform renames it)
- `aws_iam_user.this[2]` = deleted (Terraform destroys charlie's old resource)

Terraform destroys charlie and recreates them at index 1. This is why `for_each` is preferred for most collection-based resources - it uses stable keys instead of numeric indices.

## When count Is the Right Choice

Use `count` for these scenarios:

```hcl
# 1. Conditional resources (0 or 1)
resource "aws_wafv2_web_acl" "main" {
  count = var.enable_waf ? 1 : 0
  # ...
}

# 2. Multiple identical resources where order does not matter
resource "aws_instance" "worker" {
  count         = var.worker_count
  ami           = var.ami_id
  instance_type = "t3.micro"
  # All workers are interchangeable
}

# 3. Resources with computed count from another resource
resource "aws_eip" "nat" {
  count  = length(aws_subnet.public)
  domain = "vpc"
}
```

## Combining count with Conditional Logic

```hcl
locals {
  # Compute the count based on environment
  instance_count = var.environment == "production" ? 4 : 1

  # Conditionally enable features
  create_monitoring = var.environment != "dev"
  create_backups    = var.environment == "production"
}

resource "aws_instance" "app" {
  count         = local.instance_count
  ami           = var.ami_id
  instance_type = var.instance_type
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = local.create_monitoring ? local.instance_count : 0

  alarm_name = "high-cpu-${count.index}"
  namespace  = "AWS/EC2"
  metric_name = "CPUUtilization"
  dimensions = {
    InstanceId = aws_instance.app[count.index].id
  }
  comparison_operator = "GreaterThanThreshold"
  threshold           = 80
  evaluation_periods  = 2
  period              = 300
  statistic           = "Average"
}
```

## Summary

The `count` meta-argument is straightforward and effective for two main patterns: creating N identical resources and conditionally creating resources with the `condition ? 1 : 0` pattern. Use `count.index` to differentiate instances, the modulo operator to distribute across subnets, and `one()` or conditional expressions to safely reference resources that might not exist. For collection-based resource creation where items might be added or removed, prefer `for_each` to avoid the index-shifting problem.

For more on iterating over resources, see our post on [using for_each with maps](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-for-each-meta-argument-with-maps-in-terraform/view).
