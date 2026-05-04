# How to Create AWS WAFv2 Rule Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, WAF, Rule Groups, Infrastructure as Code

Description: Learn how to create reusable AWS WAFv2 rule groups with OpenTofu for modular, shareable web security rules across multiple Web ACLs.

WAFv2 rule groups bundle related rules that can be referenced from multiple Web ACLs. This enables you to define security rules once and apply them across different applications. Managing rule groups in OpenTofu ensures consistent security policies.

## Creating a Rule Group

```hcl
resource "aws_wafv2_rule_group" "api_protection" {
  name        = "api-protection-rules"
  description = "Custom rules for API endpoint protection"
  scope       = "REGIONAL"
  capacity    = 100  # WCU (Web ACL Capacity Units)

  # Block requests without API key header
  rule {
    name     = "RequireAPIKey"
    priority = 1

    action {
      block {}
    }

    statement {
      not_statement {
        statement {
          size_constraint_statement {
            field_to_match {
              single_header {
                name = "x-api-key"
              }
            }
            comparison_operator = "GE"
            size                = 1
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RequireAPIKey"
      sampled_requests_enabled   = true
    }
  }

  # Block SQL injection attempts in query strings
  rule {
    name     = "BlockSQLInjectionQueryString"
    priority = 2

    action {
      block {}
    }

    statement {
      sqli_match_statement {
        field_to_match {
          query_string {}
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjectionQueryString"
      sampled_requests_enabled   = true
    }
  }

  # Block XSS in request body
  rule {
    name     = "BlockXSSInBody"
    priority = 3

    action {
      block {}
    }

    statement {
      xss_match_statement {
        field_to_match {
          body {
            oversize_handling = "CONTINUE"
          }
        }
        text_transformation {
          priority = 0
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "XSSBody"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "api-protection-rules"
    sampled_requests_enabled   = true
  }

  tags = {
    Purpose = "API security"
  }
}
```

## Using the Rule Group in a Web ACL

```hcl
resource "aws_wafv2_web_acl" "api" {
  name  = "api-web-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Reference the custom rule group
  rule {
    name     = "APIProtection"
    priority = 1

    override_action {
      none {}  # Use the rule group's own actions
    }

    statement {
      rule_group_reference_statement {
        arn = aws_wafv2_rule_group.api_protection.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "APIProtectionGroup"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "api-web-acl"
    sampled_requests_enabled   = true
  }
}
```

## Body Size Restriction Rule

```hcl
resource "aws_wafv2_rule_group" "size_restrictions" {
  name     = "size-restrictions"
  scope    = "REGIONAL"
  capacity = 50

  # Block oversized request bodies (prevent slow-POST attacks)
  rule {
    name     = "LimitBodySize"
    priority = 1

    action {
      block {}
    }

    statement {
      size_constraint_statement {
        comparison_operator = "GT"
        size                = 10240  # 10 KB max body

        field_to_match {
          body { oversize_handling = "MATCH" }
        }

        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "OversizedBody"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "size-restrictions"
    sampled_requests_enabled   = true
  }
}
```

## Conclusion

WAFv2 rule groups in OpenTofu enable modular, reusable security policies. Group related rules by function (API protection, size limits, input validation), reference them from multiple Web ACLs, and override individual rule actions per ACL when needed. Calculate WCU capacity accurately - complex rules like regex and SQL injection detection use more WCUs than simple match conditions.
