# How to Create AWS WAF Web ACLs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, WAF, Web ACL, IP Allowlist, Custom Rules, Infrastructure as Code

Description: Learn how to create AWS WAF Web ACLs with custom rules using OpenTofu, including IP allowlists, geographic restrictions, custom header validation, and bot management rules.

## Introduction

WAF Web ACLs (Access Control Lists) contain ordered rules that inspect web requests and determine whether to allow or block them. Beyond managed rule groups, you can create custom rules for business-specific logic like IP allowlists, geographic blocking, custom header validation, and API key enforcement that managed rules don't cover.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with WAF permissions

## Step 1: Create an IP Allowlist

```hcl
# IP set for trusted office and VPN IPs

resource "aws_wafv2_ip_set" "trusted_ips" {
  name               = "${var.project_name}-trusted-ips"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  addresses = var.trusted_ip_ranges  # ["203.0.113.0/24", "198.51.100.0/24"]

  tags = {
    Name = "${var.project_name}-trusted-ips"
  }
}

# IP set for blocked malicious IPs
resource "aws_wafv2_ip_set" "blocked_ips" {
  name               = "${var.project_name}-blocked-ips"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  addresses = var.blocked_ip_ranges

  tags = {
    Name = "${var.project_name}-blocked-ips"
  }
}
```

## Step 2: Create Web ACL with Custom Rules

```hcl
resource "aws_wafv2_web_acl" "api" {
  name  = "${var.project_name}-api-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Priority 1: Block known bad IPs immediately
  rule {
    name     = "BlockBadIPs"
    priority = 1

    action { block {} }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.blocked_ips.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockedIPs"
      sampled_requests_enabled   = true
    }
  }

  # Priority 2: Allow trusted IPs to bypass further rules
  rule {
    name     = "AllowTrustedIPs"
    priority = 2

    action { allow {} }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.trusted_ips.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "TrustedIPsAllowed"
      sampled_requests_enabled   = true
    }
  }

  # Priority 3: Block requests from high-risk countries
  rule {
    name     = "GeoBlockHighRisk"
    priority = 3

    action { block {} }

    statement {
      geo_match_statement {
        country_codes = var.blocked_countries  # ["CN", "RU", "KP"]
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlocked"
      sampled_requests_enabled   = true
    }
  }

  # Priority 4: Require API key header for /api/* paths
  rule {
    name     = "RequireAPIKey"
    priority = 4

    action { block {} }

    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string         = "/api/"
            field_to_match { uri_path {} }
            positional_constraint = "STARTS_WITH"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
        statement {
          not_statement {
            statement {
              size_constraint_statement {
                field_to_match {
                  single_header { name = "x-api-key" }
                }
                comparison_operator = "GT"
                size                = 0
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "MissingAPIKey"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-api-acl"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${var.project_name}-api-acl"
  }
}
```

## Step 3: Create a Regex Pattern Set for Content Validation

```hcl
resource "aws_wafv2_regex_pattern_set" "malicious_patterns" {
  name  = "${var.project_name}-malicious-patterns"
  scope = "REGIONAL"

  regular_expression {
    regex_string = "(?i)(union.*select|select.*from|insert.*into|drop.*table)"
  }

  tags = {
    Name = "${var.project_name}-malicious-patterns"
  }
}
```

## Step 4: Create a CloudFront Web ACL (CLOUDFRONT scope)

```hcl
# For CloudFront, scope must be CLOUDFRONT and the Web ACL must be created in us-east-1
resource "aws_wafv2_web_acl" "cloudfront" {
  provider = aws.us_east_1  # CloudFront WAF must be in us-east-1

  name  = "${var.project_name}-cloudfront-acl"
  scope = "CLOUDFRONT"

  default_action { allow {} }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-cloudfront-acl"
    sampled_requests_enabled   = true
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Ordering WAF rules by priority is critical-rules are evaluated in ascending priority order and the first matching rule's action applies. Use low priority numbers (1-10) for allowlist and blocklist rules that should take precedence over managed rules. Test custom rules with the WAF rule tester in the console before deploying to production, and start rules in `count` mode to validate they match the expected traffic before switching to `block`.
