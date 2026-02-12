# How to Configure Route 53 Simple Routing Policy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Networking

Description: Learn how to configure Route 53's simple routing policy for basic DNS resolution, including single-value records, multi-value responses, and when simple routing is the right choice.

---

Simple routing is the default and most straightforward routing policy in Route 53. When a DNS query comes in for a record, Route 53 returns the value (or values) you've configured. No health checks, no weighted distribution, no geographic awareness - just a direct answer to a DNS query.

It sounds basic, and it is. But it's also the right choice more often than people think. Not every DNS record needs fancy routing logic.

## How Simple Routing Works

With simple routing, you create a single record for a name, and that record can contain one or more values. When Route 53 receives a query, it returns all values. If there are multiple values, the DNS client picks one - typically at random, depending on the client implementation.

```bash
# Create a simple A record with a single IP
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          {"Value": "52.1.2.3"}
        ]
      }
    }]
  }'
```

That's the simplest case - one name, one IP. When someone resolves `app.example.com`, they get `52.1.2.3`.

## Multiple Values in a Simple Record

You can include multiple IP addresses in a single record. Route 53 returns all of them, and the client decides which to use.

```bash
# Create an A record with multiple IPs
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "web.example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          {"Value": "52.1.2.3"},
          {"Value": "52.4.5.6"},
          {"Value": "52.7.8.9"}
        ]
      }
    }]
  }'
```

DNS clients usually rotate through the returned addresses (DNS round-robin), providing basic load distribution. But there's a big catch: this doesn't do health checking. If 52.4.5.6 goes down, Route 53 still returns it in the response. Clients will try connecting to a dead server until the record is manually updated.

If you need health checks with multiple values, look at multivalue answer routing instead - see https://oneuptime.com/blog/post/route-53-multivalue-answer-routing/view.

## Simple Routing with Alias Records

For AWS resources, use alias records. They work with simple routing and are free for queries to AWS services.

```bash
# Create an alias record pointing to an ALB
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
          "DNSName": "my-alb-123456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

With `EvaluateTargetHealth` set to true, Route 53 checks whether the ALB has healthy targets. If all targets are unhealthy, Route 53 still returns the record (since there's no failover target with simple routing), but at least the ALB handles the unhealthy backend logic.

## Common Record Types with Simple Routing

Here are examples of the most common record types you'll create with simple routing.

```bash
# CNAME record for a subdomain
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "blog.example.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "myapp.netlify.app"}]
      }
    }]
  }'

# TXT record for domain verification
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "TXT",
        "TTL": 300,
        "ResourceRecords": [
          {"Value": "\"v=spf1 include:_spf.google.com ~all\""},
          {"Value": "\"google-site-verification=abc123\""}
        ]
      }
    }]
  }'

# AAAA record for IPv6
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "AAAA",
        "TTL": 300,
        "ResourceRecords": [
          {"Value": "2600:1f18:2551:8900::1"}
        ]
      }
    }]
  }'
```

## Terraform Configuration

```hcl
# Simple A record
resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300
  records = ["52.1.2.3"]
}

# Simple record with multiple values (DNS round-robin)
resource "aws_route53_record" "web" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "web.example.com"
  type    = "A"
  ttl     = 300
  records = ["52.1.2.3", "52.4.5.6", "52.7.8.9"]
}

# Alias to ALB (simple routing)
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# MX records for email
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "MX"
  ttl     = 300
  records = [
    "10 mail1.example.com",
    "20 mail2.example.com",
  ]
}
```

## When Simple Routing Is the Right Choice

Simple routing makes sense when:

- **You have one endpoint.** A single server, a single ALB, a single CloudFront distribution. No need for routing complexity when there's only one destination.

- **You're using a load balancer.** The ALB/NLB handles health checking and load distribution. Route 53 just needs to point to the load balancer, not manage individual backend health.

- **The record doesn't change often.** Static resources, email configuration (MX, SPF, DKIM), domain verification records - these are all simple routing candidates.

- **You want DNS round-robin.** Multiple IPs in a record give you basic distribution. It's not as sophisticated as weighted routing, but it works for non-critical use cases.

## When to Use a Different Policy

Switch to a different routing policy when:

- You need health checks to remove unhealthy endpoints from responses - use **failover** or **multivalue answer** routing
- You need to distribute traffic by percentage - use **weighted** routing
- You need users to hit the nearest endpoint - use **latency-based** or **geolocation** routing
- You need active-passive failover - use **failover** routing

For an overview of weighted routing, see https://oneuptime.com/blog/post/route-53-weighted-routing-policy/view. For failover routing, see https://oneuptime.com/blog/post/route-53-failover-routing-policy/view.

## TTL Considerations

For simple routing records, TTL determines how long DNS resolvers cache the answer. Higher TTLs reduce DNS query costs and slightly improve resolution speed. Lower TTLs let you make changes that take effect faster.

My recommendations:
- **Static records** (MX, TXT, DKIM): 3600 seconds (1 hour) or higher
- **Application endpoints behind load balancers**: 300 seconds (5 minutes)
- **Records you might need to change during incidents**: 60 seconds

Don't set TTLs too low without reason - it increases your Route 53 query costs and adds latency for every DNS resolution.

Simple routing is the sensible default. Start here, and only add complexity when you have a specific reason. Your DNS configuration will be easier to understand, debug, and maintain.
