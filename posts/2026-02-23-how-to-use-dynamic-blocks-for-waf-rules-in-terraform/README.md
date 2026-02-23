# How to Use Dynamic Blocks for WAF Rules in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, WAF, Security, Infrastructure as Code

Description: A step-by-step guide to configuring AWS WAF rules using Terraform dynamic blocks for manageable and scalable web application firewall policies.

---

AWS WAF (Web Application Firewall) configurations in Terraform are notoriously verbose. A single WAF rule group can contain dozens of rules, each with nested statements, conditions, and actions. Dynamic blocks turn this from a maintenance nightmare into something you can actually manage.

## Why WAF Rules Need Dynamic Blocks

WAF rule groups in AWS WAFv2 have a deeply nested structure. A rule group contains rules, rules contain statements, and statements can be nested with AND, OR, and NOT logic. Writing this out statically for 20 or 30 rules produces thousands of lines of HCL. Dynamic blocks let you define the rules as structured data and generate the HCL automatically.

## Basic WAF Rule Group with Dynamic Rules

Let us start with a simple rule group that blocks requests based on IP sets and rate limits:

```hcl
variable "waf_rules" {
  description = "WAF rules configuration"
  type = list(object({
    name     = string
    priority = number
    action   = string  # "allow", "block", or "count"
    rule_type = string  # "ip_set", "rate_limit", "geo", "size"
    # Fields for different rule types
    ip_set_arn       = optional(string)
    rate_limit       = optional(number)
    country_codes    = optional(list(string))
    size_constraint  = optional(object({
      field            = string
      comparison       = string
      size             = number
    }))
  }))
}

resource "aws_wafv2_rule_group" "main" {
  name     = "application-rules"
  scope    = "REGIONAL"
  capacity = 500

  dynamic "rule" {
    for_each = var.waf_rules
    content {
      name     = rule.value.name
      priority = rule.value.priority

      # Dynamic action - only one of allow, block, or count should be set
      action {
        dynamic "allow" {
          for_each = rule.value.action == "allow" ? [1] : []
          content {}
        }
        dynamic "block" {
          for_each = rule.value.action == "block" ? [1] : []
          content {}
        }
        dynamic "count" {
          for_each = rule.value.action == "count" ? [1] : []
          content {}
        }
      }

      statement {
        # IP Set match
        dynamic "ip_set_reference_statement" {
          for_each = rule.value.rule_type == "ip_set" ? [1] : []
          content {
            arn = rule.value.ip_set_arn
          }
        }

        # Rate-based rule
        dynamic "rate_based_statement" {
          for_each = rule.value.rule_type == "rate_limit" ? [1] : []
          content {
            limit              = rule.value.rate_limit
            aggregate_key_type = "IP"
          }
        }

        # Geo match
        dynamic "geo_match_statement" {
          for_each = rule.value.rule_type == "geo" ? [1] : []
          content {
            country_codes = rule.value.country_codes
          }
        }

        # Size constraint
        dynamic "size_constraint_statement" {
          for_each = rule.value.rule_type == "size" ? [1] : []
          content {
            comparison_operator = rule.value.size_constraint.comparison
            size                = rule.value.size_constraint.size
            field_to_match {
              body {}
            }
            text_transformation {
              priority = 0
              type     = "NONE"
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
    metric_name                = "application-rules"
  }
}
```

## Using the Rule Configuration

```hcl
waf_rules = [
  {
    name       = "block-bad-ips"
    priority   = 1
    action     = "block"
    rule_type  = "ip_set"
    ip_set_arn = "arn:aws:wafv2:us-east-1:123456789:regional/ipset/bad-ips/abc-123"
  },
  {
    name       = "rate-limit-all"
    priority   = 2
    action     = "block"
    rule_type  = "rate_limit"
    rate_limit = 2000
  },
  {
    name          = "block-countries"
    priority      = 3
    action        = "block"
    rule_type     = "geo"
    country_codes = ["CN", "RU", "KP"]
  },
  {
    name      = "limit-body-size"
    priority  = 4
    action    = "block"
    rule_type = "size"
    size_constraint = {
      field      = "body"
      comparison = "GT"
      size       = 8192
    }
  }
]
```

## Managed Rule Group References

AWS provides managed rule groups (like the OWASP Core Rule Set) that you can reference in your WAF ACL. Dynamic blocks work well here too:

```hcl
variable "managed_rule_groups" {
  description = "AWS managed rule groups to include"
  type = list(object({
    name            = string
    vendor          = string
    priority        = number
    override_action = optional(string, "none")  # "none" or "count"
    excluded_rules  = optional(list(string), [])
  }))
  default = [
    {
      name     = "AWSManagedRulesCommonRuleSet"
      vendor   = "AWS"
      priority = 10
      excluded_rules = ["SizeRestrictions_BODY"]
    },
    {
      name     = "AWSManagedRulesSQLiRuleSet"
      vendor   = "AWS"
      priority = 20
    },
    {
      name     = "AWSManagedRulesKnownBadInputsRuleSet"
      vendor   = "AWS"
      priority = 30
    }
  ]
}

resource "aws_wafv2_web_acl" "main" {
  name  = "application-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Managed rule groups
  dynamic "rule" {
    for_each = var.managed_rule_groups
    content {
      name     = rule.value.name
      priority = rule.value.priority

      override_action {
        dynamic "none" {
          for_each = rule.value.override_action == "none" ? [1] : []
          content {}
        }
        dynamic "count" {
          for_each = rule.value.override_action == "count" ? [1] : []
          content {}
        }
      }

      statement {
        managed_rule_group_statement {
          name        = rule.value.name
          vendor_name = rule.value.vendor

          # Dynamic excluded rules
          dynamic "rule_action_override" {
            for_each = rule.value.excluded_rules
            content {
              name = rule_action_override.value
              action_to_use {
                count {}
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
    metric_name                = "application-acl"
  }
}
```

## Complex Statements with AND/OR Logic

WAF supports compound statements. Here is how to build them dynamically:

```hcl
variable "compound_rules" {
  type = list(object({
    name     = string
    priority = number
    action   = string
    # List of conditions that are ANDed together
    conditions = list(object({
      type          = string  # "geo", "ip_set", "byte_match"
      country_codes = optional(list(string))
      ip_set_arn    = optional(string)
      search_string = optional(string)
      field         = optional(string)
    }))
  }))
}

resource "aws_wafv2_rule_group" "compound" {
  name     = "compound-rules"
  scope    = "REGIONAL"
  capacity = 500

  dynamic "rule" {
    for_each = var.compound_rules
    content {
      name     = rule.value.name
      priority = rule.value.priority

      action {
        dynamic "block" {
          for_each = rule.value.action == "block" ? [1] : []
          content {}
        }
        dynamic "allow" {
          for_each = rule.value.action == "allow" ? [1] : []
          content {}
        }
      }

      statement {
        # If there are multiple conditions, wrap in and_statement
        dynamic "and_statement" {
          for_each = length(rule.value.conditions) > 1 ? [1] : []
          content {
            dynamic "statement" {
              for_each = rule.value.conditions
              content {
                dynamic "geo_match_statement" {
                  for_each = statement.value.type == "geo" ? [1] : []
                  content {
                    country_codes = statement.value.country_codes
                  }
                }
                dynamic "ip_set_reference_statement" {
                  for_each = statement.value.type == "ip_set" ? [1] : []
                  content {
                    arn = statement.value.ip_set_arn
                  }
                }
              }
            }
          }
        }

        # If there is only one condition, use it directly
        dynamic "geo_match_statement" {
          for_each = length(rule.value.conditions) == 1 && rule.value.conditions[0].type == "geo" ? [1] : []
          content {
            country_codes = rule.value.conditions[0].country_codes
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
    metric_name                = "compound-rules"
  }
}
```

## IP Set Management

IP sets that WAF rules reference can also be managed dynamically:

```hcl
variable "ip_sets" {
  description = "IP sets for WAF rules"
  type = map(object({
    description    = string
    scope          = string
    ip_version     = string
    addresses      = list(string)
  }))
}

resource "aws_wafv2_ip_set" "main" {
  for_each = var.ip_sets

  name               = each.key
  description        = each.value.description
  scope              = each.value.scope
  ip_address_version = each.value.ip_version
  addresses          = each.value.addresses
}
```

## Tips for WAF Dynamic Blocks

Keep these points in mind when working with WAF configurations:

1. WAF capacity limits are per rule group. Complex rules consume more capacity. Test your capacity usage incrementally.

2. The action block in WAF is exclusive - only one of `allow`, `block`, or `count` should be present. Use the conditional dynamic block pattern shown above.

3. When using `override_action` in a web ACL (for managed rule groups), it works differently from `action` (for custom rules). Make sure you use the right one.

4. Always include `visibility_config` on both rules and the rule group itself. It is required by the provider.

## Summary

WAF rules are one of the best use cases for dynamic blocks in Terraform. The deeply nested structure and the number of rules in a typical deployment make static configuration impractical. By defining rules as structured data and using dynamic blocks with conditional nested blocks, you can manage complex WAF policies from clean, readable variable definitions. See also our guide on [dynamic blocks for resource policy documents](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-resource-policy-documents/view) for related IAM and policy patterns.
