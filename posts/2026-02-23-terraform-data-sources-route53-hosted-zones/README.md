# How to Use Data Sources to Read Route53 Hosted Zones

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Route53, DNS, Data Sources, Infrastructure as Code

Description: Learn how to use Terraform data sources to read and reference existing Route53 hosted zones for managing DNS records across your AWS infrastructure.

---

Route53 hosted zones are a foundational piece of AWS infrastructure. They often predate Terraform adoption, are shared across multiple teams, and are managed separately from application-level infrastructure. Rather than importing these zones into every Terraform workspace that needs them, data sources let you look up hosted zones and use their attributes wherever you need them.

This guide covers how to query public and private hosted zones, use their attributes in record creation, and handle common patterns like multi-account DNS architectures.

## Basic Hosted Zone Lookup

The `aws_route53_zone` data source supports looking up zones by name, zone ID, tags, or a combination of attributes.

### By Domain Name

```hcl
# Look up a hosted zone by its domain name
data "aws_route53_zone" "main" {
  name = "example.com"
}

# The trailing dot is optional - Terraform handles both formats
# "example.com" and "example.com." both work

output "zone_info" {
  value = {
    zone_id      = data.aws_route53_zone.main.zone_id
    name         = data.aws_route53_zone.main.name
    name_servers = data.aws_route53_zone.main.name_servers
  }
}
```

### By Zone ID

```hcl
# If you know the zone ID directly
data "aws_route53_zone" "specific" {
  zone_id = "Z1234567890ABC"
}

output "zone_name" {
  value = data.aws_route53_zone.specific.name
}
```

### By Tags

```hcl
# Look up a zone using tags
data "aws_route53_zone" "tagged" {
  tags = {
    Environment = "production"
    ManagedBy   = "platform-team"
  }
}
```

## Public vs Private Hosted Zones

AWS Route53 supports both public and private hosted zones. If you have both a public and private zone with the same name, you need to specify which one you want.

```hcl
# Look up the public hosted zone
data "aws_route53_zone" "public" {
  name         = "example.com"
  private_zone = false
}

# Look up the private hosted zone
data "aws_route53_zone" "private" {
  name         = "example.com"
  private_zone = true
}

output "public_zone_id" {
  value = data.aws_route53_zone.public.zone_id
}

output "private_zone_id" {
  value = data.aws_route53_zone.private.zone_id
}
```

### Private Zones with VPC Association

When you have multiple private zones with the same name associated with different VPCs, narrow the search by specifying the VPC:

```hcl
# Look up a private zone associated with a specific VPC
data "aws_route53_zone" "internal" {
  name         = "internal.example.com"
  private_zone = true
  vpc_id       = "vpc-abc12345"
}
```

## Creating DNS Records in Looked-Up Zones

The most common use case for zone data sources is creating records:

```hcl
# Look up the zone
data "aws_route53_zone" "main" {
  name = "example.com"
}

# Create an A record pointing to a load balancer
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

# Create a CNAME record
resource "aws_route53_record" "cdn" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "cdn.example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["d12345.cloudfront.net"]
}

# Create an MX record for email
resource "aws_route53_record" "mail" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "MX"
  ttl     = 3600
  records = [
    "10 mail1.example.com",
    "20 mail2.example.com",
  ]
}
```

## Subdomain Delegation Pattern

A common architecture pattern is delegating subdomains to separate hosted zones. Data sources make this straightforward:

```hcl
# Look up the parent zone (managed by another team)
data "aws_route53_zone" "parent" {
  name = "example.com"
}

# Create a new hosted zone for our subdomain
resource "aws_route53_zone" "staging" {
  name = "staging.example.com"

  tags = {
    Environment = "staging"
    Team        = "platform"
  }
}

# Create NS records in the parent zone to delegate to our subdomain zone
resource "aws_route53_record" "staging_delegation" {
  zone_id = data.aws_route53_zone.parent.zone_id
  name    = "staging.example.com"
  type    = "NS"
  ttl     = 300

  # Use the name servers assigned to our new zone
  records = aws_route53_zone.staging.name_servers
}
```

## Multi-Environment DNS with Data Sources

When managing multiple environments, data sources help you keep configurations DRY:

```hcl
variable "environment" {
  type    = string
  default = "staging"
}

variable "domain_map" {
  type = map(string)
  default = {
    production = "example.com"
    staging    = "staging.example.com"
    dev        = "dev.example.com"
  }
}

# Look up the zone for the current environment
data "aws_route53_zone" "env" {
  name = var.domain_map[var.environment]
}

# Create records in the environment-specific zone
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.env.zone_id
  name    = "api.${data.aws_route53_zone.env.name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.api.public_ip]
}
```

## ACM Certificate Validation

One of the most practical uses of zone data sources is DNS-based certificate validation:

```hcl
# Look up the zone
data "aws_route53_zone" "main" {
  name = "example.com"
}

# Request a certificate
resource "aws_acm_certificate" "wildcard" {
  domain_name               = "example.com"
  subject_alternative_names = ["*.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Create the validation DNS records
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.wildcard.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = data.aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
  allow_overwrite = true
}

# Wait for validation to complete
resource "aws_acm_certificate_validation" "wildcard" {
  certificate_arn         = aws_acm_certificate.wildcard.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
```

## Cross-Account Zone Lookups

In multi-account AWS architectures, the hosted zone might live in a central networking account while applications run in separate accounts:

```hcl
# Configure the provider for the DNS account
provider "aws" {
  alias  = "dns_account"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/DNSManager"
  }
}

# Look up the zone in the DNS account
data "aws_route53_zone" "central" {
  provider = aws.dns_account
  name     = "example.com"
}

# Create records in the central zone from the app account
resource "aws_route53_record" "app" {
  provider = aws.dns_account
  zone_id  = data.aws_route53_zone.central.zone_id
  name     = "myapp.example.com"
  type     = "A"
  ttl      = 300
  records  = [aws_eip.app.public_ip]
}
```

## Useful Zone Attributes

The `aws_route53_zone` data source exposes several attributes:

```hcl
data "aws_route53_zone" "main" {
  name = "example.com"
}

output "zone_details" {
  value = {
    # The hosted zone ID (use this for creating records)
    zone_id = data.aws_route53_zone.main.zone_id

    # The zone name with trailing dot
    name = data.aws_route53_zone.main.name

    # The name servers assigned to this zone
    name_servers = data.aws_route53_zone.main.name_servers

    # The zone ARN
    arn = data.aws_route53_zone.main.arn

    # The zone comment
    comment = data.aws_route53_zone.main.comment

    # The caller reference used when creating the zone
    caller_reference = data.aws_route53_zone.main.caller_reference

    # Number of records in the zone
    resource_record_set_count = data.aws_route53_zone.main.resource_record_set_count
  }
}
```

## Troubleshooting

Common issues when looking up hosted zones:

- If you have both public and private zones with the same name and do not specify `private_zone`, Terraform returns an error about multiple results.
- Zone names in Route53 always end with a trailing dot. The data source handles this for you, but be aware of it when debugging.
- If you get a "no matching zone found" error, double-check the zone name spelling and ensure your AWS credentials have permission to list hosted zones.

## Conclusion

Route53 hosted zone data sources are a building block for almost any DNS configuration in Terraform. By looking up zones dynamically instead of hardcoding zone IDs, your configurations become more portable, easier to read, and less likely to break when zone IDs change. Whether you are creating simple records, setting up subdomain delegation, validating ACM certificates, or working across AWS accounts, the `aws_route53_zone` data source is the starting point.

For more on querying existing resources, see our guide on [how to use data sources to query existing security groups](https://oneuptime.com/blog/post/2026-02-23-terraform-data-sources-security-groups/view).
