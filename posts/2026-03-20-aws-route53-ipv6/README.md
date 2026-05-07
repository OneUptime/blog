# How to Configure AWS Route 53 for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, Route 53, DNS, AAAA Records, Dual-Stack

Description: Create AAAA records in AWS Route 53, configure alias records for IPv6-enabled AWS resources, and implement dual-stack DNS routing policies.

## Introduction

AWS Route 53 fully supports IPv6 through AAAA record types and ALIAS records that automatically follow IPv6-capable AWS resource endpoints. For dual-stack deployments, you typically have both A (IPv4) and AAAA (IPv6) records pointing to the same resources. Route 53 routing policies and latency-based routing work with AAAA records, and Route 53 health checks can target IPv6 endpoints when you specify the endpoint by IPv6 address.

## Create AAAA Records

```bash
ZONE_ID="ZABCDEFGHIJKLMN"

# Create AAAA record for a static IPv6 address

aws route53 change-resource-record-sets \
    --hosted-zone-id "$ZONE_ID" \
    --change-batch '{
        "Changes": [{
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "www.example.com",
                "Type": "AAAA",
                "TTL": 300,
                "ResourceRecords": [
                    {"Value": "2001:db8::1"}
                ]
            }
        }]
    }'

# Create multiple AAAA records
aws route53 change-resource-record-sets \
    --hosted-zone-id "$ZONE_ID" \
    --change-batch '{
        "Changes": [{
            "Action": "CREATE",
            "ResourceRecordSet": {
                "Name": "api.example.com",
                "Type": "AAAA",
                "TTL": 60,
                "ResourceRecords": [
                    {"Value": "2001:db8::10"},
                    {"Value": "2001:db8::11"},
                    {"Value": "2001:db8::12"}
                ]
            }
        }]
    }'
```

## Terraform Route 53 with IPv6

```hcl
# route53.tf

data "aws_route53_zone" "main" {
  name = "example.com"
}

# A record (IPv4) - points to load balancer
resource "aws_route53_record" "www_a" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# AAAA record (IPv6) - same ALB (dualstack)
resource "aws_route53_record" "www_aaaa" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www"
  type    = "AAAA"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# AAAA record for EC2 with static IPv6
resource "aws_route53_record" "server_aaaa" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "server"
  type    = "AAAA"
  ttl     = 300

  records = [aws_instance.web.ipv6_addresses[0]]
}

# Latency-based routing for IPv6
resource "aws_route53_record" "api_aaaa_us" {
  zone_id        = data.aws_route53_zone.main.zone_id
  name           = "api"
  type           = "AAAA"
  set_identifier = "us-east-1"

  latency_routing_policy {
    region = "us-east-1"
  }

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_aaaa_eu" {
  zone_id        = data.aws_route53_zone.main.zone_id
  name           = "api"
  type           = "AAAA"
  set_identifier = "eu-west-1"

  latency_routing_policy {
    region = "eu-west-1"
  }

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}
```

## Route 53 Health Checks for IPv6 Endpoints

```hcl
# Health check for IPv6 endpoint
resource "aws_route53_health_check" "ipv6_endpoint" {
  fqdn              = "server.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  # Route 53 health checkers can use IPv6
  # Specify the endpoint's IPv6 address directly
  ip_address = aws_instance.web.ipv6_addresses[0]

  tags = { Name = "server-ipv6-health" }
}
```

## Verify IPv6 DNS Configuration

```bash
# Check AAAA records
dig AAAA www.example.com

# Check both A and AAAA records
dig A www.example.com
dig AAAA www.example.com

# Query from specific DNS server
dig AAAA www.example.com @8.8.8.8

# Check propagation across multiple nameservers
for ns in $(dig NS example.com +short); do
    echo "$ns:"
    dig AAAA www.example.com @"$ns" +short
done

# Verify Route 53 hosting zones list AAAA records
aws route53 list-resource-record-sets \
    --hosted-zone-id "$ZONE_ID" \
    --query "ResourceRecordSets[?Type=='AAAA']"
```

## Conclusion

Route 53 AAAA records are the foundation of IPv6 DNS - create them alongside A records for every dual-stack service. ALIAS records for AWS resources (ALB, NLB, CloudFront) automatically resolve to the correct IPv4 or IPv6 address based on the resource's configuration. Use latency-based, geolocation, and weighted routing policies with AAAA records just as you would with A records. Route 53 health checks can probe IPv6 endpoints when you specify a public IPv6 address, enabling automatic failover for IPv6 services.
