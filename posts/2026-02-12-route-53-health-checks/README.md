# How to Set Up Route 53 Health Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Monitoring, High Availability

Description: A comprehensive guide to setting up Route 53 health checks for monitoring endpoint availability, configuring health check types, CloudWatch alarms, calculated health checks, and integrating with DNS failover.

---

Route 53 health checks continuously monitor the availability of your endpoints and integrate directly with DNS routing to automatically remove unhealthy endpoints from responses. They're the glue that makes failover routing, weighted routing, and multivalue answer routing actually work in practice.

Without health checks, Route 53 routing policies are just static configurations. With health checks, they become dynamic systems that respond to failures automatically.

## Types of Health Checks

Route 53 supports three types of health checks:

1. **Endpoint health checks** - Route 53 sends requests to your endpoint and checks the response
2. **Calculated health checks** - Combine the results of multiple child health checks
3. **CloudWatch alarm health checks** - Base the health status on a CloudWatch alarm's state

## Creating an Endpoint Health Check

The most common type. Route 53 sends HTTP, HTTPS, or TCP requests from health checkers distributed around the world.

```bash
# Create an HTTPS health check
aws route53 create-health-check \
  --caller-reference "web-app-health-$(date +%s)" \
  --health-check-config '{
    "Type": "HTTPS",
    "FullyQualifiedDomainName": "app.example.com",
    "Port": 443,
    "ResourcePath": "/health",
    "RequestInterval": 10,
    "FailureThreshold": 3,
    "EnableSNI": true
  }'
```

Let me break down each parameter:

- **Type** - HTTPS, HTTP, HTTP_STR_MATCH, HTTPS_STR_MATCH, or TCP
- **FullyQualifiedDomainName** - The domain name to check (or use IPAddress for IP-based checks)
- **Port** - The port to connect to
- **ResourcePath** - The path to request (for HTTP/HTTPS types)
- **RequestInterval** - 10 or 30 seconds between checks
- **FailureThreshold** - How many consecutive failures before the check is marked unhealthy (1-10)
- **EnableSNI** - Whether to send the hostname in the TLS handshake (important for shared hosting)

## String Match Health Checks

String match health checks go a step further - they verify not just that the endpoint responds, but that the response body contains a specific string. This catches scenarios where a server returns 200 OK but the application is actually in a bad state.

```bash
# Create a health check that verifies response body content
aws route53 create-health-check \
  --caller-reference "api-string-match-$(date +%s)" \
  --health-check-config '{
    "Type": "HTTPS_STR_MATCH",
    "FullyQualifiedDomainName": "api.example.com",
    "Port": 443,
    "ResourcePath": "/health",
    "SearchString": "\"status\":\"healthy\"",
    "RequestInterval": 10,
    "FailureThreshold": 3,
    "EnableSNI": true
  }'
```

Route 53 searches the first 5,120 bytes of the response body for the SearchString. If the string is found and the status code is 2xx or 3xx, the check passes.

## IP-Based Health Checks

For checking specific servers rather than domain names.

```bash
# Create a health check for a specific IP
aws route53 create-health-check \
  --caller-reference "server-1-health-$(date +%s)" \
  --health-check-config '{
    "Type": "HTTPS",
    "IPAddress": "52.1.2.3",
    "Port": 443,
    "ResourcePath": "/health",
    "RequestInterval": 10,
    "FailureThreshold": 2
  }'
```

When using IPAddress, Route 53 connects directly to that IP. When using FullyQualifiedDomainName, Route 53 resolves it first and connects to the resulting IP(s).

## TCP Health Checks

For services that don't speak HTTP, TCP health checks verify that a TCP connection can be established.

```bash
# Create a TCP health check for a database port
aws route53 create-health-check \
  --caller-reference "db-tcp-health-$(date +%s)" \
  --health-check-config '{
    "Type": "TCP",
    "IPAddress": "10.0.2.50",
    "Port": 5432,
    "RequestInterval": 30,
    "FailureThreshold": 3
  }'
```

TCP checks are useful for databases, Redis instances, and other non-HTTP services.

## Calculated Health Checks

Calculated health checks combine multiple child health checks using boolean logic. You set a threshold - if at least N out of M child checks are healthy, the calculated check is healthy.

```bash
# Create child health checks first (assume these already exist)
# Then create a calculated health check

aws route53 create-health-check \
  --caller-reference "calculated-$(date +%s)" \
  --health-check-config '{
    "Type": "CALCULATED",
    "HealthThreshold": 2,
    "ChildHealthChecks": [
      "child-hc-id-1",
      "child-hc-id-2",
      "child-hc-id-3"
    ]
  }'
```

With `HealthThreshold: 2` and 3 children, the calculated check is healthy as long as at least 2 of the 3 children are healthy. This is useful for:

- Considering an application healthy only if both its web and API tiers are up
- Creating a health check that represents overall system health across multiple components
- Building complex health logic (2 out of 3 regions must be healthy before triggering a global failover)

## CloudWatch Alarm Health Checks

Instead of Route 53 actively probing your endpoint, you can base health on a CloudWatch alarm. This is useful when you want health to depend on metrics like CPU utilization, error rates, or custom application metrics.

```bash
# Create a health check based on a CloudWatch alarm
aws route53 create-health-check \
  --caller-reference "cw-alarm-health-$(date +%s)" \
  --health-check-config '{
    "Type": "CLOUDWATCH_METRIC",
    "AlarmIdentifier": {
      "Region": "us-east-1",
      "Name": "high-error-rate-alarm"
    },
    "InsufficientDataHealthStatus": "Unhealthy"
  }'
```

The `InsufficientDataHealthStatus` is important - it determines what happens when CloudWatch doesn't have enough data to evaluate the alarm. Setting it to "Unhealthy" is the safer choice for failover scenarios.

## Configuring Health Check Notifications

Route 53 integrates with CloudWatch for health check monitoring.

```bash
# Create a CloudWatch alarm that triggers when a health check fails
aws cloudwatch put-metric-alarm \
  --alarm-name "route53-health-check-failed" \
  --metric-name HealthCheckStatus \
  --namespace AWS/Route53 \
  --statistic Minimum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=HealthCheckId,Value=your-health-check-id \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

This alarm fires when the health check status drops below 1 (healthy = 1, unhealthy = 0), sending a notification to your SNS topic.

## Terraform Configuration

```hcl
# HTTPS health check with string matching
resource "aws_route53_health_check" "app" {
  fqdn              = "app.example.com"
  port              = 443
  type              = "HTTPS_STR_MATCH"
  resource_path     = "/health"
  search_string     = "healthy"
  request_interval  = 10
  failure_threshold = 3

  tags = {
    Name = "app-health-check"
  }
}

# Calculated health check
resource "aws_route53_health_check" "overall" {
  type                   = "CALCULATED"
  child_health_threshold = 2
  child_healthchecks = [
    aws_route53_health_check.web.id,
    aws_route53_health_check.api.id,
    aws_route53_health_check.db.id,
  ]

  tags = {
    Name = "overall-system-health"
  }
}

# CloudWatch alarm for health check status
resource "aws_cloudwatch_metric_alarm" "health_check" {
  alarm_name          = "route53-health-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  dimensions = {
    HealthCheckId = aws_route53_health_check.app.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Health Check Regions

Route 53 health checkers run from multiple AWS regions. By default, health checks use all available regions, but you can restrict them.

```bash
# Update a health check to use specific regions
aws route53 update-health-check \
  --health-check-id your-health-check-id \
  --regions us-east-1 us-west-2 eu-west-1
```

Using fewer regions reduces the health check traffic to your endpoint, but also reduces the accuracy of the health determination. I recommend using the default (all regions) unless you have a specific reason to restrict.

## Designing Health Check Endpoints

Your /health endpoint should check the things that actually matter for the application to function:

```python
# Example health check endpoint (Python/Flask)
@app.route('/health')
def health_check():
    checks = {}

    # Check database connectivity
    try:
        db.session.execute('SELECT 1')
        checks['database'] = 'healthy'
    except Exception:
        checks['database'] = 'unhealthy'

    # Check Redis connectivity
    try:
        redis_client.ping()
        checks['cache'] = 'healthy'
    except Exception:
        checks['cache'] = 'unhealthy'

    # Determine overall status
    all_healthy = all(v == 'healthy' for v in checks.values())
    status_code = 200 if all_healthy else 503

    return jsonify({
        'status': 'healthy' if all_healthy else 'unhealthy',
        'checks': checks
    }), status_code
```

Don't make health checks too sensitive (checking every dependency can cause cascading failures) or too lenient (returning 200 when the app is actually broken). Find the balance for your specific application.

## Important Considerations

Route 53 health checks originate from AWS IP ranges, so your security groups and NACLs must allow this traffic. AWS publishes the health checker IP ranges - you can find them in the AWS IP ranges JSON file and filter for the ROUTE53_HEALTHCHECKS service.

Health check costs are $0.50/month for basic checks and $0.75/month for HTTPS with string matching. Calculated health checks are $1.00/month. These costs are trivial compared to the downtime costs they prevent.

For comprehensive endpoint monitoring beyond DNS health checks, including response time tracking and detailed alerting, consider pairing Route 53 health checks with a dedicated monitoring solution like OneUptime. Route 53 health checks tell you if an endpoint is up or down - monitoring tools tell you the full picture of how it's performing.
