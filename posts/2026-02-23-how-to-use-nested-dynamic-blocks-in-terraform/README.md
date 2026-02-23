# How to Use Nested Dynamic Blocks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, HCL, Infrastructure as Code, Nested Blocks

Description: A practical guide to using nested dynamic blocks in Terraform for resources that require multi-level repeated configuration structures.

---

Some Terraform resources have nested blocks inside other nested blocks. When both levels need to be generated from variable data, you need nested dynamic blocks. This is one of Terraform's more advanced patterns, but once you understand the mechanics, it is straightforward.

## When You Need Nested Dynamic Blocks

The most common scenario is with AWS resources that have a hierarchical structure. Take an AWS Network ACL, where each rule can have multiple CIDR block entries, or a WAF rule with nested match conditions. Another classic example is the `aws_lb_listener` resource with multiple `action` blocks, each containing their own sub-blocks.

Let us start with a concrete example.

## Basic Nested Dynamic Block Structure

Here is the general pattern for nesting dynamic blocks:

```hcl
resource "some_resource" "example" {
  name = "example"

  # Outer dynamic block
  dynamic "outer_block" {
    for_each = var.outer_items
    content {
      outer_attribute = outer_block.value.name

      # Inner dynamic block - nested inside the outer content block
      dynamic "inner_block" {
        for_each = outer_block.value.inner_items
        content {
          inner_attribute = inner_block.value.setting
        }
      }
    }
  }
}
```

The inner dynamic block has access to the outer block's iterator through `outer_block.value`, which is how you reference the nested data.

## Real Example - AWS WAF Rule with Nested Conditions

Here is a practical example using AWS WAF rules, where each rule has statements, and statements can have nested conditions:

```hcl
variable "waf_rules" {
  description = "List of WAF rules with their conditions"
  type = list(object({
    name     = string
    priority = number
    action   = string
    conditions = list(object({
      match_type = string
      field      = string
      values     = list(string)
    }))
  }))
}

resource "aws_wafv2_rule_group" "example" {
  name     = "example-rule-group"
  scope    = "REGIONAL"
  capacity = 100

  # Each rule is a dynamic block
  dynamic "rule" {
    for_each = var.waf_rules
    content {
      name     = rule.value.name
      priority = rule.value.priority

      action {
        dynamic "allow" {
          for_each = rule.value.action == "allow" ? [1] : []
          content {}
        }
        dynamic "block" {
          for_each = rule.value.action == "block" ? [1] : []
          content {}
        }
      }

      statement {
        # Nested dynamic block for OR conditions
        or_statement {
          dynamic "statement" {
            for_each = rule.value.conditions
            content {
              byte_match_statement {
                positional_constraint = "CONTAINS"
                search_string         = statement.value.values[0]
                field_to_match {
                  # Using the match type to determine which field matcher to use
                  dynamic "single_header" {
                    for_each = statement.value.match_type == "header" ? [1] : []
                    content {
                      name = statement.value.field
                    }
                  }
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
          }
        }
      }

      visibility_config {
        sampled_requests_enabled   = true
        cloudwatch_metrics_enabled = true
        metric_name                = rule.value.name
      }
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "example-rule-group"
  }
}
```

That is three levels deep in places. The key is that each dynamic block's `for_each` can reference values from any outer dynamic block's iterator.

## Simpler Example - Security Group with Tagged Rules

Let us look at something more approachable. Say you have security group rules where each rule can have multiple CIDR blocks:

```hcl
variable "security_rules" {
  description = "Security group rules with multiple CIDR ranges"
  type = list(object({
    description = string
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_groups = list(list(string)) # Groups of CIDR blocks
  }))
  default = [
    {
      description = "HTTPS from office and VPN"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_groups = [
        ["10.0.0.0/8", "172.16.0.0/12"],
        ["192.168.0.0/16"]
      ]
    }
  ]
}
```

In this case, you would flatten the structure before using it, since security group ingress rules take a flat list of CIDR blocks. But the concept of nested iteration still applies to how you process the data.

## Nested Dynamic Blocks with Named Iterators

When you nest dynamic blocks, the default iterator name matches the block label. This can get confusing when block names are similar. Use the `iterator` argument to give each level a clear name:

```hcl
variable "listener_rules" {
  type = list(object({
    priority = number
    host_headers = list(string)
    actions = list(object({
      type             = string
      target_group_arn = string
      weight           = number
    }))
  }))
}

resource "aws_lb_listener_rule" "weighted" {
  listener_arn = aws_lb_listener.front_end.arn

  dynamic "condition" {
    # Use a named iterator for clarity
    iterator = rule_condition
    for_each = var.listener_rules
    content {
      host_header {
        values = rule_condition.value.host_headers
      }
    }
  }

  dynamic "action" {
    # Outer iterator named "act" to avoid confusion
    iterator = act
    for_each = var.listener_rules[0].actions
    content {
      type             = act.value.type
      target_group_arn = act.value.target_group_arn

      # No nested dynamic needed here, but if there were sub-blocks:
      # dynamic "forward" {
      #   iterator = fwd
      #   for_each = act.value.type == "forward" ? [1] : []
      #   content { ... }
      # }
    }
  }
}
```

Named iterators make nested dynamic blocks much easier to read and debug.

## Practical Tips for Nested Dynamic Blocks

There are a few things worth keeping in mind when working with nested dynamic blocks.

First, try not to go deeper than two levels. If you find yourself nesting three or more dynamic blocks, it is usually a sign that you should restructure your data in local values or break the resource into a module.

Second, always use named iterators when nesting. The default iterator name is the block label, and when you have blocks with similar names at different levels, the inner one shadows the outer one. Named iterators prevent this ambiguity.

Third, use `locals` to pre-process complex data structures before passing them to dynamic blocks. This makes your resource blocks cleaner:

```hcl
locals {
  # Flatten nested data for easier consumption
  processed_rules = [
    for rule in var.rules : {
      name = rule.name
      conditions = [
        for cond in rule.conditions : {
          type  = cond.type
          value = cond.value
        }
        if cond.enabled # Filter out disabled conditions
      ]
    }
  ]
}
```

## Debugging Nested Dynamic Blocks

When something goes wrong, add `terraform console` to your workflow. You can inspect the data structures your dynamic blocks will iterate over:

```bash
# Launch terraform console to test expressions
terraform console

# Check what the for_each will receive
> var.waf_rules[0].conditions
```

You can also use `output` blocks to print intermediate values during plan to verify your data shapes are correct.

## Summary

Nested dynamic blocks handle multi-level repeated structures in Terraform resources. The pattern is consistent - each level uses `for_each` and `content`, and inner blocks can reference outer iterators. Keep things readable with named iterators, pre-process data in locals, and avoid going more than two levels deep when possible. For more on the iterator argument specifically, see [how to use the iterator argument in dynamic blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-iterator-argument-in-dynamic-blocks/view).
