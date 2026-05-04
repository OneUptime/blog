# How to Configure the Consul Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Consul, Infrastructure as Code, IaC, Service Discovery, Configuration

Description: Learn how to configure the HashiCorp Consul provider in OpenTofu to manage services, KV pairs, and intentions.

## Introduction

This guide covers how to configure the HashiCorp Consul provider in OpenTofu with practical examples and production-ready configurations. The provider lets you manage Consul KV data, catalog entries, ACLs, and service-mesh configuration entries with the same plan/apply workflow you use for the rest of your infrastructure.

## Prerequisites

- OpenTofu v1.6+
- A running Consul server (v1.9+ for service-intentions config entries) reachable from where you run OpenTofu
- A Consul ACL token with sufficient privileges to manage the resources below
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    consul = {
      source  = "hashicorp/consul"
      version = "~> 2.20"
    }
  }
}

# Configure the provider. Address and token can also come from
# the CONSUL_HTTP_ADDR and CONSUL_HTTP_TOKEN environment variables.

provider "consul" {
  address    = "consul.example.com:8500"
  scheme     = "https"
  datacenter = "dc1"
  # token = var.consul_token  # Prefer CONSUL_HTTP_TOKEN env var
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export CONSUL_HTTP_ADDR="https://consul.example.com:8500"
export CONSUL_HTTP_TOKEN="00000000-0000-0000-0000-000000000000"
export CONSUL_HTTP_SSL_VERIFY="true"
export CONSUL_NAMESPACE="default"  # Only required for Consul Enterprise
```

```hcl
variable "consul_address" {
  description = "Address of the Consul HTTP API"
  type        = string
}

variable "consul_token" {
  description = "ACL token used to authenticate with Consul"
  type        = string
  sensitive   = true
}
```

## Step 3: Create Basic Resources

```hcl
# Write a small set of KV pairs
resource "consul_keys" "app" {
  key {
    path  = "app/config/feature_flag"
    value = "true"
  }

  key {
    path  = "app/config/log_level"
    value = "info"
  }
}

# Register an external service in the Consul catalog
resource "consul_node" "external" {
  name    = "external-api"
  address = "10.0.1.50"
}

resource "consul_service" "external_api" {
  name    = "billing-api"
  node    = consul_node.external.name
  port    = 443
  tags    = ["external", "https"]
}
```

## Step 4: Configure Advanced Settings

```hcl
# Define an ACL policy granting read access to the app/ KV prefix
resource "consul_acl_policy" "app_read" {
  name        = "app-read"
  description = "Read access to app/ KV prefix"
  datacenters = ["dc1"]

  rules = <<-RULE
    key_prefix "app/" {
      policy = "read"
    }
  RULE
}

# Issue an ACL token bound to that policy
resource "consul_acl_token" "app" {
  description = "Token for the app service"
  policies    = [consul_acl_policy.app_read.name]
  local       = true
}

# Define a service-intentions config entry (Consul 1.9+)
# This replaces the deprecated consul_intention resource.
resource "consul_config_entry_service_intentions" "billing" {
  name = "billing-api"

  sources {
    name   = "web"
    action = "allow"
  }

  sources {
    name   = "*"
    action = "deny"
  }
}
```

## Step 5: Define Outputs

```hcl
output "app_token_accessor_id" {
  description = "Accessor ID of the app ACL token"
  value       = consul_acl_token.app.accessor_id
}

output "billing_service_id" {
  description = "ID of the registered billing-api service"
  value       = consul_service.external_api.id
}
```

The token's secret value is not stored in state. To retrieve it for distribution to a client, use the `consul_acl_token_secret_id` data source.

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify `CONSUL_HTTP_TOKEN` is valid and has not been revoked, and that `CONSUL_HTTP_ADDR` points to the correct agent. Ensure the token's attached policies grant the capabilities required by the resources you manage (for example, `acl = "write"` to manage policies and tokens).

### Rate Limiting
Add `depends_on` to serialize resource creation and avoid hitting API rate limits.

### Provider Version Conflicts
Pin to a specific provider version range to ensure reproducible deployments.

## Conclusion

You have successfully configured the HashiCorp Consul provider in OpenTofu. This provider enables you to manage Consul KV data, catalog entries, ACL policies and tokens, and service-mesh configuration entries as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials such as `CONSUL_HTTP_TOKEN`.
