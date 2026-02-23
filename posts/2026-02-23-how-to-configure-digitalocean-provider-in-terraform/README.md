# How to Configure DigitalOcean Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, DigitalOcean, Cloud, Infrastructure as Code

Description: A complete guide to configuring the DigitalOcean provider in Terraform for managing droplets, databases, Kubernetes clusters, and other DO resources.

---

DigitalOcean is known for its simplicity, and that philosophy extends to its Terraform provider. If you are tired of the sprawling complexity of some cloud providers, DigitalOcean offers a refreshing alternative for deploying infrastructure. The Terraform provider covers everything from Droplets and managed databases to Kubernetes clusters and load balancers.

This guide walks through setting up the DigitalOcean provider, authenticating, and managing the most common resources.

## Prerequisites

- Terraform 1.0 or later
- A DigitalOcean account
- A DigitalOcean personal access token (API token)

## Getting Your API Token

Generate a personal access token from the DigitalOcean control panel:

1. Go to API in the left sidebar
2. Click Generate New Token
3. Give it a name and select both Read and Write scopes
4. Copy the token immediately (it will not be shown again)

## Declaring the Provider

```hcl
# versions.tf - Pin the DigitalOcean provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.34"
    }
  }
}
```

## Provider Configuration

```hcl
# provider.tf - Configure with API token
provider "digitalocean" {
  token = var.do_token
}

variable "do_token" {
  type        = string
  sensitive   = true
  description = "DigitalOcean API token"
}
```

### Using Environment Variables

```bash
# Set the token via environment variable
export DIGITALOCEAN_TOKEN="dop_v1_your_token_here"
```

```hcl
# Provider picks up the token from DIGITALOCEAN_TOKEN
provider "digitalocean" {}
```

### Spaces Access (Object Storage)

If you also need to manage DigitalOcean Spaces (S3-compatible object storage), provide the Spaces keys.

```hcl
provider "digitalocean" {
  token             = var.do_token
  spaces_access_id  = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
}
```

## Managing Droplets

Droplets are DigitalOcean's virtual machines.

```hcl
# Create a basic Droplet
resource "digitalocean_droplet" "web" {
  name   = "web-server-01"
  region = "nyc3"
  size   = "s-2vcpu-4gb"
  image  = "ubuntu-22-04-x64"

  # Add your SSH key for access
  ssh_keys = [digitalocean_ssh_key.deploy.fingerprint]

  # Enable monitoring agent
  monitoring = true

  # Enable backups
  backups = true

  # User data script for initial setup
  user_data = <<-EOT
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
  EOT

  tags = ["web", "production"]
}

# Register an SSH key
resource "digitalocean_ssh_key" "deploy" {
  name       = "deploy-key"
  public_key = file("~/.ssh/id_ed25519.pub")
}
```

### Multiple Droplets

```hcl
# Create multiple web server Droplets
resource "digitalocean_droplet" "web_cluster" {
  count  = 3
  name   = "web-${count.index + 1}"
  region = "nyc3"
  size   = "s-2vcpu-4gb"
  image  = "ubuntu-22-04-x64"

  ssh_keys = [digitalocean_ssh_key.deploy.fingerprint]
  tags     = ["web", "production"]
}
```

## Networking

### VPC

```hcl
# Create a VPC for network isolation
resource "digitalocean_vpc" "production" {
  name     = "production-vpc"
  region   = "nyc3"
  ip_range = "10.10.10.0/24"
}

# Place Droplets in the VPC
resource "digitalocean_droplet" "app" {
  name   = "app-server"
  region = "nyc3"
  size   = "s-2vcpu-4gb"
  image  = "ubuntu-22-04-x64"
  vpc_uuid = digitalocean_vpc.production.id
}
```

### Load Balancers

```hcl
# Create a load balancer
resource "digitalocean_loadbalancer" "web" {
  name   = "web-lb"
  region = "nyc3"

  vpc_uuid = digitalocean_vpc.production.id

  forwarding_rule {
    entry_port     = 443
    entry_protocol = "https"
    target_port     = 8080
    target_protocol = "http"

    certificate_name = digitalocean_certificate.web.name
  }

  healthcheck {
    port     = 8080
    protocol = "http"
    path     = "/health"
  }

  droplet_ids = digitalocean_droplet.web_cluster[*].id
}
```

### Firewall

```hcl
# Create a firewall
resource "digitalocean_firewall" "web" {
  name = "web-firewall"

  droplet_ids = digitalocean_droplet.web_cluster[*].id

  # Allow HTTP and HTTPS from anywhere
  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Allow SSH from specific IPs
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = [var.admin_ip]
  }

  # Allow all outbound traffic
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
```

### DNS

```hcl
# Create a domain
resource "digitalocean_domain" "main" {
  name = "example.com"
}

# Create DNS records
resource "digitalocean_record" "www" {
  domain = digitalocean_domain.main.id
  type   = "A"
  name   = "www"
  value  = digitalocean_loadbalancer.web.ip
  ttl    = 300
}

resource "digitalocean_record" "api" {
  domain = digitalocean_domain.main.id
  type   = "A"
  name   = "api"
  value  = digitalocean_droplet.app.ipv4_address
  ttl    = 300
}
```

## Managed Databases

```hcl
# Create a managed PostgreSQL cluster
resource "digitalocean_database_cluster" "postgres" {
  name       = "app-db"
  engine     = "pg"
  version    = "15"
  size       = "db-s-2vcpu-4gb"
  region     = "nyc3"
  node_count = 2

  # Place in the VPC
  private_network_uuid = digitalocean_vpc.production.id
}

# Create a database
resource "digitalocean_database_db" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "myapp"
}

# Create a database user
resource "digitalocean_database_user" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "app_user"
}

# Restrict access to specific resources
resource "digitalocean_database_firewall" "postgres" {
  cluster_id = digitalocean_database_cluster.postgres.id

  rule {
    type  = "droplet"
    value = digitalocean_droplet.app.id
  }

  rule {
    type  = "k8s"
    value = digitalocean_kubernetes_cluster.main.id
  }
}

# Output the connection string
output "database_uri" {
  value     = digitalocean_database_cluster.postgres.uri
  sensitive = true
}
```

## Kubernetes (DOKS)

```hcl
# Create a managed Kubernetes cluster
resource "digitalocean_kubernetes_cluster" "main" {
  name    = "production-cluster"
  region  = "nyc3"
  version = "1.28.2-do.0"

  vpc_uuid = digitalocean_vpc.production.id

  # Default node pool
  node_pool {
    name       = "default-pool"
    size       = "s-4vcpu-8gb"
    node_count = 3
    auto_scale = true
    min_nodes  = 2
    max_nodes  = 5

    tags = ["production", "k8s"]
  }
}

# Add a dedicated node pool for workloads
resource "digitalocean_kubernetes_node_pool" "worker" {
  cluster_id = digitalocean_kubernetes_cluster.main.id

  name       = "worker-pool"
  size       = "s-8vcpu-16gb"
  node_count = 2
  auto_scale = true
  min_nodes  = 1
  max_nodes  = 10

  tags   = ["production", "worker"]
  labels = {
    workload = "general"
  }
}

# Output kubeconfig
output "kubeconfig" {
  value     = digitalocean_kubernetes_cluster.main.kube_config[0].raw_config
  sensitive = true
}
```

## Spaces (Object Storage)

```hcl
# Create a Spaces bucket
resource "digitalocean_spaces_bucket" "assets" {
  name   = "myapp-assets"
  region = "nyc3"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["https://example.com"]
    max_age_seconds = 3600
  }
}

# Upload an object to Spaces
resource "digitalocean_spaces_bucket_object" "index" {
  region       = digitalocean_spaces_bucket.assets.region
  bucket       = digitalocean_spaces_bucket.assets.name
  key          = "index.html"
  content      = file("${path.module}/static/index.html")
  content_type = "text/html"
  acl          = "public-read"
}

# Configure a CDN for the bucket
resource "digitalocean_cdn" "assets" {
  origin = digitalocean_spaces_bucket.assets.bucket_domain_name
  ttl    = 3600
}
```

## App Platform

```hcl
# Deploy an app using DigitalOcean App Platform
resource "digitalocean_app" "web" {
  spec {
    name   = "myapp"
    region = "nyc"

    service {
      name               = "api"
      instance_count     = 2
      instance_size_slug = "professional-xs"

      github {
        repo           = "myorg/myapp"
        branch         = "main"
        deploy_on_push = true
      }

      http_port = 8080

      env {
        key   = "DATABASE_URL"
        value = digitalocean_database_cluster.postgres.uri
        type  = "SECRET"
      }
    }
  }
}
```

## Data Sources

```hcl
# Look up an existing Droplet image
data "digitalocean_image" "ubuntu" {
  slug = "ubuntu-22-04-x64"
}

# Look up available regions
data "digitalocean_regions" "available" {
  filter {
    key    = "available"
    values = ["true"]
  }
}

# Look up the account information
data "digitalocean_account" "current" {}

# Look up available Kubernetes versions
data "digitalocean_kubernetes_versions" "current" {}
```

## Project Organization

```hcl
# Create a project to organize resources
resource "digitalocean_project" "production" {
  name        = "Production"
  description = "Production infrastructure"
  purpose     = "Web Application"
  environment = "Production"

  resources = [
    digitalocean_droplet.web_cluster[0].urn,
    digitalocean_loadbalancer.web.urn,
    digitalocean_database_cluster.postgres.urn,
  ]
}
```

## Best Practices

1. Always use VPCs to isolate your resources. DigitalOcean creates a default VPC per region, but creating your own gives you more control over the IP range.

2. Use database firewalls to restrict access to your managed databases. Do not leave them open to all Droplets.

3. Store your API token in environment variables or a secrets manager, never in your Terraform files.

4. Use DigitalOcean's managed services (databases, Kubernetes) when possible. They handle patching, backups, and high availability for you.

5. Tag your resources consistently for billing and organization.

## Wrapping Up

The DigitalOcean provider for Terraform brings the platform's simplicity to infrastructure as code. With fewer resource types and a cleaner API compared to the major cloud providers, it is faster to learn and easier to maintain. Whether you are running Droplets, managed databases, Kubernetes clusters, or serverless apps, everything can be defined in your Terraform configuration.

For monitoring your DigitalOcean infrastructure, [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Droplets, databases, and applications with alerting and incident management.
