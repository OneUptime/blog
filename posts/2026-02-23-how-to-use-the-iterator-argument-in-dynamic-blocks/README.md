# How to Use the Iterator Argument in Dynamic Blocks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, Iterator, HCL, Infrastructure as Code

Description: Understand the iterator argument in Terraform dynamic blocks, when to use it, and how it helps with nested dynamic blocks and readability.

---

Every dynamic block in Terraform has an iterator - the variable you use inside the `content` block to access the current item. By default, the iterator takes the name of the dynamic block's label. The `iterator` argument lets you override that name, which is useful in several situations.

## Default Iterator Behavior

When you write a dynamic block, the default iterator matches the block label:

```hcl
# The dynamic block label is "ingress"
# So the default iterator is also "ingress"
dynamic "ingress" {
  for_each = var.rules
  content {
    from_port   = ingress.value.from_port   # "ingress" is the iterator
    to_port     = ingress.value.to_port
    protocol    = ingress.value.protocol
    cidr_blocks = ingress.value.cidr_blocks
  }
}
```

The iterator object has two attributes:
- `.key` - the map key or list index of the current item
- `.value` - the value of the current item

## Setting a Custom Iterator

Use the `iterator` argument to give the iterator a different name:

```hcl
dynamic "ingress" {
  for_each = var.rules
  iterator = rule  # Override the default iterator name

  content {
    from_port   = rule.value.from_port    # Now using "rule" instead of "ingress"
    to_port     = rule.value.to_port
    protocol    = rule.value.protocol
    cidr_blocks = rule.value.cidr_blocks
    description = "Rule ${rule.key}"       # rule.key is the index or map key
  }
}
```

After setting `iterator = rule`, you must use `rule.value` and `rule.key` in the content block. The original name `ingress` no longer works as an iterator reference.

## When Custom Iterators Are Necessary

There are three main situations where you need a custom iterator.

### Situation 1 - Nested Dynamic Blocks with Same Labels

This is the most important case. When you have nested dynamic blocks and the inner block has the same label as the outer one, the inner iterator shadows the outer:

```hcl
# WAF rules have nested "statement" blocks at multiple levels
# Without custom iterators, the inner "statement" shadows the outer one

# BROKEN - inner statement iterator shadows outer
dynamic "statement" {
  for_each = var.rules
  content {
    dynamic "statement" {
      for_each = statement.value.sub_rules  # This "statement" is ambiguous
      content {
        # "statement" here refers to the inner iterator
        # Cannot access the outer statement values
      }
    }
  }
}

# FIXED - custom iterators disambiguate
dynamic "statement" {
  for_each = var.rules
  iterator = outer_rule
  content {
    dynamic "statement" {
      for_each = outer_rule.value.sub_rules
      iterator = inner_rule
      content {
        # Clear references to both levels
        name  = "${outer_rule.value.name}-${inner_rule.value.name}"
        value = inner_rule.value.setting
      }
    }
  }
}
```

### Situation 2 - Readability When Block Labels Are Generic

Some Terraform resources use generic block labels like `setting`, `parameter`, or `attribute`. A custom iterator name adds context:

```hcl
# Generic block label - "setting" does not tell you much
dynamic "setting" {
  for_each = var.environment_variables
  iterator = env_var  # More descriptive

  content {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = env_var.key    # Clearer than setting.key
    value     = env_var.value  # Clearer than setting.value
  }
}
```

### Situation 3 - When the Block Label Is a Reserved Word or Confusing

Sometimes the block label conflicts with a concept in your code:

```hcl
# "tag" as both block label and iterator can be confusing
# when you also have a "tags" variable
variable "tags" {
  type = map(string)
}

dynamic "tag" {
  for_each = var.tags
  iterator = t  # Short and avoids confusion with "tags" variable

  content {
    key                 = t.key
    value               = t.value
    propagate_at_launch = true
  }
}
```

## Iterator with Different Collection Types

The iterator works the same way regardless of the collection type, but `.key` and `.value` behave differently:

```hcl
# With a list - key is the numeric index
variable "ports" {
  type    = list(number)
  default = [80, 443, 8080]
}

dynamic "ingress" {
  for_each = var.ports
  iterator = port
  content {
    # port.key = 0, 1, 2 (list index)
    # port.value = 80, 443, 8080 (the actual port number)
    from_port   = port.value
    to_port     = port.value
    protocol    = "tcp"
    description = "Rule ${port.key}: port ${port.value}"
  }
}

# With a map - key is the map key
variable "services" {
  type = map(object({
    port     = number
    protocol = string
  }))
  default = {
    "web"  = { port = 443, protocol = "tcp" }
    "ssh"  = { port = 22,  protocol = "tcp" }
  }
}

dynamic "ingress" {
  for_each = var.services
  iterator = svc
  content {
    # svc.key = "web", "ssh" (map key)
    # svc.value = { port = 443, protocol = "tcp" } (the object)
    from_port   = svc.value.port
    to_port     = svc.value.port
    protocol    = svc.value.protocol
    description = svc.key
  }
}

# With a set - key equals value
variable "allowed_cidrs" {
  type    = set(string)
  default = ["10.0.0.0/8", "172.16.0.0/12"]
}

dynamic "ingress" {
  for_each = var.allowed_cidrs
  iterator = cidr
  content {
    # cidr.key = "10.0.0.0/8" (same as value for sets)
    # cidr.value = "10.0.0.0/8"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [cidr.value]
  }
}
```

## Practical Example - Multi-Level WAF Configuration

Here is a real-world example showing why custom iterators matter with deeply nested structures:

```hcl
variable "waf_rule_groups" {
  type = list(object({
    name     = string
    priority = number
    rules = list(object({
      name     = string
      priority = number
      action   = string
      match_conditions = list(object({
        field  = string
        values = list(string)
      }))
    }))
  }))
}

resource "aws_wafv2_web_acl" "main" {
  name  = "multi-level"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Outer level - rule groups
  dynamic "rule" {
    for_each = var.waf_rule_groups
    iterator = group

    content {
      name     = group.value.name
      priority = group.value.priority

      override_action {
        none {}
      }

      statement {
        rule_group_reference_statement {
          arn = aws_wafv2_rule_group.groups[group.key].arn
        }
      }

      visibility_config {
        sampled_requests_enabled   = true
        cloudwatch_metrics_enabled = true
        metric_name                = group.value.name
      }
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "multi-level-acl"
  }
}

# Rule groups themselves
resource "aws_wafv2_rule_group" "groups" {
  count    = length(var.waf_rule_groups)
  name     = var.waf_rule_groups[count.index].name
  scope    = "REGIONAL"
  capacity = 100

  dynamic "rule" {
    for_each = var.waf_rule_groups[count.index].rules
    iterator = waf_rule

    content {
      name     = waf_rule.value.name
      priority = waf_rule.value.priority

      action {
        dynamic "block" {
          for_each = waf_rule.value.action == "block" ? [1] : []
          content {}
        }
        dynamic "allow" {
          for_each = waf_rule.value.action == "allow" ? [1] : []
          content {}
        }
      }

      statement {
        and_statement {
          dynamic "statement" {
            for_each = waf_rule.value.match_conditions
            iterator = condition

            content {
              byte_match_statement {
                search_string         = condition.value.values[0]
                positional_constraint = "CONTAINS"
                field_to_match {
                  dynamic "single_header" {
                    for_each = condition.value.field == "header" ? [1] : []
                    content {
                      name = "user-agent"
                    }
                  }
                  dynamic "uri_path" {
                    for_each = condition.value.field == "uri" ? [1] : []
                    content {}
                  }
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }
          }
        }
      }

      visibility_config {
        sampled_requests_enabled   = true
        cloudwatch_metrics_enabled = true
        metric_name                = waf_rule.value.name
      }
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = var.waf_rule_groups[count.index].name
  }
}
```

Without custom iterators (`group`, `waf_rule`, `condition`), this code would be impossible to follow.

## Best Practices

1. Always use custom iterators when nesting dynamic blocks.
2. Choose descriptive names - `rule` is better than `r`, `env_var` is better than `e`.
3. Be consistent within a module - if you name one iterator `svc`, do not name a similar one `service` elsewhere.
4. Document the iterator when the relationship between the iterator and the data is not obvious.

## Summary

The `iterator` argument is a small feature with a big impact on readability and correctness. Use it whenever the default iterator name would cause shadowing, when nested blocks share labels, or when a more descriptive name would make the code clearer. For more on nested dynamic blocks where iterators are essential, see our guide on [nested dynamic blocks in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-nested-dynamic-blocks-in-terraform/view).
