# How to Use WAF Managed Rule Groups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, WAF, Managed Rules, Security, Web Applications

Description: Learn how to use AWS WAF managed rule groups to get instant protection against common web threats without writing custom rules from scratch.

---

Writing WAF rules from scratch is tedious and error-prone. You need to understand every attack vector, keep up with new vulnerabilities, and test rules to avoid blocking legitimate traffic. AWS managed rule groups give you a shortcut - pre-built sets of rules maintained by the AWS Threat Research Team that cover the most common web attacks.

These rule groups are updated automatically when new threats emerge. You don't need to do anything when a new attack technique is discovered - AWS updates the rules, and your protection improves without any action on your part.

## Available AWS Managed Rule Groups

AWS provides several managed rule groups, each targeting a different threat category.

| Rule Group | What It Protects Against |
|---|---|
| `AWSManagedRulesCommonRuleSet` | OWASP Top 10 including SQLi, XSS, path traversal, SSRF |
| `AWSManagedRulesSQLiRuleSet` | SQL injection attacks |
| `AWSManagedRulesKnownBadInputsRuleSet` | Known bad request patterns (Log4j, etc.) |
| `AWSManagedRulesAmazonIpReputationList` | IP addresses with poor reputation |
| `AWSManagedRulesAnonymousIpList` | VPNs, proxies, Tor exit nodes, hosting providers |
| `AWSManagedRulesBotControlRuleSet` | Bot traffic including scrapers and crawlers |
| `AWSManagedRulesATPRuleSet` | Account takeover prevention for login endpoints |
| `AWSManagedRulesLinuxRuleSet` | Linux-specific attacks (LFI, etc.) |
| `AWSManagedRulesUnixRuleSet` | Unix-specific attacks including command injection |
| `AWSManagedRulesWindowsRuleSet` | Windows-specific attacks (PowerShell, etc.) |
| `AWSManagedRulesPHPRuleSet` | PHP-specific attacks |
| `AWSManagedRulesWordPressRuleSet` | WordPress-specific exploits |

## The Essential Starter Set

If you're not sure which rule groups to enable, start with these four. They cover the vast majority of common web attacks.

### 1. Common Rule Set (Core Protection)

This is the most important managed rule group. It covers the OWASP Top 10 vulnerabilities.

```bash
# Add the Common Rule Set to your Web ACL
aws wafv2 update-web-acl \
  --name my-app-waf \
  --scope REGIONAL \
  --id YOUR_WEB_ACL_ID \
  --lock-token YOUR_LOCK_TOKEN \
  --default-action '{"Allow": {}}' \
  --visibility-config '{
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "myAppWAF"
  }' \
  --rules '[
    {
      "Name": "AWSCommonRules",
      "Priority": 1,
      "OverrideAction": {"None": {}},
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSCommonRules"
      }
    }
  ]'
```

The Common Rule Set includes rules for:
- Cross-site scripting (XSS)
- SQL injection patterns
- Path traversal (../../../etc/passwd)
- Server-side request forgery (SSRF)
- Bad bot user agents
- Request body size limits

### 2. Known Bad Inputs

Catches known exploit payloads including Log4Shell and other well-documented vulnerabilities.

```json
{
  "Name": "AWSKnownBadInputs",
  "Priority": 2,
  "OverrideAction": {"None": {}},
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesKnownBadInputsRuleSet"
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "KnownBadInputs"
  }
}
```

### 3. IP Reputation List

Blocks traffic from IP addresses that AWS has identified as malicious based on threat intelligence.

```json
{
  "Name": "AWSIPReputation",
  "Priority": 0,
  "OverrideAction": {"None": {}},
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesAmazonIpReputationList"
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "IPReputation"
  }
}
```

### 4. Anonymous IP List

Blocks traffic from anonymizing services like Tor, VPNs, and hosting providers. Be careful with this one - it can block legitimate users who use VPNs. Consider starting in Count mode.

```json
{
  "Name": "AWSAnonymousIP",
  "Priority": 3,
  "OverrideAction": {"Count": {}},
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesAnonymousIpList"
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "AnonymousIP"
  }
}
```

Notice the `OverrideAction` is set to `Count` here. This logs matches without blocking, letting you evaluate the impact before switching to block mode.

## Overriding Individual Rules

Sometimes a managed rule group blocks legitimate traffic. Instead of removing the entire group, you can override specific rules within it.

```json
{
  "Name": "AWSCommonRules",
  "Priority": 1,
  "OverrideAction": {"None": {}},
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesCommonRuleSet",
      "ExcludedRules": [
        {"Name": "SizeRestrictions_BODY"},
        {"Name": "GenericRFI_BODY"}
      ]
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "AWSCommonRules"
  }
}
```

The `ExcludedRules` list sets those specific rules to Count mode instead of Block. This is useful when a particular rule generates false positives for your application.

You can also override rules to different actions.

```json
{
  "ManagedRuleGroupStatement": {
    "VendorName": "AWS",
    "Name": "AWSManagedRulesCommonRuleSet",
    "RuleActionOverrides": [
      {
        "Name": "SizeRestrictions_BODY",
        "ActionToUse": {"Count": {}}
      },
      {
        "Name": "CrossSiteScripting_BODY",
        "ActionToUse": {"Count": {}}
      }
    ]
  }
}
```

## Platform-Specific Rule Groups

If you know your application's platform, add the appropriate rule group for targeted protection.

For Linux-based applications:

```json
{
  "Name": "AWSLinuxRules",
  "Priority": 5,
  "OverrideAction": {"None": {}},
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesLinuxRuleSet"
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "LinuxRules"
  }
}
```

For PHP applications (including WordPress):

```json
{
  "Name": "AWSPHPRules",
  "Priority": 6,
  "OverrideAction": {"None": {}},
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesPHPRuleSet"
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "PHPRules"
  }
}
```

## Terraform Configuration

Here's the complete Terraform setup with all essential managed rule groups.

```hcl
resource "aws_wafv2_web_acl" "main" {
  name        = "my-app-waf"
  description = "WAF with managed rule groups"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # IP Reputation (highest priority - check first)
  rule {
    name     = "AWSIPReputation"
    priority = 0
    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "IPReputation"
    }
  }

  # Common Rule Set
  rule {
    name     = "AWSCommonRules"
    priority = 1
    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Override specific rules that cause false positives
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use { count {} }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRules"
    }
  }

  # Known Bad Inputs
  rule {
    name     = "AWSKnownBadInputs"
    priority = 2
    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputs"
    }
  }

  # SQL Injection
  rule {
    name     = "AWSSQLInjection"
    priority = 3
    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjection"
    }
  }

  # Linux-specific rules
  rule {
    name     = "AWSLinuxRules"
    priority = 4
    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesLinuxRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "LinuxRules"
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "myAppWAF"
    sampled_requests_enabled   = true
  }
}
```

## Understanding WCU Limits

Each Web ACL has a Web ACL Capacity Unit (WCU) limit of 5,000. Each rule group consumes some WCUs. Check the capacity of each managed rule group before adding them.

```bash
# Check WCU capacity of a managed rule group
aws wafv2 describe-managed-rule-group \
  --scope REGIONAL \
  --vendor-name AWS \
  --name AWSManagedRulesCommonRuleSet
```

Typical WCU consumption:
- Common Rule Set: 700 WCU
- SQL Injection: 200 WCU
- Known Bad Inputs: 200 WCU
- IP Reputation: 25 WCU
- Anonymous IP: 50 WCU

You've got plenty of room for multiple managed rule groups plus custom rules.

## Deployment Best Practice

1. **Deploy in Count mode first** - Set `OverrideAction` to `Count` for new rule groups
2. **Monitor for 1-2 weeks** - Review sampled requests to check for false positives
3. **Exclude problematic rules** - Use rule overrides for rules that block legitimate traffic
4. **Switch to Block mode** - Change `OverrideAction` to `None` (which means "use the rule's action")
5. **Continue monitoring** - Keep sampled requests and CloudWatch metrics enabled

For custom rules to complement managed groups, see [WAF rules for common web attacks](https://oneuptime.com/blog/post/2026-02-12-aws-waf-rules-common-web-attacks/view). Add [rate limiting](https://oneuptime.com/blog/post/2026-02-12-waf-rate-limiting-rules-prevent-ddos/view) for DDoS protection. And for global applications, deploy [WAF with CloudFront](https://oneuptime.com/blog/post/2026-02-12-waf-cloudfront-global-protection/view).
