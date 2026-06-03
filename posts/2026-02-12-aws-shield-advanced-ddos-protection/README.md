# How to Configure AWS Shield Advanced for DDoS Protection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Shield, DDoS, Security, Networking

Description: A complete guide to configuring AWS Shield Advanced for DDoS protection, including resource protection, health checks, response team access, and cost protection.

---

DDoS attacks aren't a matter of "if" but "when." AWS Shield Standard gives you basic protection for free, but if you're running anything business-critical, you need Shield Advanced. It provides enhanced detection, real-time visibility, and access to the AWS Shield Response Team (SRT) when things go sideways.

Shield Advanced costs $3,000/month per organization plus data transfer fees, so it's not a casual decision. But if you're protecting revenue-generating applications, that cost is a rounding error compared to the damage a sustained DDoS attack can cause. Let's walk through how to set it up properly.

## What Shield Advanced Actually Gives You

Before diving into configuration, here's what you're paying for beyond the free Shield Standard tier:

- **Enhanced detection** with traffic baselining specific to your resources
- **Advanced mitigation** for layer 3, 4, and 7 attacks
- **Shield Response Team access** - actual AWS engineers who'll help you during an attack
- **Cost protection** - credits for scaling charges caused by DDoS attacks
- **Real-time metrics and reports** through CloudWatch
- **WAF integration** with standard AWS WAF costs covered for protected resources, within AWS's documented limits

Shield Advanced protects CloudFront distributions, Route 53 hosted zones, Global Accelerator standard accelerators, Elastic IPs, Application Load Balancers, and Classic Load Balancers. Network Load Balancers and EC2 instances are protected through associated Elastic IPs.

## Subscribing to Shield Advanced

First, you need to subscribe. This is an account-level commitment with a 1-year minimum.

```bash
# Subscribe to Shield Advanced

aws shield create-subscription

# Verify your subscription is active
aws shield describe-subscription
```

If you're running a multi-account setup with AWS Organizations, use AWS Firewall Manager to automate Shield Advanced subscriptions and protections where supported. Firewall Manager supports Shield Advanced policies for protected resource types except Route 53 hosted zones and Global Accelerator standard accelerators.

```bash
# List all member accounts
aws organizations list-accounts \
  --query 'Accounts[*].{Id:Id,Name:Name}' \
  --output table
```

## Protecting Your Resources

Once subscribed, you need to explicitly add each resource you want protected. Shield Advanced doesn't automatically protect everything.

Here's how to protect a CloudFront distribution and an ALB.

```bash
# Protect a CloudFront distribution
aws shield create-protection \
  --name "Production-CloudFront" \
  --resource-arn "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"

# Protect an Application Load Balancer
aws shield create-protection \
  --name "Production-ALB" \
  --resource-arn "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/prod-alb/abc123def456"

# Protect a Route 53 hosted zone
aws shield create-protection \
  --name "Production-DNS" \
  --resource-arn "arn:aws:route53:::hostedzone/Z1234567890ABC"

# Protect an Elastic IP (for EC2 or NLB)
aws shield create-protection \
  --name "Production-EIP" \
  --resource-arn "arn:aws:ec2:us-east-1:123456789012:eip-allocation/eipalloc-abc123"
```

You can list all your current protections to make sure nothing was missed.

```bash
# List all Shield Advanced protections
aws shield list-protections \
  --query 'Protections[*].{Name:Name,ResourceArn:ResourceArn,Id:Id}' \
  --output table
```

## Setting Up Health Checks

This is the step most people skip, and it's arguably the most important. Health checks allow Shield Advanced to detect application-layer attacks faster by correlating DDoS activity with your application's health status.

Without health checks, Shield Advanced relies solely on traffic patterns. With health checks, it can detect that your app is degraded and respond faster.

First, create Route 53 health checks for your protected resources.

```bash
# Create a health check for your application
aws route53 create-health-check \
  --caller-reference "prod-app-$(date +%s)" \
  --health-check-config '{
    "FullyQualifiedDomainName": "app.example.com",
    "Port": 443,
    "Type": "HTTPS",
    "ResourcePath": "/health",
    "RequestInterval": 10,
    "FailureThreshold": 2,
    "EnableSNI": true
  }'
```

Then associate the health check with your Shield protection.

```bash
# Associate health check with a Shield protection
aws shield associate-health-check \
  --protection-id "abc123-def456-ghi789" \
  --health-check-arn "arn:aws:route53:::healthcheck/12345678-abcd-efgh-ijkl-123456789012"
```

## Terraform Configuration

For infrastructure as code, here's a complete Terraform setup for Shield Advanced.

```hcl
# Subscribe to Shield Advanced
resource "aws_shield_subscription" "main" {
  auto_renew = "ENABLED"
}

# Protect the ALB
resource "aws_shield_protection" "alb" {
  name         = "production-alb"
  resource_arn = aws_lb.production.arn

  depends_on = [aws_shield_subscription.main]
}

# Protect the CloudFront distribution
resource "aws_shield_protection" "cloudfront" {
  name         = "production-cloudfront"
  resource_arn = aws_cloudfront_distribution.main.arn

  depends_on = [aws_shield_subscription.main]
}

# Create a health check for the application
resource "aws_route53_health_check" "app" {
  fqdn              = "app.example.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 2
  request_interval   = 10

  tags = {
    Name = "production-app-health"
  }
}

# Associate the health check with the protection
resource "aws_shield_protection_health_check_association" "alb" {
  health_check_arn     = aws_route53_health_check.app.arn
  shield_protection_id = aws_shield_protection.alb.id
}

# Create a protection group for all resources
resource "aws_shield_protection_group" "all" {
  protection_group_id = "all-production-resources"
  aggregation         = "MAX"
  pattern             = "ALL"

  depends_on = [aws_shield_subscription.main]
}
```

## Configuring SRT Access

The Shield Response Team can only help you if they have access to your resources. You need to grant them an IAM role and optionally share additional logs outside of your WAF web ACL logs.

```bash
# Create the IAM role for SRT
aws iam create-role \
  --role-name AWSDDoSResponseTeamRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "drt.shield.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach the managed policy
aws iam attach-role-policy \
  --role-name AWSDDoSResponseTeamRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSShieldDRTAccessPolicy

# Grant SRT access to your account
aws shield associate-drt-role \
  --role-arn "arn:aws:iam::123456789012:role/AWSDDoSResponseTeamRole"
```

If you want the SRT to proactively engage when your health checks fail during a detected event (highly recommended), enable proactive engagement.

```bash
# Set up emergency contacts first
aws shield update-emergency-contact-settings \
  --emergency-contact-list '[
    {
      "EmailAddress": "security@example.com",
      "PhoneNumber": "+1-555-0100",
      "ContactNotes": "Primary security on-call"
    },
    {
      "EmailAddress": "oncall@example.com",
      "PhoneNumber": "+1-555-0200",
      "ContactNotes": "Secondary on-call"
    }
  ]'

# Enable proactive engagement
aws shield enable-proactive-engagement
```

## Monitoring and Metrics

Shield Advanced publishes detailed metrics to CloudWatch. Set up alarms to know when attacks are happening.

```bash
# Create an alarm for detected DDoS events
aws cloudwatch put-metric-alarm \
  --alarm-name "DDoS-Attack-Detected" \
  --namespace "AWS/DDoSProtection" \
  --metric-name "DDoSDetected" \
  --dimensions Name=ResourceArn,Value="arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/prod-alb/abc123" \
  --statistic Sum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:security-alerts"
```

You can also check for active attacks and view attack history through the API.

```bash
# Check for active attacks
aws shield list-attacks \
  --start-time "$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Describe a specific attack
aws shield describe-attack \
  --attack-id "abc123-def456"
```

## Protection Groups

Protection groups let you organize your protected resources and define how Shield evaluates them as a group. This is useful when multiple resources serve the same application.

```bash
# Create a protection group for your web tier
aws shield create-protection-group \
  --protection-group-id "web-tier" \
  --aggregation "SUM" \
  --pattern "ARBITRARY" \
  --members '[
    "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7",
    "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/prod-alb/abc123"
  ]'
```

The aggregation setting matters. Use `SUM` when traffic is distributed across resources. Use `MAX` when you care about the highest-traffic resource. Use `MEAN` for average behavior.

## Cost Protection

One of Shield Advanced's underappreciated features is cost protection. If a DDoS attack causes your resources to scale up, you can request credits for those charges.

This covers specific increased-utilization charges, including Shield Advanced data transfer out, CloudFront requests and data transfer out, Route 53 queries, Global Accelerator standard accelerator data transfer, ALB load balancer capacity units, and instance costs for protected EC2 instances created by an auto-scaling policy in response to the attack. To qualify, the resource must be protected by Shield Advanced before the attack starts. For applicable CloudFront and ALB resources, you must also have a WAF web ACL with a rate-based rule in block mode. Credits aren't automatic - you need to request them through AWS Support with the attack details.

## Best Practices

A few things I've learned from running Shield Advanced in production:

1. **Protect all public-facing resources**, not just your main load balancer. Attackers will find your weakest entry point.
2. **Always configure health checks.** The difference in detection time is significant.
3. **Enable proactive engagement.** The SRT can start troubleshooting before you even notice.
4. **Keep emergency contacts updated.** Stale contacts mean missed notifications.
5. **Review attack summaries monthly.** Even mitigated attacks tell you about threat patterns.

For complementary protection at the application layer, consider pairing Shield Advanced with WAF rules. Check out our guide on [WAF Web ACL logging](https://oneuptime.com/blog/post/2026-02-12-waf-web-acl-logging-security-analysis/view) for more on analyzing WAF-level security events.

## Wrapping Up

Shield Advanced isn't cheap, but for production workloads that can't afford downtime, it's worth every penny. The combination of enhanced detection, SRT access, and cost protection gives you a safety net that's hard to replicate on your own. Set it up properly with health checks and proactive engagement, and you'll sleep better at night knowing there's a team of DDoS experts backing you up.
