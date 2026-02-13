# How to Configure Route 53 Weighted Routing Policy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Networking

Description: A comprehensive guide to configuring Route 53 weighted routing for traffic distribution, canary deployments, blue-green deployments, and A/B testing with practical examples and Terraform code.

---

Weighted routing in Route 53 lets you control what percentage of DNS queries go to each endpoint. You assign a relative weight to each record, and Route 53 distributes responses proportionally. If record A has weight 70 and record B has weight 30, roughly 70% of DNS responses will return record A's value and 30% will return record B's.

This is incredibly useful for canary deployments, gradual migrations, blue-green deployments, and A/B testing. Instead of switching all traffic at once, you can shift it gradually and roll back instantly if something goes wrong.

## How Weighted Routing Works

You create multiple records with the same name and type but different set identifiers and weights. Route 53 returns a single record per query, selected based on the weight distribution.

The weight doesn't have to add up to 100 - Route 53 calculates the percentage based on the total weight. If you have weights of 3 and 1, the first gets 75% and the second gets 25%. Setting a weight to 0 stops traffic to that record entirely.

## Basic Weighted Routing Setup

Let's set up weighted routing between two endpoints.

```bash
# Create a weighted record pointing to endpoint A (gets 80% of traffic)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "endpoint-a",
        "Weight": 80,
        "TTL": 60,
        "ResourceRecords": [{"Value": "52.1.2.3"}]
      }
    }]
  }'

# Create a weighted record pointing to endpoint B (gets 20% of traffic)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "endpoint-b",
        "Weight": 20,
        "TTL": 60,
        "ResourceRecords": [{"Value": "52.4.5.6"}]
      }
    }]
  }'
```

The `SetIdentifier` must be unique for each record with the same name and type. It's just a label - use something descriptive.

## Canary Deployments

One of the best use cases for weighted routing is canary deployments. Deploy your new version behind a separate ALB or target group, and gradually shift traffic to it.

```bash
# Production ALB (95% of traffic)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "production",
        "Weight": 95,
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "prod-alb-123.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Canary ALB (5% of traffic)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "canary",
        "Weight": 5,
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "canary-alb-456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

If the canary looks good, gradually increase its weight: 5 -> 10 -> 25 -> 50 -> 100. If something goes wrong, set the canary weight to 0 for an instant rollback.

## Adding Health Checks

Weighted routing becomes much more useful when combined with health checks. If an endpoint fails its health check, Route 53 stops returning it and redistributes its share of traffic to the remaining healthy endpoints.

```bash
# Create a health check for endpoint A
aws route53 create-health-check \
  --caller-reference "endpoint-a-$(date +%s)" \
  --health-check-config '{
    "IPAddress": "52.1.2.3",
    "Port": 443,
    "Type": "HTTPS",
    "ResourcePath": "/health",
    "RequestInterval": 10,
    "FailureThreshold": 3
  }'

# Associate the health check with the weighted record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "endpoint-a",
        "Weight": 80,
        "TTL": 60,
        "HealthCheckId": "health-check-id-for-a",
        "ResourceRecords": [{"Value": "52.1.2.3"}]
      }
    }]
  }'
```

For more details on setting up health checks, see https://oneuptime.com/blog/post/2026-02-12-route-53-health-checks/view.

## Sending All Traffic to One Endpoint

Setting a weight to 0 is different from removing the record. A weight of 0 means Route 53 never returns that record - unless all other records also have weight 0, in which case Route 53 treats them all equally and returns them all.

```bash
# Send all traffic to production by setting canary weight to 0
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "canary",
        "Weight": 0,
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "canary-alb-456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

## Terraform Configuration

```hcl
# Production endpoint - 90% of traffic
resource "aws_route53_record" "api_production" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  set_identifier = "production"

  weighted_routing_policy {
    weight = 90
  }

  alias {
    name                   = aws_lb.production.dns_name
    zone_id                = aws_lb.production.zone_id
    evaluate_target_health = true
  }
}

# Canary endpoint - 10% of traffic
resource "aws_route53_record" "api_canary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  set_identifier = "canary"

  weighted_routing_policy {
    weight = 10
  }

  alias {
    name                   = aws_lb.canary.dns_name
    zone_id                = aws_lb.canary.zone_id
    evaluate_target_health = true
  }
}

# Health check for production
resource "aws_route53_health_check" "production" {
  fqdn              = aws_lb.production.dns_name
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  request_interval   = 10
  failure_threshold  = 3

  tags = {
    Name = "production-health-check"
  }
}
```

## Multi-Region Weighted Routing

Weighted routing works great for distributing traffic across regions. This is different from latency-based routing (which routes to the nearest region) - with weighted routing, you explicitly control the percentages.

```hcl
resource "aws_route53_record" "api_us" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "us-east-1"

  weighted_routing_policy {
    weight = 60
  }

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_eu" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "eu-west-1"

  weighted_routing_policy {
    weight = 40
  }

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}
```

## Important Caveats

DNS caching means the traffic split won't be exact. When a resolver caches a response for the TTL duration, all queries from clients using that resolver go to the same endpoint until the cache expires. Lower TTLs make the distribution more accurate but increase query costs and add latency.

Also, the granularity depends on your TTL and the number of DNS queries. With a 60-second TTL and thousands of queries per minute, the actual distribution will closely match your configured weights. With a 300-second TTL and only a few queries per minute, the distribution will be lumpy.

Weighted routing is one of the most versatile DNS features in Route 53. It gives you a simple, infrastructure-level knob for traffic distribution that works regardless of what application or framework you're using behind it.
