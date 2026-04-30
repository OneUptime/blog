# How to Use the formatlist Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Formatlist, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the formatlist function in OpenTofu to apply format strings to each element of a list, producing a new list of formatted strings.

---

`formatlist()` is the list version of `format()`. It applies a format string across one or more list arguments, producing a new list where each element is formatted. Non-list arguments are reused for each element. When multiple list arguments are provided, they are zipped together element by element.

---

## Syntax

```hcl
formatlist(format_string, values...)
```

Where `values` can be a mix of list and non-list arguments. All list arguments must have the same length. Lists are iterated in parallel, while non-list arguments are reused for each element.

---

## Basic Examples

```hcl
variable "names" {
  type    = list(string)
  default = ["alice", "bob", "charlie"]
}

locals {
  # Apply format to each element
  greetings = formatlist("Hello, %s!", var.names)
  # ["Hello, alice!", "Hello, bob!", "Hello, charlie!"]

  # Create IAM ARNs from a list of usernames
  iam_arns = formatlist("arn:aws:iam::123456789012:user/%s", var.names)
  # ["arn:aws:iam::123456789012:user/alice", ...]
}
```

---

## Creating Resource Names from a List

```hcl
variable "services" {
  type    = list(string)
  default = ["api", "worker", "scheduler"]
}

variable "environment" {
  type    = string
  default = "production"
}

locals {
  # Create S3 bucket names for each service
  bucket_names = formatlist("%s-%s-data", var.services, var.environment)
  # ["api-production-data", "worker-production-data", "scheduler-production-data"]
}
```

---

## CIDR Block Generation

```hcl
variable "octet_range" {
  type    = list(number)
  default = [0, 1, 2, 3]
}

locals {
  # Generate CIDR blocks for each subnet
  subnet_cidrs = formatlist("10.0.%d.0/24", var.octet_range)
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

resource "aws_subnet" "app" {
  count      = length(local.subnet_cidrs)
  vpc_id     = aws_vpc.main.id
  cidr_block = local.subnet_cidrs[count.index]
}
```

---

## Building Security Group Descriptions

```hcl
variable "ingress_ports" {
  type    = list(number)
  default = [22, 80, 443, 8080]
}

locals {
  descriptions = formatlist("Allow port %d ingress", var.ingress_ports)
  # ["Allow port 22 ingress", "Allow port 80 ingress", ...]
}
```

---

## Two-List Zipping

When you provide two lists, `formatlist()` uses elements from both in parallel:

```hcl
variable "regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2", "eu-west-1"]
}

variable "account_ids" {
  type    = list(string)
  default = ["111111111111", "222222222222", "333333333333"]
}

locals {
  # Combine two lists into formatted strings
  role_arns = formatlist(
    "arn:aws:iam::%s:role/cross-account-role",
    var.account_ids
  )
  # Note: second arg is just account_ids (one list, one placeholder)

  # With two list args (parallel zip):
  regional_arns = formatlist(
    "arn:aws:iam::%s:role/deploy-role-%s",
    var.account_ids,
    var.regions
  )
  # ["arn:aws:iam::111111111111:role/deploy-role-us-east-1", ...]
}
```

---

## formatlist vs for Expression

```hcl
variable "names" {
  default = ["web", "api", "db"]
}

locals {
  # These are equivalent:
  using_formatlist = formatlist("%s-service", var.names)
  using_for        = [for name in var.names : "${name}-service"]
}
```

For simple formatting, `formatlist()` is more concise. For complex transformations or filtering, use a for expression.

---

## Summary

`formatlist()` applies a format string across one or more list arguments, returning a new list of formatted strings. Non-list arguments are reused for each element, and any list arguments must all be the same length. Use it to generate lists of ARNs, bucket names, CIDR blocks, or any other patterned strings from an input list. When multiple list arguments are provided, elements are paired by index (first element of each list, then second, etc.). For more complex transformations, use a for expression instead.
