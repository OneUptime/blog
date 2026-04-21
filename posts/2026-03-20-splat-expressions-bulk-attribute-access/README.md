# How to Use Splat Expressions for Bulk Attribute Access in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, Splat Expressions, Infrastructure as Code, Best Practice

Description: Learn how to use splat expressions in OpenTofu to efficiently access attributes from lists of resources or objects without writing explicit loops.

## Introduction

Splat expressions are a concise HCL feature that lets you extract a specific attribute from every element in a list of resources or objects. They reduce boilerplate and make your OpenTofu configurations more readable.

## The Legacy Splat Operator (`.*`)

The legacy splat operator works with lists:

```hcl
# Access the id of every instance in a list

output "instance_ids" {
  value = aws_instance.web.*.id
}
```

This is equivalent to:

```hcl
output "instance_ids" {
  value = [for instance in aws_instance.web : instance.id]
}
```

## The Full Splat Operator (`[*]`)

The full splat operator is more expressive and works with lists, sets, and tuples:

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

output "public_ips" {
  value = aws_instance.web[*].public_ip
}

output "private_ips" {
  value = aws_instance.web[*].private_ip
}
```

## Using Splat with for_each Resources

When using `for_each`, use `values()` first then apply splat:

```hcl
resource "aws_iam_user" "team" {
  for_each = toset(["alice", "bob", "carol"])
  name     = each.key
}

output "user_arns" {
  value = values(aws_iam_user.team)[*].arn
}
```

## Nested Splat Expressions

Access nested attributes:

```hcl
output "subnet_ids" {
  value = aws_vpc.main[*].id
}

# Nested attribute access
output "tag_names" {
  value = aws_instance.web[*].tags.Name
}
```

## Using Splat with Input Variables

```hcl
variable "instances" {
  type = list(object({
    name = string
    type = string
  }))
}

locals {
  instance_names = var.instances[*].name
  instance_types = var.instances[*].type
}
```

## Splat vs. For Expressions

| Use Case | Recommended |
|----------|-------------|
| Simple attribute extraction | Splat `[*]` |
| Conditional filtering | `for` with `if` |
| Transforming values | `for` expression |
| Multiple attributes | Either |

## Common Pitfall: Empty and Null Values

Splat expressions over a counted resource with `count = 0` return an empty list. When `[*]` is applied to a null single value, it returns an empty tuple rather than causing an error:

```hcl
# Returns [] if count = 0, or [ip1, ip2, ...] if count > 0
output "ips" {
  value = aws_instance.optional[*].public_ip
}
```

## Conclusion

Splat expressions in OpenTofu provide a clean, readable syntax for bulk attribute access across resource lists. Use `[*]` for most cases and fall back to `for` expressions when you need filtering or transformation.
