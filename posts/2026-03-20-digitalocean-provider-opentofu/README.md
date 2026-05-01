# How to Configure the DigitalOcean Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DigitalOcean, Infrastructure as Code, IaC, Cloud Provider

Description: Learn how to configure the DigitalOcean provider in OpenTofu to manage Droplets, databases, and Kubernetes clusters.

## Introduction

This guide covers how to configure the DigitalOcean provider in OpenTofu with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- A DigitalOcean personal access token
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

# The provider automatically reads DIGITALOCEAN_TOKEN when it is set.
provider "digitalocean" {}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export DIGITALOCEAN_TOKEN="dop_v1_your_token_here"
```

```hcl
variable "name_prefix" {
  description = "Prefix used for resource names"
  type        = string
  default     = "opentofu-do"
}

variable "region" {
  description = "DigitalOcean region for resources"
  type        = string
  default     = "nyc3"
}

variable "project_environment" {
  description = "DigitalOcean project environment: Development, Staging, or Production"
  type        = string
  default     = "Development"
}

variable "alert_email" {
  description = "Email address to receive monitoring alerts"
  type        = string
  default     = "alerts@example.com"
}
```

## Step 3: Create Basic Resources

```hcl
resource "digitalocean_droplet" "web" {
  name       = "${var.name_prefix}-web-1"
  region     = var.region
  size       = "s-1vcpu-1gb"
  image      = "ubuntu-22-04-x64"
  backups    = true
  monitoring = true
  tags       = ["opentofu", "web"]
}

resource "digitalocean_database_cluster" "postgres" {
  name       = "${var.name_prefix}-postgres"
  engine     = "pg"
  version    = "15"
  size       = "db-s-1vcpu-1gb"
  region     = var.region
  node_count = 1
  tags       = ["opentofu", "database"]
}

resource "digitalocean_kubernetes_cluster" "main" {
  name    = "${var.name_prefix}-k8s"
  region  = var.region
  version = "latest"
  tags    = ["opentofu", "kubernetes"]

  node_pool {
    name       = "default"
    size       = "s-2vcpu-2gb"
    node_count = 1
  }
}

resource "digitalocean_project" "main" {
  name        = "${var.name_prefix}-project"
  description = "Managed by OpenTofu"
  purpose     = "Web Application"
  environment = var.project_environment
  resources = [
    digitalocean_droplet.web.urn,
    digitalocean_database_cluster.postgres.urn,
    digitalocean_kubernetes_cluster.main.urn,
  ]
}
```

## Step 4: Configure Advanced Settings

```hcl
# Monitoring and alerting configuration
resource "digitalocean_monitor_alert" "cpu_alert" {
  alerts {
    email = [var.alert_email]
  }

  window      = "5m"
  type        = "v1/insights/droplet/cpu"
  compare     = "GreaterThan"
  value       = 90
  enabled     = true
  entities    = [digitalocean_droplet.web.id]
  description = "Alert when droplet CPU usage is above 90%"
}

# Restrict database access to trusted resources
resource "digitalocean_database_firewall" "postgres" {
  cluster_id = digitalocean_database_cluster.postgres.id

  rule {
    type  = "droplet"
    value = digitalocean_droplet.web.id
  }

  rule {
    type  = "k8s"
    value = digitalocean_kubernetes_cluster.main.id
  }
}
```

## Step 5: Define Outputs

```hcl
output "project_id" {
  description = "The ID of the created project"
  value       = digitalocean_project.main.id
}

output "droplet_ipv4_address" {
  description = "The public IPv4 address of the Droplet"
  value       = digitalocean_droplet.web.ipv4_address
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan -out=tfplan

# Apply configuration
tofu apply tfplan
```

## Common Issues and Solutions

### Authentication Errors
Verify `DIGITALOCEAN_TOKEN` is set and that the token has permission to create the resources in this configuration.

### Rate Limiting
Use the provider's `requests_per_second` setting if you need client-side throttling instead of adding unnecessary `depends_on` relationships.

### Provider Version Conflicts
Pin `digitalocean/digitalocean` to a specific version range and run `tofu init -upgrade` only when you intentionally want to upgrade the provider.

## Conclusion

You have successfully configured the DigitalOcean provider in OpenTofu. This provider enables you to manage Droplets, managed databases, Kubernetes clusters, and project organization as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials.
