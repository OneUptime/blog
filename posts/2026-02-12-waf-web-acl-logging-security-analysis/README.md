# How to Use WAF Web ACL Logging for Security Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, WAF, Security, Logging, CloudWatch

Description: Learn how to enable and use AWS WAF Web ACL logging to analyze security events, detect threats, and protect your web applications from malicious traffic.

---

AWS WAF is your first line of defense against web-based attacks. But running WAF without logging is like having a security camera that doesn't record - you're blocking threats but have no idea what's actually happening. Web ACL logging gives you full visibility into every request WAF evaluates, letting you analyze patterns, tune rules, and build a solid security posture.

In this guide, we'll walk through setting up WAF logging, choosing the right destination, and actually using those logs for meaningful security analysis.

## Why WAF Logging Matters

Every request that hits your WAF-protected resource gets evaluated against your Web ACL rules. Without logging, you only see aggregate metrics - counts of allowed and blocked requests. That's not enough when you need to:

- Investigate a specific attack pattern
- Determine if legitimate traffic is being blocked (false positives)
- Build custom detection rules based on real traffic
- Satisfy compliance requirements for audit trails
- Correlate WAF events with other security signals

WAF logs capture the full request details including headers, the rule that matched, the action taken, and the source IP. That's powerful data for security analysis.

## Setting Up WAF Logging

WAF supports three logging destinations: Amazon S3, CloudWatch Logs, and Kinesis Data Firehose. Each has different tradeoffs we'll cover shortly. First, let's set up the basics.

Here's how to enable WAF logging using the AWS CLI. The log group name must start with `aws-waf-logs-` for CloudWatch Logs.

```bash
# Create a CloudWatch log group for WAF logs
aws logs create-log-group \
  --log-group-name aws-waf-logs-my-web-acl

# Set retention to 90 days to manage costs
aws logs put-retention-policy \
  --log-group-name aws-waf-logs-my-web-acl \
  --retention-in-days 90
```

Now enable logging on your Web ACL. You'll need the ARN of your log destination.

```bash
# Get the ARN of your CloudWatch log group
LOG_GROUP_ARN=$(aws logs describe-log-groups \
  --log-group-name-prefix aws-waf-logs-my-web-acl \
  --query 'logGroups[0].arn' \
  --output text)

# Enable logging on the Web ACL
aws wafv2 put-logging-configuration \
  --logging-configuration '{
    "ResourceArn": "arn:aws:wafv2:us-east-1:123456789012:regional/webacl/my-web-acl/abc123",
    "LogDestinationConfigs": ["'"$LOG_GROUP_ARN"'"]
  }'
```

## Choosing Your Log Destination

Each destination serves a different use case. Here's a quick breakdown.

**CloudWatch Logs** works best when you want real-time analysis with CloudWatch Insights queries. It's the simplest to set up and great for teams already using CloudWatch. Costs can add up with high traffic volumes though.

**S3** is ideal for long-term storage and compliance. Logs land in S3 where you can query them with Athena or feed them into a SIEM. It's the cheapest option for high-volume logging.

**Kinesis Data Firehose** gives you the most flexibility. You can transform logs in transit and deliver them to S3, Redshift, Elasticsearch, or third-party tools.

For most teams getting started, CloudWatch Logs is the right choice. You can always add S3 as a secondary destination later.

## Using Terraform for Infrastructure as Code

If you're managing infrastructure with Terraform, here's how to set up WAF logging properly.

```hcl
# Define the CloudWatch log group for WAF
resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "aws-waf-logs-production"
  retention_in_days = 90

  tags = {
    Environment = "production"
    Purpose     = "waf-security-logs"
  }
}

# Create a resource policy allowing WAF to write logs
resource "aws_cloudwatch_log_resource_policy" "waf_logging" {
  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.waf_logs.arn}:*"
      }
    ]
  })
  policy_name = "waf-logging-policy"
}

# Enable logging on the Web ACL
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]
  resource_arn            = aws_wafv2_web_acl.main.arn

  # Optional: filter logs to only capture blocked requests
  logging_filter {
    default_behavior = "DROP"

    filter {
      behavior    = "KEEP"
      requirement = "MEETS_ANY"

      condition {
        action_condition {
          action = "BLOCK"
        }
      }

      condition {
        action_condition {
          action = "COUNT"
        }
      }
    }
  }
}
```

The logging filter above is useful for reducing costs. Instead of logging every single request, you only capture blocked and counted requests - which are usually the interesting ones for security analysis.

## Analyzing Logs with CloudWatch Insights

CloudWatch Insights is where WAF logging gets really powerful. Here are some queries I use regularly.

This query finds the top IP addresses getting blocked in the last 24 hours.

```
# Top 10 blocked IPs in the last 24 hours
fields @timestamp, httpRequest.clientIp, httpRequest.uri
| filter action = "BLOCK"
| stats count(*) as requestCount by httpRequest.clientIp
| sort requestCount desc
| limit 10
```

This next query helps you identify which rules are firing the most, so you can tune them.

```
# Rule match frequency - which rules are doing the most work
fields @timestamp, terminatingRuleId
| filter action = "BLOCK"
| stats count(*) as matchCount by terminatingRuleId
| sort matchCount desc
| limit 20
```

When investigating a specific IP, this query pulls all their requests.

```
# Investigate a specific suspicious IP
fields @timestamp, httpRequest.uri, httpRequest.httpMethod,
       terminatingRuleId, action, httpRequest.country
| filter httpRequest.clientIp = "203.0.113.42"
| sort @timestamp desc
| limit 100
```

And this one helps detect potential SQL injection or XSS attempts by looking at query strings.

```
# Find requests with suspicious query strings
fields @timestamp, httpRequest.clientIp, httpRequest.uri,
       httpRequest.args
| filter action = "BLOCK"
| filter terminatingRuleId like /SQLi|XSS|CrossSite/
| sort @timestamp desc
| limit 50
```

## Building Security Dashboards

Raw queries are great for investigation, but you'll want dashboards for ongoing monitoring. Create a CloudWatch dashboard that tracks key metrics.

Here's a CloudFormation snippet for a basic WAF security dashboard.

```yaml
Resources:
  WAFSecurityDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: WAF-Security-Overview
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "log",
              "properties": {
                "query": "SOURCE 'aws-waf-logs-production' | fields @timestamp | filter action = 'BLOCK' | stats count() as blocks by bin(5m)",
                "region": "${AWS::Region}",
                "title": "Blocked Requests (5min intervals)",
                "view": "timeSeries"
              }
            },
            {
              "type": "log",
              "properties": {
                "query": "SOURCE 'aws-waf-logs-production' | filter action = 'BLOCK' | stats count() by httpRequest.country | sort count() desc | limit 10",
                "region": "${AWS::Region}",
                "title": "Top Blocked Countries",
                "view": "bar"
              }
            }
          ]
        }
```

## Setting Up Alerts

Dashboards help you spot trends, but you need alerts for real-time response. Set up CloudWatch alarms for anomalous blocking patterns.

This metric filter catches spikes in blocked requests that might indicate an active attack.

```bash
# Create a metric filter for blocked requests
aws logs put-metric-filter \
  --log-group-name aws-waf-logs-my-web-acl \
  --filter-name BlockedRequests \
  --filter-pattern '{ $.action = "BLOCK" }' \
  --metric-transformations \
    metricName=WAFBlockedRequests,metricNamespace=WAFSecurity,metricValue=1

# Create an alarm that triggers when blocks spike
aws cloudwatch put-metric-alarm \
  --alarm-name WAF-High-Block-Rate \
  --metric-name WAFBlockedRequests \
  --namespace WAFSecurity \
  --statistic Sum \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts
```

## Log Filtering Best Practices

At scale, logging every request gets expensive fast. Here are some practical approaches.

**Start with full logging** when you're first setting up or tuning rules. You need the complete picture to make good decisions.

**Switch to filtered logging** once your rules are stable. Log only BLOCK and COUNT actions. This typically cuts log volume by 80-90%.

**Use redacted fields** to strip sensitive data. WAF lets you redact specific headers or query parameters from logs.

```bash
# Enable logging with field redaction
aws wafv2 put-logging-configuration \
  --logging-configuration '{
    "ResourceArn": "arn:aws:wafv2:us-east-1:123456789012:regional/webacl/my-web-acl/abc123",
    "LogDestinationConfigs": ["arn:aws:logs:us-east-1:123456789012:log-group:aws-waf-logs-my-web-acl"],
    "RedactedFields": [
      {"SingleHeader": {"Name": "authorization"}},
      {"SingleHeader": {"Name": "cookie"}}
    ]
  }'
```

## Integrating with Your Security Stack

WAF logs become even more valuable when you combine them with other security data. Consider feeding them into Amazon Security Lake or a SIEM like Splunk or Elastic. You can correlate WAF blocks with VPC Flow Logs, CloudTrail events, and GuardDuty findings to get a complete picture of an attack.

If you're building a monitoring pipeline, check out our guide on [AWS CloudWatch monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view) for more on centralized observability.

## Wrapping Up

WAF logging isn't just a checkbox for compliance - it's the foundation of web application security analysis on AWS. Start with CloudWatch Logs for simplicity, build useful queries, set up dashboards and alerts, and evolve your setup as your traffic patterns change. The key is making sure you're not just blocking threats, but learning from them to continuously improve your security posture.
