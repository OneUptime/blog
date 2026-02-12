# How to Point a Domain to an ALB with Route 53

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, ALB, Load Balancer, DNS

Description: Learn how to configure Route 53 to route traffic to an Application Load Balancer using alias records, including SSL setup and health checks.

---

Application Load Balancers are the go-to choice for routing HTTP and HTTPS traffic to your backend services on AWS. But you don't want users hitting your ALB through its auto-generated DNS name like `my-alb-123456.us-east-1.elb.amazonaws.com`. Let's set up Route 53 to point your clean custom domain to your ALB.

## How ALB DNS Works

Unlike EC2 instances, ALBs don't have static IP addresses. The IPs behind an ALB's DNS name can change at any time as AWS scales the load balancer. This is why you should never use A records with hardcoded IPs for ALBs. Instead, you use Route 53 alias records, which resolve dynamically to whatever IPs the ALB is currently using.

```mermaid
graph LR
    A[Client] --> B[Route 53]
    B -->|Alias Record| C[ALB]
    C --> D[Target Group]
    D --> E[EC2 / ECS / Lambda]
```

## Prerequisites

You need:

- An existing ALB with at least one listener
- A Route 53 hosted zone for your domain
- The ALB's DNS name and hosted zone ID

Get your ALB details:

```bash
# Get the ALB DNS name and hosted zone ID
aws elbv2 describe-load-balancers \
  --names my-application-alb \
  --query 'LoadBalancers[0].{DNSName:DNSName,HostedZoneId:CanonicalHostedZoneId}'
```

This returns something like:

```json
{
  "DNSName": "my-alb-123456.us-east-1.elb.amazonaws.com",
  "HostedZoneId": "Z35SXDOTRQ7X7K"
}
```

## Step 1: Set Up SSL on Your ALB

Before pointing your domain to the ALB, make sure HTTPS is configured. Request a certificate:

```bash
# Request an SSL certificate for your domain
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS \
  --region us-east-1
```

Validate it through DNS (add the CNAME record ACM provides to your Route 53 zone), then add an HTTPS listener to your ALB:

```bash
# Add an HTTPS listener to the ALB with the SSL certificate
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789:loadbalancer/app/my-alb/abc123 \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123456789:certificate/cert-123 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-targets/def456 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06
```

Also add an HTTP listener that redirects to HTTPS:

```bash
# Create an HTTP listener that redirects all traffic to HTTPS
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789:loadbalancer/app/my-alb/abc123 \
  --protocol HTTP \
  --port 80 \
  --default-actions '[{
    "Type": "redirect",
    "RedirectConfig": {
      "Protocol": "HTTPS",
      "Port": "443",
      "StatusCode": "HTTP_301"
    }
  }]'
```

## Step 2: Create Route 53 Alias Records

Create the alias record that points your domain to the ALB:

```json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "dualstack.my-alb-123456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "dualstack.my-alb-123456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "AAAA",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "dualstack.my-alb-123456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

Notice the `dualstack.` prefix on the DNS name - this enables IPv6 support. Also, `EvaluateTargetHealth` is set to `true`, which means Route 53 will check the ALB's health and stop routing traffic to it if the ALB reports unhealthy targets.

```bash
# Apply the alias records
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ROUTE53_ZONE_ID \
  --change-batch file://alb-dns.json
```

## Step 3: Add Route 53 Health Checks (Optional but Recommended)

While `EvaluateTargetHealth` handles basic health checking, you can set up explicit Route 53 health checks for more control:

```bash
# Create a Route 53 health check for your ALB endpoint
aws route53 create-health-check \
  --caller-reference "alb-health-$(date +%s)" \
  --health-check-config '{
    "FullyQualifiedDomainName": "example.com",
    "Port": 443,
    "Type": "HTTPS",
    "ResourcePath": "/health",
    "RequestInterval": 30,
    "FailureThreshold": 3,
    "EnableSNI": true
  }'
```

This checks your `/health` endpoint every 30 seconds and marks it unhealthy after 3 consecutive failures.

## Step 4: Verify the Setup

Test everything:

```bash
# Check DNS resolution
dig example.com A +short
dig example.com AAAA +short

# Test HTTP to HTTPS redirect
curl -I http://example.com

# Test HTTPS directly
curl -I https://example.com

# Verify SSL certificate
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -issuer -subject -dates
```

## Multi-Region Setup with Failover

If you're running ALBs in multiple regions for high availability, you can use Route 53 failover routing:

```json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "SetIdentifier": "primary-us-east-1",
        "Failover": "PRIMARY",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "dualstack.primary-alb.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "SetIdentifier": "secondary-us-west-2",
        "Failover": "SECONDARY",
        "AliasTarget": {
          "HostedZoneId": "Z1H1FL5HABSF5",
          "DNSName": "dualstack.secondary-alb.us-west-2.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

This automatically fails over to the secondary ALB in us-west-2 if the primary in us-east-1 becomes unhealthy.

## Troubleshooting

**Domain resolves but connection times out**: Check your ALB's security group. It needs to allow inbound traffic on ports 80 and 443 from `0.0.0.0/0`.

**SSL certificate error in browser**: Verify the certificate covers the exact domain you're using. A cert for `example.com` won't work for `www.example.com` unless you included it as a SAN or used a wildcard.

**Intermittent 503 errors**: This usually means your target group has no healthy targets. Check the target group health in the EC2 console.

**EvaluateTargetHealth not working**: Make sure your ALB has at least one healthy target. If all targets are unhealthy, Route 53 still routes traffic to the ALB (since there's nowhere else to send it), and you'll get 503 errors from the ALB itself.

## Monitoring Recommendations

For production workloads, pair Route 53 health checks with application-level monitoring. ALB metrics in CloudWatch give you request counts, latency percentiles, and error rates. Combine that with external monitoring from a tool like [OneUptime](https://oneuptime.com) to get a complete picture of availability from the user's perspective.

## Summary

Pointing a domain to an ALB with Route 53 is straightforward: create an alias record using the ALB's DNS name and hosted zone ID, and enable health evaluation. Add SSL via ACM, set up an HTTP-to-HTTPS redirect, and you've got a production-ready setup. For multi-region deployments, Route 53's failover routing policy adds automatic disaster recovery with minimal configuration.
