# How to Configure Route 53 DNS with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, Terraform, DNS, Infrastructure as Code

Description: Complete Terraform guide for managing Route 53 hosted zones, DNS records, health checks, and routing policies as infrastructure as code.

---

Managing DNS records through the AWS console works fine until you have dozens of records across multiple zones. Then it becomes a nightmare of manual changes, no audit trail, and the constant fear of fat-fingering a production record. Terraform solves all of this by letting you define your DNS as code, version-control it, and apply changes through your CI/CD pipeline.

## Creating a Hosted Zone

Start with the hosted zone. This is your DNS namespace:

```hcl
# Create a public hosted zone
resource "aws_route53_zone" "primary" {
  name    = "example.com"
  comment = "Primary domain hosted zone"

  tags = {
    Environment = "production"
  }
}

# Output the nameservers - you'll need these at your registrar
output "nameservers" {
  value = aws_route53_zone.primary.name_servers
}
```

For a private hosted zone (internal DNS within a VPC):

```hcl
# Create a private hosted zone associated with a VPC
resource "aws_route53_zone" "internal" {
  name    = "internal.example.com"
  comment = "Internal DNS zone"

  vpc {
    vpc_id = aws_vpc.main.id
  }

  tags = {
    Environment = "production"
  }
}

# Associate with additional VPCs if needed
resource "aws_route53_zone_association" "secondary_vpc" {
  zone_id = aws_route53_zone.internal.zone_id
  vpc_id  = aws_vpc.secondary.id
}
```

## Basic DNS Records

Create common record types:

```hcl
# A record pointing to an IP address
resource "aws_route53_record" "web" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "example.com"
  type    = "A"
  ttl     = 300
  records = ["203.0.113.10"]
}

# CNAME record
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "www.example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["example.com"]
}

# MX records for email
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "example.com"
  type    = "MX"
  ttl     = 3600
  records = [
    "10 mail1.example.com",
    "20 mail2.example.com"
  ]
}

# TXT record for SPF and domain verification
resource "aws_route53_record" "txt" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "example.com"
  type    = "TXT"
  ttl     = 300
  records = [
    "v=spf1 include:_spf.google.com ~all",
    "google-site-verification=abc123"
  ]
}
```

## Alias Records for AWS Resources

Alias records are Route 53's special sauce - they resolve directly to AWS resources, cost nothing per query, and work at the zone apex:

```hcl
# Alias record pointing to an ALB
resource "aws_route53_record" "alb" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

# Alias record pointing to CloudFront
resource "aws_route53_record" "cdn" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "cdn.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# Alias record pointing to S3 website
resource "aws_route53_record" "static" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "static.example.com"
  type    = "A"

  alias {
    name                   = aws_s3_bucket_website_configuration.static.website_domain
    zone_id                = aws_s3_bucket.static.hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 alias record for an ALB
resource "aws_route53_record" "alb_ipv6" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "AAAA"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
```

## Health Checks

Route 53 health checks monitor endpoint availability and can drive routing decisions:

```hcl
# HTTP health check
resource "aws_route53_health_check" "web" {
  fqdn              = "app.example.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30
  measure_latency    = true

  tags = {
    Name = "web-health-check"
  }
}

# CloudWatch alarm-based health check
resource "aws_route53_health_check" "cloudwatch" {
  type                            = "CLOUDWATCH_METRIC"
  cloudwatch_alarm_name           = aws_cloudwatch_metric_alarm.app_health.alarm_name
  cloudwatch_alarm_region         = "us-east-1"
  insufficient_data_health_status = "Unhealthy"

  tags = {
    Name = "app-cloudwatch-health-check"
  }
}

# Calculated health check (healthy if at least 2 of 3 child checks are healthy)
resource "aws_route53_health_check" "calculated" {
  type                   = "CALCULATED"
  child_health_threshold = 2
  child_healthchecks = [
    aws_route53_health_check.web.id,
    aws_route53_health_check.api.id,
    aws_route53_health_check.db.id,
  ]

  tags = {
    Name = "composite-health-check"
  }
}
```

## Routing Policies

Route 53 supports several routing policies. Here are Terraform configurations for each:

### Weighted Routing

Distribute traffic based on weights - useful for blue-green deployments:

```hcl
# Send 80% of traffic to the primary ALB
resource "aws_route53_record" "primary" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "primary"
  weighted_routing_policy {
    weight = 80
  }

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

# Send 20% of traffic to the canary ALB
resource "aws_route53_record" "canary" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "canary"
  weighted_routing_policy {
    weight = 20
  }

  alias {
    name                   = aws_lb.canary.dns_name
    zone_id                = aws_lb.canary.zone_id
    evaluate_target_health = true
  }
}
```

### Failover Routing

Automatic failover between primary and secondary:

```hcl
resource "aws_route53_record" "primary_failover" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "primary"
  failover_routing_policy {
    type = "PRIMARY"
  }

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.primary.id
}

resource "aws_route53_record" "secondary_failover" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "secondary"
  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = aws_lb.secondary.dns_name
    zone_id                = aws_lb.secondary.zone_id
    evaluate_target_health = true
  }
}
```

### Latency-Based Routing

Route users to the nearest region:

```hcl
resource "aws_route53_record" "us_east" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

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

resource "aws_route53_record" "eu_west" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

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

### Geolocation Routing

Route based on the user's geographic location:

```hcl
# US users go to US endpoint
resource "aws_route53_record" "geo_us" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "us"
  geolocation_routing_policy {
    country = "US"
  }

  alias {
    name                   = aws_lb.us.dns_name
    zone_id                = aws_lb.us.zone_id
    evaluate_target_health = true
  }
}

# European users go to EU endpoint
resource "aws_route53_record" "geo_eu" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  set_identifier = "eu"
  geolocation_routing_policy {
    continent = "EU"
  }

  alias {
    name                   = aws_lb.eu.dns_name
    zone_id                = aws_lb.eu.zone_id
    evaluate_target_health = true
  }
}

# Default - everyone else
resource "aws_route53_record" "geo_default" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

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

## ACM Certificate with DNS Validation

Automate SSL certificate creation and DNS validation:

```hcl
# Request a certificate
resource "aws_acm_certificate" "main" {
  domain_name               = "example.com"
  subject_alternative_names = ["*.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = "production"
  }
}

# Create the DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.primary.zone_id
}

# Wait for validation to complete
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

## Managing Records with for_each

For multiple similar records, use for_each to keep things DRY:

```hcl
variable "subdomains" {
  default = {
    "api"     = "10.0.1.10"
    "admin"   = "10.0.1.11"
    "staging" = "10.0.2.10"
  }
}

resource "aws_route53_record" "subdomains" {
  for_each = var.subdomains

  zone_id = aws_route53_zone.primary.zone_id
  name    = "${each.key}.example.com"
  type    = "A"
  ttl     = 300
  records = [each.value]
}
```

## Importing Existing Records

If you have existing Route 53 records and want to bring them under Terraform management:

```bash
# Import an existing record
terraform import 'aws_route53_record.web' Z1234567890_example.com_A

# Import a weighted record
terraform import 'aws_route53_record.primary' Z1234567890_app.example.com_A_primary
```

The import ID format is `{zone_id}_{name}_{type}_{set_identifier}`.

## Best Practices

1. **Use variables for zone IDs** - Don't hardcode zone IDs. Reference them from data sources or other resources.

2. **Use lifecycle create_before_destroy** for certificates - This prevents downtime during certificate renewal.

3. **Version control everything** - Your DNS configuration is critical infrastructure. Treat it like code.

4. **Use remote state** - Store Terraform state in S3 with DynamoDB locking so multiple team members can safely make changes.

5. **Plan before apply** - Always run `terraform plan` and review DNS changes carefully. A wrong DNS change can take your entire site offline.

```bash
# Always review the plan first
terraform plan -out=dns-changes.tfplan

# Apply only after reviewing
terraform apply dns-changes.tfplan
```

## Summary

Terraform transforms Route 53 management from manual, error-prone console clicks into version-controlled, reviewable, and repeatable infrastructure code. Start with hosted zones and basic records, add health checks for production monitoring, and use routing policies for global traffic management. The combination of alias records, health checks, and routing policies gives you a powerful DNS-based traffic management system, all defined in a few Terraform files. For more on Route 53 features, check our guide on [Route 53 query logging for DNS diagnostics](https://oneuptime.com/blog/post/2026-02-12-route-53-query-logging-dns-diagnostics/view).
