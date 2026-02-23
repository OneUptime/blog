# How to Configure Akamai Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Akamai, CDN, Providers, Infrastructure as Code, Edge Computing

Description: A practical guide to configuring the Akamai provider in Terraform for managing CDN properties, DNS zones, edge configurations, and security policies as code.

---

Akamai is one of the largest CDN and edge computing platforms in the world. If you are managing Akamai configurations, you know how tedious clicking through the Akamai Control Center can be. The Akamai Terraform provider lets you define your CDN properties, DNS zones, and security policies as code. This guide covers everything you need to get the provider working and start managing Akamai resources through Terraform.

## Prerequisites

You need the following before getting started:

- An Akamai account with API credentials
- Terraform 1.0 or later installed
- An `.edgerc` file or API credentials from Akamai Control Center

To generate API credentials, log into the Akamai Control Center, go to Identity and Access Management, and create an API client. You will receive a `client_secret`, `host`, `access_token`, and `client_token`.

## Setting Up the .edgerc File

Akamai uses a credentials file called `.edgerc`, typically stored in your home directory. The format looks like this:

```ini
# ~/.edgerc - Akamai API credentials file
[default]
client_secret = your-client-secret-here
host = akab-xxxx.luna.akamaiapis.net
access_token = akab-xxxx
client_token = akab-xxxx

# You can have multiple sections for different environments
[production]
client_secret = prod-client-secret
host = akab-yyyy.luna.akamaiapis.net
access_token = akab-yyyy
client_token = akab-yyyy
```

## Basic Provider Configuration

Here is a minimal provider setup:

```hcl
# main.tf - Akamai provider configuration

terraform {
  required_providers {
    akamai = {
      # Official Akamai provider from the Terraform registry
      source  = "akamai/akamai"
      version = "~> 6.0"
    }
  }

  required_version = ">= 1.0"
}

# Use the default section of ~/.edgerc
provider "akamai" {
  edgerc = "~/.edgerc"
  config_section = "default"
}
```

## Authentication Alternatives

Besides the `.edgerc` file, you can authenticate using environment variables or inline credentials.

### Environment Variables

```bash
# Set Akamai credentials as environment variables
export AKAMAI_CLIENT_SECRET="your-client-secret"
export AKAMAI_HOST="akab-xxxx.luna.akamaiapis.net"
export AKAMAI_ACCESS_TOKEN="akab-xxxx"
export AKAMAI_CLIENT_TOKEN="akab-xxxx"
```

With environment variables set, the provider block can be empty:

```hcl
# Provider reads credentials from environment variables
provider "akamai" {}
```

### Inline Credentials (Not Recommended for Production)

For quick testing, you can pass credentials directly:

```hcl
# Inline credentials - only use for testing
provider "akamai" {
  config {
    client_secret = var.akamai_client_secret
    host          = var.akamai_host
    access_token  = var.akamai_access_token
    client_token  = var.akamai_client_token
  }
}
```

## Managing DNS with Akamai Edge DNS

One of the most common use cases is managing DNS zones:

```hcl
# Create a DNS zone in Akamai Edge DNS
resource "akamai_dns_zone" "example" {
  contract = "ctr_1-AB123"
  group    = "grp_12345"
  zone     = "example.com"
  type     = "PRIMARY"

  # Optional comment for identification
  comment = "Primary zone managed by Terraform"
}

# Add an A record
resource "akamai_dns_record" "web" {
  zone       = akamai_dns_zone.example.zone
  name       = "www.example.com"
  recordtype = "A"
  ttl        = 300

  # Target IP addresses
  target = ["203.0.113.10", "203.0.113.11"]
}

# Add a CNAME record for CDN
resource "akamai_dns_record" "cdn" {
  zone       = akamai_dns_zone.example.zone
  name       = "cdn.example.com"
  recordtype = "CNAME"
  ttl        = 600

  target = ["cdn.example.com.edgekey.net"]
}
```

## Creating a Property (CDN Configuration)

Properties are the core of Akamai CDN configuration. They define how traffic is handled at the edge:

```hcl
# Look up the contract and group
data "akamai_contract" "default" {
  group_name = "My Group"
}

data "akamai_group" "default" {
  group_name  = "My Group"
  contract_id = data.akamai_contract.default.id
}

# Look up the CP code (Content Provider code)
data "akamai_cp_code" "default" {
  name        = "my-cp-code"
  contract_id = data.akamai_contract.default.id
  group_id    = data.akamai_group.default.id
}

# Define property rules using JSON
data "akamai_property_rules_template" "rules" {
  # Path to the JSON rules template
  template_file = abspath("${path.module}/rules/main.json")

  variables {
    name  = "origin_hostname"
    value = "origin.example.com"
    type  = "string"
  }

  variables {
    name  = "cp_code"
    value = parseint(replace(data.akamai_cp_code.default.id, "cpc_", ""), 10)
    type  = "number"
  }
}

# Create the property
resource "akamai_property" "website" {
  name        = "www.example.com"
  contract_id = data.akamai_contract.default.id
  group_id    = data.akamai_group.default.id
  product_id  = "prd_Fresca"

  # Associate hostnames with the property
  hostnames {
    cname_from             = "www.example.com"
    cname_to               = "www.example.com.edgesuite.net"
    cert_provisioning_type = "CPS_MANAGED"
  }

  # Apply the rules
  rules = data.akamai_property_rules_template.rules.json
}
```

## Activating a Property

After creating or updating a property, you need to activate it:

```hcl
# Activate the property on the staging network first
resource "akamai_property_activation" "staging" {
  property_id                    = akamai_property.website.id
  version                        = akamai_property.website.latest_version
  network                        = "STAGING"
  auto_acknowledge_rule_warnings = true

  # Email notifications for activation status
  contact = ["team@example.com"]
}

# After testing on staging, activate on production
resource "akamai_property_activation" "production" {
  property_id                    = akamai_property.website.id
  version                        = akamai_property.website.latest_version
  network                        = "PRODUCTION"
  auto_acknowledge_rule_warnings = true

  contact = ["team@example.com"]

  # Wait for staging activation to complete first
  depends_on = [akamai_property_activation.staging]
}
```

## Configuring Application Security

Akamai's Application Security features can also be managed through Terraform:

```hcl
# Create a security configuration
resource "akamai_appsec_configuration" "security" {
  name        = "Web Security Policy"
  description = "Security configuration for www.example.com"
  contract_id = data.akamai_contract.default.id
  group_id    = data.akamai_group.default.id

  host_names = ["www.example.com"]
}

# Create a security policy within the configuration
resource "akamai_appsec_security_policy" "policy" {
  config_id          = akamai_appsec_configuration.security.config_id
  security_policy_name = "Default Policy"
  default_settings     = true
}
```

## Working with Edge Workers

For custom logic at the edge, use EdgeWorkers:

```hcl
# Create an EdgeWorker ID
resource "akamai_edgeworkers_edge_worker" "custom_logic" {
  name             = "custom-header-logic"
  group_id         = data.akamai_group.default.id
  resource_tier_id = 100  # Basic Compute tier
}
```

## Using Data Sources for Existing Resources

When migrating existing Akamai configurations to Terraform, data sources help you reference what already exists:

```hcl
# Look up an existing property
data "akamai_property" "existing" {
  name        = "legacy.example.com"
  contract_id = data.akamai_contract.default.id
  group_id    = data.akamai_group.default.id
}

# Reference the existing property's rules
output "existing_rules" {
  value = data.akamai_property.existing.rules
}
```

## Structuring Your Akamai Terraform Project

For real-world projects, organize your files like this:

```
akamai-terraform/
  main.tf            # Provider configuration
  variables.tf       # Input variables
  dns.tf             # DNS zone and records
  properties.tf      # CDN property definitions
  security.tf        # Security configurations
  rules/
    main.json        # Property rules template
    performance.json # Performance-specific rules
  environments/
    staging.tfvars   # Staging-specific values
    production.tfvars # Production-specific values
```

## Best Practices

**Version pin the provider.** Akamai releases frequently. Lock to a major version with `~> 6.0` to avoid breaking changes.

**Use staging activations first.** Always test property changes on the staging network before pushing to production. The `depends_on` pattern shown above enforces this ordering.

**Store rules as templates.** Keep your property rules in JSON template files rather than inline HCL. This makes them easier to review and test.

**Import existing resources.** If you already have Akamai configurations, use `terraform import` or the Akamai CLI's export feature to generate Terraform code from existing properties.

**Manage credentials securely.** In CI/CD, use environment variables or a secrets manager. Never commit `.edgerc` to version control.

## Conclusion

The Akamai Terraform provider brings infrastructure-as-code practices to your CDN and edge computing setup. By managing DNS, properties, security policies, and edge workers through Terraform, you get version control, peer review, and repeatable deployments for your entire Akamai configuration. Start with DNS records if you want a quick win, then progressively move property configurations into Terraform as you get comfortable with the workflow.
