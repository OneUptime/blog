# How to Fix Error Creating Route53 Record Already Exists

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Route53, DNS, Troubleshooting

Description: Fix the error when Terraform tries to create a Route53 DNS record that already exists, including import strategies and handling record set conflicts.

---

When Terraform tries to create a Route53 record and finds one already exists with the same name and type, you get an error. Route53 enforces uniqueness for certain record types, so you cannot have two A records for the same domain name in the same hosted zone (except for weighted, latency, failover, or geolocation routing policies). This guide explains how to fix this whether the duplicate record was created manually or by another Terraform configuration.

## What the Error Looks Like

```
Error: error creating Route53 Record: InvalidChangeBatch:
[Tried to create resource record set [name='api.example.com.',
type='A'] but it already exists]
    status code: 400, request id: abc123-def456
```

Or:

```
Error: error creating Route53 Record: InvalidChangeBatch:
RRSet of type CNAME with DNS name api.example.com. is not
permitted at apex of zone example.com.
```

## Common Causes and Fixes

### 1. Record Was Created Outside Terraform

The most common scenario is that someone created the DNS record manually through the AWS console or CLI, and now your Terraform configuration is trying to create the same record:

```bash
# Check if the record already exists
aws route53 list-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEF \
  --query "ResourceRecordSets[?Name=='api.example.com.']"
```

**Fix: Import the existing record into Terraform state.**

The import ID format for Route53 records is `zone_id_record-name_record-type` or `zone_id_record-name_record-type_set-identifier` for records with routing policies:

```bash
# For a simple A record
terraform import aws_route53_record.api Z0123456789ABCDEF_api.example.com_A

# For a CNAME record
terraform import aws_route53_record.api Z0123456789ABCDEF_api.example.com_CNAME

# For a weighted record with a set identifier
terraform import aws_route53_record.api Z0123456789ABCDEF_api.example.com_A_primary
```

After importing, run `terraform plan` to verify the imported state matches your configuration.

### 2. Terraform State Mismatch

The record was previously managed by Terraform, but the state was lost or corrupted. Terraform thinks the record does not exist and tries to create it again.

**Fix:** Import the record (same as above) or remove it from AWS and let Terraform recreate it:

```bash
# Option A: Import
terraform import aws_route53_record.api Z0123456789ABCDEF_api.example.com_A

# Option B: Delete and recreate
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEF \
  --change-batch '{
    "Changes": [{
      "Action": "DELETE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "1.2.3.4"}]
      }
    }]
  }'
# Then run terraform apply
```

### 3. Multiple Terraform Configurations Managing the Same Zone

Two different Terraform states or workspaces might be trying to manage the same DNS record:

```hcl
# Configuration A
resource "aws_route53_record" "api" {
  zone_id = "Z0123456789ABCDEF"
  name    = "api.example.com"
  type    = "A"
  ttl     = 300
  records = ["1.2.3.4"]
}

# Configuration B - same record, different state file
resource "aws_route53_record" "api" {
  zone_id = "Z0123456789ABCDEF"
  name    = "api.example.com"
  type    = "A"
  ttl     = 300
  records = ["5.6.7.8"]
}
```

**Fix:** Consolidate DNS management into a single Terraform configuration or use a dedicated DNS module. Only one state file should manage each record.

### 4. CNAME Conflict at Zone Apex

You cannot create a CNAME record at the zone apex (e.g., `example.com`). If you need to point the apex to another domain, use an alias record instead:

```hcl
# WRONG - CNAME at zone apex
resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "CNAME"  # Not allowed at zone apex
  ttl     = 300
  records = ["my-alb-123.us-east-1.elb.amazonaws.com"]
}

# CORRECT - Alias record at zone apex
resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "A"

  alias {
    name                   = aws_lb.web.dns_name
    zone_id                = aws_lb.web.zone_id
    evaluate_target_health = true
  }
}
```

### 5. Record Name Formatting

Route53 is particular about record names. Trailing dots and case sensitivity can cause issues:

```hcl
# These are considered different by Terraform but the same by Route53
name = "api.example.com"   # Terraform adds trailing dot automatically
name = "api.example.com."  # Explicit trailing dot

# Terraform handles this, but it can cause confusion with imports
```

### 6. Conflicting Record Types

Some record types cannot coexist with certain other types for the same name:

- You cannot have a CNAME and any other record type for the same name
- You can have multiple A records (round-robin) but not a CNAME and an A record

```hcl
# WRONG - CNAME and A record for same name
resource "aws_route53_record" "api_cname" {
  zone_id = var.zone_id
  name    = "api.example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["my-alb.amazonaws.com"]
}

resource "aws_route53_record" "api_a" {
  zone_id = var.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 300
  records = ["1.2.3.4"]
}
```

Choose one type. For pointing to AWS resources, alias records are usually the best choice.

## Working with Alias Records

Alias records are a Route53-specific feature that works like a CNAME but without the limitations. They are free (no per-query charge) and can be used at the zone apex:

```hcl
# ALB alias
resource "aws_route53_record" "web" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.web.dns_name
    zone_id                = aws_lb.web.zone_id
    evaluate_target_health = true
  }
}

# CloudFront alias
resource "aws_route53_record" "cdn" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "cdn.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

# S3 website alias
resource "aws_route53_record" "static" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "static.example.com"
  type    = "A"

  alias {
    name                   = aws_s3_bucket_website_configuration.static.website_domain
    zone_id                = aws_s3_bucket.static.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Using allow_overwrite

If you want Terraform to overwrite an existing record instead of failing, use `allow_overwrite`:

```hcl
resource "aws_route53_record" "api" {
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = "api.example.com"
  type            = "A"
  ttl             = 300
  records         = ["1.2.3.4"]
  allow_overwrite = true  # Overwrite existing record
}
```

Use this with caution. It will replace whatever record currently exists without warning.

## Best Practices

1. **Manage all DNS in one place.** Use a single Terraform configuration for all Route53 records in a zone to avoid conflicts.

2. **Use data sources to reference zones.** This prevents typos in zone IDs:

```hcl
data "aws_route53_zone" "main" {
  name = "example.com"
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  # ...
}
```

3. **Prefer alias records** for AWS resources. They are free, work at zone apex, and support health checks.

4. **Monitor your DNS** with [OneUptime](https://oneuptime.com) to detect unexpected DNS changes and get alerted when records are modified outside of your Terraform pipeline.

## Conclusion

The "record already exists" error means Route53 already has a record with the same name and type. The fix is to either import the existing record into your Terraform state, delete it and let Terraform recreate it, or use `allow_overwrite = true`. For long-term maintainability, manage all DNS records for a hosted zone in a single Terraform configuration to prevent conflicts between multiple states.
