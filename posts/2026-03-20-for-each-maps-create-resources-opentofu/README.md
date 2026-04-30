# How to Use for_each with Maps to Create Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, for_each, Map, Resource, HCL, Infrastructure as Code, DevOps

Description: Learn how to use for_each with maps to create multiple named resource instances in OpenTofu, where each instance is identified by a stable key.

---

`for_each` with maps creates one resource instance per map entry, using the map key as a stable identifier. Unlike `count` which uses integer indices, `for_each` uses meaningful keys - so adding or removing one item doesn't affect others. This guide covers map-based `for_each` patterns.

---

## Basic for_each with a Map

```hcl
variable "s3_buckets" {
  type = map(object({
    versioning = bool
    lifecycle  = bool
  }))
  default = {
    "data-archive" = { versioning = true, lifecycle = true }
    "app-uploads"  = { versioning = true, lifecycle = false }
    "logs"         = { versioning = false, lifecycle = true }
  }
}

resource "aws_s3_bucket" "buckets" {
  for_each = var.s3_buckets   # one bucket per map entry

  bucket = each.key           # map key: "data-archive", "app-uploads", "logs"

  tags = {
    Name        = each.key
    Versioning  = tostring(each.value.versioning)
  }
}

# Access individual buckets by key

output "data_archive_bucket" {
  value = aws_s3_bucket.buckets["data-archive"].id
}

# Access all bucket IDs
output "all_bucket_ids" {
  value = {for k, v in aws_s3_bucket.buckets : k => v.id}
}
```

---

## for_each with Local Map

```hcl
locals {
  environments = {
    development = {
      instance_type  = "t3.micro"
      instance_count = 1
      subnet_id      = var.dev_subnet_id
    }
    staging = {
      instance_type  = "t3.small"
      instance_count = 2
      subnet_id      = var.staging_subnet_id
    }
    production = {
      instance_type  = "m5.large"
      instance_count = 5
      subnet_id      = var.prod_subnet_id
    }
  }
}

resource "aws_launch_template" "app" {
  for_each = local.environments

  name          = "app-${each.key}"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = each.value.instance_type

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "app-${each.key}"
      Environment = each.key
    }
  }
}
```

---

## each.key and each.value

Inside a `for_each` resource block:
- `each.key` - the current map key (e.g., `"production"`)
- `each.value` - the current map value (the object associated with that key)

```hcl
resource "aws_security_group" "services" {
  for_each = {
    web    = { port = 80, description = "HTTP" }
    api    = { port = 8080, description = "API" }
    admin  = { port = 9000, description = "Admin" }
  }

  name        = "${var.prefix}-${each.key}-sg"   # each.key
  description = "Security group for ${each.value.description}"   # each.value

  ingress {
    from_port   = each.value.port   # access nested value
    to_port     = each.value.port
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
}
```

---

## Building Maps Dynamically

```hcl
locals {
  # Build a map from two lists using zipmap
  subnet_map = zipmap(
    var.availability_zones,     # keys: ["us-east-1a", "us-east-1b"]
    var.private_subnet_cidrs    # values: ["10.0.1.0/24", "10.0.2.0/24"]
  )
  # Result: {"us-east-1a" = "10.0.1.0/24", "us-east-1b" = "10.0.2.0/24"}
}

resource "aws_subnet" "private" {
  for_each = local.subnet_map

  vpc_id            = aws_vpc.main.id
  availability_zone = each.key    # "us-east-1a"
  cidr_block        = each.value  # "10.0.1.0/24"

  tags = {
    Name = "private-${each.key}"
  }
}
```

---

## Adding/Removing Map Entries Safely

```hcl
# Adding an entry: only the new resource is created
# Removing an entry: only that resource is destroyed
# Other resources are unaffected - their keys are stable

# Before: 3 buckets
# After: 4 buckets (adding "backups")
variable "s3_buckets" {
  default = {
    "data-archive" = { versioning = true, lifecycle = true }
    "app-uploads"  = { versioning = true, lifecycle = false }
    "logs"         = { versioning = false, lifecycle = true }
    "backups"      = { versioning = true, lifecycle = false }   # new entry
  }
}
# Result: only "backups" bucket is created - others untouched
```

---

## Summary

`for_each` with maps creates stable, named resource instances where each instance is identified by its map key rather than a numeric index. Use `each.key` and `each.value` to access the current iteration's key and value. Adding or removing map entries affects only that specific resource - making map-based `for_each` safer than `count` for collections where items may be added or removed independently.
