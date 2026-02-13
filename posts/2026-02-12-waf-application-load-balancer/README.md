# How to Set Up WAF with Application Load Balancer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, WAF, ALB, Load Balancer, Security

Description: Learn how to attach AWS WAF to an Application Load Balancer to filter malicious traffic before it reaches your backend services, with practical rule configurations.

---

If you're running a web application behind an Application Load Balancer (ALB), you've already got a single point where all traffic enters your system. That makes it the perfect place to add a web application firewall. By attaching AWS WAF to your ALB, every HTTP/HTTPS request gets inspected before it reaches your EC2 instances, ECS containers, or Lambda functions.

This approach works well when you're not using CloudFront, or when you need region-specific WAF rules that differ from your edge-level protection. Let me walk you through the complete setup from creating the Web ACL to testing and monitoring.

## When to Use WAF on ALB vs CloudFront

Use WAF on ALB when:
- You don't use CloudFront
- You need different WAF rules per region or per ALB
- Your application is internal-facing (behind a VPN or private network)
- You want a second layer of inspection behind CloudFront's WAF

Use [WAF on CloudFront](https://oneuptime.com/blog/post/2026-02-12-waf-cloudfront-global-protection/view) when:
- You want to block traffic at the edge before it reaches your region
- Your application is public-facing and serves a global audience
- You want DDoS protection at the edge

You can also use both - CloudFront WAF for edge-level filtering and ALB WAF for application-specific rules.

## Step 1: Create the Web ACL

For ALB, the Web ACL must be in the same region as your ALB. Use `REGIONAL` scope.

```bash
aws wafv2 create-web-acl \
  --name alb-waf \
  --scope REGIONAL \
  --default-action '{"Allow": {}}' \
  --visibility-config '{
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "ALB-WAF"
  }' \
  --rules '[]' \
  --region us-east-1
```

## Step 2: Add Rules

Here's a practical rule set for a typical web application. I'll add them all at once for clarity.

```bash
WEB_ACL_ID=$(aws wafv2 list-web-acls --scope REGIONAL --region us-east-1 \
  --query 'WebACLs[?Name==`alb-waf`].Id' --output text)

LOCK_TOKEN=$(aws wafv2 get-web-acl --name alb-waf --scope REGIONAL \
  --id $WEB_ACL_ID --region us-east-1 --query 'LockToken' --output text)

aws wafv2 update-web-acl \
  --name alb-waf \
  --scope REGIONAL \
  --region us-east-1 \
  --id $WEB_ACL_ID \
  --lock-token $LOCK_TOKEN \
  --default-action '{"Allow": {}}' \
  --visibility-config '{
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "ALB-WAF"
  }' \
  --rules '[
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
    },
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
        "MetricName": "CommonRules"
      }
    },
    {
      "Name": "AWSSQLi",
      "Priority": 2,
      "OverrideAction": {"None": {}},
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesSQLiRuleSet"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "SQLInjection"
      }
    },
    {
      "Name": "AWSKnownBadInputs",
      "Priority": 3,
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
    },
    {
      "Name": "RateLimit",
      "Priority": 4,
      "Action": {"Block": {}},
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimit"
      }
    },
    {
      "Name": "LoginRateLimit",
      "Priority": 5,
      "Action": {"Block": {}},
      "Statement": {
        "RateBasedStatement": {
          "Limit": 100,
          "AggregateKeyType": "IP",
          "ScopeDownStatement": {
            "ByteMatchStatement": {
              "FieldToMatch": {"UriPath": {}},
              "PositionalConstraint": "STARTS_WITH",
              "SearchString": "/api/auth",
              "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}]
            }
          }
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "LoginRateLimit"
      }
    }
  ]'
```

## Step 3: Associate the Web ACL with Your ALB

```bash
# Get your ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers --names my-app-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Associate the Web ACL
aws wafv2 associate-web-acl \
  --web-acl-arn "arn:aws:wafv2:us-east-1:111111111111:regional/webacl/alb-waf/$WEB_ACL_ID" \
  --resource-arn $ALB_ARN \
  --region us-east-1
```

Verify the association.

```bash
# Check which Web ACL is associated with the ALB
aws wafv2 get-web-acl-for-resource \
  --resource-arn $ALB_ARN \
  --region us-east-1
```

## Step 4: Enable Logging

WAF logging is essential for troubleshooting false positives and analyzing attack patterns. You can log to S3 (via Kinesis Firehose), CloudWatch Logs, or S3 directly.

Using CloudWatch Logs (simplest setup):

```bash
# Create a log group - the name must start with aws-waf-logs-
aws logs create-log-group \
  --log-group-name aws-waf-logs-alb-waf \
  --region us-east-1

# Set retention
aws logs put-retention-policy \
  --log-group-name aws-waf-logs-alb-waf \
  --retention-in-days 30 \
  --region us-east-1

# Enable WAF logging
aws wafv2 put-logging-configuration \
  --region us-east-1 \
  --logging-configuration '{
    "ResourceArn": "arn:aws:wafv2:us-east-1:111111111111:regional/webacl/alb-waf/'$WEB_ACL_ID'",
    "LogDestinationConfigs": [
      "arn:aws:logs:us-east-1:111111111111:log-group:aws-waf-logs-alb-waf"
    ],
    "RedactedFields": [
      {"SingleHeader": {"Name": "authorization"}},
      {"SingleHeader": {"Name": "cookie"}}
    ]
  }'
```

The `RedactedFields` setting ensures sensitive headers aren't included in the logs.

## Adding Custom Rules for Your Application

Beyond managed rule groups, add rules specific to your application. Here are common patterns.

### Block Specific User Agents

Block known-bad bots and scanning tools.

```json
{
  "Name": "BlockBadBots",
  "Priority": 6,
  "Action": {"Block": {}},
  "Statement": {
    "OrStatement": {
      "Statements": [
        {
          "ByteMatchStatement": {
            "FieldToMatch": {"SingleHeader": {"Name": "user-agent"}},
            "PositionalConstraint": "CONTAINS",
            "SearchString": "sqlmap",
            "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}]
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {"SingleHeader": {"Name": "user-agent"}},
            "PositionalConstraint": "CONTAINS",
            "SearchString": "nikto",
            "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}]
          }
        },
        {
          "ByteMatchStatement": {
            "FieldToMatch": {"SingleHeader": {"Name": "user-agent"}},
            "PositionalConstraint": "CONTAINS",
            "SearchString": "nmap",
            "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}]
          }
        }
      ]
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "BlockBadBots"
  }
}
```

### Require Specific Headers

If your API requires an API key header, block requests without it.

```json
{
  "Name": "RequireAPIKey",
  "Priority": 7,
  "Action": {"Block": {}},
  "Statement": {
    "AndStatement": {
      "Statements": [
        {
          "ByteMatchStatement": {
            "FieldToMatch": {"UriPath": {}},
            "PositionalConstraint": "STARTS_WITH",
            "SearchString": "/api/",
            "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}]
          }
        },
        {
          "NotStatement": {
            "Statement": {
              "SizeConstraintStatement": {
                "FieldToMatch": {"SingleHeader": {"Name": "x-api-key"}},
                "ComparisonOperator": "GT",
                "Size": 0,
                "TextTransformations": [{"Priority": 0, "Type": "NONE"}]
              }
            }
          }
        }
      ]
    }
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "RequireAPIKey"
  }
}
```

## Terraform Configuration

Here's the complete Terraform setup.

```hcl
# Web ACL for ALB
resource "aws_wafv2_web_acl" "alb" {
  name        = "alb-waf"
  description = "WAF for Application Load Balancer"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # IP Reputation
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

  # Common rules
  rule {
    name     = "AWSCommonRules"
    priority = 1
    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRules"
    }
  }

  # SQL injection
  rule {
    name     = "AWSSQLi"
    priority = 2
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

  # Rate limiting
  rule {
    name     = "RateLimit"
    priority = 3

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ALB-WAF"
    sampled_requests_enabled   = true
  }
}

# Associate with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.alb.arn
}

# Logging
resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-alb-waf"
  retention_in_days = 30
}

resource "aws_wafv2_web_acl_logging_configuration" "alb" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.alb.arn

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}
```

## Testing Your WAF Rules

Test that rules are working correctly before relying on them in production.

### Test SQL Injection Detection

```bash
# This should be blocked
curl -v "https://your-alb.example.com/api/search?q=1%27+OR+1%3D1--"
# Expected: 403 Forbidden

# This should pass
curl -v "https://your-alb.example.com/api/search?q=normal+search+term"
# Expected: 200 OK
```

### Test Rate Limiting

```bash
# Rapidly send requests to trigger rate limiting
for i in $(seq 1 2100); do
  curl -s -o /dev/null -w "%{http_code}" "https://your-alb.example.com/health" &
done
wait
# After ~2000 requests in 5 minutes, subsequent requests should get 429
```

### Check Sampled Requests

```bash
aws wafv2 get-sampled-requests \
  --web-acl-arn "arn:aws:wafv2:us-east-1:111111111111:regional/webacl/alb-waf/$WEB_ACL_ID" \
  --rule-metric-name CommonRules \
  --scope REGIONAL \
  --time-window '{"StartTime": "2026-02-12T00:00:00Z", "EndTime": "2026-02-12T23:59:59Z"}' \
  --max-items 10 \
  --region us-east-1
```

## Monitoring with CloudWatch

Set up CloudWatch alarms to alert on unusual WAF activity.

```bash
# Alert when blocked requests spike
aws cloudwatch put-metric-alarm \
  --alarm-name waf-high-block-rate \
  --metric-name BlockedRequests \
  --namespace AWS/WAFV2 \
  --statistic Sum \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions "Name=WebACL,Value=alb-waf" "Name=Rule,Value=ALL" "Name=Region,Value=us-east-1" \
  --alarm-actions arn:aws:sns:us-east-1:111111111111:security-alerts
```

## Troubleshooting Common Issues

**WAF blocks legitimate requests** - Check the sampled requests to see which rule triggered. Set that specific rule to Count mode, investigate, and either exclude the rule or adjust your application.

**Association fails** - Make sure the Web ACL and ALB are in the same region. Also verify the ALB type - WAF only works with Application Load Balancers, not Network Load Balancers.

**Logging not working** - The CloudWatch Logs log group name must start with `aws-waf-logs-`. This is a requirement.

**Rules not taking effect** - After updating rules, it can take a minute or two for changes to propagate. Also check rule priorities - lower numbers are evaluated first.

For complementary protection, explore [WAF managed rule groups](https://oneuptime.com/blog/post/2026-02-12-waf-managed-rule-groups/view) and [rate-limiting strategies](https://oneuptime.com/blog/post/2026-02-12-waf-rate-limiting-rules-prevent-ddos/view). For global applications, consider adding [CloudFront with WAF](https://oneuptime.com/blog/post/2026-02-12-waf-cloudfront-global-protection/view) as an additional layer.
