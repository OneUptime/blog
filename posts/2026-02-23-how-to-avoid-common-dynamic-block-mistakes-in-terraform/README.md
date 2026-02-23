# How to Avoid Common Dynamic Block Mistakes in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Best Practices, HCL, Troubleshooting, Infrastructure as Code

Description: Identify and avoid the most common mistakes when using dynamic blocks in Terraform, with practical examples showing the wrong way and the right way.

---

Dynamic blocks are one of Terraform's more powerful features, but they are also a common source of errors. After working with them extensively, I have seen the same mistakes come up repeatedly. This post catalogues the most common ones and shows you how to avoid them.

## Mistake 1 - Forgetting the content Block

The `content` block is required inside every dynamic block. Putting attributes directly in the dynamic block is a syntax error:

```hcl
# WRONG - attributes directly in the dynamic block
dynamic "ingress" {
  for_each = var.rules
  from_port   = ingress.value.port  # This will not work
  to_port     = ingress.value.port
  protocol    = "tcp"
}

# CORRECT - attributes inside the content block
dynamic "ingress" {
  for_each = var.rules
  content {
    from_port   = ingress.value.port
    to_port     = ingress.value.port
    protocol    = "tcp"
    cidr_blocks = ingress.value.cidrs
  }
}
```

Terraform will give you a clear error for this, but it is easy to forget when you are typing quickly.

## Mistake 2 - Using each Instead of the Block Iterator

When a resource uses `for_each`, the current item is accessed through `each.key` and `each.value`. But inside a dynamic block, you use the block label (or custom iterator name):

```hcl
resource "aws_security_group" "main" {
  for_each = var.security_groups
  name     = each.key  # Correct - resource-level for_each
  vpc_id   = each.value.vpc_id

  dynamic "ingress" {
    for_each = each.value.rules  # Reference to resource-level each is fine here
    content {
      # WRONG - "each" refers to the resource for_each, not the dynamic block
      # from_port = each.value.port

      # CORRECT - "ingress" is the dynamic block iterator
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidrs
    }
  }
}
```

The confusing part is that `each.value` in the `for_each = each.value.rules` line refers to the resource-level each, which is correct. But inside `content`, you need the dynamic block iterator.

## Mistake 3 - Wrong Data Type for for_each

The `for_each` argument in a dynamic block accepts a list, set, or map. Passing a string, number, or bool causes an error:

```hcl
# WRONG - for_each receives a string
variable "cidr" {
  type    = string
  default = "10.0.0.0/8"
}

dynamic "ingress" {
  for_each = var.cidr  # Error: a string is not iterable
  content {
    cidr_blocks = [ingress.value]
  }
}

# CORRECT - wrap in a list
dynamic "ingress" {
  for_each = [var.cidr]  # Now it is a list with one element
  content {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [ingress.value]
  }
}
```

## Mistake 4 - Mismatched Block Names

The label in the dynamic block must match the nested block name that the resource expects:

```hcl
# WRONG - "inbound_rule" is not a valid nested block for aws_security_group
dynamic "inbound_rule" {
  for_each = var.rules
  content {
    from_port = inbound_rule.value.port
  }
}

# CORRECT - the nested block name is "ingress"
dynamic "ingress" {
  for_each = var.rules
  content {
    from_port   = ingress.value.port
    to_port     = ingress.value.port
    protocol    = ingress.value.protocol
    cidr_blocks = ingress.value.cidrs
  }
}
```

Check the provider documentation for the exact nested block names.

## Mistake 5 - Creating Duplicate Keys in Map-Based for_each

When using a map for `for_each`, keys must be unique. A common mistake is generating duplicate keys:

```hcl
# WRONG - if two rules have the same port, this creates duplicate keys
locals {
  rules_map = {
    for rule in var.rules : rule.port => rule
    # If var.rules has two entries with port 443, this errors
  }
}

# CORRECT - use a unique key
locals {
  rules_map = {
    for idx, rule in var.rules : "${rule.name}-${idx}" => rule
  }
}
```

If duplicates are possible, either include an index in the key or use the `...` grouping operator to collect duplicates.

## Mistake 6 - Overusing Dynamic Blocks

Not every repeated block needs to be dynamic. If you have a fixed set of blocks that do not change based on input, static blocks are cleaner:

```hcl
# Overkill - using dynamic block for a fixed set of tags
dynamic "tag" {
  for_each = {
    "Name"        = "my-instance"
    "Environment" = "production"
    "Team"        = "platform"
  }
  content {
    key   = tag.key
    value = tag.value
  }
}

# Better - just use the tags argument directly
tags = {
  Name        = "my-instance"
  Environment = "production"
  Team        = "platform"
}
```

Dynamic blocks add indirection. Only use them when the blocks genuinely need to be generated from variable data.

## Mistake 7 - Ignoring Iterator Shadowing

When nesting dynamic blocks, the inner block's default iterator can shadow the outer one:

```hcl
# DANGEROUS - inner "rule" shadows outer "rule" if both use default iterators
dynamic "rule" {
  for_each = var.rules
  content {
    name = rule.value.name  # Refers to outer rule

    dynamic "condition" {
      for_each = rule.value.conditions  # Outer rule - correct
      content {
        # This works because "condition" is a different name than "rule"
        type  = condition.value.type
        value = condition.value.value
      }
    }
  }
}
```

But if the inner block had the same label as the outer:

```hcl
# PROBLEM - both labels are "statement"
dynamic "statement" {
  for_each = var.statements
  content {
    dynamic "statement" {  # Same name - inner shadows outer!
      for_each = statement.value.sub_statements
      content {
        # "statement" now refers to the INNER iterator
        # Cannot access the outer statement anymore
      }
    }
  }
}

# FIX - use named iterators
dynamic "statement" {
  for_each = var.statements
  iterator = outer_stmt
  content {
    dynamic "statement" {
      for_each = outer_stmt.value.sub_statements
      iterator = inner_stmt
      content {
        # Clear: outer_stmt and inner_stmt are distinct
        type = inner_stmt.value.type
      }
    }
  }
}
```

## Mistake 8 - Not Handling Empty Collections

When a `for_each` collection might be empty, the dynamic block produces zero blocks. This is usually fine, but some resources require at least one instance of a nested block:

```hcl
# This might fail if var.rules is empty and the resource requires at least one ingress rule
dynamic "ingress" {
  for_each = var.rules  # Could be empty
  content {
    from_port   = ingress.value.port
    to_port     = ingress.value.port
    protocol    = ingress.value.protocol
    cidr_blocks = ingress.value.cidrs
  }
}

# Safer - provide a default rule if the list is empty
locals {
  ingress_rules = length(var.rules) > 0 ? var.rules : [
    {
      port     = 443
      protocol = "tcp"
      cidrs    = ["10.0.0.0/8"]
    }
  ]
}
```

## Mistake 9 - Using Dynamic Blocks Where count Would Work

For simple on/off scenarios, `count` on the resource might be simpler:

```hcl
# Over-engineered with dynamic block
resource "aws_s3_bucket" "main" {
  bucket = "my-bucket"

  dynamic "logging" {
    for_each = var.enable_logging ? [1] : []
    content {
      target_bucket = var.log_bucket
    }
  }
}

# Sometimes a separate resource with count is cleaner
resource "aws_s3_bucket_logging" "main" {
  count = var.enable_logging ? 1 : 0

  bucket        = aws_s3_bucket.main.id
  target_bucket = var.log_bucket
  target_prefix = "logs/"
}
```

## Mistake 10 - Complex Logic Inside content

Keep the content block simple. Move complex transformations to locals:

```hcl
# MESSY - too much logic in the content block
dynamic "ingress" {
  for_each = var.rules
  content {
    from_port = ingress.value.port
    to_port   = ingress.value.port_range_end != null ? ingress.value.port_range_end : ingress.value.port
    protocol  = ingress.value.protocol
    cidr_blocks = ingress.value.source_type == "cidr" ? ingress.value.sources : null
    security_groups = ingress.value.source_type == "sg" ? ingress.value.sources : null
    description = "${ingress.value.name} (${ingress.value.source_type == "cidr" ? "IP-based" : "SG-based"} - ${var.environment})"
  }
}

# CLEANER - transform data in locals first
locals {
  processed_rules = [
    for rule in var.rules : {
      from_port       = rule.port
      to_port         = coalesce(rule.port_range_end, rule.port)
      protocol        = rule.protocol
      cidr_blocks     = rule.source_type == "cidr" ? rule.sources : null
      security_groups = rule.source_type == "sg" ? rule.sources : null
      description     = "${rule.name} (${rule.source_type == "cidr" ? "IP-based" : "SG-based"} - ${var.environment})"
    }
  ]
}
```

## Summary

Most dynamic block mistakes fall into a few categories: syntax errors (missing content block, wrong iterator name), data type issues (wrong collection type, duplicate keys), and design issues (overuse, excessive complexity). Following these guidelines will save you debugging time: always use named iterators when nesting, move complex expressions to locals, verify data shapes with terraform console, and only use dynamic blocks when the blocks truly need to be generated from data. For deeper debugging techniques, see our post on [debugging dynamic block output](https://oneuptime.com/blog/post/2026-02-23-how-to-debug-dynamic-block-output-in-terraform/view).
