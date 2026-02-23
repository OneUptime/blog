# How to Configure Latency-Based DNS Routing with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DNS, Latency Routing, AWS, Route 53, Performance, Networking

Description: Learn how to set up latency-based DNS routing with Terraform and AWS Route 53 to automatically direct users to the lowest-latency endpoint.

---

Latency-based routing in AWS Route 53 directs DNS queries to the AWS region that provides the lowest latency for the user. Unlike geolocation routing, which uses the user's physical location, latency-based routing measures actual network latency between the user and each AWS region. This means users are always directed to the fastest endpoint, regardless of geographic assumptions. In this guide, we will configure latency-based DNS routing with Terraform.

## How Latency-Based Routing Works

Route 53 maintains a database of latency measurements between different network locations and AWS regions. When a DNS query arrives, Route 53 checks the source IP address, looks up the latency data for each region where you have records, and returns the record associated with the lowest-latency region.

It is important to understand that latency-based routing uses AWS region-level granularity. You specify which AWS region each record belongs to, and Route 53 handles the rest.

## Prerequisites

You will need Terraform 1.0 or later, an AWS account, a Route 53 hosted zone, and application endpoints deployed in multiple AWS regions.

## Basic Setup

Configure the AWS provider and reference your hosted zone:

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

## Creating Latency-Based Records

Create DNS records with latency routing policies pointing to endpoints in different AWS regions:

```hcl
# US East endpoint - latency-based record
resource "aws_route53_record" "us_east" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 60

  latency_routing_policy {
    region = "us-east-1"
  }

  set_identifier = "us-east-1"
  records        = ["10.0.1.100"]
}

# EU West endpoint - latency-based record
resource "aws_route53_record" "eu_west" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 60

  latency_routing_policy {
    region = "eu-west-1"
  }

  set_identifier = "eu-west-1"
  records        = ["10.0.2.100"]
}

# AP Southeast endpoint - latency-based record
resource "aws_route53_record" "ap_southeast" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 60

  latency_routing_policy {
    region = "ap-southeast-1"
  }

  set_identifier = "ap-southeast-1"
  records        = ["10.0.3.100"]
}
```

Each record specifies the AWS region it belongs to through the `latency_routing_policy` block. Route 53 uses this to determine which record to return based on measured latency.

## Latency Records with Alias Targets

When pointing to AWS resources like Application Load Balancers, use alias records:

```hcl
# Multi-region provider configuration
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

provider "aws" {
  alias  = "ap_southeast"
  region = "ap-southeast-1"
}

# Latency record for US East ALB
resource "aws_route53_record" "us_east_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  latency_routing_policy {
    region = "us-east-1"
  }

  set_identifier = "us-east-1-alb"

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

# Latency record for EU West ALB
resource "aws_route53_record" "eu_west_alb" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  latency_routing_policy {
    region = "eu-west-1"
  }

  set_identifier = "eu-west-1-alb"

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}
```

Setting `evaluate_target_health` to `true` means Route 53 will skip unhealthy targets and route to the next-lowest-latency region.

## Adding Health Checks

Combine latency-based routing with health checks for comprehensive availability:

```hcl
# Health check for the US East endpoint
resource "aws_route53_health_check" "us_east" {
  fqdn              = "us-east.example.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30
  regions            = ["us-east-1", "us-west-2", "eu-west-1"]

  tags = {
    Name = "us-east-health-check"
  }
}

# Health check for the EU West endpoint
resource "aws_route53_health_check" "eu_west" {
  fqdn              = "eu-west.example.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30
  regions            = ["us-east-1", "eu-west-1", "ap-southeast-1"]

  tags = {
    Name = "eu-west-health-check"
  }
}

# Latency record with health check
resource "aws_route53_record" "us_east_healthy" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 60

  latency_routing_policy {
    region = "us-east-1"
  }

  set_identifier  = "us-east-1-healthy"
  records         = ["10.0.1.100"]
  health_check_id = aws_route53_health_check.us_east.id
}
```

The `regions` parameter in the health check specifies which Route 53 health checker regions should send requests to your endpoint. Using multiple regions helps avoid false positives from regional network issues.

## Dynamic Configuration with For-Each

Manage multiple regions efficiently using `for_each`:

```hcl
variable "regional_endpoints" {
  description = "Map of AWS regions to endpoint IPs"
  type = map(object({
    ip            = string
    health_fqdn   = string
  }))
  default = {
    "us-east-1"      = { ip = "10.0.1.100", health_fqdn = "us-east.example.com" }
    "us-west-2"      = { ip = "10.0.2.100", health_fqdn = "us-west.example.com" }
    "eu-west-1"      = { ip = "10.0.3.100", health_fqdn = "eu-west.example.com" }
    "eu-central-1"   = { ip = "10.0.4.100", health_fqdn = "eu-central.example.com" }
    "ap-southeast-1" = { ip = "10.0.5.100", health_fqdn = "ap-southeast.example.com" }
    "ap-northeast-1" = { ip = "10.0.6.100", health_fqdn = "ap-northeast.example.com" }
  }
}

# Create health checks for all regions
resource "aws_route53_health_check" "regional" {
  for_each = var.regional_endpoints

  fqdn              = each.value.health_fqdn
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30

  tags = {
    Name   = "${each.key}-health-check"
    Region = each.key
  }
}

# Create latency-based records for all regions
resource "aws_route53_record" "latency" {
  for_each = var.regional_endpoints

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 60

  latency_routing_policy {
    region = each.key
  }

  set_identifier  = each.key
  records         = [each.value.ip]
  health_check_id = aws_route53_health_check.regional[each.key].id
}
```

This approach scales easily. Adding a new region is as simple as adding an entry to the `regional_endpoints` variable.

## Combining Latency with Failover

You can nest routing policies by using alias records that chain different policies. For example, a latency-based record can point to a failover record set:

```hcl
# Primary endpoint in us-east-1 (with failover)
resource "aws_route53_record" "us_east_primary" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "us-east.app.example.com"
  type    = "A"
  ttl     = 60

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "us-east-primary"
  records         = ["10.0.1.100"]
  health_check_id = aws_route53_health_check.us_east.id
}

# Secondary endpoint in us-east-1 (failover backup)
resource "aws_route53_record" "us_east_secondary" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "us-east.app.example.com"
  type    = "A"
  ttl     = 60

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "us-east-secondary"
  records        = ["10.0.1.200"]
}

# Latency record pointing to the failover pair
resource "aws_route53_record" "latency_us_east" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  latency_routing_policy {
    region = "us-east-1"
  }

  set_identifier = "latency-us-east"

  alias {
    name                   = "us-east.app.example.com"
    zone_id                = data.aws_route53_zone.main.zone_id
    evaluate_target_health = true
  }
}
```

## Monitoring Latency Routing Performance

To ensure your latency-based routing is working correctly, monitor endpoint response times from multiple locations. Tools like [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-latency-based-dns-routing-with-terraform/view) can help you set up synthetic monitoring from different global regions, verifying that users are being routed to the fastest endpoint.

## Best Practices

Use health checks on all latency records to automatically remove unhealthy endpoints. Keep TTL values low for faster failover. Deploy endpoints in regions where you have significant user bases. Test your configuration by using DNS tools from different geographic locations.

## Conclusion

Latency-based DNS routing with Terraform gives you an automated way to direct users to the fastest available endpoint. By leveraging Route 53's latency measurements and combining them with health checks, you ensure both performance and reliability. Managing this as Terraform code means your routing infrastructure is versioned, reviewable, and reproducible across environments.
