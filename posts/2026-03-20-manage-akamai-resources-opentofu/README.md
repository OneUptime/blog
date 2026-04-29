# How to Manage Akamai Resources with OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Akamai, CDN, Infrastructure as Code, Edge Computing

Description: Learn how to manage Akamai CDN properties, edge hostnames, and security configurations using OpenTofu and the official Akamai provider.

## Introduction

Akamai is a leading content delivery network and cloud security platform. Managing Akamai resources through OpenTofu enables teams to version-control CDN configurations, automate property activations, and integrate CDN management into existing infrastructure pipelines.

## Prerequisites

- OpenTofu installed (v1.6+)
- An Akamai account with API credentials
- Akamai API client credentials (client token, client secret, access token, host)

## Installing the Akamai Provider

```hcl
terraform {
  required_providers {
    akamai = {
      source  = "akamai/akamai"
      version = "~> 9.0"
    }
  }
}
```

## Configuring the Provider

Store credentials in an `.edgerc` file (Akamai standard format):

```ini
[default]
client_secret = your-client-secret
host          = akab-xxxx.luna.akamaiapis.net
access_token  = akab-access-token
client_token  = akab-client-token
```

Reference it in the provider:

```hcl
provider "akamai" {
  edgerc         = "~/.edgerc"
  config_section = "default"
}
```

Alternatively, use environment variables:

```bash
export AKAMAI_CLIENT_TOKEN=akab-...
export AKAMAI_CLIENT_SECRET=...
export AKAMAI_ACCESS_TOKEN=akab-...
export AKAMAI_HOST=akab-...luna.akamaiapis.net
```

## Managing a Property

Create and manage an Akamai delivery property:

```hcl
data "akamai_contract" "main" {
  group_name = "My Group"
}

data "akamai_group" "main" {
  group_name  = "My Group"
  contract_id = data.akamai_contract.main.id
}

resource "akamai_cp_code" "app" {
  name        = "my-app-cpcode"
  contract_id = data.akamai_contract.main.id
  group_id    = data.akamai_group.main.id
  product_id  = "prd_Fresca"
}

resource "akamai_edge_hostname" "app" {
  product_id    = "prd_Fresca"
  contract_id   = data.akamai_contract.main.id
  group_id      = data.akamai_group.main.id
  ip_behavior   = "IPV4"
  edge_hostname = "app.example.com.edgesuite.net"
}

resource "akamai_property" "app" {
  name        = "my-app-property"
  contract_id = data.akamai_contract.main.id
  group_id    = data.akamai_group.main.id
  product_id  = "prd_Fresca"

  hostnames {
    cname_from             = "www.example.com"
    cname_to               = akamai_edge_hostname.app.edge_hostname
    cert_provisioning_type = "DEFAULT"
  }

  rule_format = "latest"
  rules       = data.akamai_property_rules_template.app.json
}
```

## Property Rules via Template

Use a rules template file for complex configuration:

```hcl
data "akamai_property_rules_template" "app" {
  template_file = abspath("${path.module}/property-rules/main.json")

  variables {
    name  = "cpcode_id"
    value = akamai_cp_code.app.id
    type  = "number"
  }

  variables {
    name  = "origin_hostname"
    value = var.origin_hostname
    type  = "string"
  }
}
```

## Activating a Property

```hcl
resource "akamai_property_activation" "staging" {
  property_id = akamai_property.app.id
  contact     = ["devops@example.com"]
  version     = akamai_property.app.latest_version
  network     = "STAGING"
  note        = "Deployed by OpenTofu on ${timestamp()}"
}

resource "akamai_property_activation" "production" {
  property_id = akamai_property.app.id
  contact     = ["devops@example.com"]
  version     = akamai_property.app.latest_version
  network     = "PRODUCTION"

  depends_on = [akamai_property_activation.staging]
}
```

## Managing Security Configurations

```hcl
resource "akamai_appsec_configuration" "main" {
  name        = "my-security-config"
  description = "WAF configuration for production"
  contract_id = data.akamai_contract.main.id
  group_id    = data.akamai_group.main.id
  host_names  = ["www.example.com"]
}
```

## Best Practices

- Always activate to staging before production.
- Use property rule templates (JSON files) instead of inline rules for maintainability.
- Use consistent naming conventions to identify environment and project ownership.
- Store `.edgerc` credentials in a secrets manager and inject at runtime.
- Use separate OpenTofu workspaces or state only when staging and production are distinct Akamai configurations.

## Conclusion

The Akamai OpenTofu provider brings full CDN lifecycle management into your infrastructure-as-code workflow. From property creation to security configurations and staged activations, OpenTofu ensures your Akamai setup is reproducible, auditable, and integrated with your broader deployment pipeline.
