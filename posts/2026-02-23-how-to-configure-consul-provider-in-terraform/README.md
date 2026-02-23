# How to Configure Consul Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Consul, Service Discovery, Infrastructure as Code

Description: A practical guide to configuring the Consul provider in Terraform for managing key-value data, services, ACL policies, and prepared queries.

---

Consul is a versatile tool from HashiCorp that handles service discovery, configuration management, and network segmentation. While you can manage Consul through its CLI or API, using Terraform to configure Consul resources brings consistency and repeatability to your setup. This is especially valuable when you have multiple environments or need to track changes through version control.

This post covers how to set up the Consul provider in Terraform, authenticate properly, and manage common Consul resources like KV pairs, services, ACL tokens, and intentions.

## Prerequisites

You will need:

- Terraform 1.0 or later
- A running Consul cluster (or a single agent in dev mode for testing)
- A Consul ACL token with appropriate permissions (if ACLs are enabled)

## Declaring the Provider

Start by declaring the provider and pinning its version.

```hcl
# versions.tf - Declare the Consul provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    consul = {
      source  = "hashicorp/consul"
      version = "~> 2.20"
    }
  }
}
```

Now configure the provider with your Consul server details.

```hcl
# provider.tf - Point Terraform at your Consul cluster
provider "consul" {
  # Address of the Consul agent
  address    = "consul.example.com:8500"

  # Use HTTPS in production
  scheme     = "https"

  # ACL token for authentication
  token      = var.consul_token

  # Datacenter to target
  datacenter = "dc1"
}
```

## Authentication Options

### Token via Variable

```hcl
# Pass the token as a sensitive variable
variable "consul_token" {
  type      = string
  sensitive = true
  description = "ACL token for Consul access"
}

provider "consul" {
  address = "consul.example.com:8500"
  token   = var.consul_token
}
```

### Environment Variable

```bash
# Set the Consul token via environment variable
export CONSUL_HTTP_TOKEN="your-consul-token"
export CONSUL_HTTP_ADDR="https://consul.example.com:8500"
```

```hcl
# When env vars are set, the provider block can be empty
provider "consul" {}
```

### TLS Client Certificates

For mutual TLS setups, you can provide client certificates.

```hcl
# mTLS authentication with client certificates
provider "consul" {
  address = "consul.example.com:8500"
  scheme  = "https"

  ca_file   = "/path/to/ca.pem"
  cert_file = "/path/to/client-cert.pem"
  key_file  = "/path/to/client-key.pem"
}
```

## Managing Key-Value Data

The Consul KV store is one of the most commonly used features. Terraform makes it straightforward to manage KV pairs.

```hcl
# Store a single key-value pair
resource "consul_key_prefix" "app_config" {
  # The path prefix in the KV store
  path_prefix = "config/my-app/"

  subkeys = {
    "database/host"     = "db.internal.example.com"
    "database/port"     = "5432"
    "database/name"     = "myapp_production"
    "cache/ttl_seconds" = "300"
    "feature/dark_mode" = "true"
  }
}

# Store a single key with more control
resource "consul_keys" "app_settings" {
  key {
    path  = "config/my-app/version"
    value = "2.5.1"
  }

  key {
    path  = "config/my-app/maintenance_mode"
    value = "false"
  }
}
```

### Reading KV Data

```hcl
# Read values from Consul KV to use in Terraform
data "consul_keys" "app" {
  key {
    name    = "db_host"
    path    = "config/my-app/database/host"
    default = "localhost"
  }
}

# Reference the value elsewhere
output "database_host" {
  value = data.consul_keys.app.var.db_host
}
```

## Registering Services

You can register external services in Consul's catalog through Terraform.

```hcl
# Register an external service that is not running a Consul agent
resource "consul_service" "external_database" {
  name    = "postgres"
  node    = "external-db-node"
  port    = 5432
  tags    = ["production", "primary"]

  check {
    check_id = "postgres-tcp"
    name     = "PostgreSQL TCP Check"
    tcp      = "db.example.com:5432"
    interval = "10s"
    timeout  = "2s"
  }
}

# Register a node for the external service
resource "consul_node" "external_db" {
  name    = "external-db-node"
  address = "db.example.com"
}
```

## ACL Configuration

If your Consul cluster has ACLs enabled, you can manage policies and tokens through Terraform.

```hcl
# Create an ACL policy
resource "consul_acl_policy" "app_read" {
  name        = "app-read-policy"
  description = "Allows reading KV data and service discovery"

  rules = <<-EOT
    # Allow reading keys under config/my-app
    key_prefix "config/my-app/" {
      policy = "read"
    }

    # Allow discovering services
    service_prefix "" {
      policy = "read"
    }

    # Allow reading node information
    node_prefix "" {
      policy = "read"
    }
  EOT
}

# Create a token attached to the policy
resource "consul_acl_token" "app_token" {
  description = "Token for my-app service"
  policies    = [consul_acl_policy.app_read.name]
  local       = false
}
```

## Service Intentions

Intentions control which services can communicate with each other in a Consul Connect service mesh.

```hcl
# Allow the web service to connect to the API service
resource "consul_config_entry" "web_to_api" {
  kind = "service-intentions"
  name = "api"

  config_json = jsonencode({
    Sources = [
      {
        Name       = "web"
        Action     = "allow"
        Precedence = 9
        Type       = "consul"
      }
    ]
  })
}

# Deny all other traffic to the database service
resource "consul_config_entry" "db_deny_all" {
  kind = "service-intentions"
  name = "database"

  config_json = jsonencode({
    Sources = [
      {
        Name       = "api"
        Action     = "allow"
        Precedence = 9
        Type       = "consul"
      },
      {
        Name       = "*"
        Action     = "deny"
        Precedence = 8
        Type       = "consul"
      }
    ]
  })
}
```

## Prepared Queries

Prepared queries let you define complex service lookups that can failover across datacenters.

```hcl
# Create a prepared query with datacenter failover
resource "consul_prepared_query" "api_service" {
  name         = "api"
  only_passing = true
  near         = "_agent"

  service = "api"
  tags    = ["production"]

  failover {
    nearest_n   = 3
    datacenters = ["dc2", "dc3"]
  }

  dns {
    ttl = "30s"
  }
}
```

## Multiple Datacenters

Use provider aliases to manage resources across datacenters.

```hcl
# Primary datacenter
provider "consul" {
  alias      = "dc1"
  address    = "consul-dc1.example.com:8500"
  datacenter = "dc1"
  token      = var.consul_token_dc1
}

# Secondary datacenter
provider "consul" {
  alias      = "dc2"
  address    = "consul-dc2.example.com:8500"
  datacenter = "dc2"
  token      = var.consul_token_dc2
}

# Deploy config to both datacenters
resource "consul_key_prefix" "dc1_config" {
  provider    = consul.dc1
  path_prefix = "config/shared/"
  subkeys = {
    "region" = "us-east-1"
  }
}

resource "consul_key_prefix" "dc2_config" {
  provider    = consul.dc2
  path_prefix = "config/shared/"
  subkeys = {
    "region" = "eu-west-1"
  }
}
```

## Config Entries for Service Mesh

Consul config entries let you configure service mesh behavior.

```hcl
# Configure service defaults
resource "consul_config_entry" "api_defaults" {
  kind = "service-defaults"
  name = "api"

  config_json = jsonencode({
    Protocol = "http"
  })
}

# Configure a service router
resource "consul_config_entry" "api_router" {
  kind = "service-router"
  name = "api"

  config_json = jsonencode({
    Routes = [
      {
        Match = {
          HTTP = {
            PathPrefix = "/v2/"
          }
        }
        Destination = {
          Service       = "api-v2"
          PrefixRewrite = "/"
        }
      }
    ]
  })
}
```

## Practical Tips

1. Use `consul_key_prefix` instead of individual `consul_keys` when managing a group of related keys. It is cleaner and easier to maintain.

2. Always use ACL tokens with the minimum required permissions. Creating dedicated tokens for Terraform prevents over-provisioning access.

3. When working with Consul Connect, define your intentions in Terraform to keep your security posture consistent and auditable.

4. If your Consul cluster uses TLS, make sure the CA certificate is available on the machine running Terraform, or use the `ca_file` option in the provider.

5. Consider using the `consul_keys` data source to feed dynamic configuration into other parts of your Terraform setup.

## Wrapping Up

The Consul provider in Terraform gives you full control over your Consul cluster configuration as code. Whether you are managing KV data, registering services, setting up ACL policies, or configuring service mesh intentions, everything can be tracked in version control and deployed through your CI/CD pipeline.

For monitoring the health of your Consul-backed services and getting alerts when things go wrong, take a look at [OneUptime](https://oneuptime.com) for comprehensive infrastructure monitoring.
