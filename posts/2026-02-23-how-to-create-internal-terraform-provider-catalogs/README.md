# How to Create Internal Terraform Provider Catalogs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Platform Engineering, DevOps, Internal Tools

Description: Learn how to build and maintain an internal catalog of approved Terraform providers, including custom providers, version governance, and security review processes for your organization.

---

Terraform's power comes from its provider ecosystem, but with thousands of available providers, organizations need a curated approach. An internal provider catalog defines which providers are approved for use, which versions are sanctioned, and how custom providers are developed and distributed. This prevents shadow IT, ensures security compliance, and provides a consistent experience across teams.

In this guide, we will cover how to build and maintain an internal Terraform provider catalog.

## Why You Need a Provider Catalog

Without governance, teams will use any provider they find. Some providers may not be maintained, may have security vulnerabilities, or may conflict with organizational standards. A provider catalog provides a vetted, documented list of providers that teams can use with confidence.

## Designing the Catalog Structure

```yaml
# provider-catalog/catalog.yaml
# Internal Terraform Provider Catalog

catalog_version: "2.0"
last_updated: "2026-02-23"

providers:
  - name: "hashicorp/aws"
    status: "approved"
    approved_versions: ">= 5.30.0, < 6.0.0"
    latest_tested: "5.35.0"
    category: "cloud"
    security_review: "2026-01-15"
    documentation: "https://wiki.internal/terraform/providers/aws"
    notes: "Primary cloud provider. Use for all AWS resources."
    restrictions:
      - "Must use assume_role for authentication"
      - "Must set allowed_account_ids"

  - name: "hashicorp/azurerm"
    status: "approved"
    approved_versions: ">= 3.80.0, < 4.0.0"
    latest_tested: "3.85.0"
    category: "cloud"
    security_review: "2026-01-20"
    documentation: "https://wiki.internal/terraform/providers/azurerm"
    notes: "Secondary cloud provider for specific workloads."

  - name: "hashicorp/kubernetes"
    status: "approved"
    approved_versions: ">= 2.24.0, < 3.0.0"
    latest_tested: "2.25.0"
    category: "orchestration"
    security_review: "2026-02-01"
    documentation: "https://wiki.internal/terraform/providers/k8s"

  - name: "myorg/internal-services"
    status: "approved"
    approved_versions: ">= 1.0.0"
    latest_tested: "1.2.0"
    category: "internal"
    security_review: "2026-02-10"
    documentation: "https://wiki.internal/terraform/providers/internal"
    notes: "Custom provider for managing internal platform services."
    source: "registry.internal/myorg/internal-services"

  - name: "integrations/github"
    status: "conditional"
    approved_versions: ">= 6.0.0"
    category: "devops"
    security_review: "2026-01-25"
    conditions:
      - "Only for repository and team management"
      - "Requires security team approval for org-level changes"

  - name: "hashicorp/vault"
    status: "approved"
    approved_versions: ">= 3.20.0"
    category: "security"
    security_review: "2025-12-15"

  - name: "deprecated-provider/old-tool"
    status: "deprecated"
    deprecation_date: "2025-10-01"
    replacement: "hashicorp/new-tool"
    migration_guide: "https://wiki.internal/terraform/migrate-old-tool"
```

## Enforcing Provider Restrictions

Use policy-as-code to enforce provider catalog compliance:

```rego
# policies/provider-catalog.rego
# Enforce that only approved providers are used

package terraform.providers

import future.keywords.in

# List of approved providers and their version constraints
approved_providers := {
    "registry.terraform.io/hashicorp/aws": ">= 5.30.0, < 6.0.0",
    "registry.terraform.io/hashicorp/azurerm": ">= 3.80.0, < 4.0.0",
    "registry.terraform.io/hashicorp/kubernetes": ">= 2.24.0, < 3.0.0",
    "registry.terraform.io/hashicorp/vault": ">= 3.20.0",
    "registry.terraform.io/hashicorp/random": ">= 3.5.0",
    "registry.terraform.io/hashicorp/null": ">= 3.2.0",
    "registry.internal/myorg/internal-services": ">= 1.0.0"
}

# Deny unapproved providers
deny[msg] {
    provider := input.configuration.provider_config[name]
    full_source := provider.full_name
    not full_source in approved_providers
    msg := sprintf(
        "Provider '%s' is not in the approved provider catalog. Submit a request at wiki.internal/terraform/provider-request",
        [full_source]
    )
}
```

## Building Custom Internal Providers

For internal services that do not have public providers:

```go
// internal-provider/main.go
// Custom Terraform provider for internal services

package main

import (
    "context"
    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "myorg/terraform-provider-internal/internal/provider"
)

func main() {
    providerserver.Serve(context.Background(), provider.New, providerserver.ServeOpts{
        Address: "registry.internal/myorg/internal-services",
    })
}
```

```go
// internal-provider/internal/provider/provider.go
// Provider configuration

package provider

import (
    "context"
    "github.com/hashicorp/terraform-plugin-framework/datasource"
    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/resource"
)

type InternalProvider struct {
    version string
}

func New(version string) func() provider.Provider {
    return func() provider.Provider {
        return &InternalProvider{version: version}
    }
}

func (p *InternalProvider) Resources(ctx context.Context) []func() resource.Resource {
    return []func() resource.Resource{
        NewServiceResource,
        NewDatabaseResource,
        NewCacheResource,
    }
}

func (p *InternalProvider) DataSources(ctx context.Context) []func() datasource.DataSource {
    return []func() datasource.DataSource{
        NewServiceDataSource,
        NewTeamDataSource,
    }
}
```

## Provider Security Review Process

Every provider must undergo security review before approval:

```yaml
# provider-catalog/security-review-template.yaml
# Security review checklist for Terraform providers

review:
  provider_name: ""
  version_reviewed: ""
  reviewer: ""
  review_date: ""

  checks:
    source_code:
      - "Source code is publicly available and auditable"
      - "No embedded credentials or secrets"
      - "Uses secure communication (TLS) for API calls"
      - "Handles errors without leaking sensitive data"

    authentication:
      - "Supports secure authentication methods"
      - "Does not store credentials in state file unnecessarily"
      - "Supports credential rotation"

    data_handling:
      - "Sensitive attributes marked as sensitive"
      - "State file does not contain unnecessary sensitive data"
      - "Logging does not expose sensitive information"

    maintenance:
      - "Provider is actively maintained"
      - "Security vulnerabilities are patched promptly"
      - "Compatible with current Terraform version"
      - "Has automated tests"

    compliance:
      - "Meets organizational security standards"
      - "Compatible with our encryption requirements"
      - "Supports required audit logging"

  result: "approved/conditional/rejected"
  conditions: ""
  next_review_date: ""
```

## Hosting a Private Provider Registry

Set up a private registry for distributing approved providers:

```hcl
# registry-infrastructure/main.tf
# Infrastructure for hosting a private Terraform provider registry

# S3 bucket to store provider binaries
resource "aws_s3_bucket" "provider_registry" {
  bucket = "myorg-terraform-providers"
}

resource "aws_s3_bucket_versioning" "provider_registry" {
  bucket = aws_s3_bucket.provider_registry.id
  versioning_configuration {
    status = "Enabled"
  }
}

# CloudFront distribution for fast provider downloads
resource "aws_cloudfront_distribution" "provider_registry" {
  origin {
    domain_name = aws_s3_bucket.provider_registry.bucket_regional_domain_name
    origin_id   = "provider-registry"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.registry.cloudfront_access_identity_path
    }
  }

  enabled             = true
  default_root_object = "index.json"

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "provider-registry"
    viewer_protocol_policy = "https-only"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = var.certificate_arn
    ssl_support_method  = "sni-only"
  }

  tags = {
    Purpose   = "terraform-provider-registry"
    ManagedBy = "terraform"
  }
}
```

## Provider Version Upgrade Strategy

Define how provider versions are tested and rolled out:

```yaml
# provider-catalog/upgrade-strategy.yaml
# Strategy for upgrading provider versions

upgrade_process:
  1_notification:
    trigger: "New provider version released"
    action: "Automated notification to platform team"

  2_testing:
    action: "Test new version in sandbox environment"
    tests:
      - "Run existing module tests with new version"
      - "Check for deprecated features"
      - "Verify no breaking changes"
    timeline: "1 week"

  3_staging:
    action: "Deploy to staging environments"
    validation:
      - "Run terraform plan on all staging workspaces"
      - "Verify no unexpected changes"
    timeline: "1 week"

  4_approval:
    action: "Update approved version range in catalog"
    requires: "Platform team lead approval"

  5_rollout:
    action: "Announce new version and update documentation"
    communication:
      - "Update catalog YAML"
      - "Post in #terraform-announcements"
      - "Update CI/CD pipeline version constraints"

  6_enforcement:
    action: "Set deadline for teams to upgrade"
    timeline: "30 days for minor versions, 90 days for major"
```

## Tracking Provider Usage

Monitor which providers and versions are in use across the organization:

```python
# scripts/provider-usage.py
# Track provider usage across all workspaces

import json
import os

def scan_provider_usage(workspace_root):
    """Scan all workspaces for provider usage."""
    usage = {}

    for root, dirs, files in os.walk(workspace_root):
        for file in files:
            if file == ".terraform.lock.hcl":
                lock_file = os.path.join(root, file)
                providers = parse_lock_file(lock_file)

                for provider, version in providers.items():
                    if provider not in usage:
                        usage[provider] = {}
                    if version not in usage[provider]:
                        usage[provider][version] = []
                    usage[provider][version].append(root)

    return usage

def generate_usage_report(usage):
    """Generate a human-readable usage report."""
    print("Provider Usage Report")
    print("=" * 60)

    for provider, versions in sorted(usage.items()):
        print(f"\n{provider}:")
        for version, workspaces in sorted(versions.items()):
            print(f"  v{version}: {len(workspaces)} workspaces")
```

## Best Practices

Keep the catalog up to date. An outdated catalog erodes trust. Schedule regular reviews and updates to keep approved versions current.

Make it easy to request new providers. Create a simple process for teams to request providers that are not in the catalog. If the process is too burdensome, teams will find workarounds.

Automate enforcement. Use CI/CD checks and policy-as-code to prevent unapproved providers from being used, rather than relying on manual review.

Document provider-specific best practices. Some providers have nuances that teams should be aware of. Include provider-specific guidance in the catalog.

Plan for provider deprecation. When a provider is deprecated, provide a migration guide and a reasonable timeline for teams to migrate.

## Conclusion

An internal Terraform provider catalog brings order to the provider ecosystem within your organization. By vetting providers, managing versions, and distributing custom providers through a private registry, you ensure that teams have access to the providers they need while maintaining security and consistency. The catalog serves as a trusted reference that teams can rely on when building infrastructure.
