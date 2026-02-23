# How to Debug Dynamic Block Output in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Debugging, HCL, Troubleshooting

Description: Practical techniques for debugging dynamic block output in Terraform when things do not work as expected, including plan inspection and console testing.

---

Dynamic blocks are powerful, but when they do not produce the output you expect, debugging them can be frustrating. The generated blocks are not visible in your source code, and errors can be cryptic. This post covers practical techniques for figuring out what went wrong.

## The Challenge of Debugging Dynamic Blocks

Unlike static blocks where you can see exactly what Terraform will create, dynamic blocks are generated at plan time from your data. When something goes wrong, it could be:

- The `for_each` collection is empty when you expected items
- The `for_each` collection has unexpected items
- Attribute references inside `content` point to the wrong thing
- The data shape does not match what you assumed

Let us walk through each debugging approach.

## Technique 1 - Use Output Blocks to Inspect Data

The simplest debugging technique is to add output blocks that show what your `for_each` collection looks like:

```hcl
variable "ingress_rules" {
  type = list(object({
    port     = number
    protocol = string
    cidrs    = list(string)
  }))
}

# Debug output - shows the raw data that for_each will receive
output "debug_ingress_rules" {
  value = var.ingress_rules
}

# Also useful: show the length of the collection
output "debug_ingress_count" {
  value = length(var.ingress_rules)
}

resource "aws_security_group" "main" {
  name   = "debug-example"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidrs
    }
  }
}
```

Run `terraform plan` and check the output values. They show you exactly what data the dynamic block is working with. Remove these debug outputs once you have identified the issue.

## Technique 2 - Terraform Console

The `terraform console` command gives you an interactive REPL where you can test expressions. This is extremely useful for dynamic block debugging:

```bash
# Start the console with your current state and variables
terraform console

# Test the for_each expression directly
> var.ingress_rules
[
  {
    "cidrs" = ["10.0.0.0/8"]
    "port" = 443
    "protocol" = "tcp"
  },
]

# Test individual value access
> var.ingress_rules[0].port
443

# Test a for expression that you might use in for_each
> [for rule in var.ingress_rules : rule if rule.port > 80]
[
  {
    "cidrs" = ["10.0.0.0/8"]
    "port" = 443
    "protocol" = "tcp"
  },
]

# Test conditional for_each expressions
> var.enable_feature ? [1] : []
[1]
```

You can paste expressions directly from your dynamic block into the console to see what they evaluate to.

## Technique 3 - Read the Plan Output Carefully

Run `terraform plan` and look at what blocks are being created. Terraform shows each generated block:

```bash
terraform plan -out=plan.tfplan

# For more detail, show the plan in JSON format
terraform show -json plan.tfplan | jq '.planned_values.root_module.resources'
```

The plan output tells you exactly how many nested blocks were generated and what values they contain. If you see zero blocks where you expected some, the `for_each` collection is empty.

## Technique 4 - Break Down Complex Expressions

When you have a complex expression in `for_each`, break it into locals:

```hcl
# Before - hard to debug
resource "aws_security_group" "complex" {
  name   = "complex"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = {
      for idx, rule in var.rules :
      "${rule.name}-${idx}" => rule
      if rule.enabled && contains(rule.environments, var.environment)
    }
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidrs
    }
  }
}

# After - easier to debug because you can output the intermediate value
locals {
  # Pull the complex expression into a local for inspection
  filtered_rules = {
    for idx, rule in var.rules :
    "${rule.name}-${idx}" => rule
    if rule.enabled && contains(rule.environments, var.environment)
  }
}

output "debug_filtered_rules" {
  value = local.filtered_rules
}

resource "aws_security_group" "complex" {
  name   = "complex"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = local.filtered_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidrs
    }
  }
}
```

Now you can inspect `local.filtered_rules` in the console or through output blocks.

## Technique 5 - Check Iterator Names

A common source of bugs is using the wrong iterator name. By default, the iterator name matches the block label:

```hcl
# The iterator name here is "ingress" (matching the block label)
dynamic "ingress" {
  for_each = var.rules
  content {
    # Correct: using "ingress.value"
    from_port = ingress.value.port

    # WRONG: using "rule.value" - this is undefined
    # from_port = rule.value.port
  }
}

# With a custom iterator, the name changes
dynamic "ingress" {
  for_each = var.rules
  iterator = rule  # Now the iterator is named "rule"
  content {
    # Correct with custom iterator
    from_port = rule.value.port

    # WRONG now: "ingress.value" no longer works
    # from_port = ingress.value.port
  }
}
```

If you get errors about unknown references inside a content block, double-check your iterator name.

## Technique 6 - Validate Data Types

Type mismatches cause subtle issues. A dynamic block's `for_each` expects either a list, a set, or a map. If you accidentally pass a string or a number, you get an error:

```hcl
# This will fail - for_each needs a collection, not a string
dynamic "tag" {
  for_each = "not-a-collection"  # Error!
  content {
    key   = tag.key
    value = tag.value
  }
}

# Fix: wrap single values in a list
dynamic "tag" {
  for_each = var.enable_tag ? [var.tag_value] : []
  content {
    key   = "Name"
    value = tag.value
  }
}
```

Use `type()` in the terraform console to check what type a value has:

```bash
> type(var.rules)
list(object({
  port = number
  protocol = string
}))
```

## Technique 7 - Use Terraform Validate

Before running a plan, use `terraform validate` to catch syntax and type errors:

```bash
# Quick validation without connecting to providers
terraform validate

# If you need more detail about warnings
terraform validate -json | jq '.'
```

This catches issues like referencing undefined variables, incorrect block structure, and type mismatches.

## Technique 8 - Enable Terraform Logging

For deeper debugging, enable Terraform's built-in logging:

```bash
# Set log level to TRACE for maximum detail
export TF_LOG=TRACE

# Run your plan - output will include internal processing details
terraform plan 2>debug.log

# Search the log for dynamic block processing
grep -i "dynamic" debug.log
```

The TRACE level is verbose, so pipe stderr to a file and search through it.

## Common Error Messages and Their Causes

Here are error messages you might see and what they usually mean:

- "Invalid for_each argument" - The value passed to `for_each` is not a map, list, or set. Check the type of your expression.
- "each.key/each.value in non-each context" - You are using `each.key` instead of the dynamic block's iterator name. Use `blockname.key` or your custom iterator name.
- "Unsupported block type" - The nested block name in your dynamic block does not match what the resource expects. Check the provider documentation.
- "Missing required argument" - A required attribute inside your content block is not set, possibly because the iterator value is null.

## Summary

Debugging dynamic blocks comes down to understanding what data flows into them and what they produce. Output blocks, terraform console, locals decomposition, and careful reading of plan output are your main tools. When in doubt, break complex expressions into smaller pieces and inspect each one. For related patterns, check out our post on [common dynamic block mistakes](https://oneuptime.com/blog/post/2026-02-23-how-to-avoid-common-dynamic-block-mistakes-in-terraform/view).
