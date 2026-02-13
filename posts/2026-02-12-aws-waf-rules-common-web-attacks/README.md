# How to Set Up AWS WAF Rules for Common Web Attacks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, WAF, Security, Web Applications

Description: Learn how to configure AWS WAF rules to protect your web applications from common attacks including SQL injection, XSS, path traversal, and request smuggling.

---

Your web application is under attack right now. Bots are scanning for SQL injection vulnerabilities. Scripts are trying cross-site scripting payloads. Automated tools are probing for known exploits. This isn't hypothetical - if you put a web server on the internet and check the logs, you'll see this traffic within minutes.

AWS WAF (Web Application Firewall) sits in front of your application and filters malicious requests before they reach your servers. It works with CloudFront, Application Load Balancers, API Gateway, and AppSync. You define rules that inspect incoming requests, and WAF either allows, blocks, or counts them.

Let me show you how to set up rules for the most common web attacks.

## Understanding WAF Components

Before diving into rules, here's how WAF is structured:

- **Web ACL** - The top-level container. You associate it with a CloudFront distribution, ALB, or API Gateway. Each Web ACL has a list of rules evaluated in order.
- **Rules** - Define what to inspect and what action to take. Rules can be standalone or grouped.
- **Rule Groups** - Collections of rules that you manage together. Both AWS-managed and custom rule groups exist.
- **Statements** - The conditions within a rule that define what to match (IP address, string pattern, regex, etc.)

## Creating a Web ACL

Start by creating a Web ACL. This is the container for all your rules.

```bash
# Create a Web ACL for an ALB (use CLOUDFRONT scope for CloudFront)
aws wafv2 create-web-acl \
  --name my-app-waf \
  --scope REGIONAL \
  --default-action '{"Allow": {}}' \
  --visibility-config '{
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "myAppWAF"
  }' \
  --rules '[]'
```

The default action is what happens to requests that don't match any rules. Setting it to `Allow` means unmatched traffic passes through. You'll add specific blocking rules next.

## SQL Injection Protection

SQL injection is one of the most dangerous web attacks. WAF has built-in detection for SQLi patterns.

```bash
# Create a rule to detect SQL injection in common request fields
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
      "Name": "SQLInjectionProtection",
      "Priority": 1,
      "Statement": {
        "OrStatement": {
          "Statements": [
            {
              "SqliMatchStatement": {
                "FieldToMatch": {"QueryString": {}},
                "TextTransformations": [
                  {"Priority": 0, "Type": "URL_DECODE"},
                  {"Priority": 1, "Type": "HTML_ENTITY_DECODE"}
                ]
              }
            },
            {
              "SqliMatchStatement": {
                "FieldToMatch": {"Body": {"OversizeHandling": "CONTINUE"}},
                "TextTransformations": [
                  {"Priority": 0, "Type": "URL_DECODE"},
                  {"Priority": 1, "Type": "HTML_ENTITY_DECODE"}
                ]
              }
            },
            {
              "SqliMatchStatement": {
                "FieldToMatch": {"UriPath": {}},
                "TextTransformations": [
                  {"Priority": 0, "Type": "URL_DECODE"}
                ]
              }
            }
          ]
        }
      },
      "Action": {"Block": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "SQLInjection"
      }
    }
  ]'
```

The text transformations are important. Attackers encode their payloads to bypass simple pattern matching. URL decoding and HTML entity decoding catch encoded attacks like `%27%20OR%201%3D1` which decodes to `' OR 1=1`.

## Cross-Site Scripting (XSS) Protection

XSS attacks inject JavaScript into your application. WAF can detect common XSS patterns.

Here's the rule definition in JSON format for clarity.

```json
{
  "Name": "XSSProtection",
  "Priority": 2,
  "Statement": {
    "OrStatement": {
      "Statements": [
        {
          "XssMatchStatement": {
            "FieldToMatch": {"QueryString": {}},
            "TextTransformations": [
              {"Priority": 0, "Type": "URL_DECODE"},
              {"Priority": 1, "Type": "HTML_ENTITY_DECODE"}
            ]
          }
        },
        {
          "XssMatchStatement": {
            "FieldToMatch": {"Body": {"OversizeHandling": "CONTINUE"}},
            "TextTransformations": [
              {"Priority": 0, "Type": "URL_DECODE"},
              {"Priority": 1, "Type": "HTML_ENTITY_DECODE"}
            ]
          }
        },
        {
          "XssMatchStatement": {
            "FieldToMatch": {"UriPath": {}},
            "TextTransformations": [
              {"Priority": 0, "Type": "URL_DECODE"}
            ]
          }
        }
      ]
    }
  },
  "Action": {"Block": {}},
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "XSS"
  }
}
```

## Size-Based Restrictions

Unusually large requests are often probes or attacks. Limit request size to what your application actually needs.

```json
{
  "Name": "SizeRestrictions",
  "Priority": 3,
  "Statement": {
    "OrStatement": {
      "Statements": [
        {
          "SizeConstraintStatement": {
            "FieldToMatch": {"UriPath": {}},
            "ComparisonOperator": "GT",
            "Size": 2048,
            "TextTransformations": [{"Priority": 0, "Type": "NONE"}]
          }
        },
        {
          "SizeConstraintStatement": {
            "FieldToMatch": {"QueryString": {}},
            "ComparisonOperator": "GT",
            "Size": 4096,
            "TextTransformations": [{"Priority": 0, "Type": "NONE"}]
          }
        },
        {
          "SizeConstraintStatement": {
            "FieldToMatch": {"Body": {"OversizeHandling": "MATCH"}},
            "ComparisonOperator": "GT",
            "Size": 8192,
            "TextTransformations": [{"Priority": 0, "Type": "NONE"}]
          }
        }
      ]
    }
  },
  "Action": {"Block": {}},
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "SizeRestrictions"
  }
}
```

## IP Reputation Blocking

Block requests from known-bad IP addresses using an IP set.

```bash
# Create an IP set for blocked IPs
aws wafv2 create-ip-set \
  --name blocked-ips \
  --scope REGIONAL \
  --ip-address-version IPV4 \
  --addresses '["198.51.100.0/24", "203.0.113.0/24"]'
```

Then reference it in a rule.

```json
{
  "Name": "BlockBadIPs",
  "Priority": 0,
  "Statement": {
    "IPSetReferenceStatement": {
      "ARN": "arn:aws:wafv2:us-east-1:111111111111:regional/ipset/blocked-ips/abc123"
    }
  },
  "Action": {"Block": {}},
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "BlockedIPs"
  }
}
```

## Geo-Blocking

If your application only serves certain countries, block traffic from everywhere else.

```json
{
  "Name": "GeoRestriction",
  "Priority": 5,
  "Statement": {
    "NotStatement": {
      "Statement": {
        "GeoMatchStatement": {
          "CountryCodes": ["US", "CA", "GB", "DE", "FR"]
        }
      }
    }
  },
  "Action": {"Block": {}},
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "GeoBlock"
  }
}
```

## Terraform Configuration

Here's a comprehensive Terraform setup with multiple protection rules.

```hcl
resource "aws_wafv2_web_acl" "main" {
  name        = "my-app-waf"
  description = "WAF for main application"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # SQL Injection protection
  rule {
    name     = "SQLInjectionProtection"
    priority = 1

    override_action {
      none {}
    }

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

  # XSS protection
  rule {
    name     = "XSSProtection"
    priority = 2

    action {
      block {}
    }

    statement {
      xss_match_statement {
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
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "XSS"
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "myAppWAF"
    sampled_requests_enabled   = true
  }
}

# Associate with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

## Testing Your Rules

Always test rules in Count mode before switching to Block mode. Count mode logs matching requests without blocking them.

```json
{
  "Action": {"Count": {}}
}
```

After running in Count mode for a few days, review the sampled requests in CloudWatch to verify there are no false positives. Then switch to Block.

```bash
# View sampled requests
aws wafv2 get-sampled-requests \
  --web-acl-arn YOUR_WEB_ACL_ARN \
  --rule-metric-name SQLInjection \
  --scope REGIONAL \
  --time-window '{"StartTime": "2026-02-12T00:00:00Z", "EndTime": "2026-02-12T23:59:59Z"}' \
  --max-items 10
```

## Monitoring

Enable WAF logging to see all blocked and allowed requests.

```bash
aws wafv2 put-logging-configuration \
  --logging-configuration '{
    "ResourceArn": "YOUR_WEB_ACL_ARN",
    "LogDestinationConfigs": [
      "arn:aws:s3:::my-waf-logs-bucket"
    ],
    "RedactedFields": [
      {"SingleHeader": {"Name": "authorization"}}
    ]
  }'
```

For a more comprehensive WAF setup, look into [WAF managed rule groups](https://oneuptime.com/blog/post/2026-02-12-waf-managed-rule-groups/view) which provide pre-built protection for common threats, and [rate-limiting rules](https://oneuptime.com/blog/post/2026-02-12-waf-rate-limiting-rules-prevent-ddos/view) to protect against DDoS attacks. For global protection, consider [WAF with CloudFront](https://oneuptime.com/blog/post/2026-02-12-waf-cloudfront-global-protection/view).
