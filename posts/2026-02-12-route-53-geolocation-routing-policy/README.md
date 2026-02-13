# How to Configure Route 53 Geolocation Routing Policy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Networking

Description: Learn how to configure Route 53 geolocation routing to direct users to different endpoints based on their geographic location, useful for content localization, compliance, and regional deployments.

---

Geolocation routing in Route 53 lets you control which endpoint users reach based on where they're located geographically. Unlike latency-based routing (which optimizes for speed), geolocation routing is deterministic - a user in Germany always gets the European endpoint, regardless of whether the US endpoint might actually be faster at that moment.

This makes it the right choice when you need geographic control for reasons beyond performance: regulatory compliance, data sovereignty, content localization, or license restrictions.

## How Geolocation Routing Works

Route 53 maps the source IP of each DNS query to a geographic location using a GeoIP database. You create records tagged with continents, countries, or US states, and Route 53 matches queries to the most specific record available.

The matching order is:
1. US state (if applicable and configured)
2. Country
3. Continent
4. Default (catches everything that doesn't match)

If there's no matching record and no default record, Route 53 returns no answer - effectively blocking access. Always create a default record unless you intentionally want to restrict access to specific geographies.

## Setting Up Geolocation Routing

Let's create a setup where European users hit an EU endpoint, US users hit a US endpoint, and everyone else hits the US endpoint as a default.

```bash
# European users go to the EU endpoint
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "europe",
        "GeoLocation": {
          "ContinentCode": "EU"
        },
        "AliasTarget": {
          "HostedZoneId": "Z32O12XQLNTSW2",
          "DNSName": "eu-alb.eu-west-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# US users go to the US endpoint
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "united-states",
        "GeoLocation": {
          "CountryCode": "US"
        },
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "us-alb.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Default record for everyone else
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "default",
        "GeoLocation": {
          "CountryCode": "*"
        },
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "us-alb.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

The default record uses `CountryCode: "*"` as a wildcard. This catches any location that doesn't match a more specific record.

## Country-Level Routing

You can get more specific with individual country codes. This is common for data sovereignty requirements where certain countries' data must stay in specific regions.

```bash
# Germany specifically - maybe for GDPR data processing
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "germany",
        "GeoLocation": {
          "CountryCode": "DE"
        },
        "AliasTarget": {
          "HostedZoneId": "Z215JYRZR1TBD5",
          "DNSName": "de-alb.eu-central-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Japan
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "japan",
        "GeoLocation": {
          "CountryCode": "JP"
        },
        "AliasTarget": {
          "HostedZoneId": "Z14GRHDCWA56QT",
          "DNSName": "jp-alb.ap-northeast-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

A German user matches the Germany record (most specific), not the Europe continent record. Route 53 always picks the most specific match.

## US State-Level Routing

For US traffic, you can route by state. This is useful for state-specific content or regulations.

```bash
# California users get a specific endpoint
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "california",
        "GeoLocation": {
          "CountryCode": "US",
          "SubdivisionCode": "CA"
        },
        "TTL": 300,
        "ResourceRecords": [{"Value": "52.1.2.3"}]
      }
    }]
  }'
```

## Terraform Configuration

```hcl
# EU endpoint for European users
resource "aws_route53_record" "app_eu" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "europe"

  geolocation_routing_policy {
    continent = "EU"
  }

  alias {
    name                   = aws_lb.eu.dns_name
    zone_id                = aws_lb.eu.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.eu.id
}

# US endpoint for American users
resource "aws_route53_record" "app_us" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "us"

  geolocation_routing_policy {
    country = "US"
  }

  alias {
    name                   = aws_lb.us.dns_name
    zone_id                = aws_lb.us.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.us.id
}

# Asia-Pacific endpoint
resource "aws_route53_record" "app_ap" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "asia"

  geolocation_routing_policy {
    continent = "AS"
  }

  alias {
    name                   = aws_lb.ap.dns_name
    zone_id                = aws_lb.ap.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.ap.id
}

# Default for all other locations
resource "aws_route53_record" "app_default" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "default"

  geolocation_routing_policy {
    country = "*"
  }

  alias {
    name                   = aws_lb.us.dns_name
    zone_id                = aws_lb.us.zone_id
    evaluate_target_health = true
  }
}
```

## Health Checks and Failover

Add health checks to geolocation records so that unhealthy endpoints get skipped. When a geolocation record fails its health check, Route 53 tries the next most specific matching record. If that also fails, it falls through to the default.

For example, if the Germany-specific record is unhealthy, a German user falls back to the Europe continent record. If that's also unhealthy, they fall back to the default.

This gives you a natural failover chain: Country -> Continent -> Default.

## Geolocation vs Latency-Based Routing

The choice comes down to your priorities:

| Need | Use |
|------|-----|
| Best performance | Latency-based routing |
| Data sovereignty/compliance | Geolocation routing |
| Content localization | Geolocation routing |
| Geographic restrictions | Geolocation routing |
| Regulatory requirements | Geolocation routing |

You can't combine geolocation and latency-based routing on the same record name directly, but you can nest them using alias records. For example, geolocation routing at the top level, then latency-based routing within a region. For advanced routing like this, consider Route 53 Traffic Flow - see https://oneuptime.com/blog/post/2026-02-12-route-53-geoproximity-routing-traffic-flow/view.

## Testing

Test geolocation routing with the Route 53 test tool.

```bash
# Test what a resolver in Germany would get
aws route53 test-dns-answer \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --record-name app.example.com \
  --record-type A \
  --resolver-ip 5.9.0.1

# Test what a resolver in Japan would get
aws route53 test-dns-answer \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --record-name app.example.com \
  --record-type A \
  --resolver-ip 203.119.1.1
```

## Limitations

Geolocation routing is based on the DNS resolver's IP, not the end user's IP. If a user in Europe uses a VPN that exits in the US, they'll get the US endpoint. EDNS Client Subnet helps mitigate this for major public resolvers like Google DNS and Cloudflare.

Also, the GeoIP database isn't perfect. Edge cases exist, especially for mobile users and corporate VPNs. Design your system so that getting the "wrong" endpoint degrades performance but doesn't break functionality.

Geolocation routing is essential for any application with regulatory, compliance, or localization requirements. Always include a default record, always add health checks, and test from multiple geographic locations before going live.
