# How to Use Data Sources to Read DNS Records in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, DNS, Route53, Data Sources, Infrastructure as Code

Description: Learn how to use Terraform data sources to read and reference existing DNS records from Route53 and other DNS providers in your infrastructure configurations.

---

DNS records are one of those things that tend to exist long before you start managing infrastructure with Terraform. You might have records created through the AWS console, managed by a different team, or set up by a legacy deployment process. Terraform data sources let you query these existing DNS records and use their values in your configurations without needing to import or recreate them.

This guide covers practical techniques for reading DNS records using Terraform data sources, primarily with AWS Route53 but with patterns that apply to other DNS providers too.

## Reading DNS Records from Route53

The `aws_route53_record` data source is the most direct way to query a specific DNS record from Route53. You need to know the hosted zone ID, the record name, and the record type.

```hcl
# First, look up the hosted zone
data "aws_route53_zone" "main" {
  name = "example.com"
}

# Then read a specific A record from that zone
data "aws_route53_record" "web" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"
}

# Use the record's values in an output
output "web_record_values" {
  value = data.aws_route53_record.web.records
}
```

The data source returns different attributes depending on the record type. For standard records, you get the `records` list. For alias records, you get `alias` block details.

## Querying Different Record Types

### A Records

```hcl
# Look up an A record to get its IP addresses
data "aws_route53_record" "server_a" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"
}

output "api_ips" {
  # Returns a list of IP addresses
  value = data.aws_route53_record.server_a.records
}
```

### CNAME Records

```hcl
# Look up a CNAME record
data "aws_route53_record" "cdn_cname" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "cdn.example.com"
  type    = "CNAME"
}

output "cdn_target" {
  # Returns the CNAME target
  value = data.aws_route53_record.cdn_cname.records[0]
}
```

### MX Records

```hcl
# Look up MX records for email configuration
data "aws_route53_record" "mail_mx" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "MX"
}

output "mail_servers" {
  # Returns MX record values like ["10 mail1.example.com", "20 mail2.example.com"]
  value = data.aws_route53_record.mail_mx.records
}
```

### TXT Records

```hcl
# Look up TXT records - common for domain verification
data "aws_route53_record" "spf" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "TXT"
}

output "txt_values" {
  value = data.aws_route53_record.spf.records
}
```

## Using the dns Provider for Generic DNS Lookups

If your DNS records are not in Route53, or you want to query DNS directly without cloud provider credentials, Terraform has a `dns` provider that performs live DNS lookups:

```hcl
# Configure the DNS provider
terraform {
  required_providers {
    dns = {
      source  = "hashicorp/dns"
      version = "~> 3.3"
    }
  }
}

# Look up A records for any domain via DNS
data "dns_a_record_set" "example" {
  host = "www.example.com"
}

output "resolved_ips" {
  # Returns the IP addresses from DNS resolution
  value = data.dns_a_record_set.example.addrs
}
```

### Looking Up Various Record Types with the dns Provider

```hcl
# Look up AAAA (IPv6) records
data "dns_aaaa_record_set" "ipv6" {
  host = "www.example.com"
}

# Look up CNAME records
data "dns_cname_record_set" "alias" {
  host = "cdn.example.com"
}

# Look up MX records
data "dns_mx_record_set" "mail" {
  domain = "example.com"
}

# Look up NS records
data "dns_ns_record_set" "nameservers" {
  host = "example.com"
}

# Look up TXT records
data "dns_txt_record_set" "verification" {
  host = "example.com"
}

# Look up SRV records
data "dns_srv_record_set" "service" {
  service  = "_http"
  proto    = "_tcp"
  domain   = "example.com"
}

output "dns_results" {
  value = {
    ipv6_addrs    = data.dns_aaaa_record_set.ipv6.addrs
    cname_target  = data.dns_cname_record_set.alias.cname
    mail_servers  = [for mx in data.dns_mx_record_set.mail.mx : mx.exchange]
    nameservers   = data.dns_ns_record_set.nameservers.nameservers
    txt_records   = data.dns_txt_record_set.verification.records
  }
}
```

## Practical Use Cases

### Conditional Resource Creation Based on DNS

```hcl
# Check if a DNS record already exists before creating resources
data "dns_a_record_set" "check_existing" {
  host = "api.example.com"
}

# Only create the record if it does not already point somewhere
resource "aws_route53_record" "api" {
  count = length(data.dns_a_record_set.check_existing.addrs) == 0 ? 1 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 300
  records = [aws_eip.api.public_ip]
}
```

### Cross-referencing DNS with Load Balancers

```hcl
# Look up the existing DNS record for a service
data "aws_route53_record" "lb_record" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
}

# Use the DNS data to find the associated load balancer
data "aws_lb" "app" {
  # If the record is an alias to an ALB, we can look up the ALB
  name = "app-load-balancer"
}

# Create a new listener rule on the discovered load balancer
resource "aws_lb_listener_rule" "new_route" {
  listener_arn = data.aws_lb_listener.app.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.new_service.arn
  }

  condition {
    path_pattern {
      values = ["/api/v2/*"]
    }
  }
}
```

### Validating ACM Certificates with Existing DNS

```hcl
# Look up the hosted zone
data "aws_route53_zone" "main" {
  name = "example.com"
}

# Request an ACM certificate
resource "aws_acm_certificate" "cert" {
  domain_name       = "app.example.com"
  validation_method = "DNS"
}

# Create DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]

  # Allow overwriting existing records if they exist
  allow_overwrite = true
}
```

## Working with Private Hosted Zones

```hcl
# Look up a private hosted zone by name and VPC
data "aws_route53_zone" "private" {
  name         = "internal.example.com"
  private_zone = true
  vpc_id       = "vpc-abc12345"
}

# Read a record from the private zone
data "aws_route53_record" "internal_db" {
  zone_id = data.aws_route53_zone.private.zone_id
  name    = "database.internal.example.com"
  type    = "A"
}

# Use the internal database IP in another resource
resource "aws_security_group_rule" "allow_db" {
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = [for ip in data.aws_route53_record.internal_db.records : "${ip}/32"]
  security_group_id = aws_security_group.app.id
}
```

## Error Handling and Tips

A few things to keep in mind when using DNS data sources:

1. The `aws_route53_record` data source will fail if the record does not exist. Plan for this in your configuration.
2. The `dns` provider performs live DNS lookups, so results depend on your DNS resolver and record TTLs.
3. When querying alias records in Route53, the `records` attribute will be empty. Check the `alias` block instead.
4. DNS propagation delays mean recently created records might not be visible to the `dns` provider immediately.

## Conclusion

Terraform data sources for DNS give you a clean way to reference existing records in your configurations. Whether you are looking up Route53 records by zone and type, or performing generic DNS queries with the `dns` provider, these data sources help you build infrastructure that integrates with your existing DNS setup. The pattern of looking up a hosted zone first, then querying specific records, applies across most DNS-related workflows in Terraform.

For related techniques, see our guide on [how to use data sources to read Route53 hosted zones](https://oneuptime.com/blog/post/2026-02-23-terraform-data-sources-route53-hosted-zones/view).
