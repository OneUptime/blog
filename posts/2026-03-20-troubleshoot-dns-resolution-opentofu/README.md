# How to Troubleshoot DNS Resolution Issues in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, DNS, Route53, Networking, Infrastructure as Code

Description: Learn how to diagnose and fix DNS resolution failures in OpenTofu-managed infrastructure including Route53 record propagation, private hosted zones, and split-horizon DNS issues.

## Introduction

DNS issues in OpenTofu-managed infrastructure fall into two distinct categories: errors during `tofu apply` (Route53 API failures, record conflicts) and post-apply DNS resolution failures (records created but not resolving correctly). Both require different diagnostic approaches.

## Error: Route53 Record Already Exists

```text
Error: [ERR]: Error building changeset: InvalidChangeBatch:
[Tried to create resource record set [name='api.example.com.', type='A']
but it already exists]
```

```bash
# Check if the record exists in Route53

aws route53 list-resource-record-sets \
  --hosted-zone-id Z1234567890ABCDE \
  --query "ResourceRecordSets[?Name=='api.example.com.']"

# If it exists and should be managed by OpenTofu, import it
tofu import aws_route53_record.api Z1234567890ABCDE_api.example.com_A
```

```hcl
# If OpenTofu and an external system both manage the same record,
# use allow_overwrite
resource "aws_route53_record" "api" {
  zone_id         = aws_route53_zone.main.zone_id
  name            = "api.example.com"
  type            = "A"
  allow_overwrite = true  # overwrite records created outside OpenTofu

  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}
```

## Error: Hosted Zone Not Found

```text
Error: reading Route53 Hosted Zone: NoSuchHostedZone:
No hosted zone found with ID: Z1234567890ABCDE
```

```bash
# Find the correct zone ID
aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='example.com.'].[Id,Name,Config.PrivateZone]" \
  --output table

# Note: Zone IDs returned by AWS are /hostedzone/ZXXX - strip the prefix
# OpenTofu expects just ZXXX

# Use data source to look up the zone dynamically
```

```hcl
# Look up hosted zone dynamically instead of hardcoding the ID
data "aws_route53_zone" "main" {
  name         = "example.com."
  private_zone = false  # set to true for private hosted zones
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${data.aws_route53_zone.main.name}"
  type    = "A"
  # ...
}
```

## Post-Apply: Records Created but Not Resolving

```bash
# Check if the record exists in Route53 (authoritative)
dig @ns-1234.awsdns-56.org api.example.com

# Check local resolution (may be cached)
dig api.example.com

# Check TTL - shorter TTLs reduce how long recursive resolvers cache answers
dig api.example.com +noall +answer

# Query a public resolver instead of the local resolver (it may still have cached data)
dig @8.8.8.8 api.example.com
```

## Private Hosted Zone Not Resolving in VPC

Private hosted zones resolve through Route 53 Resolver in associated VPCs (or through an inbound Resolver endpoint for hybrid networks), and the VPC must have DNS support enabled.

```bash
# Check the VPCs currently associated with the hosted zone
aws route53 get-hosted-zone \
  --id Z1234567890ABCDE \
  --query "VPCs"

# From within the VPC, test resolution
# (SSH to an EC2 instance in the VPC)
dig internal-api.example.internal
```

```hcl
# Ensure the private zone is associated with the correct VPC
resource "aws_route53_zone" "private" {
  name = "example.internal"

  vpc {
    vpc_id = aws_vpc.main.id
  }

  lifecycle {
    ignore_changes = [vpc]  # avoid diffs when additional associations are managed separately
  }
}

# Associate additional VPCs if needed
resource "aws_route53_zone_association" "secondary" {
  zone_id = aws_route53_zone.private.zone_id
  vpc_id  = aws_vpc.secondary.id
}
```

## Split-Horizon DNS Configuration

Different DNS responses for internal vs. external clients.

```hcl
# Public zone - for external clients
resource "aws_route53_zone" "public" {
  name = "example.com"
}

resource "aws_route53_record" "public_api" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 300
  records = [aws_eip.api.public_ip]  # public IP
}

# Private zone - for internal clients in VPC
resource "aws_route53_zone" "private" {
  name = "example.com"
  vpc {
    vpc_id = aws_vpc.main.id
  }
}

resource "aws_route53_record" "private_api" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.internal.dns_name
    zone_id                = aws_lb.internal.zone_id
    evaluate_target_health = true
  }
}
```

## DNS Propagation Wait in Automation

After creating DNS records, dependent resources may fail if they check DNS immediately.

```hcl
# Use time_sleep to wait for DNS propagation
resource "time_sleep" "dns_propagation" {
  depends_on      = [aws_route53_record.api]
  create_duration = "30s"
}

resource "null_resource" "ssl_cert_validation" {
  depends_on = [time_sleep.dns_propagation]
  # certificate validation that requires DNS to be live
}
```

## Summary

Route53 errors during apply are usually record conflicts (import with `tofu import` or set `allow_overwrite = true`) or wrong zone IDs (use `data.aws_route53_zone` to look up dynamically). Post-apply DNS failures are usually propagation delay (check with `dig @ns-server` directly against Route53's nameservers), private hosted zone VPC association missing, or TTL caching. For automation, add a `time_sleep` after DNS record creation when downstream steps depend on DNS resolution.
