# How to Manage Akamai Resources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Akamai, CDN, Edge Security, WAF

Description: Learn how to manage Akamai properties, edge hostnames, security configurations, and firewall rules using OpenTofu for reproducible CDN and edge security management.

## Introduction

The Akamai provider for OpenTofu manages Akamai CDN properties, edge hostnames, security configurations, and WAF rules. Managing these configurations as code enables consistent edge behavior across staging and production and makes WAF policy changes subject to code review.

## Provider Configuration

```hcl
terraform {
  required_providers {
    akamai = {
      source  = "akamai/akamai"
      version = "~> 6.0"
    }
  }
}

provider "akamai" {
  edgerc         = "~/.edgerc"  # Akamai EdgeGrid credentials file
  config_section = "default"
  # Or use environment variables:
  # AKAMAI_HOST, AKAMAI_CLIENT_TOKEN, AKAMAI_CLIENT_SECRET, AKAMAI_ACCESS_TOKEN
}
```

## Edge Hostname

```hcl
data "akamai_contract" "main" {
  group_name = "My Company"
}

data "akamai_group" "main" {
  group_name  = "My Company"
  contract_id = data.akamai_contract.main.id
}

resource "akamai_edge_hostname" "app" {
  product_id    = "prd_Fresca"  # Ion Standard
  contract_id   = data.akamai_contract.main.id
  group_id      = data.akamai_group.main.id
  ip_behavior   = "IPV6_PERFORMANCE"
  edge_hostname = "www.example.com.edgekey.net"

  certificate = 12345  # Certificate enrollment ID
}
```

## Property Configuration

```hcl
resource "akamai_property" "app" {
  name        = "www.example.com"
  product_id  = "prd_Fresca"
  contract_id = data.akamai_contract.main.id
  group_id    = data.akamai_group.main.id

  hostnames {
    cname_from             = "www.example.com"
    cname_to               = akamai_edge_hostname.app.edge_hostname
    cert_provisioning_type = "CPS_MANAGED"
  }

  rule_format = "v2024-01-09"

  rules = data.akamai_property_rules_builder.app_rules.json
}

# Build property rules using the rules builder

data "akamai_property_rules_builder" "app_rules" {
  rules_v2024_01_09 {
    name     = "default"
    comments = "Default rule"

    behavior {
      origin {
        origin_type             = "CUSTOMER"
        hostname                = "origin.example.com"
        forward_host_header     = "REQUEST_HOST_HEADER"
        cache_key_hostname      = "REQUEST_HOST_HEADER"
        compress                = true
        enable_true_client_ip   = true
        https_port              = 443
        http_port               = 80
      }
    }

    behavior {
      cp_code {
        value {
          id   = 123456
          name = "www.example.com"
        }
      }
    }

    behavior {
      caching {
        behavior        = "MAX_AGE"
        must_revalidate = false
        ttl             = "7d"
      }
    }
  }
}
```

## Security Configuration (WAF)

```hcl
resource "akamai_appsec_configuration" "app" {
  name        = "app-security"
  description = "WAF configuration for www.example.com"
  contract_id = data.akamai_contract.main.id
  group_id    = data.akamai_group.main.id

  host_names = ["www.example.com", "api.example.com"]
}

resource "akamai_appsec_security_policy" "main" {
  config_id              = akamai_appsec_configuration.app.config_id
  default_settings       = true
  security_policy_name   = "Default Policy"
  security_policy_prefix = "AA00"
}

# Set how Kona Rule Set updates are applied for the policy
resource "akamai_appsec_waf_mode" "main" {
  config_id          = akamai_appsec_configuration.app.config_id
  security_policy_id = akamai_appsec_security_policy.main.security_policy_id
  mode               = "ASE_AUTO"  # Adaptive Security Engine automatic updates
}
```

## Activating Configuration

```hcl
resource "akamai_property_activation" "staging" {
  property_id = akamai_property.app.id
  contact     = ["devops@example.com"]
  version     = akamai_property.app.latest_version
  network     = "STAGING"
}

resource "akamai_property_activation" "production" {
  property_id = akamai_property.app.id
  contact     = ["devops@example.com"]
  version     = akamai_property.app.latest_version
  network     = "PRODUCTION"

  depends_on = [akamai_property_activation.staging]
}
```

## Conclusion

Akamai's complex property and security configurations benefit significantly from infrastructure-as-code management. Changes to WAF rules, caching behavior, and origin configuration go through pull request review and automated testing against staging before production deployment. The two-stage property activation (staging then production) provides a safe deployment pattern that mirrors Akamai's recommended workflow.
