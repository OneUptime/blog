# How to Create WAF Rate-Limiting Rules to Prevent DDoS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, WAF, DDoS, Rate Limiting, Security

Description: Learn how to configure AWS WAF rate-based rules to protect your applications from DDoS attacks, brute force attempts, and abusive traffic patterns.

---

A rate-limiting rule is the single most effective WAF rule you can deploy. Without it, a single attacker can hammer your API with thousands of requests per second, overwhelming your backend, running up your AWS bill, and degrading the experience for legitimate users. Rate-based rules automatically block IPs that exceed a request threshold you define.

AWS WAF rate-based rules track the request rate from individual IP addresses over a 5-minute window. When an IP exceeds your threshold, WAF blocks it automatically. When the rate drops below the threshold, WAF unblocks it. No manual intervention needed.

## How Rate-Based Rules Work

WAF evaluates rate-based rules on a rolling 5-minute window. If you set a threshold of 2,000 requests, any IP sending more than 2,000 requests in any 5-minute period gets blocked until its rate drops below the threshold.

Key details:
- The minimum threshold is 100 requests per 5 minutes
- Evaluation happens continuously, not at fixed 5-minute boundaries
- Blocked IPs are automatically unblocked when their rate decreases
- You can combine rate limits with other conditions (like specific URL paths)

## Basic Rate Limiting

Here's a straightforward rate limit that blocks any IP sending more than 2,000 requests in 5 minutes.

```bash
# Create a rate-based rule in your Web ACL
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
      "Name": "RateLimit2000",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {"Block": {}},
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimit"
      }
    }
  ]'
```

## Rate Limiting Specific Endpoints

Your login page, API endpoints, and search functionality are common DDoS targets. Apply tighter rate limits to these paths.

### Login Endpoint Protection

Brute force login attacks are extremely common. Apply a strict rate limit to your authentication endpoint.

```json
{
  "Name": "LoginRateLimit",
  "Priority": 2,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 100,
      "AggregateKeyType": "IP",
      "ScopeDownStatement": {
        "AndStatement": {
          "Statements": [
            {
              "ByteMatchStatement": {
                "FieldToMatch": {"UriPath": {}},
                "PositionalConstraint": "STARTS_WITH",
                "SearchString": "/api/login",
                "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}]
              }
            },
            {
              "ByteMatchStatement": {
                "FieldToMatch": {"Method": {}},
                "PositionalConstraint": "EXACTLY",
                "SearchString": "POST",
                "TextTransformations": [{"Priority": 0, "Type": "NONE"}]
              }
            }
          ]
        }
      }
    }
  },
  "Action": {"Block": {}},
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "LoginRateLimit"
  }
}
```

This blocks any IP that sends more than 100 POST requests to `/api/login` in 5 minutes. That's way more than a legitimate user would send, even if they're struggling with their password.

### API Rate Limiting

Protect your API endpoints from abuse.

```json
{
  "Name": "APIRateLimit",
  "Priority": 3,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 1000,
      "AggregateKeyType": "IP",
      "ScopeDownStatement": {
        "ByteMatchStatement": {
          "FieldToMatch": {"UriPath": {}},
          "PositionalConstraint": "STARTS_WITH",
          "SearchString": "/api/",
          "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}]
        }
      }
    }
  },
  "Action": {"Block": {}},
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "APIRateLimit"
  }
}
```

### Search Endpoint Protection

Search queries can be expensive for your backend. Rate limit aggressively.

```json
{
  "Name": "SearchRateLimit",
  "Priority": 4,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 200,
      "AggregateKeyType": "IP",
      "ScopeDownStatement": {
        "ByteMatchStatement": {
          "FieldToMatch": {"UriPath": {}},
          "PositionalConstraint": "CONTAINS",
          "SearchString": "/search",
          "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}]
        }
      }
    }
  },
  "Action": {"Block": {}},
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "SearchRateLimit"
  }
}
```

## Advanced: Rate Limiting by Custom Keys

WAF supports rate limiting by multiple keys, not just IP address. This lets you create more sophisticated rules.

### Rate Limit by IP + URI

Different rate limits for different URLs, where the rate is tracked per IP per URL.

```json
{
  "Name": "PerPathRateLimit",
  "Priority": 5,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 500,
      "AggregateKeyType": "CUSTOM_KEYS",
      "CustomKeys": [
        {
          "IP": {}
        },
        {
          "UriPath": {
            "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}]
          }
        }
      ]
    }
  },
  "Action": {"Block": {}},
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "PerPathRateLimit"
  }
}
```

### Rate Limit by Header Value

If your API uses API keys or account IDs in headers, rate limit per key.

```json
{
  "Name": "PerAPIKeyRateLimit",
  "Priority": 6,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 5000,
      "AggregateKeyType": "CUSTOM_KEYS",
      "CustomKeys": [
        {
          "Header": {
            "Name": "X-API-Key",
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
    "MetricName": "PerAPIKeyRateLimit"
  }
}
```

## Custom Response for Rate-Limited Requests

Instead of the default WAF block response, return a helpful error message.

```json
{
  "Action": {
    "Block": {
      "CustomResponse": {
        "ResponseCode": 429,
        "ResponseHeaders": [
          {
            "Name": "Retry-After",
            "Value": "300"
          }
        ],
        "CustomResponseBodyKey": "rate-limited"
      }
    }
  }
}
```

Define the custom response body in the Web ACL.

```bash
aws wafv2 update-web-acl \
  --name my-app-waf \
  --scope REGIONAL \
  --id YOUR_WEB_ACL_ID \
  --lock-token YOUR_LOCK_TOKEN \
  --default-action '{"Allow": {}}' \
  --custom-response-bodies '{
    "rate-limited": {
      "ContentType": "APPLICATION_JSON",
      "Content": "{\"error\": \"Too many requests. Please try again later.\", \"retry_after\": 300}"
    }
  }' \
  --visibility-config '{
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "myAppWAF"
  }' \
  --rules '[...]'
```

## Terraform Configuration

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "my-app-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Global rate limit
  rule {
    name     = "GlobalRateLimit"
    priority = 1

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
      metric_name                = "GlobalRateLimit"
    }
  }

  # Login rate limit
  rule {
    name     = "LoginRateLimit"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
          and_statement {
            statement {
              byte_match_statement {
                field_to_match {
                  uri_path {}
                }
                positional_constraint = "STARTS_WITH"
                search_string         = "/api/login"
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }
            statement {
              byte_match_statement {
                field_to_match {
                  method {}
                }
                positional_constraint = "EXACTLY"
                search_string         = "POST"
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
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "LoginRateLimit"
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "myAppWAF"
    sampled_requests_enabled   = true
  }
}
```

## Monitoring Rate-Limited IPs

Track which IPs are getting blocked and how often.

```bash
# View IPs currently being rate limited
aws wafv2 get-rate-based-statement-managed-keys \
  --scope REGIONAL \
  --web-acl-name my-app-waf \
  --web-acl-id YOUR_WEB_ACL_ID \
  --rule-name RateLimit2000

# View sampled blocked requests
aws wafv2 get-sampled-requests \
  --web-acl-arn YOUR_WEB_ACL_ARN \
  --rule-metric-name RateLimit \
  --scope REGIONAL \
  --time-window '{"StartTime": "2026-02-12T00:00:00Z", "EndTime": "2026-02-12T23:59:59Z"}' \
  --max-items 20
```

## Choosing the Right Thresholds

Setting rate limits too low blocks legitimate users. Too high and attacks get through. Here's a practical approach:

1. **Start with Count mode** to see actual traffic patterns
2. **Check your current peak traffic** per IP per 5 minutes
3. **Set the initial threshold at 5x your normal peak** to give plenty of headroom
4. **Gradually lower it** while monitoring for false positives
5. **Use tighter limits for sensitive endpoints** (login, API, search) than for static content

For broader protection, combine rate limiting with [WAF rules for common web attacks](https://oneuptime.com/blog/post/2026-02-12-aws-waf-rules-common-web-attacks/view) and [managed rule groups](https://oneuptime.com/blog/post/2026-02-12-waf-managed-rule-groups/view). For global applications, deploy [WAF with CloudFront](https://oneuptime.com/blog/post/2026-02-12-waf-cloudfront-global-protection/view) for edge-level rate limiting.
