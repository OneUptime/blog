# How to Use the concat Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the concat function in Terraform to combine multiple lists into a single list, with practical examples for merging configurations and resources.

---

Combining lists is one of the most frequent operations in Terraform configurations. Whether you are merging CIDR blocks from multiple sources, combining resource lists, or building up configurations from modular pieces, the `concat` function is your go-to tool. It takes two or more lists and returns a single flat list containing all elements.

This post covers the syntax, behavior, and practical applications of the `concat` function in Terraform.

## What is the concat Function?

The `concat` function takes two or more lists as arguments and returns a single list that contains all elements from each input list, in order.

```hcl
# Combines multiple lists into one
concat(list1, list2, ...)
```

All input lists must contain elements of the same type, or types that Terraform can unify.

## Basic Usage in Terraform Console

```hcl
# Combine two lists
> concat(["a", "b"], ["c", "d"])
["a", "b", "c", "d"]

# Combine three lists
> concat(["a"], ["b"], ["c"])
["a", "b", "c"]

# Empty lists are handled gracefully
> concat(["a", "b"], [])
["a", "b"]

# Duplicate elements are preserved
> concat(["a", "b"], ["b", "c"])
["a", "b", "b", "c"]

# Works with numbers
> concat([1, 2], [3, 4])
[1, 2, 3, 4]

# Concatenating empty lists
> concat([], [])
[]
```

Unlike `merge` (which works with maps), `concat` does not deduplicate. If you need unique values, pipe the result through `distinct`.

## Merging CIDR Block Lists

A very common use case is combining CIDR blocks from different sources into a single security group or firewall rule.

```hcl
variable "office_cidrs" {
  type    = list(string)
  default = ["203.0.113.0/24", "198.51.100.0/24"]
}

variable "vpn_cidrs" {
  type    = list(string)
  default = ["10.8.0.0/16"]
}

variable "partner_cidrs" {
  type    = list(string)
  default = ["192.0.2.0/24"]
}

locals {
  # Combine all allowed CIDRs into a single list
  all_allowed_cidrs = concat(
    var.office_cidrs,
    var.vpn_cidrs,
    var.partner_cidrs,
  )
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = local.all_allowed_cidrs
  }
}
```

## Combining Module Outputs

When modules produce lists of resources, `concat` is the natural way to combine them.

```hcl
module "public_subnets" {
  source = "./modules/subnets"
  type   = "public"
  vpc_id = aws_vpc.main.id
  cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
}

module "private_subnets" {
  source = "./modules/subnets"
  type   = "private"
  vpc_id = aws_vpc.main.id
  cidrs  = ["10.0.10.0/24", "10.0.11.0/24"]
}

locals {
  # Combine subnet IDs from both modules
  all_subnet_ids = concat(
    module.public_subnets.subnet_ids,
    module.private_subnets.subnet_ids,
  )
}

resource "aws_db_subnet_group" "main" {
  name       = "db-subnet-group"
  subnet_ids = local.all_subnet_ids
}
```

## Conditional List Concatenation

You can use `concat` with conditional expressions to optionally include groups of elements.

```hcl
variable "enable_monitoring" {
  type    = bool
  default = true
}

variable "enable_debug_ports" {
  type    = bool
  default = false
}

locals {
  base_ports       = [80, 443]
  monitoring_ports = [9090, 9100, 3000]
  debug_ports      = [8080, 5005, 9229]

  # Build the final port list based on feature flags
  open_ports = concat(
    local.base_ports,
    var.enable_monitoring ? local.monitoring_ports : [],
    var.enable_debug_ports ? local.debug_ports : [],
  )
}

resource "aws_security_group_rule" "ingress" {
  count = length(local.open_ports)

  type              = "ingress"
  from_port         = local.open_ports[count.index]
  to_port           = local.open_ports[count.index]
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = aws_security_group.app.id
}
```

The empty list `[]` in the conditional expressions acts as a no-op when concatenated, keeping the logic clean.

## Building IAM Policy Documents

IAM policies frequently need to combine permission lists from various sources.

```hcl
variable "extra_s3_arns" {
  type    = list(string)
  default = []
}

locals {
  base_s3_arns = [
    aws_s3_bucket.logs.arn,
    "${aws_s3_bucket.logs.arn}/*",
    aws_s3_bucket.artifacts.arn,
    "${aws_s3_bucket.artifacts.arn}/*",
  ]

  # Combine base and extra S3 ARNs
  all_s3_arns = concat(local.base_s3_arns, var.extra_s3_arns)
}

data "aws_iam_policy_document" "app" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket",
    ]
    resources = local.all_s3_arns
  }
}
```

## concat vs flatten

Both `concat` and `flatten` can produce a single list from nested structures, but they serve different purposes.

```hcl
# concat: joins lists side by side
> concat(["a", "b"], ["c", "d"])
["a", "b", "c", "d"]

# flatten: recursively flattens nested lists
> flatten([["a", "b"], ["c", "d"]])
["a", "b", "c", "d"]

# The difference shows with nested structures
> concat([["a", "b"]], [["c", "d"]])
[["a", "b"], ["c", "d"]]

> flatten([["a", "b"], ["c", "d"]])
["a", "b", "c", "d"]
```

Use `concat` when you have separate list variables to join. Use `flatten` when you have a list of lists (often from a `for` expression) that needs to become a single flat list. For more details, check out [How to Use the flatten Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-flatten-function-in-terraform/view).

## Combining Tags Lists for Autoscaling Groups

Autoscaling groups in AWS use a list format for tags. `concat` is perfect for merging base tags with environment-specific tags.

```hcl
locals {
  base_tags = [
    {
      key                 = "ManagedBy"
      value               = "terraform"
      propagate_at_launch = true
    },
    {
      key                 = "Project"
      value               = "webapp"
      propagate_at_launch = true
    },
  ]

  env_tags = [
    {
      key                 = "Environment"
      value               = var.environment
      propagate_at_launch = true
    },
  ]

  monitoring_tags = var.enable_monitoring ? [
    {
      key                 = "MonitoringEnabled"
      value               = "true"
      propagate_at_launch = true
    },
  ] : []

  # Combine all tag lists
  all_asg_tags = concat(local.base_tags, local.env_tags, local.monitoring_tags)
}
```

## Working with Dynamic Blocks

The `concat` function integrates naturally with dynamic blocks for building flexible resource configurations.

```hcl
variable "additional_ebs_volumes" {
  type = list(object({
    device_name = string
    volume_size = number
    volume_type = string
  }))
  default = []
}

locals {
  # Root volume is always present
  root_volume = [{
    device_name = "/dev/sda1"
    volume_size = 50
    volume_type = "gp3"
  }]

  # Combine root with any additional volumes
  all_volumes = concat(local.root_volume, var.additional_ebs_volumes)
}

resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"

  dynamic "ebs_block_device" {
    for_each = local.all_volumes
    content {
      device_name = ebs_block_device.value.device_name
      volume_size = ebs_block_device.value.volume_size
      volume_type = ebs_block_device.value.volume_type
    }
  }
}
```

## Deduplication After concat

Since `concat` preserves duplicates, you may need to run `distinct` afterward.

```hcl
locals {
  team_a_regions = ["us-east-1", "us-west-2", "eu-west-1"]
  team_b_regions = ["us-west-2", "eu-west-1", "ap-southeast-1"]

  # Combine and deduplicate
  all_regions = distinct(concat(local.team_a_regions, local.team_b_regions))
  # Result: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
}
```

## Summary

The `concat` function is fundamental to Terraform list manipulation. It provides a clean, readable way to combine lists from multiple sources into a single unified list.

Key takeaways:

- `concat` joins two or more lists into one, preserving order and duplicates
- All lists must contain elements of compatible types
- Empty lists are valid inputs and act as no-ops
- Use `distinct` afterward if you need deduplication
- Pairs well with conditional expressions using `[]` as a conditional no-op
- Choose `concat` for joining separate list variables; choose `flatten` for nested list structures

Every Terraform project of meaningful size will use `concat`. Master it early and it will serve you well.
