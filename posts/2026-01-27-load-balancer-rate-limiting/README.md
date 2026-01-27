# How to Implement Load Balancer Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Load Balancing, Rate Limiting, HAProxy, Nginx, AWS ALB, WAF, Traffic Management, DDoS Protection, API Security

Description: A comprehensive guide to implementing rate limiting at the load balancer level using HAProxy, Nginx, AWS ALB with WAF rules, and other cloud load balancer options.

---

> Rate limiting at the load balancer is your first line of defense - it protects your entire backend infrastructure before malicious or excessive traffic ever reaches your application servers.

Modern web applications face constant threats from traffic spikes, DDoS attacks, and API abuse. While application-level rate limiting is important, implementing rate limiting at the load balancer level provides a more efficient and scalable solution. This guide covers the essential algorithms, practical configurations, and best practices for rate limiting across popular load balancers.

---

## Understanding Rate Limiting Algorithms

Before diving into configurations, understanding the core algorithms helps you choose the right approach for your use case.

### Token Bucket Algorithm

The token bucket algorithm is one of the most popular rate limiting strategies. It works by maintaining a bucket of tokens that refills at a constant rate. Each request consumes a token, and requests are rejected when the bucket is empty.

```
# Token Bucket Conceptual Model
#
# Bucket Capacity: 100 tokens
# Refill Rate: 10 tokens/second
#
# Timeline:
# t=0:  Bucket has 100 tokens
# t=0:  Burst of 80 requests -> 20 tokens remain
# t=1:  Refill adds 10 tokens -> 30 tokens
# t=2:  Refill adds 10 tokens -> 40 tokens
# ...
#
# Allows bursts up to bucket capacity while maintaining
# average rate equal to refill rate
```

**Use case:** APIs that need to allow short bursts while maintaining an average rate.

### Leaky Bucket Algorithm

The leaky bucket processes requests at a fixed rate, regardless of how fast they arrive. Excess requests queue up (up to a limit) or are dropped.

```
# Leaky Bucket Conceptual Model
#
# Processing Rate: 10 requests/second
# Queue Size: 50 requests
#
# Incoming requests fill the bucket
# Bucket "leaks" at constant rate (processed)
# Overflow is rejected
#
# Provides smooth, predictable output rate
```

**Use case:** Services requiring smooth, consistent throughput.

### Sliding Window Algorithm

The sliding window algorithm tracks requests over a rolling time window, providing more accurate rate limiting than fixed windows.

```
# Sliding Window Log
#
# Window: 60 seconds
# Limit: 100 requests
#
# Tracks timestamp of each request
# Counts requests within window from current time
# More memory intensive but more accurate
#
# Sliding Window Counter (hybrid)
#
# Combines fixed windows with weighted counting
# Current window count + (previous window count * overlap %)
# Memory efficient approximation
```

**Use case:** APIs needing precise rate limiting without allowing boundary exploitation.

---

## HAProxy Rate Limiting

HAProxy provides powerful rate limiting through stick tables, which track connection metadata in memory.

### Basic Connection Rate Limiting

```haproxy
# /etc/haproxy/haproxy.cfg
#
# Global settings for HAProxy rate limiting

global
    log /dev/log local0
    maxconn 50000
    # Enable stats socket for runtime management
    stats socket /var/run/haproxy.sock mode 600 level admin

defaults
    mode http
    log global
    option httplog
    option dontlognull
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

# Frontend configuration with rate limiting
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/combined.pem

    # Define stick table for tracking request rates per IP
    # - type ip: Track by client IP address
    # - size 1m: Store up to 1 million entries
    # - expire 30s: Entries expire after 30 seconds of inactivity
    # - store http_req_rate(10s): Track HTTP request rate over 10-second window
    stick-table type ip size 1m expire 30s store http_req_rate(10s)

    # Track client IP in stick table
    http-request track-sc0 src

    # Deny if client exceeds 100 requests in 10 seconds
    # sc_http_req_rate(0) returns the request rate for stick counter 0
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }

    # Add rate limit headers for client visibility
    http-response set-header X-RateLimit-Limit 100
    http-response set-header X-RateLimit-Remaining %[sc_http_req_rate(0),neg,add(100)]

    default_backend app_servers

backend app_servers
    balance roundrobin
    server app1 10.0.1.10:8080 check
    server app2 10.0.1.11:8080 check
    server app3 10.0.1.12:8080 check
```

### Advanced Multi-Tier Rate Limiting

```haproxy
# /etc/haproxy/haproxy.cfg
#
# Multi-tier rate limiting with different limits per endpoint

frontend http_front
    bind *:443 ssl crt /etc/ssl/certs/combined.pem

    # Stick table for general API rate limiting (per IP)
    stick-table type ip size 1m expire 60s store http_req_rate(60s),conn_cur,bytes_out_rate(60s)

    # Stick table for authentication endpoints (stricter limits)
    stick-table type ip size 500k expire 300s store http_req_rate(300s) name auth_table

    # Stick table for API key based limiting
    stick-table type string len 64 size 100k expire 3600s store http_req_rate(3600s) name apikey_table

    # Track all requests by source IP
    http-request track-sc0 src

    # Track auth endpoint requests separately
    http-request track-sc1 src table auth_table if { path_beg /api/auth /api/login /api/register }

    # Track by API key if present in header
    http-request track-sc2 req.hdr(X-API-Key) table apikey_table if { req.hdr(X-API-Key) -m found }

    # Rate limit rules (evaluated in order)

    # Block IPs making too many concurrent connections (potential DDoS)
    http-request deny deny_status 429 if { sc_conn_cur(0) gt 50 }

    # Block IPs with excessive bandwidth usage (1GB/minute)
    http-request deny deny_status 429 if { sc_bytes_out_rate(0) gt 1073741824 }

    # Strict limit on auth endpoints: 10 requests per 5 minutes
    http-request deny deny_status 429 if { sc_http_req_rate(1) gt 10 }

    # API key limit: 10000 requests per hour
    http-request deny deny_status 429 if { sc_http_req_rate(2) gt 10000 }

    # General limit: 1000 requests per minute
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 1000 }

    # ACL for different backends
    acl is_api path_beg /api
    acl is_static path_beg /static /assets /images

    use_backend api_servers if is_api
    use_backend static_servers if is_static
    default_backend web_servers

backend api_servers
    balance leastconn
    option httpchk GET /health
    server api1 10.0.2.10:8080 check inter 5s fall 3 rise 2
    server api2 10.0.2.11:8080 check inter 5s fall 3 rise 2

backend web_servers
    balance roundrobin
    server web1 10.0.3.10:8080 check
    server web2 10.0.3.11:8080 check

backend static_servers
    balance roundrobin
    server static1 10.0.4.10:80 check
    server static2 10.0.4.11:80 check
```

### HAProxy Stick Table Runtime Management

```bash
# View current stick table entries
echo "show table http_front" | socat stdio /var/run/haproxy.sock

# Clear specific IP from table
echo "clear table http_front key 192.168.1.100" | socat stdio /var/run/haproxy.sock

# View table statistics
echo "show table http_front" | socat stdio /var/run/haproxy.sock | head -20

# Set a specific entry (useful for manual blocking)
echo "set table http_front key 192.168.1.100 data.http_req_rate 99999" | socat stdio /var/run/haproxy.sock
```

---

## Nginx Rate Limiting

Nginx provides rate limiting through the `ngx_http_limit_req_module` module, offering both request rate limiting and connection limiting.

### Basic Request Rate Limiting

```nginx
# /etc/nginx/nginx.conf
#
# Basic Nginx rate limiting configuration

# Define rate limiting zones in http context
# Zone: memory zone name and size (10MB stores ~160,000 states)
# Rate: requests per second (can use r/s or r/m)

http {
    # Rate limit zone based on client IP
    # $binary_remote_addr is more efficient than $remote_addr (uses less memory)
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

    # Separate zone for API endpoints with higher limits
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;

    # Zone for login/auth with strict limits
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    # Connection limit zone
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # Custom log format for rate limit events
    log_format ratelimit '$remote_addr - $remote_user [$time_local] '
                         '"$request" $status $body_bytes_sent '
                         '"$http_referer" "$http_user_agent" '
                         'rate_limit_status=$limit_req_status';

    server {
        listen 80;
        listen 443 ssl http2;
        server_name api.example.com;

        ssl_certificate /etc/ssl/certs/server.crt;
        ssl_certificate_key /etc/ssl/private/server.key;

        # Apply connection limit
        limit_conn conn_limit 20;

        # Default rate limit for all requests
        # burst=20: Allow up to 20 requests to queue
        # nodelay: Process burst requests immediately (no queuing delay)
        limit_req zone=general burst=20 nodelay;

        # Return 429 instead of default 503
        limit_req_status 429;
        limit_conn_status 429;

        # Use custom log format
        access_log /var/log/nginx/access.log ratelimit;

        # API endpoints with higher limits
        location /api/ {
            limit_req zone=api burst=50 nodelay;

            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Auth endpoints with strict limits
        location ~ ^/(login|register|reset-password) {
            limit_req zone=auth burst=5;

            proxy_pass http://auth_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Health check endpoint - no rate limiting
        location /health {
            limit_req off;
            return 200 'OK';
            add_header Content-Type text/plain;
        }

        location / {
            proxy_pass http://web_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # Upstream definitions
    upstream api_backend {
        least_conn;
        server 10.0.1.10:8080 weight=5;
        server 10.0.1.11:8080 weight=5;
        keepalive 32;
    }

    upstream auth_backend {
        server 10.0.2.10:8080;
        server 10.0.2.11:8080;
    }

    upstream web_backend {
        server 10.0.3.10:8080;
        server 10.0.3.11:8080;
    }
}
```

### Advanced Rate Limiting with Multiple Keys

```nginx
# /etc/nginx/conf.d/rate-limiting.conf
#
# Advanced rate limiting using multiple variables

# Rate limit by IP
limit_req_zone $binary_remote_addr zone=per_ip:10m rate=10r/s;

# Rate limit by API key (from header)
# map creates a variable from the header value
map $http_x_api_key $api_key {
    default $http_x_api_key;
    ""      "no_key";
}
limit_req_zone $api_key zone=per_apikey:10m rate=1000r/m;

# Rate limit by combination of IP and URI
# Prevents single IP from hammering one endpoint
limit_req_zone $binary_remote_addr$uri zone=per_ip_uri:20m rate=5r/s;

# Whitelist certain IPs from rate limiting
geo $rate_limit_whitelist {
    default         1;
    10.0.0.0/8      0;  # Internal networks
    192.168.0.0/16  0;
    127.0.0.1       0;  # Localhost
}

# Create a variable that's empty for whitelisted IPs
map $rate_limit_whitelist $rate_limit_key {
    0   "";
    1   $binary_remote_addr;
}

limit_req_zone $rate_limit_key zone=with_whitelist:10m rate=10r/s;

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # Apply rate limit only to non-whitelisted IPs
    # Empty key means no tracking/limiting
    limit_req zone=with_whitelist burst=20 nodelay;

    location /api/v1/ {
        # Layer multiple rate limits
        # All limits must pass for request to proceed
        limit_req zone=per_ip burst=10 nodelay;
        limit_req zone=per_apikey burst=100 nodelay;
        limit_req zone=per_ip_uri burst=5;

        # Add rate limit headers
        add_header X-RateLimit-Limit "10 per second" always;

        proxy_pass http://api_backend;
    }

    # Different tiers based on API key prefix
    location /api/v2/ {
        # Use map to determine tier
        set $tier "standard";
        if ($http_x_api_key ~ "^premium_") {
            set $tier "premium";
        }

        # Apply appropriate rate limit based on tier
        # (In practice, use separate location blocks or Lua)
        limit_req zone=per_ip burst=20 nodelay;

        proxy_pass http://api_v2_backend;
    }
}
```

### Nginx Rate Limit with Custom Error Response

```nginx
# /etc/nginx/conf.d/rate-limit-errors.conf
#
# Custom error responses for rate limiting

server {
    listen 443 ssl http2;
    server_name api.example.com;

    limit_req zone=api burst=20 nodelay;
    limit_req_status 429;

    # Custom error page for rate limiting
    error_page 429 = @rate_limited;

    location @rate_limited {
        default_type application/json;
        return 429 '{
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after": 60,
            "documentation_url": "https://docs.example.com/rate-limits"
        }';
    }

    location /api/ {
        proxy_pass http://api_backend;

        # Add Retry-After header on 429 responses
        # This is handled in the error_page location
    }
}
```

---

## AWS ALB with WAF Rate Limiting

AWS Application Load Balancer combined with AWS WAF provides managed rate limiting at scale.

### WAF Rate-Based Rule Configuration

```json
{
    "Name": "RateLimitRule",
    "Priority": 1,
    "Statement": {
        "RateBasedStatement": {
            "Limit": 2000,
            "AggregateKeyType": "IP",
            "ScopeDownStatement": {
                "ByteMatchStatement": {
                    "SearchString": "/api/",
                    "FieldToMatch": {
                        "UriPath": {}
                    },
                    "TextTransformations": [
                        {
                            "Priority": 0,
                            "Type": "LOWERCASE"
                        }
                    ],
                    "PositionalConstraint": "STARTS_WITH"
                }
            }
        }
    },
    "Action": {
        "Block": {
            "CustomResponse": {
                "ResponseCode": 429,
                "CustomResponseBodyKey": "rate-limit-body",
                "ResponseHeaders": [
                    {
                        "Name": "Retry-After",
                        "Value": "300"
                    }
                ]
            }
        }
    },
    "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitRule"
    }
}
```

### Terraform Configuration for AWS WAF Rate Limiting

```hcl
# aws-waf-rate-limiting.tf
#
# Terraform configuration for AWS WAF with rate limiting rules

# WAF Web ACL with rate limiting rules
resource "aws_wafv2_web_acl" "api_rate_limit" {
  name        = "api-rate-limiting"
  description = "Rate limiting for API endpoints"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Custom response body for rate limited requests
  custom_response_body {
    key          = "rate-limit-body"
    content      = jsonencode({
      error   = "rate_limit_exceeded"
      message = "You have exceeded the rate limit. Please try again later."
      retry_after = 300
    })
    content_type = "APPLICATION_JSON"
  }

  # Rule 1: Strict rate limit for authentication endpoints
  rule {
    name     = "auth-endpoint-rate-limit"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        # 100 requests per 5-minute window per IP
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string = "/api/auth"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "STARTS_WITH"
              }
            }
            statement {
              byte_match_statement {
                search_string = "/api/login"
                field_to_match {
                  uri_path {}
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "STARTS_WITH"
              }
            }
          }
        }
      }
    }

    action {
      block {
        custom_response {
          response_code            = 429
          custom_response_body_key = "rate-limit-body"
          response_header {
            name  = "Retry-After"
            value = "300"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AuthRateLimit"
      sampled_requests_enabled  = true
    }
  }

  # Rule 2: General API rate limit
  rule {
    name     = "api-general-rate-limit"
    priority = 2

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        # 2000 requests per 5-minute window per IP
        limit              = 2000
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string = "/api/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "STARTS_WITH"
          }
        }
      }
    }

    action {
      block {
        custom_response {
          response_code            = 429
          custom_response_body_key = "rate-limit-body"
          response_header {
            name  = "Retry-After"
            value = "60"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "APIGeneralRateLimit"
      sampled_requests_enabled  = true
    }
  }

  # Rule 3: Rate limit by forwarded IP (behind CDN/proxy)
  rule {
    name     = "forwarded-ip-rate-limit"
    priority = 3

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = 5000
        aggregate_key_type = "FORWARDED_IP"

        forwarded_ip_config {
          header_name       = "X-Forwarded-For"
          fallback_behavior = "MATCH"
        }
      }
    }

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "ForwardedIPRateLimit"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "APIWebACL"
    sampled_requests_enabled  = true
  }

  tags = {
    Environment = "production"
    Purpose     = "rate-limiting"
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "alb_association" {
  resource_arn = aws_lb.api_alb.arn
  web_acl_arn  = aws_wafv2_web_acl.api_rate_limit.arn
}

# CloudWatch alarm for rate limiting events
resource "aws_cloudwatch_metric_alarm" "rate_limit_alarm" {
  alarm_name          = "high-rate-limit-blocks"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "High number of rate-limited requests detected"

  dimensions = {
    WebACL = aws_wafv2_web_acl.api_rate_limit.name
    Rule   = "api-general-rate-limit"
    Region = var.aws_region
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

---

## Cloud Load Balancer Options

Different cloud providers offer various rate limiting capabilities at the load balancer level.

### Google Cloud Armor Rate Limiting

```yaml
# gcp-cloud-armor-policy.yaml
#
# Google Cloud Armor security policy with rate limiting

# Create via gcloud CLI:
# gcloud compute security-policies create api-rate-limit-policy \
#   --description "Rate limiting policy for API"

# Add rate limiting rule
# gcloud compute security-policies rules create 1000 \
#   --security-policy api-rate-limit-policy \
#   --expression "true" \
#   --action "rate-based-ban" \
#   --rate-limit-threshold-count 1000 \
#   --rate-limit-threshold-interval-sec 60 \
#   --ban-duration-sec 300 \
#   --conform-action "allow" \
#   --exceed-action "deny-429"

# Terraform equivalent:
resource "google_compute_security_policy" "api_rate_limit" {
  name = "api-rate-limit-policy"

  # Default rule - allow all
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  # Rate limiting rule
  rule {
    action   = "rate_based_ban"
    priority = "1000"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"

      rate_limit_threshold {
        count        = 1000
        interval_sec = 60
      }

      ban_threshold {
        count        = 5000
        interval_sec = 60
      }

      ban_duration_sec = 300
    }

    description = "Rate limit all traffic"
  }
}
```

### Azure Application Gateway with WAF

```bicep
// azure-appgw-waf.bicep
//
// Azure Application Gateway with WAF rate limiting

resource wafPolicy 'Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies@2023-05-01' = {
  name: 'api-waf-policy'
  location: resourceGroup().location
  properties: {
    customRules: [
      {
        name: 'RateLimitRule'
        priority: 1
        ruleType: 'RateLimitRule'
        rateLimitDuration: 'OneMin'
        rateLimitThreshold: 1000
        matchConditions: [
          {
            matchVariables: [
              {
                variableName: 'RequestUri'
              }
            ]
            operator: 'Contains'
            matchValues: [
              '/api/'
            ]
            transforms: [
              'Lowercase'
            ]
          }
        ]
        groupByUserSession: [
          {
            groupByVariables: [
              {
                variableName: 'ClientAddr'
              }
            ]
          }
        ]
        action: 'Block'
      }
      {
        name: 'AuthRateLimitRule'
        priority: 2
        ruleType: 'RateLimitRule'
        rateLimitDuration: 'FiveMins'
        rateLimitThreshold: 50
        matchConditions: [
          {
            matchVariables: [
              {
                variableName: 'RequestUri'
              }
            ]
            operator: 'BeginsWith'
            matchValues: [
              '/api/auth'
              '/api/login'
            ]
            transforms: [
              'Lowercase'
            ]
          }
        ]
        groupByUserSession: [
          {
            groupByVariables: [
              {
                variableName: 'ClientAddr'
              }
            ]
          }
        ]
        action: 'Block'
      }
    ]
    policySettings: {
      requestBodyCheck: true
      maxRequestBodySizeInKb: 128
      fileUploadLimitInMb: 100
      state: 'Enabled'
      mode: 'Prevention'
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'OWASP'
          ruleSetVersion: '3.2'
        }
      ]
    }
  }
}
```

### Cloudflare Rate Limiting Rules

```javascript
// cloudflare-rate-limit.js
//
// Cloudflare Rate Limiting configuration via API

// Create rate limiting rule via Cloudflare API
const createRateLimitRule = async () => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'API Rate Limiting',
        kind: 'zone',
        phase: 'http_ratelimit',
        rules: [
          {
            action: 'block',
            ratelimit: {
              characteristics: [
                'cf.colo.id',
                'ip.src'
              ],
              period: 60,
              requests_per_period: 100,
              mitigation_timeout: 300
            },
            expression: '(http.request.uri.path contains "/api/auth")',
            description: 'Rate limit auth endpoints'
          },
          {
            action: 'block',
            ratelimit: {
              characteristics: [
                'ip.src'
              ],
              period: 60,
              requests_per_period: 1000,
              mitigation_timeout: 60
            },
            expression: '(http.request.uri.path contains "/api/")',
            description: 'Rate limit general API'
          }
        ]
      })
    }
  );

  return response.json();
};

// Terraform Cloudflare provider configuration
/*
resource "cloudflare_rate_limit" "api_rate_limit" {
  zone_id   = var.cloudflare_zone_id
  threshold = 1000
  period    = 60

  match {
    request {
      url_pattern = "*api.example.com/api/*"
      schemes     = ["HTTP", "HTTPS"]
      methods     = ["GET", "POST", "PUT", "DELETE"]
    }

    response {
      statuses       = [200, 201, 202, 301, 429]
      origin_traffic = true
    }
  }

  action {
    mode    = "ban"
    timeout = 300

    response {
      content_type = "application/json"
      body         = jsonencode({
        error       = "rate_limit_exceeded"
        message     = "Too many requests"
        retry_after = 300
      })
    }
  }

  disabled = false
  description = "Rate limit API endpoints"
}
*/
```

---

## Response Handling Best Practices

Proper response handling for rate-limited requests improves client experience and aids in debugging.

### Standard HTTP 429 Response

```json
{
    "error": {
        "code": "RATE_LIMIT_EXCEEDED",
        "message": "You have exceeded the rate limit for this endpoint",
        "details": {
            "limit": 1000,
            "window": "1 hour",
            "retry_after": 3600,
            "reset_at": "2026-01-27T15:00:00Z"
        },
        "documentation_url": "https://docs.example.com/api/rate-limits"
    }
}
```

### Essential Response Headers

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 3600
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706367600
X-RateLimit-Policy: "1000;w=3600"
```

### HAProxy Custom Error Response

```haproxy
# /etc/haproxy/errors/429.http
#
# Custom 429 error response for HAProxy

HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60
Connection: close
Cache-Control: no-store

{"error":"rate_limit_exceeded","message":"Too many requests. Please slow down.","retry_after":60}
```

```haproxy
# Reference in haproxy.cfg
frontend http_front
    # ... other configuration ...

    errorfile 429 /etc/haproxy/errors/429.http

    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }
```

### Nginx Custom Error with Lua

```nginx
# /etc/nginx/conf.d/rate-limit-lua.conf
#
# Dynamic rate limit response with Lua

lua_shared_dict rate_limit_store 10m;

server {
    listen 443 ssl http2;
    server_name api.example.com;

    location /api/ {
        access_by_lua_block {
            local limit = require "resty.limit.req"
            local lim, err = limit.new("rate_limit_store", 100, 50)

            if not lim then
                ngx.log(ngx.ERR, "failed to instantiate limiter: ", err)
                return ngx.exit(500)
            end

            local key = ngx.var.binary_remote_addr
            local delay, err = lim:incoming(key, true)

            if not delay then
                if err == "rejected" then
                    ngx.header["Content-Type"] = "application/json"
                    ngx.header["Retry-After"] = "60"
                    ngx.header["X-RateLimit-Limit"] = "100"
                    ngx.header["X-RateLimit-Remaining"] = "0"

                    ngx.status = 429
                    ngx.say('{"error":"rate_limit_exceeded","retry_after":60}')
                    return ngx.exit(429)
                end
                ngx.log(ngx.ERR, "failed to limit req: ", err)
                return ngx.exit(500)
            end

            -- Set remaining count header
            local remaining = 100 - lim:uncommit(key)
            ngx.header["X-RateLimit-Remaining"] = remaining > 0 and remaining or 0
        }

        proxy_pass http://api_backend;
    }
}
```

---

## Best Practices Summary

### Design Principles

1. **Layer your rate limits** - Apply different limits at different layers (edge, load balancer, application) for defense in depth.

2. **Use appropriate algorithms** - Token bucket for APIs allowing bursts, leaky bucket for smooth throughput, sliding window for precise limiting.

3. **Differentiate by endpoint** - Auth endpoints need stricter limits than read-only endpoints.

4. **Consider user tiers** - Premium users may warrant higher limits; implement API key-based differentiation.

5. **Whitelist internal traffic** - Exclude health checks, internal services, and monitoring from rate limits.

### Implementation Guidelines

1. **Always return proper 429 responses** - Include `Retry-After` header and informative error bodies.

2. **Add rate limit headers to all responses** - Help clients track their usage proactively.

3. **Log rate limit events** - Essential for debugging and identifying abuse patterns.

4. **Set up monitoring and alerts** - Detect when legitimate users are being impacted.

5. **Test under load** - Verify rate limiting works correctly before production deployment.

### Common Pitfalls to Avoid

1. **Do not rate limit health check endpoints** - This can cause false positives in load balancer health checks.

2. **Consider clients behind NAT** - Shared IP addresses may need higher limits or alternative tracking methods.

3. **Handle X-Forwarded-For correctly** - When behind a CDN or proxy, use the correct client IP.

4. **Plan for failover** - Ensure rate limit state is not lost during load balancer failover (use distributed storage if needed).

5. **Document your limits** - Publish rate limits in API documentation so developers can design accordingly.

---

## Conclusion

Implementing rate limiting at the load balancer level provides efficient protection for your entire infrastructure. Whether you choose HAProxy, Nginx, AWS ALB with WAF, or another cloud solution, the key is to design limits that protect your services while minimizing impact on legitimate users.

Start with conservative limits, monitor the impact, and adjust based on real traffic patterns. Remember that rate limiting is just one layer of protection - combine it with other security measures for comprehensive API protection.

For comprehensive monitoring of your rate-limited services, including alerting when limits are frequently hit and tracking the impact on user experience, check out [OneUptime](https://oneuptime.com) - the open-source observability platform that helps you understand how your rate limiting policies affect real users.
