# How to Manage DNS Zones and Records with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DNS, Terraform, Infrastructure as Code, Route53, Cloudflare, AWS

Description: Learn how to create and manage DNS zones and records on AWS Route53 and Cloudflare using OpenTofu, including A, AAAA, CNAME, MX, and TXT records.

---

Managing DNS with OpenTofu (the open-source Terraform fork) enables reproducible, version-controlled DNS configurations. This guide covers creating Route53 hosted zones and records, plus managing records in an existing Cloudflare zone, using OpenTofu providers.

---

## Prerequisites

```bash
# Install OpenTofu

brew install opentofu

# Create project directory
mkdir dns-management && cd dns-management
```

---

## AWS Route53 DNS Management

### Provider Configuration

```hcl
# providers.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

### Create a Hosted Zone

```hcl
# dns.tf
resource "aws_route53_zone" "main" {
  name    = "example.com"
  comment = "Main production zone"

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "zone_id" {
  value = aws_route53_zone.main.zone_id
}

output "name_servers" {
  value = aws_route53_zone.main.name_servers
}
```

### Common DNS Record Types

```hcl
# A Record - IPv4
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "A"
  ttl     = 300
  records = ["203.0.113.10"]
}

# AAAA Record - IPv6
resource "aws_route53_record" "apex_ipv6" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "AAAA"
  ttl     = 300
  records = ["2001:db8::10"]
}

# CNAME Record
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["example.com"]
}

# MX Records
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "MX"
  ttl     = 3600
  records = [
    "10 mail1.example.com.",
    "20 mail2.example.com."
  ]
}

# TXT Record (SPF, DMARC, etc.)
resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "TXT"
  ttl     = 3600
  records = ["v=spf1 include:_spf.google.com ~all"]
}
```

### Alias Records (Route53-specific)

```hcl
# Alias to ALB
resource "aws_route53_record" "alb" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

---

## Cloudflare DNS Management

### Provider Configuration

```hcl
# providers.tf
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  sensitive = true
}
```

### Cloudflare Records in an Existing Zone

```hcl
# Get existing zone
data "cloudflare_zone" "main" {
  filter = {
    name = "example.com"
  }
}

# A Record
resource "cloudflare_dns_record" "apex" {
  zone_id = data.cloudflare_zone.main.id
  name    = "example.com"
  type    = "A"
  content = "203.0.113.10"
  ttl     = 1  # Auto TTL when proxied
  proxied = true  # Cloudflare proxy (orange cloud)
}

# AAAA Record
resource "cloudflare_dns_record" "apex_ipv6" {
  zone_id = data.cloudflare_zone.main.id
  name    = "example.com"
  type    = "AAAA"
  content = "2001:db8::10"
  ttl     = 1  # Auto TTL when proxied
  proxied = true
}

# CNAME
resource "cloudflare_dns_record" "www" {
  zone_id = data.cloudflare_zone.main.id
  name    = "www.example.com"
  type    = "CNAME"
  content = "example.com"
  ttl     = 1  # Auto TTL when proxied
  proxied = true
}
```

---

## Using for_each for Multiple Records

```hcl
# variables.tf
variable "dns_records" {
  default = {
    "app"  = "203.0.113.20"
    "api"  = "203.0.113.21"
    "mail" = "203.0.113.22"
  }
}

# Create records dynamically
resource "aws_route53_record" "services" {
  for_each = var.dns_records

  zone_id = aws_route53_zone.main.zone_id
  name    = "${each.key}.example.com"
  type    = "A"
  ttl     = 300
  records = [each.value]
}
```

---

## Apply and Verify

```bash
# Initialize
tofu init

# Preview changes
tofu plan

# Apply
tofu apply

# Verify DNS records
dig example.com A
dig example.com AAAA
dig www.example.com CNAME
```

---

## Best Practices

1. **Use data sources** to reference existing zones you do not want OpenTofu to create or manage
2. **Set appropriate TTLs** - lower for frequently changing records, higher for stable ones
3. **Use variables** for IP addresses to make the config reusable across environments
4. **Store state remotely** in S3 or another supported remote backend for team collaboration
5. **Tag all resources** for cost allocation and management

---

## Conclusion

OpenTofu makes DNS management predictable and repeatable. Whether using AWS Route53 or Cloudflare, define your zones and records as code, review changes with `tofu plan`, and apply with confidence.

---

*Monitor DNS availability and response times with [OneUptime](https://oneuptime.com) - uptime monitoring with DNS checks.*
