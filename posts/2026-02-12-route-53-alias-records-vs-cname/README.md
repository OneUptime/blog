# How to Use Route 53 Alias Records vs CNAME Records

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Networking

Description: A detailed comparison of Route 53 Alias records and standard CNAME records, covering when to use each, zone apex limitations, cost differences, and practical configuration examples.

---

If you've worked with Route 53, you've probably wondered whether to use an Alias record or a CNAME when pointing one domain name at another. They seem to do the same thing - redirect DNS queries from one name to another - but they work differently under the hood, and choosing wrong can cost you money or break your setup entirely.

The short answer: use Alias records for AWS resources whenever possible. For everything else, use CNAMEs. But let me explain why.

## How CNAME Records Work

A CNAME (Canonical Name) record tells DNS resolvers "the answer to this query is actually over there." When a client queries `www.example.com` and gets a CNAME pointing to `my-alb-123.us-east-1.elb.amazonaws.com`, the resolver then makes a second query to resolve the ALB's DNS name to actual IP addresses.

```bash
# Create a CNAME record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {"Value": "my-alb-123.us-east-1.elb.amazonaws.com"}
        ]
      }
    }]
  }'
```

CNAME records are a standard DNS feature that works everywhere, not just in Route 53. They're supported by every DNS provider and understood by every DNS client.

## How Alias Records Work

Alias records are a Route 53-specific feature. They look like a standard A record (or AAAA record) to the client, but internally Route 53 resolves the target and returns the actual IP addresses directly. The client doesn't see any indirection - it gets IP addresses in one query.

```bash
# Create an Alias record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "my-alb-123.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

Notice the type is "A", not "CNAME". The client receives A records with IP addresses. It doesn't know or care that Route 53 resolved them from an ALB's DNS name.

## The Zone Apex Problem

This is the biggest practical difference. CNAMEs cannot be used at the zone apex (the "naked" domain - `example.com` without any subdomain). This is a fundamental DNS specification limitation, not an AWS restriction.

If someone types `example.com` in their browser, you can't have a CNAME there. But you can have an Alias record, because it appears as a regular A record to the outside world.

```bash
# THIS WORKS - Alias at zone apex
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "my-alb-123.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# THIS DOES NOT WORK - CNAME at zone apex
# Route 53 will reject this:
# "Name": "example.com",
# "Type": "CNAME"
# Error: CNAME records are not allowed at the zone apex
```

If you want `example.com` to point to an ALB, CloudFront, or S3 bucket, Alias is your only option within Route 53.

## Cost Difference

Alias records that point to AWS resources (ALBs, CloudFront, S3, API Gateway, etc.) are free - Route 53 doesn't charge for the DNS queries. CNAME queries are charged at the standard rate of $0.40 per million queries.

For a high-traffic website, the cost difference can be significant. If `www.example.com` gets 100 million DNS queries per month:
- CNAME: $40/month in query charges
- Alias: $0

## Performance Difference

With a CNAME, the resolver needs two lookups:
1. Resolve `www.example.com` -> CNAME `my-alb-123.us-east-1.elb.amazonaws.com`
2. Resolve `my-alb-123.us-east-1.elb.amazonaws.com` -> IP addresses

With an Alias, Route 53 does the resolution internally and returns IP addresses in the first response. One fewer round trip means slightly faster resolution, especially for clients with higher-latency connections to DNS resolvers.

## Side-by-Side Comparison

| Feature | Alias Record | CNAME Record |
|---------|-------------|--------------|
| Zone apex support | Yes | No |
| Query charges to AWS targets | Free | Standard rate |
| Resolution speed | Single lookup | Two lookups |
| Works with non-AWS targets | No | Yes |
| TTL control | Inherited from target | You set the TTL |
| DNS standard | Route 53 proprietary | Universal DNS standard |
| Works with routing policies | Yes | Yes |
| Health check integration | EvaluateTargetHealth | Separate health checks |
| Record type | A or AAAA | CNAME |

## Supported Alias Targets

Alias records only work with specific AWS resources:

- Elastic Load Balancers (ALB, NLB, CLB)
- CloudFront distributions
- S3 website endpoints
- API Gateway
- VPC interface endpoints
- AWS Global Accelerator
- Route 53 records in the same hosted zone
- Elastic Beanstalk environments

You can't create an Alias record pointing to an arbitrary domain like `myapp.netlify.app` or `my-site.herokuapp.com`. For non-AWS targets, you must use CNAME.

## Finding the Correct HostedZoneId

Each AWS service has a hosted zone ID for each region. You need this when creating Alias records. Here's how to find it.

```bash
# For an ALB - the zone ID is in the ALB's description
aws elbv2 describe-load-balancers \
  --names my-alb \
  --query 'LoadBalancers[0].{DNSName:DNSName,ZoneId:CanonicalHostedZoneId}'

# For CloudFront, it's always Z2FDTNDATAQYW2

# For S3 website endpoints, it varies by region
# us-east-1: Z3AQBSTGFYJSTF
# us-west-2: Z3BJ6K6RIION7M
# eu-west-1: Z1BKCTXD74EZPE
```

## Terraform Configuration

```hcl
# Alias record to ALB (free queries, works at apex)
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Alias record for www (also free queries)
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# CNAME for a non-AWS service (standard query charges apply)
resource "aws_route53_record" "blog" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "blog.example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["mycompany.ghost.io"]
}

# Alias to CloudFront distribution
resource "aws_route53_record" "cdn" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "cdn.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## EvaluateTargetHealth

This Alias-specific feature integrates the target's health status with DNS routing. When set to true, Route 53 checks if the target resource has healthy endpoints.

For ALBs, it checks if the ALB has at least one healthy target in its target groups. For S3 website endpoints, there's no health evaluation (S3 is managed and always considered healthy). For CloudFront, it checks the distribution's status.

```bash
# Alias with health evaluation enabled
"AliasTarget": {
  "HostedZoneId": "Z35SXDOTRQ7X7K",
  "DNSName": "my-alb.us-east-1.elb.amazonaws.com",
  "EvaluateTargetHealth": true
}
```

When combined with failover routing, EvaluateTargetHealth enables automatic failover without a separate Route 53 health check - the ALB's built-in health checks drive the DNS routing decision. See https://oneuptime.com/blog/post/route-53-failover-routing-policy/view for details.

## Decision Framework

When pointing to an AWS resource: use Alias. Always. You get free queries, zone apex support, better performance, and integrated health evaluation.

When pointing to a non-AWS resource: use CNAME. It's the only option, and it works fine.

When at the zone apex: use Alias. It's the only option besides A records with static IPs.

When you need to control TTL: use CNAME. Alias records inherit the TTL of the target, which you can't override.

The choice is usually straightforward. Alias for AWS, CNAME for everything else, and never use CNAME at the zone apex.
