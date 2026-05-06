# How to Configure Bot Protection with WAF in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, WAF, Bot Protection, AWS, Infrastructure as Code

Description: Learn how to configure bot protection using AWS WAFv2 bot control and managed rule groups with OpenTofu to block malicious bots while allowing legitimate ones.

Bot traffic makes up over 40% of internet traffic. AWS WAFv2's Bot Control managed rule group labels bot traffic, verifies generally desirable bots, and enables selective blocking or monitoring of categories like scrapers, scanners, status monitors, and search engines. With targeted inspection, it can also challenge more sophisticated bots that do not self-identify.

## Bot Control Managed Rule Group

```hcl
resource "aws_wafv2_web_acl" "bot_protected" {
  name  = "bot-protected-web-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # AWS Bot Control - managed bot detection
  rule {
    name     = "AWSManagedRulesBotControlRuleSet"
    priority = 5

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "COMMON"  # COMMON or TARGETED
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BotControlRules"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "bot-protected-web-acl"
    sampled_requests_enabled   = true
  }
}
```

## Custom Bot Detection Rules

```hcl
resource "aws_wafv2_web_acl" "custom_bot" {
  name  = "custom-bot-web-acl"
  scope = "REGIONAL"

  default_action { allow {} }

  # Block requests without a User-Agent value
  rule {
    name     = "BlockMissingUserAgent"
    priority = 1

    action { block {} }

    statement {
      not_statement {
        statement {
          size_constraint_statement {
            field_to_match {
              single_header { name = "user-agent" }
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

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "MissingUserAgent"
      sampled_requests_enabled   = true
    }
  }

  # Block known bad bot User-Agent strings
  rule {
    name     = "BlockBadBotAgents"
    priority = 2

    action { block {} }

    statement {
      byte_match_statement {
        field_to_match {
          single_header { name = "user-agent" }
        }
        positional_constraint = "CONTAINS"
        search_string         = "sqlmap"
        text_transformation {
          priority = 0
          type     = "LOWERCASE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BadBotAgent"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "custom-bot-web-acl"
    sampled_requests_enabled   = true
  }
}
```

## Bot Detection Monitoring

```hcl
resource "aws_cloudwatch_metric_alarm" "bot_traffic_spike" {
  alarm_name          = "waf-bot-traffic-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 5000
  alarm_description   = "Spike in WAF bot-blocked requests - potential bot attack"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.bot_protected.name
    Region = var.region
    Rule   = "BotControlRules"
  }
}
```

## Conclusion

Bot protection with AWS WAFv2 in OpenTofu combines managed Bot Control rules with custom detection for comprehensive coverage. Use the Bot Control managed rule group with COMMON inspection level as a baseline, rely on Bot Control's built-in handling for verified bots, and add custom rules to catch requests that omit or spoof common bot identifiers. Monitor blocked request spikes to detect sustained bot attacks.
