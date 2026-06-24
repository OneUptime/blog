# How to Manage Portainer Environments with Terraform - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Environment, Infrastructure, DevOps

Description: Learn how to create, configure, and manage Portainer environments using Terraform, including Docker, Kubernetes, and Edge environments with full IaC lifecycle management.

## Introduction

Portainer environments represent managed infrastructure. Using Terraform to manage them ensures new environments are provisioned consistently, old ones are cleanly decommissioned, and configuration drift is detected automatically. This guide covers managing Docker, Swarm, and Kubernetes environments with Terraform.

## Prerequisites

- Portainer Terraform provider configured
- Terraform v1.0+
- Infrastructure already deployed (Portainer connects to existing Docker/K8s)
- TLS certificates if using secure Docker API

## Step 1: Docker Standalone Environment

```hcl
# environments.tf

# Local Docker (Unix socket)

resource "portainer_environment" "local_docker" {
  name                = "local"
  environment_address = "unix:///var/run/docker.sock"
  type                = 1  # Docker standalone
}

# Remote Docker over TLS
resource "portainer_environment" "production_docker" {
  name                = "production"
  environment_address = "tcp://192.168.1.100:2376"
  type                = 1

  tls_enabled     = true
  tls_skip_verify = false
  tls_ca_cert     = file("${path.module}/certs/ca.pem")
  tls_cert        = file("${path.module}/certs/cert.pem")
  tls_key         = file("${path.module}/certs/key.pem")

  tag_ids  = [portainer_tag.environment_prod.id]
  group_id = portainer_endpoint_group.production.id
}

# Remote Docker over TCP (no TLS - dev only)
resource "portainer_environment" "dev_docker" {
  name                = "development"
  environment_address = "tcp://10.0.0.50:2375"
  type                = 1

  tag_ids = [portainer_tag.environment_dev.id]
}
```

## Step 2: Docker Swarm Environment

```hcl
# Swarm manager node
resource "portainer_environment" "production_swarm" {
  name                = "production-swarm"
  environment_address = "tcp://swarm-manager.example.com:2376"
  type                = 1  # Same type, Portainer detects Swarm automatically

  tls_enabled     = true
  tls_skip_verify = false
  tls_ca_cert     = file("${path.module}/certs/swarm-ca.pem")
  tls_cert        = file("${path.module}/certs/swarm-cert.pem")
  tls_key         = file("${path.module}/certs/swarm-key.pem")
}
```

## Step 3: Kubernetes Environment

```hcl
# Kubernetes environment via Agent (load balancer)
resource "portainer_environment" "k8s_production" {
  name                = "k8s-production"
  environment_address = "tcp://k8s-production.example.com:9001"
  type                = 6  # Kubernetes via Agent

  tag_ids = [portainer_tag.environment_prod.id]
}

# Kubernetes environment via Agent (node port)
resource "portainer_environment" "k8s_staging" {
  name                = "k8s-staging"
  environment_address = "tcp://10.0.20.15:30778"
  type                = 6  # Kubernetes via Agent

  tag_ids = [portainer_tag.environment_staging.id]
}
```

## Step 4: Tags and Groups

```hcl
# tags.tf

resource "portainer_tag" "environment_prod" {
  name = "env:production"
}

resource "portainer_tag" "environment_staging" {
  name = "env:staging"
}

resource "portainer_tag" "environment_dev" {
  name = "env:development"
}

resource "portainer_tag" "region_us" {
  name = "region:us-east"
}

resource "portainer_tag" "region_eu" {
  name = "region:eu-west"
}

# endpoint_groups.tf

resource "portainer_endpoint_group" "production" {
  name        = "Production Environments"
  description = "All production infrastructure"
}

resource "portainer_endpoint_group" "development" {
  name        = "Development Environments"
  description = "Dev and staging infrastructure"
}
```

## Step 5: Multi-Region Environment Setup

```hcl
# variables.tf
variable "environments" {
  description = "Map of environment configurations"
  type = map(object({
    url      = string
    region   = string
    env_type = string
    ca_cert  = string
    cert     = string
    key      = string
  }))
}

# Multi-environment creation with for_each
resource "portainer_environment" "managed" {
  for_each = var.environments

  name                = each.key
  environment_address = each.value.url
  type                = 1

  tls_enabled     = true
  tls_skip_verify = false
  tls_ca_cert     = each.value.ca_cert
  tls_cert        = each.value.cert
  tls_key         = each.value.key

  tag_ids = [
    portainer_tag.environment_prod.id
  ]
}
```

With `terraform.tfvars`:

```hcl
environments = {
  "us-east-1-docker" = {
    url      = "tcp://10.0.1.10:2376"
    region   = "us-east-1"
    env_type = "production"
    ca_cert  = "-----BEGIN CERTIFICATE-----..."
    cert     = "-----BEGIN CERTIFICATE-----..."
    key      = "-----BEGIN RSA PRIVATE KEY-----..."
  }
  "eu-west-1-docker" = {
    url      = "tcp://10.1.1.10:2376"
    region   = "eu-west-1"
    env_type = "production"
    ca_cert  = "..."
    cert     = "..."
    key      = "..."
  }
}
```

## Step 6: Access Policies

```hcl
# Update the existing environments to grant team access
resource "portainer_environment" "production_docker" {
  name                = "production"
  environment_address = "tcp://192.168.1.100:2376"
  type                = 1

  tls_enabled     = true
  tls_skip_verify = false
  tls_ca_cert     = file("${path.module}/certs/ca.pem")
  tls_cert        = file("${path.module}/certs/cert.pem")
  tls_key         = file("${path.module}/certs/key.pem")

  tag_ids  = [portainer_tag.environment_prod.id]
  group_id = portainer_endpoint_group.production.id

  team_access_policies = {
    (portainer_team.devops.id) = 1  # Environment administrator
  }
}

resource "portainer_environment" "k8s_staging" {
  name                = "k8s-staging"
  environment_address = "tcp://10.0.20.15:30778"
  type                = 6

  tag_ids = [portainer_tag.environment_staging.id]

  team_access_policies = {
    (portainer_team.backend.id) = 3  # Standard User
  }
}
```

## Step 7: Outputs

```hcl
# outputs.tf

output "environment_ids" {
  description = "Map of environment names to IDs"
  value = {
    production = portainer_environment.production_docker.id
    staging    = portainer_environment.k8s_staging.id
    local      = portainer_environment.local_docker.id
  }
}

output "endpoint_group_ids" {
  description = "Environment group IDs"
  value = {
    production = portainer_endpoint_group.production.id
    dev        = portainer_endpoint_group.development.id
  }
}
```

## Step 8: Plan and Apply

```bash
# Initialize
terraform init

# Plan - see what will be created
terraform plan

# Apply
terraform apply

# Verify environments were created
curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
  "https://portainer.example.com/api/endpoints" | \
  jq '.[] | {id: .Id, name: .Name}'
```

## Conclusion

Managing Portainer environments with Terraform makes your infrastructure registration reproducible and auditable. New servers are added to Portainer by modifying a Terraform configuration file and running `apply`, not by logging into the UI. Tags, groups, and access policies can all live in the same Terraform configuration, ensuring complete environment metadata and access settings are captured in code from day one.
