# How to Use the sort Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Collections

Description: Learn how to use the sort function in Terraform to order lists of strings lexicographically for consistent and predictable infrastructure configurations.

---

Ordering matters more than you might think in infrastructure code. When Terraform processes a list of values, the order can affect resource creation, plan diffs, and even whether your configuration produces unnecessary changes on every apply. The `sort` function helps you bring order to your lists and keep things predictable.

## What is the sort Function?

The `sort` function takes a list of strings and returns a new list with the elements sorted in lexicographic (alphabetical) order.

```hcl
# Basic sort - alphabetical ordering
> sort(["banana", "apple", "cherry"])
[
  "apple",
  "banana",
  "cherry",
]
```

The syntax is simple:

```hcl
sort(list_of_strings)
```

One very important thing to note: `sort` only works with lists of strings. It does not work directly with numbers, booleans, or complex types.

## How Lexicographic Sorting Works

Since `sort` uses lexicographic ordering (not numerical ordering), the results can be surprising when you sort strings that contain numbers:

```hcl
# Lexicographic sorting treats numbers as strings
> sort(["10", "2", "1", "20", "3"])
[
  "1",
  "10",
  "2",
  "20",
  "3",
]
```

Notice that `"10"` comes before `"2"` because the character `"1"` comes before `"2"` in the ASCII table. If you need numerical sorting, you will need to pad your numbers or use a different approach.

```hcl
# Zero-padded strings sort correctly
> sort(["01", "10", "02", "20", "03"])
[
  "01",
  "02",
  "03",
  "10",
  "20",
]
```

## Practical Example: Consistent Security Group Rules

One of the biggest benefits of sorting is producing consistent Terraform plans. Without sorting, a list that comes from a data source or variable might appear in a different order each time, causing Terraform to show unnecessary changes.

```hcl
variable "allowed_cidrs" {
  type = list(string)
  default = [
    "172.16.0.0/16",
    "10.0.0.0/8",
    "192.168.0.0/16"
  ]
}

# Sort the CIDR blocks to ensure consistent ordering
resource "aws_security_group" "main" {
  name        = "main-sg"
  description = "Main security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = sort(var.allowed_cidrs)
    # Always produces: ["10.0.0.0/8", "172.16.0.0/16", "192.168.0.0/16"]
  }
}
```

By sorting the CIDR blocks, the order is always deterministic regardless of how the variable value is provided.

## Sorting Tags and Labels

When you work with tags or labels across multiple resources, sorting them ensures consistency:

```hcl
variable "environment_tags" {
  type    = list(string)
  default = ["production", "critical", "monitored", "backup-enabled"]
}

locals {
  # Sorted tags for consistent output
  sorted_tags = sort(var.environment_tags)
  # Result: ["backup-enabled", "critical", "monitored", "production"]

  # Join sorted tags into a comma-separated string
  tag_string = join(", ", local.sorted_tags)
  # Result: "backup-enabled, critical, monitored, production"
}
```

## Using sort with Other Functions

The `sort` function becomes more powerful when combined with other Terraform functions.

### sort with distinct

Remove duplicates and sort in one step:

```hcl
locals {
  raw_regions = ["us-east-1", "eu-west-1", "us-east-1", "ap-southeast-1", "eu-west-1"]

  # Remove duplicates and sort
  unique_sorted_regions = sort(distinct(local.raw_regions))
  # Result: ["ap-southeast-1", "eu-west-1", "us-east-1"]
}
```

### sort with concat

Merge lists from different sources and sort them:

```hcl
variable "team_a_servers" {
  default = ["web-03", "web-01"]
}

variable "team_b_servers" {
  default = ["web-04", "web-02"]
}

locals {
  all_servers = sort(concat(var.team_a_servers, var.team_b_servers))
  # Result: ["web-01", "web-02", "web-03", "web-04"]
}
```

### sort with keys

Sort the keys of a map to iterate over them in a predictable order:

```hcl
variable "instance_types" {
  type = map(string)
  default = {
    production  = "m5.xlarge"
    staging     = "t3.large"
    development = "t3.medium"
  }
}

locals {
  sorted_env_names = sort(keys(var.instance_types))
  # Result: ["development", "production", "staging"]
}

# Create instances in alphabetical order of environment name
resource "aws_instance" "env" {
  count         = length(local.sorted_env_names)
  ami           = var.ami_id
  instance_type = var.instance_types[local.sorted_env_names[count.index]]

  tags = {
    Environment = local.sorted_env_names[count.index]
  }
}
```

## Preventing Plan Drift with sort

One of the most practical uses of `sort` is preventing unnecessary plan changes. Consider a scenario where subnets are returned from an API in random order:

```hcl
data "aws_subnets" "private" {
  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

# Without sort, the order might change between plans
# causing Terraform to want to recreate resources
resource "aws_db_subnet_group" "main" {
  name       = "main"
  subnet_ids = sort(data.aws_subnets.private.ids)
}
```

Without the `sort`, you might see a plan diff like this every time you run `terraform plan`, even though nothing actually changed. Sorting fixes that.

## Sorting and count-based Resources

When using `count` to create multiple resources, the order of your list directly affects which resource gets which value. Sorting makes this predictable:

```hcl
variable "dns_names" {
  type    = list(string)
  default = ["api.example.com", "www.example.com", "admin.example.com"]
}

resource "aws_acm_certificate" "cert" {
  domain_name               = sort(var.dns_names)[0]
  subject_alternative_names = slice(sort(var.dns_names), 1, length(var.dns_names))
  validation_method         = "DNS"
}
# Primary domain will always be "admin.example.com" (alphabetically first)
```

## Sorting Number Strings Correctly

If you need to sort number strings in numerical order, you can pad them first:

```hcl
locals {
  port_strings = ["8080", "443", "80", "22", "3306"]

  # Pad to 5 digits for correct numerical sorting
  padded = [for p in local.port_strings : format("%05s", p)]
  # ["08080", "00443", "00080", "00022", "03306"]

  sorted_padded = sort(local.padded)
  # ["00022", "00080", "00443", "03306", "08080"]

  # Strip the padding back off
  sorted_ports = [for p in local.sorted_padded : trimprefix(p, "0")]
  # Note: This simplified trimming may need adjustment for your use case
}
```

Alternatively, you can convert to numbers, sort with a workaround, and convert back - but for most infrastructure use cases, string sorting is sufficient.

## Case Sensitivity

The `sort` function is case-sensitive. Uppercase letters sort before lowercase letters:

```hcl
> sort(["banana", "Apple", "cherry", "apricot"])
[
  "Apple",
  "apricot",
  "banana",
  "cherry",
]
```

If you need case-insensitive sorting, you can use `lower` in combination with a `for` expression, though this gets complex. In most Terraform configurations, you will be sorting values that are already consistently cased.

## Empty Lists and Edge Cases

```hcl
# Sorting an empty list returns an empty list
> sort([])
[]

# Single-element list returns itself
> sort(["only-one"])
[
  "only-one",
]

# Duplicate values are preserved (sort does not deduplicate)
> sort(["a", "b", "a"])
[
  "a",
  "a",
  "b",
]
```

## Summary

The `sort` function is one of those small utilities that makes a big difference in production Terraform code. It keeps your plans stable, your outputs predictable, and your configurations consistent. Just remember that it operates on strings using lexicographic ordering, so number strings may not sort the way you expect without padding. For more on working with lists in Terraform, check out the [slice function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-slice-function-in-terraform/view) and [flatten function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-flatten-for-nested-data-structures-in-terraform/view).
