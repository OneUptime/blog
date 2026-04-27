# How to Configure OWASP Core Rule Set in WAF with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, WAF, OWASP, CRS, Infrastructure as Code

Description: Learn how to enable and tune the OWASP Core Rule Set in AWS WAFv2, Azure WAF, and GCP Cloud Armor with OpenTofu for comprehensive web application protection.

The OWASP Core Rule Set (CRS) protects against the OWASP Top 10 vulnerabilities including SQL injection, XSS, command injection, and path traversal. Each cloud provider offers the CRS as a managed rule set that can be enabled and tuned through OpenTofu.

## AWS WAFv2 with OWASP CRS

```hcl
resource "aws_wafv2_web_acl" "owasp_protected" {
  name  = "owasp-protected-web-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # OWASP CRS via AWS Managed Rules Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      count {}  # Start in count mode - monitor before switching to block
      # Change to: none {} to enforce blocking
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Suppress rules causing false positives
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}  # Count instead of block for large body rule
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # SQL injection managed rules
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 20

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Linux/POSIX rule set
  rule {
    name     = "AWSManagedRulesLinuxRuleSet"
    priority = 30

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesLinuxRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "LinuxRuleSet"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "owasp-protected-web-acl"
    sampled_requests_enabled   = true
  }
}
```

## Azure WAF with OWASP CRS 3.2

```hcl
resource "azurerm_web_application_firewall_policy" "owasp" {
  name                = "owasp-waf-policy"
  resource_group_name = var.resource_group_name
  location            = var.location

  policy_settings {
    enabled = true
    mode    = "Prevention"
  }

  managed_rules {
    # OWASP CRS 3.2
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"

      # Disable specific rule causing false positives
      rule_group_override {
        rule_group_name = "REQUEST-942-APPLICATION-ATTACK-SQLI"

        rule {
          id      = "942450"
          enabled = false
          action  = "Log"
        }
      }
    }
  }
}
```

## GCP Cloud Armor with Pre-Configured OWASP Rules

```hcl
resource "google_compute_security_policy" "owasp_policy" {
  name = "owasp-security-policy"

  # SQL injection
  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': 1})"
      }
    }
    description = "OWASP SQL injection protection (sensitivity 1)"
  }

  # XSS
  rule {
    action   = "deny(403)"
    priority = 1001
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('xss-v33-stable', {'sensitivity': 1})"
      }
    }
    description = "OWASP XSS protection"
  }

  # LFI (Local File Inclusion)
  rule {
    action   = "deny(403)"
    priority = 1002
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('lfi-v33-stable')"
      }
    }
    description = "OWASP LFI protection"
  }

  # RFI (Remote File Inclusion)
  rule {
    action   = "deny(403)"
    priority = 1003
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('rfi-v33-stable')"
      }
    }
    description = "OWASP RFI protection"
  }

  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = ["*"] }
    }
    description = "Default allow"
  }
}
```

## Conclusion

OWASP CRS in WAF provides battle-tested protection against the most common web vulnerabilities. Start in detection/count mode, monitor sampled requests for false positives, then switch to prevention/block mode. Use rule group exclusions for specific rules that trigger on legitimate application requests. Always enable SQLi, XSS, and known bad inputs rule sets as a minimum baseline across all cloud providers.
