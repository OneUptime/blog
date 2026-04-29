# How to Configure the Linode Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Linode, Infrastructure as Code, IaC, Akamai Cloud, Cloud Provider

Description: Learn how to configure the Linode (Akamai Cloud) provider in OpenTofu to manage compute instances and Kubernetes clusters.

## Introduction

This guide covers How to Configure the Linode Provider in OpenTofu using OpenTofu with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- A Linode APIv4 personal access token
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 3.0"
    }
  }
}

provider "linode" {
  # The provider reads credentials from LINODE_TOKEN.
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export LINODE_TOKEN="your-linode-api-token"
```

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "region" {
  description = "Linode region for resources"
  type        = string
  default     = "us-central"
}

variable "root_pass" {
  description = "Root password for the compute instance"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key to add to the compute instance"
  type        = string
}

variable "k8s_version" {
  description = "LKE Kubernetes version in major.minor format"
  type        = string
  default     = "1.32"
}
```

## Step 3: Create Basic Resources

```hcl
resource "linode_instance" "web" {
  label           = "${var.environment}-web"
  image           = "linode/ubuntu22.04"
  region          = var.region
  type            = "g6-standard-1"
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_pass
  private_ip      = true

  tags = [var.environment, "opentofu"]
}

resource "linode_lke_cluster" "main" {
  label       = "${var.environment}-lke"
  k8s_version = var.k8s_version
  region      = var.region
  tags        = [var.environment, "opentofu"]

  pool {
    type  = "g6-standard-2"
    count = 3
  }
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "linode_instance" "web" {
  label           = "${var.environment}-web"
  image           = "linode/ubuntu22.04"
  region          = var.region
  type            = "g6-standard-1"
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_pass
  private_ip      = true
  backups_enabled = true

  tags = [var.environment, "opentofu"]

  alerts {
    cpu            = 90
    transfer_quota = 80
  }
}

resource "linode_lke_cluster" "main" {
  label       = "${var.environment}-lke"
  k8s_version = var.k8s_version
  region      = var.region
  tags        = [var.environment, "opentofu"]

  control_plane {
    high_availability = true
  }

  pool {
    type  = "g6-standard-2"
    count = 3
  }
}
```

## Step 5: Define Outputs

```hcl
output "instance_ip" {
  description = "The public IPv4 address of the Linode instance"
  value       = linode_instance.web.ip_address
}

output "lke_cluster_id" {
  description = "The ID of the created LKE cluster"
  value       = linode_lke_cluster.main.id
}

output "lke_dashboard_url" {
  description = "The dashboard URL for the created LKE cluster"
  value       = linode_lke_cluster.main.dashboard_url
}
```

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
Verify `LINODE_TOKEN` is set correctly and that the token has permission to create the Linode resources in your configuration.

### Rate Limiting
If the Linode API rate-limits your run, lower concurrency with `tofu plan -parallelism=1` or `tofu apply -parallelism=1`.

### Provider Version Conflicts
Pin the `linode/linode` provider to a compatible version range to ensure reproducible deployments.

## Conclusion

You have successfully configured the Linode provider in OpenTofu. This provider enables you to manage compute instances and Kubernetes clusters as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials.
