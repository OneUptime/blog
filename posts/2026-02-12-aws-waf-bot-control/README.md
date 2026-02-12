# How to Set Up AWS WAF Bot Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, WAF, Bot Control, Security, Web Application

Description: Configure AWS WAF Bot Control to detect and manage bot traffic on your web applications, distinguishing between good bots and malicious scrapers.

---

Bots make up a massive chunk of internet traffic. Some are welcome - search engine crawlers, uptime monitors, feed readers. Others are anything but - scrapers stealing your content, credential stuffers trying stolen passwords, inventory hoarders buying out your stock. The challenge isn't blocking all bots. It's telling the good ones from the bad ones and handling each appropriately.

AWS WAF Bot Control is a managed rule group that does exactly this. It uses a combination of request analysis, browser fingerprinting, JavaScript challenges, and CAPTCHA to classify bot traffic and let you define actions for each category. Let's set it up.

## Bot Control Tiers

AWS WAF Bot Control comes in two tiers:

**Common** - Detects and categorizes self-identifying bots (ones that declare themselves in the User-Agent header). This handles search engines, social media crawlers, monitoring tools, and other legitimate bots. It also catches basic automated tools.

**Targeted** - Goes deeper with behavioral analysis, browser fingerprinting, and machine learning to detect sophisticated bots that try to look like real users. This is where you catch credential stuffing, scraping, and scalping bots.

Common tier is included with the standard Bot Control subscription. Targeted tier costs more but is necessary if you're dealing with sophisticated bot attacks.

## Prerequisites

You need:
- An AWS WAF web ACL attached to a CloudFront distribution, ALB, API Gateway, or App Runner service
- The resource must be serving HTTP/HTTPS traffic

## Adding Bot Control to Your Web ACL

### Via CLI

This adds the Bot Control managed rule group to your web ACL:

```bash
# First, get your current web ACL config
aws wafv2 get-web-acl \
  --name my-web-acl \
  --scope REGIONAL \
  --id abc123-def456

# Update the web ACL to include Bot Control
aws wafv2 update-web-acl \
  --name my-web-acl \
  --scope REGIONAL \
  --id abc123-def456 \
  --lock-token "your-lock-token" \
  --default-action '{"Allow": {}}' \
  --visibility-config '{
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "myWebACL"
  }' \
  --rules '[
    {
      "Name": "AWS-AWSManagedRulesBotControlRuleSet",
      "Priority": 0,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesBotControlRuleSet",
          "ManagedRuleGroupConfigs": [
            {
              "AWSManagedRulesBotControlRuleSetProperty": {
                "InspectionLevel": "COMMON"
              }
            }
          ]
        }
      },
      "OverrideAction": {"None": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "BotControl"
      }
    }
  ]'
```

For targeted bot control, change `COMMON` to `TARGETED`:

```json
{
  "AWSManagedRulesBotControlRuleSetProperty": {
    "InspectionLevel": "TARGETED"
  }
}
```

### Via Terraform

This Terraform configuration creates a web ACL with Bot Control:

```hcl
resource "aws_wafv2_web_acl" "main" {
  name        = "my-web-acl"
  description = "Web ACL with Bot Control"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "bot-control"
    priority = 0

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "COMMON"
          }
        }

        # Override specific rules to count instead of block
        rule_action_override {
          action_to_use {
            count {}
          }
          name = "CategoryAdvertising"
        }

        rule_action_override {
          action_to_use {
            count {}
          }
          name = "CategorySeo"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BotControl"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "myWebACL"
    sampled_requests_enabled   = true
  }
}
```

## Bot Categories

Bot Control classifies bots into categories. Understanding these helps you configure appropriate actions.

| Category | Examples | Default Action |
|----------|----------|---------------|
| CategoryVerifiedSearchEngine | Googlebot, Bingbot | Allow |
| CategoryVerifiedSocialMedia | Facebook, Twitter crawlers | Allow |
| CategoryVerifiedScraping | Price comparison | Count |
| CategoryHttpLibrary | python-requests, curl | Block |
| CategoryAdvertising | Ad bots | Count |
| CategorySecurity | Security scanners | Count |
| CategorySeo | SEO tools | Count |
| SignalAutomatedBrowser | Headless Chrome, Selenium | Block |
| SignalKnownBotDataCenter | Requests from known bot hosting | Block |
| SignalNonBrowserUserAgent | Non-browser user agents | Block |

## Customizing Actions Per Category

You probably don't want to block everything. Search engines should be allowed, SEO tools might be fine, but automated browsers should be challenged.

This overrides specific Bot Control rules to use different actions:

```json
{
  "Name": "AWS-AWSManagedRulesBotControlRuleSet",
  "Priority": 0,
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesBotControlRuleSet",
      "ManagedRuleGroupConfigs": [
        {
          "AWSManagedRulesBotControlRuleSetProperty": {
            "InspectionLevel": "TARGETED"
          }
        }
      ],
      "RuleActionOverrides": [
        {
          "Name": "CategoryVerifiedSearchEngine",
          "ActionToUse": {"Allow": {}}
        },
        {
          "Name": "CategoryVerifiedSocialMedia",
          "ActionToUse": {"Allow": {}}
        },
        {
          "Name": "CategorySeo",
          "ActionToUse": {"Count": {}}
        },
        {
          "Name": "SignalAutomatedBrowser",
          "ActionToUse": {
            "Captcha": {}
          }
        },
        {
          "Name": "CategoryHttpLibrary",
          "ActionToUse": {
            "Challenge": {}
          }
        }
      ]
    }
  },
  "OverrideAction": {"None": {}},
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "BotControl"
  }
}
```

## Using CAPTCHA and Challenge Actions

CAPTCHA presents a visual puzzle. Challenge runs a silent JavaScript challenge (no user interaction).

Configure CAPTCHA immunity time (how long a solved CAPTCHA is valid):

```json
{
  "CaptchaConfig": {
    "ImmunityTimeProperty": {
      "ImmunityTime": 300
    }
  }
}
```

Challenge immunity time:

```json
{
  "ChallengeConfig": {
    "ImmunityTimeProperty": {
      "ImmunityTime": 300
    }
  }
}
```

## Scope-Down Statements

You don't always want bot detection on every request. Use scope-down statements to limit Bot Control to specific URLs.

This applies Bot Control only to your login and API endpoints:

```json
{
  "ManagedRuleGroupStatement": {
    "VendorName": "AWS",
    "Name": "AWSManagedRulesBotControlRuleSet",
    "ScopeDownStatement": {
      "OrStatement": {
        "Statements": [
          {
            "ByteMatchStatement": {
              "SearchString": "/api/",
              "FieldToMatch": {"UriPath": {}},
              "TextTransformations": [{"Priority": 0, "Type": "NONE"}],
              "PositionalConstraint": "STARTS_WITH"
            }
          },
          {
            "ByteMatchStatement": {
              "SearchString": "/login",
              "FieldToMatch": {"UriPath": {}},
              "TextTransformations": [{"Priority": 0, "Type": "NONE"}],
              "PositionalConstraint": "EXACTLY"
            }
          }
        ]
      }
    }
  }
}
```

## Monitoring Bot Traffic

Enable logging to see what Bot Control is doing.

```bash
# Enable WAF logging
aws wafv2 put-logging-configuration \
  --logging-configuration '{
    "ResourceArn": "arn:aws:wafv2:us-east-1:111111111111:regional/webacl/my-web-acl/abc123",
    "LogDestinationConfigs": [
      "arn:aws:s3:::my-waf-logs-bucket"
    ],
    "LoggingFilter": {
      "DefaultBehavior": "KEEP",
      "Filters": [
        {
          "Behavior": "KEEP",
          "Conditions": [
            {
              "LabelNameCondition": {
                "LabelName": "awswaf:managed:aws:bot-control:"
              }
            }
          ],
          "Requirement": "MEETS_ANY"
        }
      ]
    }
  }'
```

## Best Practices

**Start in count mode.** Set all Bot Control rules to count first. Monitor for a week to see what's being flagged. Only switch to block after you've confirmed there are no false positives.

**Don't block verified search engines.** This seems obvious, but it happens. Always allow `CategoryVerifiedSearchEngine`.

**Use targeted mode for sensitive endpoints.** Login pages, checkout flows, and APIs benefit from the deeper analysis. Static content pages probably don't need it.

**Monitor your CAPTCHA solve rates.** Very low solve rates might mean legitimate users are struggling. Very high rates might mean bots are solving them.

**Combine with rate limiting.** Bot Control identifies bots. Rate limiting prevents abuse from anything, bot or human. Use both. See our [WAF Account Takeover Prevention](https://oneuptime.com/blog/post/aws-waf-account-takeover-prevention/view) guide for protecting login pages specifically.

Feed your WAF metrics into [OneUptime](https://oneuptime.com) for unified monitoring of both bot traffic and application performance.
