# How to Use the concat Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the concat function in OpenTofu to merge multiple lists into a single list for combining security groups, subnets, and other collections.

## Introduction

The `concat` function in OpenTofu combines two or more lists into a single list. It is one of the most frequently used collection functions for merging subnet IDs, security group IDs, permission sets, and any other list-valued resources that need to be combined.

## Syntax

```hcl
concat(list1, list2, ...)
```

- Accepts two or more list arguments
- Returns a single list containing all elements in order
- All lists must contain the same element type

## Basic Examples

```hcl
output "basic_concat" {
  value = concat(["a", "b"], ["c", "d"])  # Returns ["a", "b", "c", "d"]
}

output "three_lists" {
  value = concat([1, 2], [3, 4], [5, 6])  # Returns [1, 2, 3, 4, 5, 6]
}

output "empty_list" {
  value = concat(["a"], [], ["b"])  # Returns ["a", "b"]
}
```

## Practical Use Cases

### Combining Security Group IDs

```hcl
variable "default_security_groups" {
  type    = list(string)
  default = ["sg-00000001", "sg-00000002"]
}

variable "additional_security_groups" {
  type    = list(string)
  default = ["sg-00000003"]
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  # Combine base and additional security groups (use vpc_security_group_ids for VPC instances)
  vpc_security_group_ids = concat(var.default_security_groups, var.additional_security_groups)

  tags = {
    Name = "app-server"
  }
}
```

### Merging Subnet Lists for Multi-AZ Deployment

```hcl
variable "public_subnet_ids" {
  type    = list(string)
  default = ["subnet-pub-1", "subnet-pub-2"]
}

variable "private_subnet_ids" {
  type    = list(string)
  default = ["subnet-priv-1", "subnet-priv-2"]
}

resource "aws_lb" "internal" {
  name     = "app-lb"
  internal = false
  subnets  = var.public_subnet_ids

  tags = {
    Name = "app-lb"
  }
}

resource "aws_autoscaling_group" "app" {
  # Use all subnets across AZs
  vpc_zone_identifier = concat(var.public_subnet_ids, var.private_subnet_ids)
  min_size            = 2
  max_size            = 10
  desired_capacity    = 4

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

### Building IAM Policy Resource Lists

```hcl
variable "read_only_arns" {
  type    = list(string)
  default = ["arn:aws:s3:::prod-data/*"]
}

variable "write_arns" {
  type    = list(string)
  default = ["arn:aws:s3:::prod-uploads/*"]
}

locals {
  all_s3_arns = concat(local.bucket_arns, var.read_only_arns, var.write_arns)
}

resource "aws_iam_policy" "s3" {
  name = "s3-combined-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = local.all_s3_arns
    }]
  })
}
```

### Combining Dynamic and Static Lists

```hcl
variable "environment" {
  type    = string
  default = "prod"
}

locals {
  base_tags = ["managed-by-opentofu", "project-myapp"]
  env_tags  = var.environment == "prod" ? ["production", "high-availability"] : ["non-production"]
  all_tags  = concat(local.base_tags, local.env_tags)
}

output "resource_tags" {
  value = local.all_tags
  # ["managed-by-opentofu", "project-myapp", "production", "high-availability"]
}
```

### Merging for_each-Created Resource Attributes

```hcl
resource "aws_subnet" "public" {
  for_each          = toset(["a", "b", "c"])
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${index(["a", "b", "c"], each.key)}.0/24"
  availability_zone = "us-east-1${each.key}"

  tags = {
    Name = "public-${each.key}"
  }
}

resource "aws_subnet" "private" {
  for_each          = toset(["a", "b", "c"])
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${index(["a", "b", "c"], each.key) + 10}.0/24"
  availability_zone = "us-east-1${each.key}"

  tags = {
    Name = "private-${each.key}"
  }
}

locals {
  # Combine subnet IDs from both for_each-created resource sets into a single list
  all_subnet_ids = concat(
    values(aws_subnet.public)[*].id,
    values(aws_subnet.private)[*].id,
  )
}
```

## Step-by-Step Usage

1. Identify the lists you want to merge.
2. Call `concat(list1, list2, ...)`.
3. Use the result in resource arguments or other list operations.
4. Test in `tofu console`:

```bash
tofu console

> concat(["a", "b"], ["c"])
["a", "b", "c"]
> length(concat([1, 2], [3, 4], [5]))
5
```

## concat vs flatten

| Function | Use Case |
|----------|----------|
| `concat` | Merges top-level lists (does not flatten nested lists) |
| `flatten` | Recursively flattens nested lists into a single flat list |

## Conclusion

The `concat` function is an essential building block in OpenTofu for combining lists from different sources. Whether you are merging security groups, subnet IDs, policy ARNs, or any other list-valued data, `concat` provides a clean, readable way to combine multiple lists into one. Use it whenever you need to build composite lists from variable, static, and computed inputs.
