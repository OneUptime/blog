# How to Create Geo-Based DNS Routing with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DNS, Geolocation Routing, AWS, Route 53, Networking, CDN

Description: Learn how to implement geographic DNS routing with Terraform and AWS Route 53 to direct users to the nearest regional endpoint.

---

Geo-based DNS routing, also known as geolocation routing, allows you to route traffic to different endpoints based on the geographic location of the user making the DNS query. This is useful for delivering localized content, complying with data residency requirements, or simply reducing latency by directing users to the closest server. In this guide, we will set up geographic DNS routing using Terraform and AWS Route 53.

## Why Use Geolocation Routing

Geolocation routing solves several practical problems. Users in Europe can be directed to servers in the EU region for GDPR compliance. Users in Asia can reach servers deployed in Singapore or Tokyo for lower latency. You can also serve location-specific content, such as language-appropriate pages or region-specific pricing, without any application-level logic.

Route 53 determines the user's location based on the source IP of the DNS query. It supports routing based on continent, country, or US state.

## Prerequisites

You need Terraform 1.0 or later, an AWS account with Route 53 permissions, and a hosted zone configured for your domain. You should also have endpoints deployed in multiple regions.

## Basic Geolocation Routing Setup

Start with the provider and hosted zone reference:

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Reference the existing hosted zone
data "aws_route53_zone" "main" {
  name = "example.com"
}
```

## Creating Geolocation Records

Now create DNS records with geolocation routing policies for different regions:

```hcl
# Route traffic from North America to the US-based endpoint
resource "aws_route53_record" "north_america" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300

  geolocation_routing_policy {
    continent = "NA"
  }

  set_identifier = "north-america"
  records        = ["10.0.1.100"]
}

# Route traffic from Europe to the EU-based endpoint
resource "aws_route53_record" "europe" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300

  geolocation_routing_policy {
    continent = "EU"
  }

  set_identifier = "europe"
  records        = ["10.0.2.100"]
}

# Route traffic from Asia to the Asia-based endpoint
resource "aws_route53_record" "asia" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300

  geolocation_routing_policy {
    continent = "AS"
  }

  set_identifier = "asia"
  records        = ["10.0.3.100"]
}

# Default record for locations not covered above
resource "aws_route53_record" "default" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300

  geolocation_routing_policy {
    country = "*"
  }

  set_identifier = "default"
  records        = ["10.0.1.100"]
}
```

The default record (using `country = "*"`) is essential. Without it, Route 53 will return an empty response for users in regions that do not match any of your geolocation rules.

## Country-Level Routing

For more granular control, you can route based on specific countries:

```hcl
# Route German users to a dedicated endpoint
resource "aws_route53_record" "germany" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300

  geolocation_routing_policy {
    country = "DE"
  }

  set_identifier = "germany"
  records        = ["10.0.4.100"]
}

# Route Japanese users to a dedicated endpoint
resource "aws_route53_record" "japan" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300

  geolocation_routing_policy {
    country = "JP"
  }

  set_identifier = "japan"
  records        = ["10.0.5.100"]
}
```

Country-specific records take precedence over continent-level records. If a user in Germany queries the DNS and both a Germany-specific record and a Europe continent record exist, Route 53 uses the Germany-specific record.

## US State-Level Routing

For United States traffic, you can get even more specific with state-level routing:

```hcl
# Route California users to a West Coast endpoint
resource "aws_route53_record" "california" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300

  geolocation_routing_policy {
    country     = "US"
    subdivision = "CA"
  }

  set_identifier = "california"
  records        = ["10.0.6.100"]
}

# Route New York users to an East Coast endpoint
resource "aws_route53_record" "new_york" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300

  geolocation_routing_policy {
    country     = "US"
    subdivision = "NY"
  }

  set_identifier = "new-york"
  records        = ["10.0.7.100"]
}
```

## Adding Health Checks

Combine geolocation routing with health checks so that unhealthy endpoints are automatically excluded:

```hcl
# Health check for the European endpoint
resource "aws_route53_health_check" "europe" {
  fqdn              = "eu.example.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30

  tags = {
    Name = "europe-health-check"
  }
}

# Geolocation record with health check
resource "aws_route53_record" "europe_with_health" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 60

  geolocation_routing_policy {
    continent = "EU"
  }

  set_identifier  = "europe-healthy"
  records         = ["10.0.2.100"]
  health_check_id = aws_route53_health_check.europe.id
}
```

When the European endpoint fails its health check, Route 53 will fall through to the default record, ensuring users still get a response.

## Using Alias Records with Geolocation

For AWS resources like load balancers, use alias records:

```hcl
# Geolocation record pointing to a regional ALB
resource "aws_route53_record" "us_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  geolocation_routing_policy {
    continent = "NA"
  }

  set_identifier = "us-alb"

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

# Geolocation record pointing to an EU regional ALB
resource "aws_route53_record" "eu_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  geolocation_routing_policy {
    continent = "EU"
  }

  set_identifier = "eu-alb"

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}
```

## Dynamic Configuration with For-Each

For managing many regions, use `for_each` to reduce repetition:

```hcl
variable "geo_endpoints" {
  description = "Map of geographic regions to their endpoints"
  type = map(object({
    continent = optional(string)
    country   = optional(string)
    ip        = string
  }))
  default = {
    "north-america" = { continent = "NA", ip = "10.0.1.100" }
    "europe"        = { continent = "EU", ip = "10.0.2.100" }
    "asia"          = { continent = "AS", ip = "10.0.3.100" }
    "south-america" = { continent = "SA", ip = "10.0.4.100" }
    "africa"        = { continent = "AF", ip = "10.0.5.100" }
    "oceania"       = { continent = "OC", ip = "10.0.6.100" }
  }
}

# Create geolocation records dynamically
resource "aws_route53_record" "geo" {
  for_each = var.geo_endpoints

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300

  geolocation_routing_policy {
    continent = each.value.continent
    country   = each.value.country
  }

  set_identifier = each.key
  records        = [each.value.ip]
}
```

## Testing Geolocation Routing

You can test your geolocation routing using the Route 53 test tool in the AWS console, or by using DNS queries from different geographic locations. The `dig` command with the EDNS Client Subnet option can help simulate queries from different regions.

## Monitoring Geo-Based Routing

Tracking the performance of your geo-based routing is important. Using a monitoring tool like [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-geo-based-dns-routing-with-terraform/view), you can monitor endpoints in multiple regions simultaneously and verify that users are reaching the correct regional endpoint.

## Best Practices

Always include a default geolocation record to catch traffic from unmapped locations. Use health checks with geolocation records to ensure automatic failover. Keep TTL values reasonable - lower values mean faster failover but higher DNS query costs. Consider combining geolocation routing with latency-based routing for the best user experience.

## Conclusion

Geo-based DNS routing with Terraform gives you precise control over where your users are directed based on their physical location. Whether you need to comply with data sovereignty laws, reduce latency, or serve region-specific content, Route 53 geolocation routing policies combined with Terraform provide a clean, reproducible solution. The ability to manage all of this as code means you can review, test, and version control your routing decisions just like any other part of your infrastructure.
