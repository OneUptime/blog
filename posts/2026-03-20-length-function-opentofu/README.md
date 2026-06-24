# How to Use the length Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Length, Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the length function in OpenTofu to count the number of elements in a list, map, or set, or the number of characters in a string.

---

`length()` returns the number of elements in a collection or structural value (such as a list, map, set, tuple, or object) or the number of characters in a string. For strings, a "character" is a Unicode grapheme cluster. It's one of the most frequently used functions in OpenTofu.

---

## Syntax

```hcl
length(value)
```

---

## Counting List Elements

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

locals {
  az_count = length(var.availability_zones)   # 3
}

resource "aws_subnet" "app" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = var.availability_zones[count.index]
}
```

---

## Counting Map Entries

```hcl
variable "services" {
  type = map(object({
    port = number
  }))
  default = {
    web    = { port = 80 }
    api    = { port = 8080 }
    admin  = { port = 9090 }
  }
}

output "service_count" {
  value = length(var.services)   # 3
}
```

---

## String Length

```hcl
variable "bucket_name" {
  type = string

  validation {
    # S3 bucket names must be between 3 and 63 characters
    condition     = length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63
    error_message = "bucket_name must be between 3 and 63 characters."
  }
}
```

---

## Conditional Based on Collection Size

```hcl
variable "extra_policies" {
  type    = list(string)
  default = []
}

locals {
  # Only attach policies if the list is non-empty
  has_extra_policies = length(var.extra_policies) > 0
}

resource "aws_iam_role_policy_attachment" "extra" {
  count = length(var.extra_policies)

  role       = aws_iam_role.app.name
  policy_arn = var.extra_policies[count.index]
}
```

---

## Enforcing Minimum List Size

```hcl
variable "subnet_ids" {
  type = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for high availability."
  }
}
```

---

## Using length in Loops

```hcl
variable "names" {
  type    = list(string)
  default = ["web", "api", "db"]
}

locals {
  # Create numbered names: web-1, api-2, db-3
  numbered = [
    for i in range(length(var.names)) :
    "${var.names[i]}-${i + 1}"
  ]
  # ["web-1", "api-2", "db-3"]
}
```

---

## length on Sets

```hcl
variable "allowed_ips" {
  type    = set(string)
  default = toset(["10.0.0.1", "10.0.0.2", "10.0.0.3"])
}

output "allowed_ip_count" {
  value = length(var.allowed_ips)   # 3
}
```

---

## Summary

`length()` works on lists, maps, sets, tuples, objects, and strings. For collections and structural values, it returns the number of elements or attributes. For strings, it returns the number of characters (Unicode grapheme clusters). Use it to dynamically set `count` values, enforce collection size constraints in variable validation blocks, check if a list is empty (`length(list) == 0`), and iterate with index-based access using `range(length(list))`.
