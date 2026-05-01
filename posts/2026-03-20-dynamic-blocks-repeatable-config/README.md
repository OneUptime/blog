# How to Use Dynamic Blocks for Repeatable Configuration in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Dynamic Blocks, Infrastructure as Code, HCL, Loop

Description: Learn how to use OpenTofu dynamic blocks to generate repeatable nested configuration blocks from variables and lists, avoiding duplication in your infrastructure code.

---

Dynamic blocks in OpenTofu (and Terraform) allow you to generate multiple nested configuration blocks programmatically from a list or map. Instead of copy-pasting similar blocks, you define the pattern once and let the dynamic block iterate over your data.

---

## The Problem Dynamic Blocks Solve

Without dynamic blocks, adding multiple ingress rules requires repetition:

```hcl
# Without dynamic blocks - repetitive

resource "aws_security_group" "web" {
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
}
```

---

## Basic Dynamic Block Syntax

```hcl
dynamic "BLOCK_TYPE" {
  for_each = COLLECTION
  content {
    # Block attributes using iterator.key / iterator.value
    attribute = BLOCK_TYPE.value.field
  }
}
```

---

## Example 1: Security Group Ingress Rules

```hcl
# variables.tf
variable "ingress_rules" {
  default = [
    { port = 80,   protocol = "tcp", cidr = "0.0.0.0/0" },
    { port = 443,  protocol = "tcp", cidr = "0.0.0.0/0" },
    { port = 8080, protocol = "tcp", cidr = "10.0.0.0/8" },
    { port = 22,   protocol = "tcp", cidr = "10.0.0.0/8" },
  ]
}

# main.tf
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = [ingress.value.cidr]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## Example 2: EBS Volumes on EC2

```hcl
variable "ebs_volumes" {
  default = [
    { device_name = "/dev/xvdb", size = 100, type = "gp3" },
    { device_name = "/dev/xvdc", size = 500, type = "gp3" },
  ]
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  dynamic "ebs_block_device" {
    for_each = var.ebs_volumes
    content {
      device_name = ebs_block_device.value.device_name
      volume_size = ebs_block_device.value.size
      volume_type = ebs_block_device.value.type
      encrypted   = true
    }
  }
}
```

---

## Example 3: Custom Iterator Name

By default, the iterator uses the dynamic block's label. Use `iterator` to rename it:

```hcl
variable "tags_map" {
  default = {
    Environment = "production"
    Team        = "platform"
    CostCenter  = "engineering"
  }
}

resource "aws_autoscaling_group" "app" {
  # ...

  dynamic "tag" {
    for_each = var.tags_map
    iterator = each_tag

    content {
      key                 = each_tag.key
      value               = each_tag.value
      propagate_at_launch = true
    }
  }
}
```

---

## Example 4: Nested Dynamic Blocks

Dynamic blocks can be nested:

```hcl
variable "origin_groups" {
  default = {
    app = {
      failover_status_codes = [403, 404, 500, 502]
      members               = ["primary-app", "failover-app"]
    }
  }
}

resource "aws_cloudfront_distribution" "main" {
  # origin blocks omitted

  dynamic "origin_group" {
    for_each = var.origin_groups
    content {
      origin_id = origin_group.key

      failover_criteria {
        status_codes = origin_group.value.failover_status_codes
      }

      dynamic "member" {
        for_each = origin_group.value.members
        content {
          origin_id = member.value
        }
      }
    }
  }

  # ...
}
```

---

## Example 5: Conditional Dynamic Blocks

Use a conditional to include or exclude a block:

```hcl
variable "enable_lifecycle" {
  default = true
}

resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.bucket

  dynamic "rule" {
    for_each = var.enable_lifecycle ? [1] : []
    content {
      id     = "expire-after-90-days"
      status = "Enabled"

      expiration {
        days = 90
      }
    }
  }
}
```

---

## Practical Tips

```hcl
# Use toset() for unique values when order does not matter
dynamic "ingress" {
  for_each = toset([80, 443, 8080])
  content {
    from_port   = ingress.value
    to_port     = ingress.value
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Use for expressions to filter
dynamic "ingress" {
  for_each = [for rule in var.ingress_rules : rule if rule.enabled]
  content {
    from_port = ingress.value.port
    to_port   = ingress.value.port
    protocol  = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## Best Practices

1. **Use lists when block order matters, and maps when you need stable keys** for identification
2. **Name your iterator** explicitly with `iterator =` when nesting or for clarity
3. **Keep the content block simple** - complex logic belongs in locals or variables
4. **Combine with for_each** on the resource level for multi-resource + multi-block patterns
5. **Use conditional dynamic blocks** (`for_each = condition ? [1] : []`) instead of count hacks

---

## Conclusion

Dynamic blocks eliminate repetition in nested resource configuration. Use them for security group rules, EBS volumes, nested block structures, tags, and any other repeating block pattern. Combined with variables and locals, they make your OpenTofu configurations concise and maintainable.

---

*Manage and monitor your infrastructure deployments with [OneUptime](https://oneuptime.com).*
