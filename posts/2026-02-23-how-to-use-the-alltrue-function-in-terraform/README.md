# How to Use the alltrue Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Collection Functions

Description: Learn how to use the alltrue function in Terraform to check if every element in a list evaluates to true, with practical examples and real-world use cases.

---

Terraform provides a rich set of built-in functions that make it easier to manipulate data within your configuration files. One such function is `alltrue`, which checks whether all elements in a given collection evaluate to `true`. This function is particularly useful for validation blocks, conditional logic, and ensuring that a set of conditions are all met before proceeding with resource creation.

In this post, we will explore how the `alltrue` function works, walk through its syntax, and look at practical examples that show where it shines in real Terraform projects.

## What is the alltrue Function?

The `alltrue` function takes a single argument - a list of boolean values - and returns `true` only if every element in that list is `true`. If even one element is `false`, the function returns `false`.

The basic syntax looks like this:

```hcl
# alltrue returns true only when ALL elements are true
alltrue(list)
```

The function accepts a list of values that can be converted to booleans. Strings like `"true"` are coerced to `true`, and `"false"` becomes `false`.

## Basic Usage in Terraform Console

You can experiment with `alltrue` directly in the Terraform console before incorporating it into your configurations.

```hcl
# All elements are true, so the result is true
> alltrue([true, true, true])
true

# One element is false, so the result is false
> alltrue([true, false, true])
false

# An empty list returns true (vacuous truth)
> alltrue([])
true

# String values are coerced to booleans
> alltrue(["true", "true"])
true
```

Notice that an empty list returns `true`. This follows the mathematical concept of vacuous truth - if there are no elements to be false, then "all elements are true" holds.

## Using alltrue with Variable Validation

One of the most common use cases for `alltrue` is inside variable validation blocks. Suppose you have a variable that accepts a list of port numbers, and you want to make sure every port falls within a valid range.

```hcl
variable "allowed_ports" {
  type        = list(number)
  description = "List of ports to allow in the security group"

  # Validate that every port is within the valid range
  validation {
    condition = alltrue([
      for port in var.allowed_ports : port >= 1 && port <= 65535
    ])
    error_message = "All ports must be between 1 and 65535."
  }
}
```

In this example, the `for` expression generates a list of booleans - one for each port. The `alltrue` function then checks that every single one of those booleans is `true`. If someone passes in a port like `70000`, the validation fails with a clear error message.

## Combining alltrue with Complex Conditions

You can combine `alltrue` with more complex expressions to validate multiple properties of your input data. Consider a scenario where you are defining a list of S3 bucket configurations and you need to ensure each one follows your naming conventions and has encryption enabled.

```hcl
variable "bucket_configs" {
  type = list(object({
    name       = string
    encrypted  = bool
    versioned  = bool
  }))

  # Ensure all buckets are encrypted and follow naming rules
  validation {
    condition = alltrue([
      for bucket in var.bucket_configs :
      bucket.encrypted == true &&
      can(regex("^myorg-", bucket.name))
    ])
    error_message = "All buckets must be encrypted and start with 'myorg-' prefix."
  }
}
```

Here, the `alltrue` function verifies two conditions simultaneously for every bucket configuration in the list. Each bucket must be encrypted and its name must start with `myorg-`.

## Using alltrue in Local Values

Beyond validation, `alltrue` works well in local values for driving conditional logic elsewhere in your configuration.

```hcl
locals {
  # Check if all instances are in a healthy state
  instance_health_checks = [
    aws_instance.web[0].instance_state == "running",
    aws_instance.web[1].instance_state == "running",
    aws_instance.web[2].instance_state == "running",
  ]

  all_instances_healthy = alltrue(local.instance_health_checks)
}

# Only create the load balancer attachment if all instances are healthy
resource "aws_lb_target_group_attachment" "web" {
  count = local.all_instances_healthy ? 3 : 0

  target_group_arn = aws_lb_target_group.web.arn
  target_id        = aws_instance.web[count.index].id
  port             = 80
}
```

This pattern lets you gate resource creation on multiple conditions being satisfied at once.

## alltrue with Dynamic Data Sources

You can also pair `alltrue` with data sources to make decisions based on the current state of your infrastructure.

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Check that we have at least the required AZs and they all match our region
  required_azs = ["us-east-1a", "us-east-1b", "us-east-1c"]

  azs_available = alltrue([
    for az in local.required_azs :
    contains(data.aws_availability_zones.available.names, az)
  ])
}

# Conditionally deploy multi-AZ resources
resource "aws_subnet" "multi_az" {
  count = local.azs_available ? length(local.required_azs) : 0

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = local.required_azs[count.index]
}
```

## Difference Between alltrue and anytrue

It helps to understand how `alltrue` compares to its sibling function `anytrue`. While `alltrue` requires every element to be `true`, `anytrue` returns `true` if at least one element is `true`.

```hcl
# alltrue needs ALL elements to be true
> alltrue([true, true, false])
false

# anytrue needs at least ONE element to be true
> anytrue([true, true, false])
true
```

Use `alltrue` when you need strict compliance across all items. Use `anytrue` when you just need at least one item to meet a condition. You can read more about `anytrue` in our post on [How to Use the anytrue Function in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-anytrue-function-in-terraform/view).

## Error Handling and Edge Cases

There are a few things to keep in mind when working with `alltrue`:

- **Empty lists return true**: As shown earlier, `alltrue([])` returns `true`. If this behavior is not desirable in your case, add an additional check for list length.
- **Type coercion**: Non-boolean values will be coerced. The string `"true"` becomes `true`, and `"false"` becomes `false`. Other strings will cause an error.
- **Null values**: Passing `null` in the list will cause the function to fail. Make sure your data is clean before passing it in.

```hcl
# Guard against empty lists if needed
variable "required_tags" {
  type = list(string)

  validation {
    condition = length(var.required_tags) > 0 && alltrue([
      for tag in var.required_tags : length(tag) > 0
    ])
    error_message = "Must provide at least one non-empty tag."
  }
}
```

## Real-World Scenario: Multi-Region Deployment Validation

Here is a more complete real-world example. Suppose you are building a module that deploys resources across multiple regions, and you need to validate that every region configuration has the required fields populated.

```hcl
variable "region_configs" {
  type = list(object({
    region     = string
    vpc_cidr   = string
    enable_nat = bool
  }))

  # Validate all region configs have valid CIDR blocks
  validation {
    condition = alltrue([
      for config in var.region_configs :
      can(cidrhost(config.vpc_cidr, 0))
    ])
    error_message = "All region configurations must have valid VPC CIDR blocks."
  }
}
```

This ensures that before Terraform even starts planning, every CIDR block in your region configurations is syntactically valid.

## Summary

The `alltrue` function is a straightforward but powerful tool in Terraform. It is most useful for validation blocks where you need to ensure that every element in a collection meets a specific condition. Combined with `for` expressions, it gives you a clean and readable way to enforce rules across lists of complex objects.

Key takeaways:

- `alltrue` returns `true` only when every element in the list is `true`
- Empty lists return `true` by default
- It pairs naturally with `for` expressions for validation
- Use it in variable validation blocks, local values, and conditional resource creation
- Always handle edge cases like empty lists and null values

Start using `alltrue` in your Terraform modules to write cleaner, more robust input validation and conditional logic.
