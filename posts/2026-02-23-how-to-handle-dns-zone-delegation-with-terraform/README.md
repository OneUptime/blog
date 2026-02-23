# How to Handle DNS Zone Delegation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Route53, DNS, Zone Delegation, Infrastructure as Code

Description: Learn how to handle DNS zone delegation with Terraform using Route53, including parent-child zone relationships, cross-account delegation, and multi-environment DNS architectures.

---

DNS zone delegation is a fundamental technique for organizing and managing DNS at scale. It allows you to split your domain into subdomains managed by separate hosted zones, often in different AWS accounts. This is especially useful for multi-environment architectures where each team or environment manages its own DNS. In this guide, we will implement DNS zone delegation using Terraform and AWS Route53.

## What Is DNS Zone Delegation?

Zone delegation works by creating NS (Name Server) records in a parent zone that point to the name servers of a child zone. When a DNS resolver queries for a subdomain, it follows these NS records to the appropriate child zone. For example, if you own `example.com` and delegate `staging.example.com` to a separate hosted zone, queries for `app.staging.example.com` will be resolved by the child zone's name servers.

## Prerequisites

You need Terraform 1.0 or later, AWS credentials with Route53 permissions, and a registered domain name. For cross-account delegation, you will need credentials or provider configurations for multiple AWS accounts.

## Basic Zone Delegation

Let us start with the simplest case - delegating a subdomain within the same AWS account.

```hcl
provider "aws" {
  region = "us-east-1"
}

# Parent hosted zone (example.com)
resource "aws_route53_zone" "parent" {
  name    = "example.com"
  comment = "Parent zone for example.com"

  tags = {
    Environment = "production"
  }
}

# Child hosted zone (staging.example.com)
resource "aws_route53_zone" "staging" {
  name    = "staging.example.com"
  comment = "Delegated zone for staging environment"

  tags = {
    Environment = "staging"
  }
}

# NS records in the parent zone pointing to the child zone's name servers
resource "aws_route53_record" "staging_delegation" {
  zone_id = aws_route53_zone.parent.zone_id
  name    = "staging.example.com"
  type    = "NS"
  ttl     = 300  # Lower TTL during setup, increase once confirmed working

  # Reference the child zone's name servers
  records = aws_route53_zone.staging.name_servers
}
```

The key is the NS record in the parent zone that contains the name servers from the child zone. This tells DNS resolvers where to find records under `staging.example.com`.

## Multi-Environment Delegation

A common pattern is delegating zones for development, staging, and production environments.

```hcl
# Define the environments
locals {
  environments = {
    dev = {
      comment = "Development environment"
    }
    staging = {
      comment = "Staging environment"
    }
    prod = {
      comment = "Production environment"
    }
  }
}

# Create child zones for each environment
resource "aws_route53_zone" "environment" {
  for_each = local.environments

  name    = "${each.key}.example.com"
  comment = each.value.comment

  tags = {
    Environment = each.key
  }
}

# Create delegation NS records in the parent zone for each environment
resource "aws_route53_record" "environment_delegation" {
  for_each = local.environments

  zone_id = aws_route53_zone.parent.zone_id
  name    = "${each.key}.example.com"
  type    = "NS"
  ttl     = 3600  # 1 hour TTL for stable delegations

  records = aws_route53_zone.environment[each.key].name_servers
}
```

Now you can create records in each environment zone independently. For example, `api.dev.example.com` would be managed in the dev zone.

## Cross-Account Zone Delegation

In enterprise setups, each environment typically lives in a separate AWS account. This requires using multiple providers.

```hcl
# Provider for the management account (owns the parent zone)
provider "aws" {
  alias  = "management"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/TerraformDNSRole"
  }
}

# Provider for the development account
provider "aws" {
  alias  = "development"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::222222222222:role/TerraformDNSRole"
  }
}

# Provider for the staging account
provider "aws" {
  alias  = "staging"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::333333333333:role/TerraformDNSRole"
  }
}

# Parent zone in the management account
resource "aws_route53_zone" "parent" {
  provider = aws.management
  name     = "example.com"

  tags = {
    ManagedBy = "terraform"
  }
}

# Child zone in the development account
resource "aws_route53_zone" "dev" {
  provider = aws.development
  name     = "dev.example.com"

  tags = {
    Environment = "development"
    ManagedBy   = "terraform"
  }
}

# Delegation record in the parent zone pointing to the dev zone
resource "aws_route53_record" "dev_delegation" {
  provider = aws.management
  zone_id  = aws_route53_zone.parent.zone_id
  name     = "dev.example.com"
  type     = "NS"
  ttl      = 3600

  records = aws_route53_zone.dev.name_servers
}

# Child zone in the staging account
resource "aws_route53_zone" "staging_account" {
  provider = aws.staging
  name     = "staging.example.com"

  tags = {
    Environment = "staging"
    ManagedBy   = "terraform"
  }
}

# Delegation record for staging
resource "aws_route53_record" "staging_delegation_cross_account" {
  provider = aws.management
  zone_id  = aws_route53_zone.parent.zone_id
  name     = "staging.example.com"
  type     = "NS"
  ttl      = 3600

  records = aws_route53_zone.staging_account.name_servers
}
```

## Using Data Sources for Existing Zones

If the parent zone already exists and is managed outside of your Terraform state, use a data source.

```hcl
# Look up an existing parent zone
data "aws_route53_zone" "parent" {
  name         = "example.com"
  private_zone = false
}

# Create the child zone
resource "aws_route53_zone" "app" {
  name = "app.example.com"

  tags = {
    ManagedBy = "terraform"
  }
}

# Delegate using the existing parent zone
resource "aws_route53_record" "app_delegation" {
  zone_id = data.aws_route53_zone.parent.zone_id
  name    = "app.example.com"
  type    = "NS"
  ttl     = 3600

  records = aws_route53_zone.app.name_servers
}
```

## Nested Delegation

You can create multiple levels of delegation for complex organizational structures.

```hcl
# Top-level zone: example.com
resource "aws_route53_zone" "root" {
  name = "example.com"
}

# Second-level zone: platform.example.com
resource "aws_route53_zone" "platform" {
  name = "platform.example.com"
}

# Delegation from root to platform
resource "aws_route53_record" "platform_delegation" {
  zone_id = aws_route53_zone.root.zone_id
  name    = "platform.example.com"
  type    = "NS"
  ttl     = 3600
  records = aws_route53_zone.platform.name_servers
}

# Third-level zone: api.platform.example.com
resource "aws_route53_zone" "api_platform" {
  name = "api.platform.example.com"
}

# Delegation from platform to api.platform
# Note: this NS record goes in the platform zone, not the root zone
resource "aws_route53_record" "api_platform_delegation" {
  zone_id = aws_route53_zone.platform.zone_id
  name    = "api.platform.example.com"
  type    = "NS"
  ttl     = 3600
  records = aws_route53_zone.api_platform.name_servers
}
```

## Adding Records to Delegated Zones

Once delegation is set up, you can manage records in each zone independently.

```hcl
# Records in the staging zone
resource "aws_route53_record" "staging_api" {
  zone_id = aws_route53_zone.staging.zone_id
  name    = "api.staging.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.staging_api.dns_name
    zone_id                = aws_lb.staging_api.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "staging_web" {
  zone_id = aws_route53_zone.staging.zone_id
  name    = "www.staging.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.staging.domain_name
    zone_id                = aws_cloudfront_distribution.staging.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Verifying Zone Delegation

After applying the Terraform configuration, verify the delegation works using DNS queries.

```hcl
# Output the name servers for verification
output "parent_name_servers" {
  value = aws_route53_zone.parent.name_servers
}

output "staging_name_servers" {
  value = aws_route53_zone.staging.name_servers
}

# After terraform apply, verify with:
# dig +trace staging.example.com NS
# dig api.staging.example.com A
```

You can verify delegation by running `dig NS staging.example.com` and confirming the returned name servers match the child zone's name servers. The `+trace` flag in dig will show you the full delegation chain.

## Common Pitfalls

The most common mistake is creating records for the delegated subdomain in the parent zone instead of the child zone. If you have `staging.example.com` delegated to a child zone but create `api.staging.example.com` in the parent zone, it will not resolve correctly.

Another issue is TTL values. When first setting up delegation, use low TTLs (300 seconds) so that changes propagate quickly. Once everything is confirmed working, increase the TTL to reduce DNS query load.

Be careful when destroying delegated zones. Always remove the NS delegation record from the parent zone before destroying the child zone to avoid dangling references.

## Conclusion

DNS zone delegation with Terraform provides a clean separation of DNS management across teams, environments, and accounts. By using Terraform to manage both parent and child zones along with their delegation records, you ensure consistency and traceability. The cross-account delegation pattern is particularly valuable for enterprise organizations following AWS best practices with separate accounts per environment.

For related DNS topics, see our guide on [How to Configure Route53 Resolver with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-route53-resolver-with-terraform/view).
