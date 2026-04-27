# How to Configure the OVH Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OVH, Infrastructure as Code, IaC, Cloud Provider, European Cloud

Description: Learn how to configure the OVH Cloud provider in OpenTofu to manage cloud instances, databases, and networking.

## Introduction

This guide covers how to configure the `ovh/ovh` provider in OpenTofu with practical examples for managing Public Cloud project users, Managed Kubernetes Service clusters, IAM policies, and DNS records on OVHcloud.

## Prerequisites

- OpenTofu v1.6+
- An OVHcloud account with an existing Public Cloud project (the project's `service_name` is required for most resources)
- A set of API credentials generated from the [OVHcloud token creation page](https://api.ovh.com/createToken/) with the rights you need
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    ovh = {
      source  = "ovh/ovh"
      version = "~> 2.0"
    }
  }
}

# All credentials and the endpoint can also come from environment
# variables (OVH_ENDPOINT, OVH_APPLICATION_KEY, OVH_APPLICATION_SECRET,
# OVH_CONSUMER_KEY), which is the recommended approach.

provider "ovh" {
  endpoint = "ovh-eu" # ovh-eu, ovh-us, or ovh-ca
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export OVH_ENDPOINT="ovh-eu"            # ovh-eu, ovh-us, ovh-ca, soyoustart-eu, kimsufi-eu, ...
export OVH_APPLICATION_KEY="your-application-key"
export OVH_APPLICATION_SECRET="your-application-secret"
export OVH_CONSUMER_KEY="your-consumer-key"
```

```hcl
variable "service_name" {
  description = "Public Cloud project ID (service_name)"
  type        = string
}

variable "region" {
  description = "OVHcloud region (e.g. GRA11, SBG5, BHS5)"
  type        = string
  default     = "GRA11"
}
```

## Step 3: Create Basic Resources

```hcl
# Create a service user inside an existing Public Cloud project. The
# generated password is exposed once via the resource's sensitive
# `password` attribute.
resource "ovh_cloud_project_user" "ops" {
  service_name = var.service_name
  description  = "Service user managed by OpenTofu"
  role_names = [
    "compute_operator",
    "network_operator",
    "objectstore_operator",
  ]
}

# Add an SSH key that can be referenced when creating Public Cloud
# instances.
resource "ovh_cloud_project_ssh_key" "ops" {
  service_name = var.service_name
  name         = "ops-key"
  public_key   = file("~/.ssh/id_ed25519.pub")
}
```

## Step 4: Configure Advanced Settings

```hcl
# Create a Managed Kubernetes Service (MKS) cluster
resource "ovh_cloud_project_kube" "main" {
  service_name = var.service_name
  name         = "prod-cluster"
  region       = var.region
}

# Attach a node pool to the cluster
resource "ovh_cloud_project_kube_nodepool" "main" {
  service_name  = ovh_cloud_project_kube.main.service_name
  kube_id       = ovh_cloud_project_kube.main.id
  name          = "default-pool"
  flavor_name   = "b3-8"
  desired_nodes = 3
  min_nodes     = 1
  max_nodes     = 5
}

# Restrict who can manage the Public Cloud project via IAM
data "ovh_me" "account" {}

resource "ovh_me_identity_group" "platform" {
  name        = "platform"
  description = "Platform team identities"
}

resource "ovh_iam_policy" "platform_cloud_admin" {
  name        = "platform-cloud-admin"
  description = "Allow platform group full access to the Public Cloud project"
  identities  = [ovh_me_identity_group.platform.urn]
  resources   = ["urn:v1:eu:resource:publicCloudProject:${var.service_name}"]

  allow = [
    "publicCloudProject:apiovh:*",
  ]
}

# Manage a DNS record on an existing OVHcloud domain zone
resource "ovh_domain_zone_record" "api" {
  zone      = "example.com"
  subdomain = "api"
  fieldtype = "A"
  ttl       = 3600
  target    = "203.0.113.10"
}
```

## Step 5: Define Outputs

```hcl
output "kube_cluster_id" {
  description = "ID of the OVHcloud Managed Kubernetes cluster"
  value       = ovh_cloud_project_kube.main.id
}

output "kubeconfig" {
  description = "Kubeconfig for the Managed Kubernetes cluster"
  value       = ovh_cloud_project_kube.main.kubeconfig
  sensitive   = true
}

output "ops_user_username" {
  description = "Generated OpenStack username for the service user"
  value       = ovh_cloud_project_user.ops.username
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download the provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan -var "service_name=YOUR_PROJECT_ID"

# Apply configuration
tofu apply -var "service_name=YOUR_PROJECT_ID"
```

## Common Issues and Solutions

### Authentication Errors
Verify that `OVH_APPLICATION_KEY`, `OVH_APPLICATION_SECRET`, and `OVH_CONSUMER_KEY` are set, and that `OVH_ENDPOINT` matches the region your account belongs to (`ovh-eu`, `ovh-us`, or `ovh-ca`). When you generate the consumer key on the [token creation page](https://api.ovh.com/createToken/), make sure the requested rights cover every API path you need (for example `GET`, `POST`, `PUT`, and `DELETE` on `/cloud/project/*`).

### Rate Limiting
OVHcloud APIs enforce per-account rate limits and the provider surfaces them as `429` errors. Use the provider's `api_rate_limit` argument to throttle requests (operations per second) rather than relying on `depends_on`, and reduce concurrency on `tofu apply` with `-parallelism=N` for large configurations.

### Provider Version Conflicts
Pin the `ovh/ovh` provider to a tested version range (for example `~> 2.0`) and commit the `.terraform.lock.hcl` file generated by `tofu init` so the same provider version is selected across environments.

## Conclusion

You have successfully configured the OVH provider in OpenTofu to manage Public Cloud users, Managed Kubernetes clusters, IAM policies, and DNS records. Managing OVHcloud as code keeps your European cloud infrastructure consistent across environments and enables GitOps workflows. Always store API credentials in environment variables or a secret store, and protect your OpenTofu state backend because attributes such as cluster kubeconfigs and generated user passwords are persisted there.
