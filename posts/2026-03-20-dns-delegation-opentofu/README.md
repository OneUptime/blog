# How to Configure DNS Delegation with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DNS, Delegation, Route53, Infrastructure as Code

Description: Learn how to configure DNS delegation with OpenTofu to delegate subdomains to separate hosted zones for team autonomy and organizational DNS management.

DNS delegation lets you delegate responsibility for a subdomain to a separate DNS zone. This enables team-level DNS autonomy (each team manages their own subdomain) and independent lifecycle management. In cross-account setups, it can also support separate billing.

## Why Delegate DNS?

```text
example.com          (parent zone - platform team)
  ├── api.example.com     (delegated to api team zone)
  ├── app.example.com     (delegated to app team zone)
  └── staging.example.com (delegated to staging zone)
```

## Parent Zone Setup (Route53)

```hcl
# Parent zone - owned by platform team

data "aws_route53_zone" "root" {
  name         = "example.com."
  private_zone = false
}
```

## Creating Child Zones

```hcl
# Child zone for API team
resource "aws_route53_zone" "api" {
  name = "api.example.com"

  tags = {
    Team        = "backend"
    Environment = "production"
  }
}

# Child zone for application team
resource "aws_route53_zone" "app" {
  name = "app.example.com"

  tags = {
    Team        = "frontend"
    Environment = "production"
  }
}
```

## Delegation NS Records in Parent Zone

```hcl
# Delegate api.example.com to the api team's zone
resource "aws_route53_record" "api_ns" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = "api.example.com"
  type    = "NS"
  ttl     = 172800  # 48 hours - example long TTL for a stable delegation

  records = aws_route53_zone.api.name_servers
}

# Delegate app.example.com to the app team's zone
resource "aws_route53_record" "app_ns" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = "app.example.com"
  type    = "NS"
  ttl     = 172800

  records = aws_route53_zone.app.name_servers
}
```

## Cross-Account Delegation

```hcl
# Parent zone in platform account
provider "aws" {
  alias  = "platform"
  region = "us-east-1"
  # Uses platform account credentials
}

# API team zone in their own account
provider "aws" {
  alias  = "api_team"
  region = "us-east-1"
  # Uses API team account credentials
}

data "aws_route53_zone" "root" {
  provider     = aws.platform
  name         = "example.com."
  private_zone = false
}

resource "aws_route53_zone" "api_team_zone" {
  provider = aws.api_team
  name     = "api.example.com"
}

# Platform account creates delegation NS record
resource "aws_route53_record" "api_delegation" {
  provider = aws.platform
  zone_id  = data.aws_route53_zone.root.zone_id
  name     = "api.example.com"
  type     = "NS"
  ttl      = 172800
  records  = aws_route53_zone.api_team_zone.name_servers
}
```

## Environment-Based Delegation

```hcl
locals {
  environments = ["dev", "staging", "production"]
}

resource "aws_route53_zone" "env_zones" {
  for_each = toset(local.environments)
  name     = "${each.key}.example.com"
}

resource "aws_route53_record" "env_ns_records" {
  for_each = toset(local.environments)

  zone_id = data.aws_route53_zone.root.zone_id
  name    = "${each.key}.example.com"
  type    = "NS"
  ttl     = 172800
  records = aws_route53_zone.env_zones[each.key].name_servers
}
```

## Verifying Delegation

```bash
# Verify NS delegation is correct
dig @8.8.8.8 api.example.com NS

# Trace the full delegation chain
dig +trace api.example.com NS
```

## Conclusion

DNS delegation in OpenTofu enables organizational DNS autonomy. Create child zones per team or environment, add NS records in the parent zone pointing to the child zone's nameservers, and use cross-account provider aliases when teams have separate AWS accounts. A longer TTL can make sense for stable NS delegation records, but remember that delegation changes can be cached for up to the TTL.
